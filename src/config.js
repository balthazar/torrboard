const __DEV__ = process.env.NODE_ENV !== 'production'
const BASE_URL = 'https://media.balthazar.dev'

const __APIPORT__ = 3434
const __APIURL__ = '/graphql'

module.exports = {
  __DEV__,
  __APIPORT__,
  __APIURL__,

  BASE_URL,
  IMAGE_URL: `${BASE_URL}/statics/torrboard.png`,
  DOWNLOAD_URL: 'http://balthazargronon.com',
  SYSTEM_EMAIL: 'media@balthazar.dev',
}
