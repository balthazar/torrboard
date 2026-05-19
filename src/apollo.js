import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import Cookies from 'js-cookie'

import { __APIURL__ } from './config.client'

const httpLink = createHttpLink({ uri: __APIURL__ })

const authLink = setContext((_, { headers }) => {
  const token = Cookies.get('token')

  return {
    headers: {
      ...headers,
      authorization: `Bearer ${token}`,
    },
  }
})

export default new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
})
