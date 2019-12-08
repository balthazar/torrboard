import React, { useState } from 'react'
import gql from 'graphql-tag'
import { useMutation } from '@apollo/react-hooks'
import { useToasts } from 'react-toast-notifications'
import Cookies from 'js-cookie'
import jwt from 'jsonwebtoken'
import { navigate } from '@reach/router'

import { useStore } from '../state'
import Input from './Input'
import GuestContainer from './GuestContainer'
import Logo from './Logo'

const SET_PASSWORD = gql`
  mutation setPassword($inviteCode: String!, $password: String!) {
    setPassword(inviteCode: $inviteCode, password: $password)
  }
`

const LOGIN = gql`
  mutation login($name: String, $password: String!) {
    login(name: $name, password: $password)
  }
`

const apiHandlers = ({
  addToast,
  onError = err => addToast(err.message.replace('GraphQL error: ', ''), { appearance: 'error' }),
  onCompleted = () => {},
}) => ({ onError, onCompleted })

export default ({ inviteCode }) => {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const { addToast } = useToasts()
  const [, dispatch] = useStore()

  const isInvite = !!inviteCode

  const doLogin = (data, fieldName) => {
    const token = data[fieldName]
    Cookies.set('token', token, { expires: 7 })
    const decoded = jwt.decode(token)
    dispatch({ type: 'LOGIN', payload: { ...decoded, token } })
    navigate('/')
  }

  const [setAccountPassword] = useMutation(
    SET_PASSWORD,
    apiHandlers({
      onCompleted: data => {
        addToast('Account activated.', { appearance: 'success' })
        doLogin(data, 'setPassword')
      },
      addToast,
    }),
  )

  const [login, { loading: loginLoading }] = useMutation(
    LOGIN,
    apiHandlers({
      onCompleted: data => {
        addToast("You're in.", { appearance: 'success' })
        doLogin(data, 'login')
      },
      addToast,
    }),
  )

  const onKeyDown = e => {
    const isEnter = e.keyCode === 13
    if (!isEnter) {
      return
    }

    if (isInvite) {
      setAccountPassword({ variables: { inviteCode, password } })
    }

    if (!isInvite && !loginLoading && password) {
      login({
        variables: { name, password },
      })
    }
  }

  return (
    <GuestContainer>
      <Logo />
      {inviteCode ? (
        <>
          <span>{'Welcome to the future.'}</span>
          <Input
            autoFocus
            onChange={e => setPassword(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Password"
          />
        </>
      ) : (
        <>
          <Input autoFocus onChange={e => setName(e.target.value)} placeholder="Name" />
          <Input
            onChange={e => setPassword(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Password "
          />
        </>
      )}
    </GuestContainer>
  )
}
