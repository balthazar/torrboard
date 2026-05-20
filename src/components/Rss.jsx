import React, { useState } from 'react'
import styled from 'styled-components'
import { gql, useQuery, useMutation } from '@apollo/client'
import get from 'lodash/get'
import { MdCheck } from 'react-icons/md'
import { FiDownloadCloud } from 'react-icons/fi'
import { IoIosArrowRoundUp, IoIosArrowRoundDown } from 'react-icons/io'
import differenceInMinutes from 'date-fns/differenceInMinutes'
import differenceInHours from 'date-fns/differenceInHours'

import { FilterValue } from './Filters'
import Placeloader from './Placeloader'
import VideoDisplay from './VideoDisplay'

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

const ControlBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: ${p => p.theme.spacing[5]};
  margin: ${p => p.theme.spacing[3]} 0;
`

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing[2]};
`

const ControlLabel = styled.span`
  font-size: ${p => p.theme.font.size.xs};
  font-weight: ${p => p.theme.font.weight.semibold};
  letter-spacing: ${p => p.theme.font.tracking.wider};
  text-transform: uppercase;
  color: ${p => p.theme.colors.textSubtle};
`

const ControlPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${p => p.theme.spacing[2]};
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing[2]};
  margin-top: ${p => p.theme.spacing[3]};
`

const Item = styled.div`
  background-color: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.md};
  overflow: hidden;
  transition: border-color ${p => p.theme.motion.fast};

  &:hover {
    border-color: ${p => p.theme.colors.borderHover};
  }
`

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing[4]};
  padding: ${p => p.theme.spacing[3]} ${p => p.theme.spacing[4]};
  cursor: pointer;
`

const ItemMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing[2]};
`

const ItemTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing[2]};
  font-size: ${p => p.theme.font.size.sm};
  font-weight: ${p => p.theme.font.weight.medium};
  color: ${p => p.theme.colors.text};
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const EpisodeBadge = styled.span`
  font-family: ${p => p.theme.font.mono};
  font-size: ${p => p.theme.font.size.xs};
  color: ${p => p.theme.colors.textSubtle};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.sm};
  padding: 2px 6px;
  flex-shrink: 0;
`

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${p => p.theme.spacing[2]};
  font-family: ${p => p.theme.font.mono};
  font-size: ${p => p.theme.font.size.xs};
  color: ${p => p.theme.colors.textSubtle};
  letter-spacing: ${p => p.theme.font.tracking.wide};
  text-transform: uppercase;
`

const Tag = styled.span``

const Sep = styled.span`
  color: ${p => p.theme.colors.borderHover};
`

const SeedInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: ${p => p.theme.font.mono};
  font-size: ${p => p.theme.font.size.xs};
  align-items: flex-end;

  > span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
`

const Seeders = styled.span`
  color: ${p => p.theme.colors.success};
`

const Leechers = styled.span`
  color: ${p => p.theme.colors.error};
`

const DownloadButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${p => p.theme.radii.full};
  flex-shrink: 0;
  cursor: ${p => (p.$disabled ? 'default' : 'pointer')};
  transition: background-color ${p => p.theme.motion.fast},
    color ${p => p.theme.motion.fast};

  ${p =>
    p.$disabled
      ? `
    background-color: ${p.theme.colors.success}26;
    color: ${p.theme.colors.success};
  `
      : `
    background-color: ${p.theme.colors.surfaceHover};
    color: ${p.theme.colors.textMuted};

    &:hover {
      background-color: ${p.theme.colors.accent};
      color: #fff;
    }
  `}
`

const ExtraContent = styled.div`
  margin: 0 ${p => p.theme.spacing[4]} ${p => p.theme.spacing[4]};
  border-top: 1px solid ${p => p.theme.colors.border};
  padding-top: ${p => p.theme.spacing[4]};
  display: flex;
  justify-content: center;
`

const SkeletonRow = styled.div`
  border-radius: ${p => p.theme.radii.md};
  background-color: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  padding: ${p => p.theme.spacing[3]};
`

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
    .slice()
    .filter(i => (resolution ? get(i, 'meta.resolution') === resolution : true))
    .sort((a, b) =>
      sortBy === 'seeders' ? b.seeders - a.seeders : new Date(b.date) - new Date(a.date),
    )

  return (
    <div>
      <ControlBar>
        <ControlGroup>
          <ControlLabel>Sort by</ControlLabel>
          <ControlPills>
            {['seeders', 'time'].map(value => (
              <FilterValue $active={sortBy === value} key={value} onClick={() => setSort(value)}>
                {value}
              </FilterValue>
            ))}
          </ControlPills>
        </ControlGroup>

        <ControlGroup>
          <ControlLabel>Resolution</ControlLabel>
          <ControlPills>
            {['480p', '720p', '1080p'].map(value => (
              <FilterValue
                $active={resolution === value}
                key={value}
                onClick={() => setResolution(resolution === value ? null : value)}
              >
                {value}
              </FilterValue>
            ))}
          </ControlPills>
        </ControlGroup>
      </ControlBar>

      <List>
        {loading &&
          [...Array(20).keys()].map(i => (
            <SkeletonRow key={i}>
              <Placeloader
                time={Math.max(1000, Math.floor(Math.random() * 3000))}
                style={{ width: '100%', height: 36 }}
              />
            </SkeletonRow>
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
          const isOpen = selected === link

          return (
            <Item key={link}>
              <ItemRow onClick={() => selectItem(isOpen ? null : link)}>
                <ItemMain>
                  <ItemTitle>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
                    {episode && (
                      <EpisodeBadge>
                        {season ? `S${season} ` : ''}E{episode}
                      </EpisodeBadge>
                    )}
                  </ItemTitle>
                  <Tags>
                    <Tag>{item.category}</Tag>
                    {get(item, 'meta.resolution') && (
                      <>
                        <Sep>·</Sep>
                        <Tag>{item.meta.resolution}</Tag>
                      </>
                    )}
                    <Sep>·</Sep>
                    <Tag>{diff}</Tag>
                  </Tags>
                </ItemMain>

                <SeedInfo>
                  <Seeders>
                    <IoIosArrowRoundUp size={14} />
                    {item.seeders}
                  </Seeders>
                  <Leechers>
                    <IoIosArrowRoundDown size={14} />
                    {item.leechers}
                  </Leechers>
                </SeedInfo>

                <DownloadButton
                  $disabled={!!already}
                  onClick={e => {
                    e.stopPropagation()
                    if (already) return
                    download({ variables: { link } })
                  }}
                  aria-label={already ? 'Already downloaded' : 'Download'}
                >
                  {already ? <MdCheck size={20} /> : <FiDownloadCloud size={20} />}
                </DownloadButton>
              </ItemRow>

              {isOpen && (
                <ExtraContent>
                  <VideoDisplay query={`${title} ${episode ? 'series' : ''}`} />
                </ExtraContent>
              )}
            </Item>
          )
        })}
      </List>
    </div>
  )
}
