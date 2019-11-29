import React from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import { useQuery } from '@apollo/react-hooks'

import Placeloader from './Placeloader'

const GET_RSS = gql`
  {
    rss {
      title
      link
      category
      seeders
      leechers
      isSerie
      meta {
        title
        resolution
        year
      }
    }
  }
`

export default () => {
  const { loading, error, data } = useQuery(GET_RSS)

  if (loading) {
    return <Placeloader style={{ height: 500, width: '100%' }} />
  }

  return (
    <div>
      {data &&
        data.rss &&
        data.rss.map(item => (
          <div key={item.link}>
            <span>
              {item.meta
                ? `${item.meta.title} ${item.meta.resolution ? `(${item.resolution})` : ''}`
                : item.title}
            </span>
          </div>
        ))}
    </div>
  )
}
