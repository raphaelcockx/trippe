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
   * Returns an array of lowest prices (in points and in cash) per night for a period of up to 60 days
   *
   * @param {string} hotelCode The systemwide id of the hotel
   * @param {object} dates An object containing startDate and endDate keys (both optional)
   * @returns {Promise<Array>}
  */
  getHotelPrices (hotelCode, {
    startDate = dayjs().format('YYYY-MM-DD'),
    endDate = dayjs(startDate).add(59, 'day').format('YYYY-MM-DD')
  } = {}) {
    const headers = this.#headers

    // Check if hotelCode was provided
    if (!hotelCode) {
      throw new Error('hotelCode is required')
    }

    // Calculate number of days
    const days = dayjs(endDate).diff(dayjs(startDate), 'day') + 1

    // Check if there's 60 days or less
    if (days > 60) {
      throw new Error('Please limit the number of days to 60 or less')
    }

    const url = `https://apis.ihg.com/availability/v1/windows?hotelCodes=${hotelCode.toUpperCase()}&rateCodes=IVANI,IDMAP,IDME0&startDate=${startDate}T00:00:00Z&endDate=${endDate}T00:00:00Z&lengthOfStay=1&numberOfRooms=1&includeSellStrategy=never`
    const dates = [...new Array(days)].map((u, i) => dayjs(startDate).add(i, 'day').format('YYYY-MM-DD'))

    return got.get(url, { headers }).json()
      .then(json => json.hotels[0])
      .then(hotel => {
        const { currencyCode, rates } = hotel

        if (rates.length === 0) {
          throw new Error('Unknown or invalid hotelCode')
        } else {
          const ratesCombined = rates.flatMap(rate => rate.windows)

          return dates.map(checkinDate => {
            const points = Math.min(...ratesCombined.filter(rate => rate.startDate === `${checkinDate}T00:00:00Z` && 'totalPoints' in rate).map(rate => rate.totalPoints))
            const cashPrice = Math.min(...ratesCombined.filter(rate => rate.startDate === `${checkinDate}T00:00:00Z` && 'totalAmount' in rate).map(rate => rate.totalAmount))

            return {
              hotelCode,
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
   * Returns an object containing arrays of available products, available rate plans and available prices
   * (in cash and points) for a specific hotel on specific dates
   *
   * @param {string} hotelCode The systemwide id of the hotel
   * @param {object} dates An object containing checkinDate and checkoutDate (both optional)
   * @returns {Promise<Object>}
  */
  getStayPrices (hotelCode, {
    checkinDate = dayjs().format('YYYY-MM-DD'),
    checkoutDate = dayjs(checkinDate).add(1, 'day').format('YYYY-MM-DD')
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
              count: 1
            },
            {
              otaCode: 'AQC8',
              count: 0
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
          } else if (errors.map((error) => error.code).includes('CRS_50025')) {
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
              productDescription: productDefinition.description.trim(),
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

          const ratePrice = 'rewardNights' in offer ? null : parseFloat(offer.productUses[0].rates.totalRate.average.amountAfterTax)
          const ratePoints = 'rewardNights' in offer
            ? [{
                points: offer.rewardNights.pointsOnly.averageDailyPoints,
                cash: 0
              },
              ...offer.rewardNights.pointsCash.options.map((option) => {
                return {
                  points: option.averageDailyPoints,
                  cash: option.averageDailyCash
                }
              })
              ]
            : null

          return {
            productCode,
            rateCode,
            ratePrice,
            ratePoints
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
        const { hotelMnemonic: hotelCode, propertyCurrency: currencyCode, lowestPointsOnlyCost, lowestCashOnlyCost } = hotel

        const cashPrice = parseFloat(lowestCashOnlyCost.amountAfterTax)
        const points = lowestPointsOnlyCost ? lowestPointsOnlyCost.points : null

        return {
          hotelCode,
          checkinDate,
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
}
