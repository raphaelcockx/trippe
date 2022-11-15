import test from 'ava'
import dotenv from 'dotenv'

import Trippe from './src/index.js'

test('Throws when no API key provided', (t) => {
  t.throws(() => {
    // eslint-disable-next-line no-unused-vars
    const trippe = new Trippe()
  }, {
    message: 'apiKey is required'
  })
})

test('Throws when no hotelId is provided to getHotelDetails', (t) => {
  // Load environment variables
  dotenv.config()

  const trippe = new Trippe(process.env.API_KEY)

  t.throws(() => {
    trippe.getHotelDetails()
  }, {
    message: 'hotelId is required'
  })
})

test('Throws when invalid or unknown hotelId is provided to getHotelDetails', async (t) => {
  // Load environment variables
  dotenv.config()

  const trippe = new Trippe(process.env.API_KEY)

  await t.throwsAsync(async () => {
    await trippe.getHotelDetails('X')
  }, {
    message: 'Unknown or invalid hotelId'
  })
})

test('Gets correct hotel details', async (t) => {
  // Load environment variables
  dotenv.config()

  const trippe = new Trippe(process.env.API_KEY)
  const hotelDetails = await trippe.getHotelDetails('ANRAW')

  t.deepEqual(hotelDetails, {
    chain: 'Hotel Indigo',
    location: 'Antwerp - City Centre',
    country: 'BE',
    latitude: 51.218943,
    longitude: 4.42057,
    url: 'https://www.hotelindigo.com/antwerp'
  })
})
