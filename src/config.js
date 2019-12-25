const __DEV__ = process.env.NODE_ENV !== 'production'

const __APIPORT__ = 3434

const BASE_URL = 'https://media.balthazar.dev'
const __APIURL__ = `${BASE_URL}/graphql`

module.exports = {
  __DEV__,
  __APIPORT__,
  __APIURL__,

  BASE_URL,
  IMAGE_URL: `${BASE_URL}/statics/torrboard.png`,
  DOWNLOAD_URL: 'http://balthazargronon.com',
  DOWNLOAD_DIR: '/home/media',
  SYSTEM_EMAIL: 'media@balthazar.dev',
}
