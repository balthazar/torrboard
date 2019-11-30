import React, { useState } from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import get from 'lodash/get'
import { useQuery, useMutation } from '@apollo/react-hooks'

import Placeloader from './Placeloader'

const GET_TORRENTS = gql`
  {
    deluge {
      torrents {
        id
        name
        seeders
        leechers
        eta
        progress
        num_seeds
        num_peers
        ratio
        upload_payload_rate
        download_payload_rate
        time_added
        state
        total_size
      }
    }
  }
`

const Item = styled.div`
  background-color: ${p => p.theme.bg};
  padding: 10px;
  margin: 5px;
  display: flex;
`

export default () => {
  const { loading, data } = useQuery(GET_TORRENTS)

  if (loading) {
    return <Placeloader style={{ height: '100%', width: '100%' }} />
  }

  const list = get(data, 'deluge.torrents', [])

  return (
    <div>
      {list.map(torrent => (
        <Item key={torrent.id}>
          <span>{torrent.name}</span>
        </Item>
      ))}
    </div>
  )
}
