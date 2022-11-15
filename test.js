import test from 'ava'
import dotenv from 'dotenv'

import Trippe from './src/index.js'

test.before('Load environment variables', (t) => {
  dotenv.config()
})

test('Throws when no API key provided', (t) => {
  t.throws(() => {
    // eslint-disable-next-line no-unused-vars
    const trippe = new Trippe()
  }, {
    message: 'apiKey is required'
  })
})

test('Throws when no hotelId is provided to getHotelDetails', (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  t.throws(() => {
    trippe.getHotelDetails()
  }, {
    message: 'hotelId is required'
  })
})

test('Throws when invalid or unknown hotelId is provided to getHotelDetails', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  await t.throwsAsync(async () => {
    await trippe.getHotelDetails('X')
  }, {
    message: 'Unknown or invalid hotelId'
  })
})

test('Gets correctly formatted hotel details', async (t) => {
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

test('Throws when no hotelId is provided to getHotelPrices', (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  t.throws(() => {
    trippe.getHotelPrices()
  }, {
    message: 'hotelId is required'
  })
})

test('Throws when invalid or unknown hotelId is provided to getHotelPrices', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)

  await t.throwsAsync(async () => {
    await trippe.getHotelPrices('X', {})
  }, {
    message: 'Unknown or invalid hotelId'
  })
})

test('Throws when more than 60 days are requested from getHotelPrices', (t) => {
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

test('Gets correctly formatted hotel prices', async (t) => {
  const trippe = new Trippe(process.env.API_KEY)
  const hotelPrices = await trippe.getHotelPrices('ANRAW', {})

  t.is(60, hotelPrices.length)
})

function getObjectTypes (obj) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, typeof value]))
}
