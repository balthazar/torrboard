const __DEV__ = process.env.NODE_ENV !== 'production'

const __APIPORT__ = 3434
const __APIURL__ = __DEV__ ? `http://localhost:${__APIPORT__}` : 'https://media.balthazargronon.com'

module.exports = {
  __DEV__,

  __APIPORT__,
  __APIURL__,
}
