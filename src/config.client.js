import { isMobile } from 'react-device-detect'
import config from './config'

export const {
  __APIURL__,
  BASE_URL,
  IMAGE_URL,
  DOWNLOAD_URL,
  DOWNLOAD_DIR,
} = config

export const TOOLBAR_WIDTH = isMobile ? 50 : 100
