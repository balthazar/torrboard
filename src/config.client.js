import { isMobile } from 'react-device-detect'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

export const __APIURL__ = `${BASE_URL}/graphql`
export { BASE_URL }
export const IMAGE_URL = `${BASE_URL}/statics/torrboard.png`
export const DOWNLOAD_URL = process.env.DOWNLOAD_URL || BASE_URL
export const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || '/home/media'

export const TOOLBAR_WIDTH = isMobile ? 50 : 100
