import React, { useState } from 'react'
import { useQuery, useMutation } from '@apollo/react-hooks'
import gql from 'graphql-tag'
import styled from 'styled-components'
import { MdAdd, MdRemove } from 'react-icons/md'

import Placeloader from './Placeloader'

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
  flex-direction: column;

  a {
    cursor: pointer;
    margin-right: 10px;
    padding: 10px;

    transition: background-color 250ms ease-in;

    &:hover {
      background-color: ${p => p.theme.opacityDark(0.2)};
    }
  }

  > * {
    padding: 10px;
    background-color: ${p => p.theme.bg};
    border-radius: 3px;
    display: flex;
    align-items: center;
  }

  > * + * {
    margin-top: 10px;
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

const Input = styled.input`
  width: 400px;
  height: 48px;
  padding: 10px 20px 10px 60px;
  font-size: 10pt;
  background-color: ${p => p.theme.bg};
  border-radius: 3px;
  margin-bottom: 10px;
`

const GET_GRABS = gql`
  {
    config {
      autoGrabs
    }
  }
`

const SET_GRABS = gql`
  mutation setAutoGrabs($autoGrabs: [String]!) {
    setAutoGrabs(autoGrabs: $autoGrabs)
  }
`

export default () => {
  const { loading, data } = useQuery(GET_GRABS, {
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

  const [text, setText] = useState('')

  if (loading) {
    return <Placeloader style={{ width: '100%', height: '100%' }} />
  }

  const grabs = data.config.autoGrabs
  const removeGrab = text => {
    setGrabs({ variables: { autoGrabs: grabs.filter(t => t !== text) } })
  }

  const onKeyDown = e => {
    if (e.keyCode === 13) {
      setGrabs({ variables: { autoGrabs: [...grabs, text] } })
      setText('')
    }
  }

  return (
    <Container>
      <h3>{'rss auto grabs'}</h3>
      <InputContainer>
        <InputIcon>
          <MdAdd />
        </InputIcon>
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Add a torrent name to auto grab."
        />
      </InputContainer>

      <Autos>
        {grabs.map((text, i) => (
          <span key={i}>
            <a onClick={() => removeGrab(text)}>
              <MdRemove />
            </a>
            <span>{text}</span>
          </span>
        ))}
      </Autos>

      <h3>{'invites'}</h3>
    </Container>
  )
}
