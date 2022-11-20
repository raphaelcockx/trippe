import got from 'got'
import dayjs from 'dayjs'
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
    this.#headers = {
      'x-ihg-api-key': apiKey
    }
  }

  /**
   * Gets basic info on a hotel
   *
   * @param {string} hotelCode The systemwide id (mnemonic) of the hotel
   * @returns {Promise<Object>}
  */
  getHotelDetails (hotelCode) {
    // Check if hotelCode was provided
    if (!hotelCode) {
      throw new Error('hotelCode is required')
    }

    const headers = this.#headers
    const url = `https://apis.ihg.com/hotels/v1/profiles/${hotelCode}/details?fieldset=brandInfo,profile,address`

    return got.get(url, { headers }).json()
      .then(json => json.hotelInfo)
      .then(hotelInfo => {
        const { brandInfo, profile, address } = hotelInfo

        const { brandCode } = brandInfo
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
          country: address.country.code,
          coordinates: [latLong.longitude, latLong.latitude],
          url: `https://${address.consumerFriendlyURL}`
        }
      })
      .catch((err) => {
        throw new Error(err.code === 'ERR_NON_2XX_3XX_RESPONSE' ? 'Unknown or invalid hotelCode' : err)
      })
  }

  /**
   * Returns an array of prices (in points and in cash) per night for a period of up to 60 days
   *
   * @param {string} hotelId The systemwide id of the hotel
   * @param {object} dates An object containing startDate and endDate keys (both optional)
   * @returns {Promise<Array>}
  */
  getHotelPrices (hotelId, {
    startDate = dayjs().format('YYYY-MM-DD'),
    endDate = dayjs(startDate).add(59, 'day').format('YYYY-MM-DD')
  } = {}) {
    const headers = this.#headers

    // Check if hotelId was provided
    if (!hotelId) {
      throw new Error('hotelId is required')
    }

    // Calculate number of days
    const days = dayjs(endDate).diff(dayjs(startDate), 'day') + 1

    // Check if there's 60 days or less
    if (days > 60) {
      throw new Error('Please limit the number of days to 60 or less')
    }

    const url = `https://apis.ihg.com/availability/v1/windows?hotelCodes=${hotelId.toUpperCase()}&rateCodes=IVANI,IDMAP,IDME0&startDate=${startDate}T00:00:00Z&endDate=${endDate}T00:00:00Z&lengthOfStay=1&numberOfRooms=1&includeSellStrategy=never`
    const dates = [...new Array(days)].map((u, i) => dayjs(startDate).add(i, 'day').format('YYYY-MM-DD'))

    return got.get(url, { headers }).json()
      .then(json => json.hotels[0])
      .then(hotel => {
        const { currencyCode, rates } = hotel

        if (rates.length === 0) {
          throw new Error('Unknown or invalid hotelId')
        } else {
          const ratesCombined = rates.flatMap(rate => rate.windows)

          return dates.map(checkinDate => {
            const points = Math.min(...ratesCombined.filter(rate => rate.startDate === `${checkinDate}T00:00:00Z` && 'totalPoints' in rate).map(rate => rate.totalPoints))
            const cashPrice = Math.min(...ratesCombined.filter(rate => rate.startDate === `${checkinDate}T00:00:00Z` && 'totalAmount' in rate).map(rate => rate.totalAmount))

            return {
              hotelId,
              checkinDate,
              cashPrice: cashPrice < Infinity ? cashPrice : null,
              currencyCode,
              points: points < Infinity ? points : null
            }
          })
        }
      })
  }

  /**
   * Returns an array of prices (in points and in cash) in a search area and for a given night
   *
   * @param {string} centrePoint The point (in [longitude, latitude] notation) to search from
   * @param {object} options An object containing radius, unit and checkinDate parameters (all optional)
   * @returns {Promise<Array>}
  */
  getAreaPrices (coordinates, {
    radius = 100,
    unit = 'mi',
    checkinDate = dayjs().format('YYYY-MM-DD')
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
              count: 1
            },
            {
              otaCode: 'AQC8',
              count: 0
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
        const { hotelMnemonic: hotelId, propertyCurrency: currencyCode, lowestPointsOnlyCost, lowestCashOnlyCost } = hotel

        const cashPrice = parseFloat(lowestCashOnlyCost.amountAfterTax)
        const points = lowestPointsOnlyCost ? lowestPointsOnlyCost.points : null

        return {
          hotelId,
          checkinDate,
          cashPrice,
          currencyCode,
          points
        }
      }))
  }
}
