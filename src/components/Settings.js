import React, { useState } from 'react'
import { useQuery, useMutation } from '@apollo/react-hooks'
import gql from 'graphql-tag'
import styled from 'styled-components'
import { MdAdd, MdRemove } from 'react-icons/md'
import { useToasts } from 'react-toast-notifications'
import get from 'lodash/get'

import Placeloader from './Placeloader'
import Button from './Button'
import Input from './Input'

const Container = styled.div`
  h3 {
    font-size: 13px;
    text-transform: uppercase;
    margin-bottom: 10px;
    &:not(:first-child) {
      margin-top: 30px;
    }
  }
`

const Autos = styled.div`
  display: flex;
  flex-wrap: wrap;

  > * {
    padding: 5px;
    margin: 5px;
    background-color: ${p => p.theme.bg};
    border-radius: 3px;
    display: flex;
    align-items: center;

    span {
      max-width: 300px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  a {
    cursor: pointer;
    margin-right: 10px;
    padding: 5px;

    transition: background-color 250ms ease-in;

    &:hover {
      background-color: ${p => p.theme.opacityDark(0.2)};
    }
  }
`

const InputContainer = styled.div`
  position: relative;
`

const InputIcon = styled.div`
  position: absolute;
  left: 20px;
  top: 15px;
`

const AutoGrabInput = styled.input`
  width: 400px;
  height: 48px;
  padding: 10px 20px 10px 60px;
  font-size: 10pt;
  background-color: ${p => p.theme.bg};
  border-radius: 3px;
  margin-bottom: 10px;
`

const CreateUserContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 300px;

  > * + * {
    margin-top: 10px;
  }
`

const DateInput = styled.input`
  padding: 10px;
  height: 48px;
  background-color: ${p => p.theme.bg};
  border-radius: 3px;
`

const Users = styled.div`
  > * + * {
    margin-top: 10px;
  }
`

const UserInfos = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: ${p => p.theme.bg};

  .status {
    margin-left: auto;
    padding: 2px 4px;
    border-radius: 3px;
    background-color: ${p => p.theme[p.inviteCode ? 'red' : 'green']};
  }

  > * + * {
    margin-left: 10px;
  }
`

const GET_GRABS = gql`
  {
    config {
      autoGrabs
    }
  }
`

const GET_USERS = gql`
  {
    users {
      name
      email
      expires
      inviteCode
      ips {
        value
        lastSeen
      }
    }
  }
`

const SET_GRABS = gql`
  mutation setAutoGrabs($autoGrabs: [String]!) {
    setAutoGrabs(autoGrabs: $autoGrabs)
  }
`

const CREATE_USER = gql`
  mutation createUser($name: String!, $email: String!, $expires: String!) {
    createUser(name: $name, email: $email, expires: $expires)
  }
`

export default () => {
  const [text, setText] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [expires, setExpires] = useState(null)
  const { addToast } = useToasts()

  const { loading: loadingUsers, data: usersData } = useQuery(GET_USERS)

  const { loading: loadingGrabs, data: grabsData } = useQuery(GET_GRABS, {
    pollInterval: 30e3,
  })

  const [setGrabs] = useMutation(SET_GRABS, {
    update(cache, { data }) {
      cache.writeQuery({
        query: GET_GRABS,
        data: { config: { autoGrabs: data.setAutoGrabs, __typename: 'Config' } },
      })
    },
  })

  const [createUserMut] = useMutation(CREATE_USER, {
    onCompleted: () => {
      addToast('User created.', { appearance: 'success' })
      setName('')
      setEmail('')
    },
    onError: err => addToast(err.message, { appearance: 'error' }),
  })

  const grabs = get(grabsData, 'config.autoGrabs')

  const removeGrab = text => {
    setGrabs({ variables: { autoGrabs: grabs.filter(t => t !== text) } })
  }

  const onKeyDown = e => {
    if (e.keyCode === 13) {
      setGrabs({ variables: { autoGrabs: [...grabs, text] } })
      setText('')
    }
  }

  const createUser = () => {
    if (!name || !email || !expires) {
      return addToast('Invalid params.', { appearance: 'error' })
    }

    const variables = { name, email, expires }
    createUserMut({ variables })
  }

  return (
    <Container>
      <h3>{'rss auto grabs'}</h3>
      <InputContainer>
        <InputIcon>
          <MdAdd />
        </InputIcon>
        <AutoGrabInput
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Add a torrent name to auto grab."
        />
      </InputContainer>

      {loadingGrabs ? (
        <Placeloader style={{ width: '100%', height: 100 }} />
      ) : (
        <Autos>
          {grabs.map((text, i) => (
            <span key={i}>
              <a onClick={() => removeGrab(text)}>
                <MdRemove />
              </a>
              <span title={text}>{text}</span>
            </span>
          ))}
        </Autos>
      )}

      <h3>{'users'}</h3>

      {loadingUsers ? (
        <Placeloader style={{ width: '100%', height: 100 }} />
      ) : (
        <Users>
          {get(usersData, 'users', [])
            .filter(u => u.name !== 'master')
            .map(user => (
              <UserInfos inviteCode={user.inviteCode} key={user.name}>
                <span>{user.name}</span>
                <span>({user.email})</span>
                <span className="status">{user.inviteCode ? 'inactive' : 'active'}</span>
              </UserInfos>
            ))}
        </Users>
      )}

      <h3>{'create'}</h3>

      <CreateUserContainer>
        <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="name" />
        <DateInput onChange={e => setExpires(e.target.value)} type="date" />
        <Button onClick={createUser}>create</Button>
      </CreateUserContainer>
    </Container>
  )
}
