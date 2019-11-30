import React, { useState } from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import get from 'lodash/get'
import { useQuery, useMutation } from '@apollo/react-hooks'
import Youtube from 'react-youtube'

import Placeloader from './Placeloader'

const GET_TORRENTS = gql`
  {
    deluge {
      torrents {
        id
        name
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

        meta {
          title
        }
      }
    }
  }
`

const GET_YOUTUBE_ID = gql`
  query getYtID($query: String!) {
    getYtID(query: $query)
  }
`

const Item = styled.div`
  background-color: ${p => p.theme.bg};
  padding: 10px;
  margin: 5px;
  display: flex;
`

const VideoDisplay = ({ query }) => {
  if (!query) {
    return
  }

  const { loading, data } = useQuery(GET_YOUTUBE_ID, { variables: { query } })

  if (loading) {
    return <Placeloader style={{ height: 390, width: 640 }} />
  }

  console.log(data)

  return (
    <Youtube
      videoId={'7YZzYeBartM'}
      opts={{
        height: '390',
        width: '640',
        playerVars: { autoplay: 1 },
      }}
    />
  )
}

export default () => {
  const { loading, data } = useQuery(GET_TORRENTS)
  const [selected, selectItem] = useState(null)

  if (loading) {
    return <Placeloader style={{ height: '100%', width: '100%' }} />
  }

  const list = get(data, 'deluge.torrents', []).sort((a, b) => b.time_added - a.time_added)

  return (
    <div>
      {list.map(torrent => (
        <Item onClick={() => selectItem(torrent.id)} key={torrent.id}>
          <span>{torrent.name}</span>
          {selected === torrent.id && <VideoDisplay query={get(torrent, 'meta.title')} />}
        </Item>
      ))}
    </div>
  )
}
