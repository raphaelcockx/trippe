import test from 'ava'
import dotenv from 'dotenv'

import Trippe from './src/index.js'

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

test('[getHotelDetails] Throws when no hotelId is provided', (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  t.throws(() => {
    trippe.getHotelDetails()
  }, {
    message: 'hotelId is required'
  })
})

test('[getHotelDetails] Throws when invalid or unknown hotelId is provided', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  await t.throwsAsync(async () => {
    await trippe.getHotelDetails('X')
  }, {
    message: 'Unknown or invalid hotelId'
  })
})

test('[getHotelDetails] Gets correctly formatted hotel details', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)
  const hotelDetails = await trippe.getHotelDetails('ANRAW')

  t.deepEqual(getObjectTypes(hotelDetails), {
    chain: 'string',
    location: 'string',
    country: 'string',
    latitude: 'number',
    longitude: 'number',
    url: 'string'
  })

  t.false(Object.values(hotelDetails).includes(null))
})

test('[getHotelPrices] Throws when no hotelId is provided', (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  t.throws(() => {
    trippe.getHotelPrices()
  }, {
    message: 'hotelId is required'
  })
})

test('[getHotelPrices] Throws when invalid or unknown hotelId is provided', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  await t.throwsAsync(async () => {
    await trippe.getHotelPrices('X', {})
  }, {
    message: 'Unknown or invalid hotelId'
  })
})

test('[getHotelPrices] Throws when more than 60 days are requested', (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  t.throws(() => {
    trippe.getHotelPrices('ANRAW', {
      startDate: '2023-01-01',
      endDate: '2023-12-31'
    })
  }, {
    message: 'Please limit the number of days to 60 or less'
  })
})

test('[getHotelPrices] Gets correctly formatted hotel prices', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)
  const hotelPrices = await trippe.getHotelPrices('ANRAW', {})

  t.is(60, hotelPrices.length)
})

test('[getAreaPrices] Throws when no or invalid coordinates are provided', (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  t.throws(() => {
    trippe.getAreaPrices([])
  }, {
    message: 'Invalid format used for coordinates, please use [lng, lat]'
  })

  t.throws(() => {
    trippe.getAreaPrices([50.5])
  }, {
    message: 'Invalid format used for coordinates, please use [lng, lat]'
  })

  t.throws(() => {
    trippe.getAreaPrices([50.5, '50'])
  }, {
    message: 'Invalid format used for coordinates, please use [lng, lat]'
  })
})

test('[getAreaPrices] Throws when checkinDate is incorrect', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  await t.throwsAsync(async () => {
    await trippe.getAreaPrices([4.39739, 51.22171], {
      checkinDate: '22-11-19'
    })
  }, {
    message: 'Invalid value for checkinDate (should be formatted as YYYY-MM-DD)'
  })
})

test('[getAreaPrices] Gets correctly formatted hotel prices', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)
  const hotelPrices = await trippe.getAreaPrices([4.397955750773747, 51.21847735675646], {})

  t.false(hotelPrices.length === 0)
})

function getObjectTypes (obj) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, typeof value]))
}
