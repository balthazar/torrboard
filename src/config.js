const { isMobile } = require('react-device-detect')

const __DEV__ = process.env.NODE_ENV !== 'production'

const __APIPORT__ = process.env.PORT || 3000

const BASE_URL = process.env.BASE_URL
const __APIURL__ = `${BASE_URL}/graphql`

module.exports = {
  __DEV__,
  __APIPORT__,
  __APIURL__,

  BASE_URL,
  IMAGE_URL: `${BASE_URL}/statics/torrboard.png`,
  DOWNLOAD_URL: process.env.DOWNLOAD_URL || BASE_URL,
  DOWNLOAD_DIR: process.env.DOWNLOAD_DIR || '/home/media',
  SYSTEM_EMAIL: process.env.SYSTEM_EMAIL || 'media@balthazar.dev',

  TOOLBAR_WIDTH: isMobile ? 50 : 100,
}
