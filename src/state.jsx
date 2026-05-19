import React, { createContext, useContext, useReducer } from 'react'
import Cookies from 'js-cookie'

import decodeToken from './fn/decodeToken'

export const StateContext = createContext()

const createReducer = handlers => (state, action) => {
  if (!handlers.hasOwnProperty(action.type)) {
    return state
  }

  return handlers[action.type](state, action)
}

const reducer = createReducer({
  LOGIN: (state, { payload }) => ({
    ...state,
    user: payload,
  }),
  LOGOUT: state => ({ ...state, user: null }),
})

const getUser = () => {
  const token = Cookies.get('token')

  const decoded = decodeToken(token)
  return decoded ? { ...decoded, token } : null
}

const initialState = {
  user: getUser(),
}

export const StoreProvider = ({ children }) => (
  <StateContext.Provider value={useReducer(reducer, initialState)}>
    {children}
  </StateContext.Provider>
)

export const useStore = () => useContext(StateContext)
