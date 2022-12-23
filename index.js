import got from 'got'
import dayjs from 'dayjs'
import { readPackageSync } from 'read-pkg'

import customParseFormat from 'dayjs/plugin/customParseFormat.js'
dayjs.extend(customParseFormat)

const brandCodes = {
  ATWL: 'Atwell Suites',
  AVID: 'avid Hotels',
  CDLW: 'Candlewood Suites',
  HICP: 'Crowne Plaza',
  EVEN: 'EVEN Hotels',
  HOLI: 'Holiday Inn',
  HICV: 'Holiday Inn Club Vacations',
  HIEX: 'Holiday Inn Express',
  HEXS: 'Holiday Inn Express & Suites',
  INDG: 'Hotel Indigo',
  HLUX: 'HUALUXE',
  ICON: 'InterContinental',
  KIKI: 'Kimpton',
  MRMS: 'Mr & Mrs Smith',
  RGNT: 'Regent',
  SIXS: 'Six Senses',
  STAY: 'Staybridge Suites',
  LXLX: 'Vignette Collection',
  VXVX: 'voco'
}

export default class Trippe {
  #headers

  constructor (apiKey) {
    // Check if apiKey was provided
    if (!apiKey) {
      throw new Error('apiKey is required')
    }

    // Set headers
    const { version } = readPackageSync()

    this.#headers = {
      'x-ihg-api-key': apiKey,
      'user-agent': `Trippe v${version} (https://github.com/raphaelcockx/trippe)`
    }
  }

  /**
   * Gets basic info on a hotel
   *
   * @param {string} hotelCode The systemwide id (mnemonic) of the hotel
   * @returns {Promise<hotelDetails>}
  */

  /**
   * @typedef {Object} hotelDetails
   * @property {string} hotelCode The systemwide id (mnemonic) of the hotel
   * @property {string} hotelName The name of the hotel, not taking into account the brand name of the chain it belongs to
   * @property {string} brandCode The code of the (sub)chain the hotel belongs to
   * @property {string} brandName The brand name of the (sub)chain the hotel belongs to
   * @property {hotelDescription} description A description of the property, in two formats
   * @property {number} numberOfRooms The number of available rooms
   * @property {string} closestCity The closest city to the hotel (may be the actual city of the address)
   * @property {Array} street The street part of the property address, with one entry for each line needed (maximum 2)
   * @property {string} postalCode The postal code of the property
   * @property {string} city The city the hotel is in
   * @property {state|null} state The state part of the address, null when not locally used
   * @property {string} country The country the hotel is in, expressed as a ISO 3166-1 alpha-2 code
   * @property {Array} coordinates The coordinates of the hotel, expressed as [longitude, latitude]
   * @property {string} url The url of the hotel's homepage
   */

  /**
   * @typedef {Object} hotelDescription
   * @property {string} long The long description of the property
   * @property {string} short The short description of the property
   */

  /**
   * @typedef {Object} state
   * @property {string} code The (local) shorthand used
   * @property {string} name The full name
   */

  getHotelDetails (hotelCode) {
    // Check if hotelCode was provided
    if (!hotelCode) {
      throw new Error('hotelCode is required')
    }

    const headers = this.#headers
    const url = `https://apis.ihg.com/hotels/v1/profiles/${hotelCode}/details?fieldset=brandInfo,location,profile,address`

    return got.get(url, { headers }).json()
      .then(json => json.hotelInfo)
      .then(hotelInfo => {
        const { brandInfo, location, profile, address } = hotelInfo

        const { brandCode } = brandInfo
        const { closestCity } = location
        const { roomsIncludingSuitesCount, latLong, name, shortDescription, longDescription } = profile

        return {
          hotelCode,
          hotelName: name,
          brandCode,
          brandName: brandCodes[brandCode],
          description: {
            long: longDescription,
            short: shortDescription
          },
          numberOfRooms: roomsIncludingSuitesCount,
          closestCity,
          street: [address.street1, address.street4].filter((d) => d),
          postalCode: address.zip,
          city: address.city,
          state: 'code' in address.state ? address.state.code : null,
          country: address.country.code,
          coordinates: [latLong.longitude, latLong.latitude],
          url: address.consumerFriendlyURL ? `https://${address.consumerFriendlyURL}` : null
        }
      })
      .catch((err) => {
        throw new Error(err.code === 'ERR_NON_2XX_3XX_RESPONSE' ? 'Unknown or invalid hotelCode' : err)
      })
  }

  /**
   * Returns an object with the hotelCode, the currencyCode and an array  of lowest prices (in points and in cash) for a
   * single hotel - per night and for a period of up to 62 days
   * Note that the rates that this method returns don't always include (all) taxes
   *
   * @param {string} hotelCode The systemwide id of the hotel
   * @param {startEndDates} dates An object containing startDate and endDate keys (both optional)
   * @returns {Promise<Object[lowestHotelPrices]>}
  */

  /**
   * @typedef {Object} startEndDates
   * @property {string} startDate The date (check in date) from which to start searching, defaults to today
   * @property {string} endDate The last date (as a check in date) to include in the search, defaults to today + 61 days
   */

  /**
   * @typedef { Object } lowestHotelPrices
   * @property {string} hotelCode The systemwide id (mnemonic) of the hotel
   * @property {string} currencyCode The currency used at this hotel
   * @property {lowestPriceDay} prices The lowest prices by day
   */

  /**
   * @typedef {Object} lowestPriceDay
   * @property {string} checkinDate The check in date
   * @property {number|null} cashPrice The lowest cash price available - not including (some) taxes for a one night stay, null if no rooms available
   * @property {number|null} points The lowest number of points available to book a reward night with points only, null if no reward nights are available
   */
  getLowestHotelPrices (hotelCode, {
    startDate = dayjs().format('YYYY-MM-DD'),
    endDate = dayjs(startDate).add(61, 'day').format('YYYY-MM-DD')
  } = {}) {
    const headers = this.#headers

    // Check if hotelCode was provided
    if (!hotelCode) {
      throw new Error('hotelCode is required')
    }

    // Calculate number of days
    const days = dayjs(endDate).diff(dayjs(startDate), 'day') + 1

    // Check if there's 62 days or less
    if (days > 62) {
      throw new Error('Please limit the number of days to 62 or less')
    }

    const url = `https://apis.ihg.com/availability/v1/windows?hotelCodes=${hotelCode.toUpperCase()}&rateCodes=IVANI,IDMAP,IDME0,IDME2,IGCOR,IDVPD&startDate=${startDate}T00:00:00Z&endDate=${endDate}T00:00:00Z&lengthOfStay=1&numberOfRooms=1&includeSellStrategy=never`

    return got.get(url, { headers }).json()
      .then(json => json.hotels[0])
      .then(hotel => {
        const { currencyCode, rates } = hotel
        const dates = [...new Array(days)].map((u, i) => dayjs(startDate).add(i, 'day').format('YYYY-MM-DD'))

        if (currencyCode === '') {
          throw new Error('Unknown or invalid hotelCode')
        } else {
          const ratesCombined = rates.flatMap(rate => rate.windows)

          const prices = dates.map(checkinDate => {
            const points = Math.min(...ratesCombined.filter(rate => rate.startDate === `${checkinDate}T00:00:00Z` && 'totalPoints' in rate).map(rate => rate.totalPoints))
            const cashPrice = Math.min(...ratesCombined.filter(rate => rate.startDate === `${checkinDate}T00:00:00Z` && 'totalAmount' in rate).map(rate => rate.totalAmount))

            return {
              checkinDate,
              cashPrice: cashPrice < Infinity ? cashPrice : null,
              points: points < Infinity ? points : null
            }
          })

          return {
            hotelCode,
            currencyCode,
            prices
          }
        }
      })
  }

  /**
   * Returns an object containing arrays of available products, available rate plans and available prices
   * (in cash and points) for a specific hotel on specific dates
   *
   * @param {string} hotelCode The systemwide id of the hotel
   * @param {startEndDatesAndGuests} options
   * @returns {Promise<Object>}
  */

  /**
   * @typedef {Object} startEndDatesAndGuests
   * @property {string} startDate The date (check in date) from which to start searching, defaults to today
   * @property {string} endDate The last date (as a check in date) to include in the search, defaults to today + 61 days
   * @property {number} adults The number of adult guests in the room
   * @property {number} children The number of children in the room
   */

  getStayPrices (hotelCode, {
    checkinDate = dayjs().format('YYYY-MM-DD'),
    checkoutDate = dayjs(checkinDate).add(1, 'day').format('YYYY-MM-DD'),
    adults = 1,
    children = 0
  } = {}) {
    const headers = this.#headers

    // Check if hotelCode was provided
    if (!hotelCode) {
      throw new Error('hotelCode is required')
    }

    // Check checkinDate format
    const isValidCheckinDate = dayjs(checkinDate, 'YYYY-MM-DD', true).isValid()
    if (!isValidCheckinDate) throw new Error('Invalid value for checkinDate (should be formatted as YYYY-MM-DD)')

    const url = 'https://apis.ihg.com/availability/v3/hotels/offers?fieldset=rateDetails,rateDetails.policies,rateDetails.bonusRates,rateDetails.upsells'

    const json = {
      products: [
        {
          productCode: 'SR',
          guestCounts: [
            {
              otaCode: 'AQC10',
              count: adults
            },
            {
              otaCode: 'AQC8',
              count: children
            }],
          startDate: checkinDate,
          endDate: checkoutDate,
          quantity: 1
        }
      ],
      startDate: checkinDate,
      endDate: checkoutDate,
      hotelMnemonics: [hotelCode],
      rates: {
        ratePlanCodes: [
          {
            internal: 'IVANI'
          }
        ]
      },
      options: {
        disabilityMode: 'ACCESSIBLE_AND_NON_ACCESSIBLE',
        returnAdditionalRatePlanDescriptions: true
      }
    }

    return got.post(url, { headers, json, retry: { methods: ['POST'] }, throwHttpErrors: false })
      .then(response => {
        if (response.statusCode !== 200) {
          const errors = JSON.parse(response.body).errors

          if (errors.map((error) => error.code).includes('INVALID_HOTEL_MNEMONICS')) {
            throw new Error('Unknown or invalid hotelCode')
          } else if (errors.map((error) => error.code).includes('CRS_50010')) {
            throw new Error('Unknown or invalid hotelCode')
          } else if (errors.map((error) => error.code).includes('CRS_50025')) {
            throw new Error('No availabilty for your search')
          } else {
            throw new Error(errors[0].message)
          }
        } else {
          return JSON.parse(response.body)
        }
      })
      .then(json => json.hotels[0])
      .then(hotelData => {
        // Get list of products offered
        const { productDefinitions } = hotelData

        const products = productDefinitions
          .filter((productDefinition) => 'inventoryTypeName' in productDefinition && productDefinition.isAvailable)
          .map((productDefinition) => {
            return {
              productCode: productDefinition.inventoryTypeCode,
              productName: productDefinition.inventoryTypeName,
              productDescription: productDefinition.description ? productDefinition.description.trim() : null,
              productIsPremium: productDefinition.isPremium
            }
          })

        const currency = hotelData.propertyCurrency

        // Get a list of ratePlans offered
        const { ratePlanDefinitions } = hotelData

        const ratePlans = ratePlanDefinitions
          .filter((ratePlanDefinition) => 'additionalDescriptions' in ratePlanDefinition)
          .map((ratePlanDefinition) => {
            return {
              rateCode: ratePlanDefinition.code,
              rateName: ratePlanDefinition.additionalDescriptions.longRateName,
              rateDescription: ratePlanDefinition.additionalDescriptions.longRateDesc
            }
          })

        // Check rates per room type
        const { rateDetails } = hotelData

        const prices = rateDetails.offers.map((offer) => {
          const productCode = offer.productUses[0].inventoryTypeCode
          const rateCode = offer.ratePlanCode

          const cashPrice = 'rewardNights' in offer ? null : parseFloat(offer.productUses[0].rates.totalRate.average.amountAfterTax)

          let points = null

          if ('rewardNights' in offer) {
            const noCash = {
              points: offer.rewardNights.pointsOnly.averageDailyPoints,
              cashPrice: 0
            }

            const cashOptions = 'options' in offer.rewardNights.pointsCash
              ? offer.rewardNights.pointsCash.options.map((option) => {
                return {
                  points: option.averageDailyPoints,
                  cashPrice: option.averageDailyCash
                }
              })
              : []
            points = [noCash, ...cashOptions]
          }

          return {
            productCode,
            rateCode,
            cashPrice,
            points
          }
        })

        return {
          products,
          ratePlans,
          currency,
          prices: prices.sort((a, b) => a.ratePrice < b.ratePrice ? -1 : 1)
        }
      })
  }

  /**
   * Returns an array of lowest prices (in points and in cash) in a search area and for a given night
   *
   * @param {string} centrePoint The point (in [longitude, latitude] notation) to search from
   * @param {object} options An object containing radius, unit and checkinDate parameters (all optional)
   * @returns {Promise<Array>}
  */
  getLowestAreaPrices (coordinates, {
    radius = 100,
    unit = 'mi',
    checkinDate = dayjs().format('YYYY-MM-DD'),
    adults = 1,
    children = 0
  } = {}) {
    const headers = this.#headers
    const url = 'https://apis.ihg.com/availability/v3/hotels/offers?fieldset=summary,summary.rateRanges'

    // Check coordinates
    const validCoordinates = Array.isArray(coordinates) &&
        coordinates.length === 2 &&
        coordinates.every(d => typeof (d) === 'number')

    if (!validCoordinates) throw new Error('Invalid format used for coordinates, please use [lng, lat]')

    const [longitude, latitude] = coordinates

    // Check checkinDate format
    const isValidCheckinDate = dayjs(checkinDate, 'YYYY-MM-DD', true).isValid()
    if (!isValidCheckinDate) throw new Error('Invalid value for checkinDate (should be formatted as YYYY-MM-DD)')

    const checkoutDate = dayjs(checkinDate).add(1, 'day').format('YYYY-MM-DD')

    // Check distance unit
    if (!['KM', 'MI'].includes(unit.toUpperCase())) throw new Error('Wrong distance unit provided')

    // Check maximum distance
    if (radius > 100) throw new Error('The value of radius should not be greater than 100')

    const json = {
      products: [
        {
          productCode: 'SR',
          guestCounts: [
            {
              otaCode: 'AQC10',
              count: adults
            },
            {
              otaCode: 'AQC8',
              count: children
            }
          ],
          quantity: 1
        }
      ],
      radius,
      distanceUnit: unit.toUpperCase(),
      distanceType: 'STRAIGHT_LINE',
      startDate: checkinDate,
      endDate: checkoutDate,
      geoLocation: [
        {
          longitude,
          latitude
        }
      ],
      rates: {
        ratePlanCodes: [
          {
            internal: 'IVANI'
          }
        ]
      }
    }

    return got.post(url, { headers, json, retry: { methods: ['POST'] } }).json()
      .then(json => json.hotels)
      .then(hotels => hotels.filter(hotel => hotel.availabilityStatus === 'OPEN'))
      .then(hotels => hotels.map(hotel => {
        const { hotelMnemonic: hotelCode, propertyCurrency: currencyCode, lowestPointsOnlyCost, lowestCashOnlyCost } = hotel

        const cashPrice = parseFloat(lowestCashOnlyCost.amountAfterTax)
        const points = lowestPointsOnlyCost ? lowestPointsOnlyCost.points : null

        return {
          hotelCode,
          cashPrice,
          currencyCode,
          points
        }
      }))
  }

  /**
   * Returns a list of destinations and their coordinates
   *
   * @param {string} query A query to autocomplete, at least 3 characters long
   * @returns {Promise<Array>}
   */
  getDestinations (query) {
    // Check that the query is 3 characters or longer
    if (query.length < 3) throw new Error('Query string should be 3 characters or more')

    const headers = this.#headers
    const url = `https://apis.ihg.com/locations/v1/destinations?destination=${query}`

    return got.get(url, { headers }).json()
      .then(locations => {
        return locations.map(location => {
          const { longitude, latitude, clarifiedLocation: display } = location

          return {
            coordinates: [longitude, latitude],
            display
          }
        })
      })
  }

  /**
   * Returns a url that will show the room and rate options for the given hotel
   * with the givebn check in and check out dates
   *
   * @param {string} hotelCode The systemwide id of the hotel
   * @param {object} dates An object containing startDate and endDate keys (both optional)
   * @returns {Promise<Array>}
   */
  getBookingPageUrl (hotelCode, {
    checkinDate = dayjs().format('YYYY-MM-DD'),
    checkoutDate = dayjs(checkinDate).add(1, 'day').format('YYYY-MM-DD'),
    adults = 1,
    children = 0
  } = {}) {
    const checkinDateElements = checkinDate.split('-')
    const checkinDay = checkinDateElements[2]
    const checkinMonthYear = `${(+checkinDateElements[1] - 1).toString().padStart(2, '0')}${checkinDateElements[0]}`

    const checkoutDateElements = checkoutDate.split('-')
    const checkoutDay = checkoutDateElements[2]
    const checkoutMonthYear = `${(+checkoutDateElements[1] - 1).toString().padStart(2, '0')}${checkoutDateElements[0]}`

    return `https://www.ihg.com/hotels/us/en/find-hotels/select-roomrate?fromRedirect=true&qSrt=sBR&qSlH=${hotelCode}&qRms=1&qAdlt=${adults}&qChld=${children}&qCiD=${checkinDay}&qCiMy=${checkinMonthYear}&qCoD=${checkoutDay}&qCoMy=${checkoutMonthYear}`
  }
}
