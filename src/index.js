import got from 'got'
import dayjs from 'dayjs'

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
   * @param {string} hotelId The systemwide id of the hotel
   * @returns {Promise<Object>}
  */
  getHotelDetails (hotelId) {
    const headers = this.#headers
    const url = `https://apis.ihg.com/hotels/v1/profiles/${hotelId}/details?fieldset=brandInfo,profile,address`

    return got.get(url, { headers }).json()
      .then(json => json.hotelInfo)
      .then(hotelInfo => {
        const { brandInfo, profile, address } = hotelInfo
        return {
          chain: brandInfo.brandName,
          location: profile.name,
          country: address.country.code,
          latitude: profile.latLong.latitude,
          longitude: profile.latLong.longitude,
          url: `https://${address.consumerFriendlyURL}`
        }
      })
  }

  /**
   * Returns an array of prices (in points and in cash) per night for a period of up to 60 days
   *
   * @param {string} hotelId The systemwide id of the hotel
   * @param {object} dates An object containing startDate and endDate keys (both optional)
   * @returns {Promise<Array>}
  */

  getPrices (hotelId, {
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
      })
  }
}
