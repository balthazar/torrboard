const __DEV__ = process.env.NODE_ENV !== 'production'

const __APIPORT__ = 3434
const __APIURL__ = `http://media.balthazargronon.com:${__APIPORT__}/graphql`

module.exports = {
  __DEV__,

  __APIPORT__,
  __APIURL__,
}
