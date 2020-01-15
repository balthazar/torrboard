import React from 'react'
import gql from 'graphql-tag'
import { useQuery } from '@apollo/react-hooks'
import Youtube from 'react-youtube'

import Placeloader from './Placeloader'

const DEFAULT_SIZE = {
  height: 390,
  width: 640,
}

const GET_YOUTUBE_ID = gql`
  query getYtID($query: String!) {
    getYtID(query: $query)
  }
`

export default ({ query, videoSize = DEFAULT_SIZE }) => {
  const { loading, data } = useQuery(GET_YOUTUBE_ID, { variables: { query } })

  if (loading) {
    return <Placeloader style={videoSize} />
  }

  if (!data) {
    return null
  }

  return (
    <Youtube
      videoId={data.getYtID}
      opts={{
        ...videoSize,
        playerVars: { autoplay: 1 },
      }}
    />
  )
}
