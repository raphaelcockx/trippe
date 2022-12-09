import test from 'ava'
import dotenv from 'dotenv'

import Trippe from '../index.js'

test.before('Load environment variables', (t) => {
  dotenv.config()
})

test('[constructor] Throws when no API key provided', (t) => {
  t.throws(() => {
    // eslint-disable-next-line no-unused-vars
    const trippe = new Trippe()
  }, {
    message: 'apiKey is required'
  })
})

test('[getHotelDetails] Throws when no hotelCode is provided', (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  t.throws(() => {
    trippe.getHotelDetails()
  }, {
    message: 'hotelCode is required'
  })
})

test('[getHotelDetails] Throws when invalid or unknown hotelCode is provided', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  await t.throwsAsync(async () => {
    await trippe.getHotelDetails('X')
  }, {
    message: 'Unknown or invalid hotelCode'
  })
})

test('[getHotelDetails] Gets correctly formatted hotel details', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)
  const hotelDetails = await trippe.getHotelDetails('ANRAW')

  t.deepEqual(getObjectTypes(hotelDetails), {
    hotelCode: 'string',
    hotelName: 'string',
    brandCode: 'string',
    brandName: 'string',
    description: 'object',
    numberOfRooms: 'number',
    closestCity: 'string',
    street: 'array',
    postalCode: 'string',
    city: 'string',
    state: 'object',
    country: 'string',
    coordinates: 'array',
    url: 'string'
  })

  t.is(hotelDetails.brandCode.length, 4)
  t.is(hotelDetails.country.length, 2)
})

test('[getDestinations] Gets correctly formatted list of destinations', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)
  const destinations = await trippe.getDestinations('Ant')

  t.true(Array.isArray(destinations))
  t.true(destinations.map(destination => destination.display).includes('Antwerp, Belgium'))
})

test('[getLowestHotelPrices] Throws when no hotelCode is provided', (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  t.throws(() => {
    trippe.getLowestHotelPrices()
  }, {
    message: 'hotelCode is required'
  })
})

test('[getLowestHotelPrices] Throws when invalid or unknown hotelCode is provided', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  await t.throwsAsync(async () => {
    await trippe.getLowestHotelPrices('X', {})
  }, {
    message: 'Unknown or invalid hotelCode'
  })
})

test('[getLowestHotelPrices] Throws when more than 60 days are requested', (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  t.throws(() => {
    trippe.getLowestHotelPrices('ANRAW', {
      startDate: '2023-01-01',
      endDate: '2023-12-31'
    })
  }, {
    message: 'Please limit the number of days to 60 or less'
  })
})

test('[getLowestHotelPrices] Gets correctly formatted hotel prices', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)
  const hotelPrices = await trippe.getLowestHotelPrices('ANRAW', {})

  t.is(60, hotelPrices.length)
})

test('[getLowestAreaPrices] Throws when no or invalid coordinates are provided', (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  t.throws(() => {
    trippe.getLowestAreaPrices([])
  }, {
    message: 'Invalid format used for coordinates, please use [lng, lat]'
  })

  t.throws(() => {
    trippe.getLowestAreaPrices([50.5])
  }, {
    message: 'Invalid format used for coordinates, please use [lng, lat]'
  })

  t.throws(() => {
    trippe.getLowestAreaPrices([50.5, '50'])
  }, {
    message: 'Invalid format used for coordinates, please use [lng, lat]'
  })
})

test('[getLowestAreaPrices] Throws when checkinDate is incorrect', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  await t.throwsAsync(async () => {
    await trippe.getLowestAreaPrices([4.39739, 51.22171], {
      checkinDate: '22-11-19'
    })
  }, {
    message: 'Invalid value for checkinDate (should be formatted as YYYY-MM-DD)'
  })
})

test('[getLowestAreaPrices] Gets correctly formatted hotel prices', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)
  const hotelPrices = await trippe.getLowestAreaPrices([4.397955750773747, 51.21847735675646], {})

  t.false(hotelPrices.length === 0)
})

test('[getStayPrices] Throws when invalid or unknown hotelCode is provided', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  await t.throwsAsync(async () => {
    await trippe.getStayPrices('X', {})
  }, {
    message: 'Unknown or invalid hotelCode'
  })
})

test('[getStayPrices] Throws when checkinDate is incorrect', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  await t.throwsAsync(async () => {
    await trippe.getStayPrices('ANRAW', {
      checkinDate: '22-11-19'
    })
  }, {
    message: 'Invalid value for checkinDate (should be formatted as YYYY-MM-DD)'
  })
})

function getObjectTypes (obj) {
  return Object.fromEntries(Object.entries(obj)
    .map(([key, value]) => [key, Array.isArray(value) ? 'array' : typeof value])
  )
}
