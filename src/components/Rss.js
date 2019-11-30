import React, { useState } from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import get from 'lodash/get'
import { useQuery, useMutation } from '@apollo/react-hooks'
import { MdArrowUpward, MdArrowDownward } from 'react-icons/md'
import { FiDownloadCloud } from 'react-icons/fi'
import differenceInMinutes from 'date-fns/differenceInMinutes'
import differenceInHours from 'date-fns/differenceInHours'

import { Filters, FilterValue } from './Filters'
import Placeloader from './Placeloader'
import theme from '../theme'

const GET_RSS = gql`
  {
    rss {
      title
      date
      link
      category
      seeders
      leechers
      isSerie
      meta {
        title
        episode
        season
        resolution
      }
    }
  }
`

const DOWNLOAD = gql`
  mutation download($link: String!) {
    download(link: $link)
  }
`

const Item = styled.div`
  background-color: ${p => p.theme.bg};
  padding: 10px;
  margin: 5px;
  display: flex;
`

const SeedInfo = styled.div`
  margin-left: auto;
  margin-right: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;

  > * {
    display: flex;
    align-items: center;
    justify-content: flex-end;

    > span {
      margin-right: 10px;
    }
  }
`

const DownloadButton = styled.div`
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  background-color: ${p => p.theme.opacityDark(0.2)};
  transition: background-color 250ms ease-in;

  &:hover {
    background-color: ${p => p.theme.opacityDark(0.4)};
  }
`

const Tags = styled.div`
  display: flex;
  margin-top: 10px;

  > * + * {
    margin-left: 10px;
  }
`

const Tag = styled.div`
  background-color: ${p => p.theme.opacityDark(0.2)};
  border-radius: 3px;
  padding: 4px 8px;
`

export default () => {
  const [resolution, setResolution] = useState('1080p')
  const [sortBy, setSort] = useState('seeders')
  const { loading, data } = useQuery(GET_RSS)
  const [download] = useMutation(DOWNLOAD)

  if (loading) {
    return <Placeloader style={{ height: '100%', width: '100%' }} />
  }

  const list = get(data, 'rss', [])
    .filter(i => (resolution ? get(i, 'meta.resolution') === resolution : true))
    .sort((a, b) =>
      sortBy === 'seeders' ? b.seeders - a.seeders : new Date(b.date) - new Date(a.date),
    )

  return (
    <div>
      <Filters>
        <div>
          {['seeders', 'time'].map(value => (
            <FilterValue active={sortBy === value} key={value} onClick={() => setSort(value)}>
              {value}
            </FilterValue>
          ))}
        </div>

        <div>
          {['480p', '720p', '1080p'].map(value => (
            <FilterValue
              active={resolution === value}
              key={value}
              onClick={() => setResolution(resolution === value ? null : value)}
            >
              {value}
            </FilterValue>
          ))}
        </div>
      </Filters>

      {list.map(item => {
        const title = get(item, 'meta.title', item.title)
        const episode = get(item, 'meta.episode')
        const season = get(item, 'meta.season')
        const diffMin = differenceInMinutes(new Date(), new Date(item.date))
        const diff =
          diffMin > 60 ? `${differenceInHours(new Date(), new Date(item.date))}h` : `${diffMin}min`

        const { link } = item

        return (
          <Item key={item.link}>
            <div>
              <span>
                {title}
                {episode ? ` (${season ? `S${season} ` : ''}E${episode})` : ''}
              </span>
              <Tags>
                <Tag>{item.category}</Tag>
                {get(item, 'meta.resolution') && <Tag>{item.meta.resolution}</Tag>}
                <Tag>{diff}</Tag>
              </Tags>
            </div>

            <SeedInfo>
              <span>
                <span>{item.seeders}</span>
                <MdArrowUpward fill={theme.green} />
              </span>
              <span>
                <span>{item.leechers}</span>
                <MdArrowDownward fill={theme.red} />
              </span>
            </SeedInfo>

            <DownloadButton onClick={() => download({ variables: { link } })}>
              <FiDownloadCloud />
            </DownloadButton>
          </Item>
        )
      })}
    </div>
  )
}
