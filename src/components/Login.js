import React, { useState } from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import { useMutation } from '@apollo/react-hooks'
import { useToasts } from 'react-toast-notifications'
import Cookies from 'js-cookie'
import jwt from 'jsonwebtoken'

import { useStore } from '../state'
import Input from './Input'
import Logo from './Logo'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  position: absolute;
  top: 50%;
  left: 50%;

  transform: translate(-50%, -50%);

  > div:first-child {
    margin-bottom: 30px;
  }

  > input {
    width: 300px;
    & + input {
      margin-top: 10px;
    }
  }
`

const LOGIN = gql`
  mutation login($name: String, $password: String!) {
    login(name: $name, password: $password)
  }
`

export default () => {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const { addToast } = useToasts()
  const [, dispatch] = useStore()

  const [login, { loading }] = useMutation(LOGIN, {
    onError: err => {
      addToast(err.message.replace('GraphQL error: ', ''), { appearance: 'error' })
    },
    onCompleted: data => {
      addToast("You're in.", { appearance: 'success' })
      const token = data.login
      Cookies.set('token', token, { expires: 7 })
      const decoded = jwt.decode(token)
      dispatch({ type: 'LOGIN', payload: { ...decoded, token } })
    },
  })

  const onKeyDown = e => {
    if (e.keyCode === 13 && !loading && password) {
      login({
        variables: { name, password },
      })
    }
  }

  return (
    <Container>
      <Logo />
      <Input autoFocus onChange={e => setName(e.target.value)} placeholder="Name" />
      <Input
        onChange={e => setPassword(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Password "
      />
    </Container>
  )
}
