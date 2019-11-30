import React, { useState } from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import get from 'lodash/get'
import { useQuery, useMutation } from '@apollo/react-hooks'
import { MdArrowUpward, MdArrowDownward, MdCheck } from 'react-icons/md'
import { FiDownloadCloud } from 'react-icons/fi'
import differenceInMinutes from 'date-fns/differenceInMinutes'
import differenceInHours from 'date-fns/differenceInHours'
import Youtube from 'react-youtube'

import { Filters, FilterValue } from './Filters'
import Placeloader from './Placeloader'
import theme from '../theme'

const GET_YOUTUBE_ID = gql`
  query getYtID($query: String!) {
    getYtID(query: $query)
  }
`

const GET_RSS = gql`
  {
    deluge {
      torrents {
        name
      }
    }

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
        year
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
  ${p => (p.loading ? '' : `padding: 10px;`)};
  background-color: ${p => p.theme.bg};
  margin: 5px;

  > div:first-child {
    cursor: pointer;
  }

  > div {
    display: flex;
  }
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

  ${p =>
    !p.disabled
      ? `
  cursor: pointer;
  background-color: ${p.theme.opacityDark(0.2)};
  transition: background-color 250ms ease-in;

  &:hover {
    background-color: ${p.theme.opacityDark(0.4)};
  }
`
      : ''}
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

const ExtraContent = styled.div`
  margin-top: 20px;
  height: 400px;
`

const VideoDisplay = ({ query }) => {
  if (!query) {
    return
  }

  const { loading, data } = useQuery(GET_YOUTUBE_ID, { variables: { query } })

  if (loading) {
    return <Placeloader style={{ height: '100%', width: '100%' }} />
  }

  return (
    <Youtube
      videoId={data.getYtID}
      opts={{
        height: '390',
        width: '640',
        playerVars: { autoplay: 1 },
      }}
    />
  )
}

export default () => {
  const [resolution, setResolution] = useState('1080p')
  const [sortBy, setSort] = useState('seeders')
  const [selected, selectItem] = useState(null)
  const { loading, data } = useQuery(GET_RSS, {
    pollInterval: 20e3,
  })

  const [download] = useMutation(DOWNLOAD)

  const activeTorrents = get(data, 'deluge.torrents', []).reduce(
    (acc, cur) => ((acc[cur.name.replace(/\.[A-z]+$/, '')] = 1), acc),
    {},
  )

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

      {loading &&
        [...Array(20).keys()].map(i => (
          <Item loading="true" key={i}>
            <Placeloader style={{ width: '100%', height: 78 }} key={i} />
          </Item>
        ))}

      {list.map(item => {
        const title = get(item, 'meta.title', item.title)
        const episode = get(item, 'meta.episode')
        const season = get(item, 'meta.season')
        const diffMin = differenceInMinutes(new Date(), new Date(item.date))
        const diff =
          diffMin > 60 ? `${differenceInHours(new Date(), new Date(item.date))}h` : `${diffMin}min`

        const { link } = item
        const already = activeTorrents[item.title.replace(/ /g, '.').replace(/\.[A-z]+$/, '')]

        return (
          <Item key={item.link}>
            <div onClick={() => selectItem(selected === item.link ? null : item.link)}>
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

              <DownloadButton
                disabled={already}
                onClick={() => !already && download({ variables: { link } })}
              >
                {already ? <MdCheck /> : <FiDownloadCloud />}
              </DownloadButton>
            </div>

            {item.link === selected && (
              <ExtraContent>
                <VideoDisplay query={`${title} ${episode ? 'series' : ''}`} />
              </ExtraContent>
            )}
          </Item>
        )
      })}
    </div>
  )
}
