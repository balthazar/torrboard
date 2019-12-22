const __DEV__ = process.env.NODE_ENV !== 'production'
const { BASE_URL } = process.env

const __APIPORT__ = 3434
const __APIURL__ = '/graphql'

module.exports = {
  __DEV__,

  __APIPORT__,
  __APIURL__,
}
