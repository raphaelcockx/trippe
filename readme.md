# Trippe 🏨

Unofficial API client to check hotel prices and reward night availability at over 6.000 hotels worldwide - suitable for an intercontinental lifestyle. Please get in touch with the hotel company before using this software in production. Please also note that Trippe will **not** work 'out of the box' but needs a (static) API key to perform any request to the backend.

[![npm version](https://img.shields.io/npm/v/trippe)](https://www.npmjs.com/package/trippe)
[![license](https://img.shields.io/github/license/raphaelcockx/trippe)](LICENSE)

## First of all

This is both a labour of love and a work in progress. During development Trippe has been tested and fine-tuned thoroughly, things like method names and the structure of both parameters as well as output are unlikely to change anytime soon. There are however a sheer infinite number of combinations when it comes to hotels, prices and dates meaning 'special cases' are bound to keep popping up. If you find a bug or just notice that the output of a certain search makes no sense at all, make sure to [open an issue](https://github.com/raphaelcockx/trippe/issues).

## Installation

```sh
npm install trippe
```

**Warning**: This package is native [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) and does not provide a CommonJS export. If your project uses CommonJS, you'll have to [convert to ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) or use the [dynamic `import()`](https://v8.dev/features/dynamic-import) function.

## Getting started

Import Trippe and set up a new instance of the class with the API key as the sole parameter:

```js
import Trippe from 'trippe'

const trippe = new Trippe('API_KEY')
```

## Usage

### `getHotelDetails(hotelCode)`

The `getHotelDetails` method will return some basic info on a specific hotel in the system. It needs a single parameter, in the form of the unique `hotelCode` of the property. This id of 5 characters (all letters, all uppercase) will be used for almost every other method as well.

```js
// Get details for a specific hotel in Antwerp, Belgium
const hotelDetails = await trippe.getHotelDetails('ANRAW')
```

#### Returns

Returns a Promise that will resolve with an object containing the following keys:

| Key | Type | Description |
| --- | ---- | ----------- |
| hotelCode | String | The systemwide id ('mnemonic') of the hotel
| hotelName | String | The name of the hotel, not taking into account the brand name of the (sub)chain it belongs to
| brandCode | String | The code of the (sub)chain the hotel belongs to
| brandName | String | The brand name of the (sub)chain the hotel belongs to
| description.long & description.short | String | A description of the property, in two formats
| numberOfRooms | Number | The number of available rooms
| closestCity | String | The closest city to the hotel (could be the actual city of the address)
| street | Array | The street part of the property address, with one entry for each line needed (maximum 2)
| postalCode | String | The postal code of the property
| city | String | The city the hotel is in
| state | String | The state part of the address, null when not locally used
| country | String | The country the hotel is in, expressed as an ISO 3166-1 alpha-2 code
| coordinates | Array | The coordinates of the hotel, expressed as [longitude, latitude]
| url | String | The URL of the hotel's homepage

---
### `getStayPrices(hotelCode, [options])`

The `getStayPrices` method allows you to get a full list of all possible prices at a specific hotel and for a specific set of dates. It returns a list of room types available for booking (Standard Room, Junior Suite...), the different rate plans being offered (Advanced Purchase, Non-Refundable, Member Rates...) and the price of any combination of rooms and rates - both in points as well in cash including taxes.

```js
// Get all available rates for a two-night stay in Tokyo
const stayPrices = await trippe.getStayPrices('TYOHB', {
  checkinDate: '2023-03-01',
  checkoutDate: '2023-03-03',
  adults: 2
})
```

#### Options

As above, the `hotelCode` parameter should always be provided. The options object is optional, as are any of its keys. Keys and default values are as follows:

| Key | Type | Default | Description |
| --- | ---- | ------- | ----------- |
| checkinDate | String | Today's date in your local timezone | The check-in date in ISO 8601 date format |
| checkoutDate | String | The date following the `checkinDate` | The checkout date in ISO 8601 date format |
| adults | Number | 1 | The number of adults sharing the room |
| children | Number | 0 | The number of children sharing the room |

#### Returns

Returns a Promise that will resolve with an object containing the following keys:

| Key | Type | Description |
| --- | ---- | ----------- |
| products | Array | Available products (room types), see below |
| ratePlans | Array | Available rate plans, see below
| currencyCode | String | The ISO 4217 currency code in which prices are expressed |
| prices | Array | Available combinations of products and rate plans, see below

The **`products`** array contains objects with these keys:

| Key | Type | Description |
| --- | ---- | ----------- |
| productCode | String | A 4-letter code indicating the type of room |
| productName | String | The name of the room type as displayed to the user |
| productDescription | String | A longer description of the room type |
| productIsPremium | Boolean | Whether this is considered to be a premium room at the hotel |

The **`ratePlans`** array contains objects with these keys:

| Key | Type | Description |
| --- | ---- | ----------- |
| rateCode | String | A short code indicating the type of rate |
| rateName | String | The name of the rate plan as displayed to the user |
| rateDescription | String | A longer description of the rate plan |

Rate plans might differ by things such as payment and cancellation conditions, whether membership in the loyalty program is required to book it, whether breakfast is included and by the number of bonus points being awarded to members. **Please note** that a rate plan being listed here does not mean that it will be available for this stay. The same goes for a product being included in the `products` array.

Finally, the combinations of products and rate plans being offered are listed in the **`prices`** array which contains objects with these keys:

| Key | Type | Description |
| --- | ---- | ----------- |
| productCode | String | The product id, as used in `products` above |
| rateCode | String | The rate plan id, as used in `ratePlans` above |
| cashPrice | Number | The room price in the hotel's currency. Will be null for reward rates |
| points | Array or null | The room price in points, including points and cash offers - formatted as an array of objects with `points` and `cashPrice` keys. Will be null if the `rateCode` refers to a cash rate |

Please note that any `cashPrice` included as part of a cash and points offers will **always** be in US Dollars!

---
### `getDestinations(query)`

The `getDestinations` method can autocomplete any geographic text query and show the corresponding set of  coordinates. Useful queries include (partial) city or airport names, landmarks and even full addresses in major cities.

```js
const destinations = await trippe.getDestinations('Van')
// Returns suggestions such as 'Vancouver, BC, CAN' and 'Van Gogh Museum, Amsterdam, Netherlands'
```

#### Returns

Returns a Promise that will resolve with an array of objects each containing the following keys:

| Key | Type | Description |
| --- | ---- | ----------- |
| display | String | The text of the suggested destination |
| coordinates | Array | The coordinates of that destination in [longitude, latitude] format |

Although queries are language-specific, `getDestinations` can for the moment only work with query strings in English. More language support is coming soon.

---
### `getLowestAreaPrices(coordinates, [options])`

The `getLowestAreaPrices` method allows you to compare hotel prices in a radius of up to 100 miles / 160 kilometres around a geographic centre point. It will provide you with the lowest price (in both cash and points) available at each hotel within that radius for a given night and including taxes. Prices always represent a stay of 1 night in 1 room, but you can specify the number of guests.

```js
// Get the lowest prices for a one-night stay in a radius of 20 km
// around the Place de la Concorde in Paris
const lowestAreaPrices = await trippe.getHotelDetails([2.321096215980252, 48.86542132948351], {
  radius: 20,
  unit: 'km',
  checkinDate: '2023-04-01'
  adults: 2
})
```

Coordinates should be expressed as [longitude, latitude] (can be exported from `getDestinations`). As with all methods that involve specifying a date, Trippe expects the `checkinDate` to be a string formatted as `YYYY-MM-DD` (AKA [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html))

#### Options

The options object is optional, as are any of its keys. Keys and default values are as follows:

| Key | Type | Default | Description |
| --- | ---- | ------- | ----------- |
| radius | Number | 100 | The search radius around `coordinates` up to a maximum value of 100 |
| unit = | String | mi | Either 'mi' for miles or 'km' for kilometres |
| checkinDate | String | Today's date in your local timezone | The check-in date in ISO 8601 date format |
| adults | Number | 1 | The number of adults sharing the room |
| children | Number | 0 | The number of children sharing the room |

#### Returns

Returns a Promise that will resolve with an array of objects each containing the following keys:

| Key | Type | Description |
| --- | ---- | ----------- |
| hotelCode | String | The systemwide id ('mnemonic') of the hotel |
| cashPrice | Number | The lowest available price at the hotel for that night, in the hotel's currency |
| currencyCode | String | The ISO 4217 currency code in which the `cashPrice` is expressed |
| points | Number | The lowest available price at the hotel for that night, in points |

**Please note** that this method will not include hotels that have no rooms available. You should therefore not use this method to get a list of hotels in a certain area.

---
### `getLowestHotelPrices(hotelCode, [options])`

The `getLowestHotelPrices` method will do more or less the opposite of the `getLowestAreaPrices` method above. It will provide you with pricing data from one single hotel (as specified by `hotelCode`) but spread out over up to 60 days. This 'price calender' shows both cash rates as well as prices in points. It is important to note though that cash prices **DO NOT** include taxes - see below for more details.

```js
// Get a calendar of prices for a stay in Mexico City in spring (April and May)
const lowestPrices = trippe.getLowestHotelPrices('MEXHA', {
  startDate: '2023-04-01',
  endDate: '2023-05-30'
})
```

#### Options

The options object is optional, as are any of its keys. Keys and default values are as follows:

| Key | Type | Default | Description |
| --- | ---- | ------- | ----------- |
| startDate | String | Today's date in your local timezone | The first check-in date (in ISO 8601 date format) for which prices are to be determined |
| endDate | String | Today's date in your local timezone + 59 days | The last check-in date (in ISO 8601 date format) for which prices are to be determined |

#### Returns

Returns a Promise that will resolve with an array of objects each containing the following keys:

| Key | Type | Description |
| --- | ---- | ----------- |
| checkinDate | String | The check-in date to which these prices are applicable (in ISO 8601 date format) |
| currencyCode | String | The ISO 4217 currency code in which prices are expressed |
| cashPrice | Number | The lowest room price in the hotel's currency. Will be null if no rooms are available. |
| points | Array or null | The lowest room price in points. Will be null if no reward stays are available. |

All prices reflect a one-night stay by 1 adult in 1 room.

---
### `getBookingPageUrl(hotelCode, [options])`

The `getBookingPageUrl` method will allow you to link to the booking page on the official site. When using the URL returned by this method, all details about the stay will be prefilled and users will be able to select a room type and rate.

```js
// Book a two-night stay in early March in Tokyo
const bookingUrl = await trippe.getBookingPageUrl('TYOHB', {
  checkinDate: '2023-03-01',
  checkoutDate: '2023-03-03',
  adults: 2
})
```

#### Options

This method uses the same parameters as the [`getStayPrices` method](#getstaypriceshotelcode-options)

#### Returns

The URL as a string.

## Good to know

### Taxes

**TL;DR**: It's complicated. You should probably avoid getting prices without tax from the API or be sure you can correctly calculate the additional taxes yourself.

Most Trippe methods will return cash prices with all taxes **included** and thus represent the final and full price to pay at the time of booking. The only method that doesn't follow this logic is `getLowestHotelPrices` which will mostly show prices **without** taxes as that is all the API gives us for this method.

The difference isn't however as clear-cut as you'd expect. Depending on local laws, prices without taxes might already include things like a sales tax but not an often much smaller local tourism tax that is added per person and night. This is certainly the case for many European hotels which means that, in locations where no tourism tax is added, prices with and without taxes could be the same.

In other places the difference between both numbers may be significant as sales taxes, local hotel taxes and so-called amenity fees CAN be left out and really add up. While Trippe could get itemised tax rates for each hotel from the hotel, it turns out that these numbers aren't always correct - certainly not often enough to feed them to an automated system.

### Throttling 

Every method listed above corresponds to - at the most - **one underlying API call**. This means, for instance, that using the `getLowestAreaPrices` will not return hotel names, as this info is not returned from the API. It is up to your code to use `getHotelDetails` to translate a `hotelCode` to the name, address or location of the hotel in question and to store that information where needed. It also means that Trippe doesn't do any *throttling** towards the API. Your code should make sure that calls to Trippe methods are 'spaced out' in such a way that you don't get blocked by the API. For a quick and easy rate-limiting setup, [Bottleneck](https://www.npmjs.com/package/bottleneck) works well.

## Contributing

If you found a bug or want to propose a feature, feel free to visit [the issues page](https://github.com/raphaelcockx/trippe/issues).
