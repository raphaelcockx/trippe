import got from 'got'

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

  getHotelDetails (id) {
    const headers = this.#headers
    const url = `https://apis.ihg.com/hotels/v1/profiles/${id}/details?fieldset=brandInfo,profile,address`

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
}
