import React, { useState } from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import get from 'lodash/get'
import { useQuery, useMutation } from '@apollo/react-hooks'
import {
  IoIosArrowRoundDown,
  IoIosArrowRoundUp,
  IoMdCheckmark,
  IoMdPlay,
  IoMdPause,
} from 'react-icons/io'
import { MdCancel } from 'react-icons/md'
import { FiDelete, FiTrash2 } from 'react-icons/fi'
import { Tooltip } from 'react-tippy'
import { isMobile } from 'react-device-detect'

import SearchInput from './SearchInput'
import Placeloader from './Placeloader'
import convertBytes from '../fn/convertBytes'
import theme from '../theme'

const GET_TORRENTS = gql`
  {
    deluge {
      torrents {
        id
        name
        eta
        progress
        total_seeds
        total_peers
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

const GET_TORRENT_STATES = gql`
  {
    deluge {
      torrents {
        id
        state
        progress
      }
    }
  }
`

const TORRENT_ACTION = gql`
  mutation torrentAction($name: String!, $torrentId: String!, $removeFiles: Boolean) {
    torrentAction(name: $name, torrentId: $torrentId, removeFiles: $removeFiles)
  }
`

const fields = [
  {
    name: 'state',
    width: 20,
    hidden: true,
  },
  {
    name: 'name',
    width: isMobile ? 100 : 300,
  },
  {
    name: 'total_size',
    label: 'Size',
    width: 80,
    fn: convertBytes,
    hide: isMobile,
  },
  {
    name: 'ratio',
    width: 50,
    fn: v => v.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    hide: isMobile,
  },
  {
    name: 'download_payload_rate',
    label: <IoIosArrowRoundDown />,
    width: 80,
    fn: v => (v ? `${convertBytes(v)}/s` : ''),
    hide: isMobile,
  },
  {
    name: 'upload_payload_rate',
    label: <IoIosArrowRoundUp />,
    width: 80,
    fn: v => (v ? `${convertBytes(v)}/s` : ''),
    hide: isMobile,
  },
  {
    name: 'progress',
    label: '%',
    width: 50,
    fn: v => (v === 100 ? '' : v.toLocaleString(undefined, { maximumFractionDigits: 1 })),
    hide: isMobile,
  },
  {
    name: 'eta',
    width: isMobile ? 50 : 80,
    fn: v => (v ? `${(v / 60).toFixed(0)}m` : ''),
  },
  {
    name: 'total_peers',
    label: 'Peers',
    width: 50,
    fn: v => Math.max(0, v),
    hide: isMobile,
  },
  {
    name: 'total_seeds',
    label: 'Seeds',
    width: 50,
    fn: v => Math.max(0, v),
    hide: isMobile,
  },
  {
    name: 'actions',
  },
]

const Item = styled.div`
  ${p => (p.loading ? '' : `padding: 10px 20px;`)};

  margin: 5px;
  display: flex;
  align-items: center;

  ${p =>
    p.heading
      ? `
  font-size: 13px;
  text-transform: uppercase;
  `
      : `

  background-color: ${p.theme.bg};
      `}

  ${() => (isMobile ? 'font-size: 10px' : '')};

  > * + * {
    margin-left: 20px;
  }

  > * {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  > *:first-child {
    display: flex;
  }

  > *:last-child {
    margin-left: auto;
  }
`

const State = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: ${p =>
    p.value === 'Seeding' ? p.theme.blue : p.value === 'Paused' ? 'lightgrey' : p.theme.green};
`

const Actions = styled.span`
  > * {
    cursor: pointer;
  }

  > * + * {
    margin-left: 10px;
  }
`

const actions = [
  { name: 'resume', icon: <IoMdPlay /> },
  { name: 'pause', icon: <IoMdPause /> },
  { name: 'remove', icon: <FiDelete /> },
  { name: 'remove', icon: <FiTrash2 />, extra: { removeFiles: true } },
]

export default () => {
  const [query, setQuery] = useState('')
  const [pendingConfirm, askConfirm] = useState({})
  const { loading, data } = useQuery(GET_TORRENTS, {
    pollInterval: 1e3,
  })

  const [torrentAction] = useMutation(TORRENT_ACTION)

  const list = get(data, 'deluge.torrents', [])
    .filter(t =>
      t.name
        .toLowerCase()
        .replace(/\./g, ' ')
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.time_added - a.time_added)

  return (
    <div>
      <SearchInput onChange={e => setQuery(e.target.value)} style={{ marginBottom: 10 }} />

      <Item heading>
        {fields
          .filter(f => !f.hide)
          .map(({ name, label, width }) => (
            <span key={name} style={{ width }}>
              {name === 'state' ? '' : label || name}
            </span>
          ))}
      </Item>

      {loading &&
        [...Array(20).keys()].map(i => (
          <Item loading="true" key={i}>
            <Placeloader
              time={Math.max(1000, Math.floor(Math.random() * 3000))}
              style={{ width: '100%', height: 40 }}
              key={i}
            />
          </Item>
        ))}

      {list.map(torrent => (
        <Item key={torrent.id}>
          {fields
            .filter(f => !f.hide)
            .map(({ name, fn = f => f, width }) => {
              if (name === 'state') {
                return (
                  <span style={{ width }} key={name}>
                    <State value={torrent.state} />
                  </span>
                )
              }

              const torrentId = torrent.id

              const onClickAction = (name, extra) => {
                if (name === 'remove') {
                  askConfirm(prev => ({
                    ...prev,
                    [torrentId]: { name, extra },
                  }))
                } else {
                  torrentAction({
                    variables: { name, torrentId, ...extra },
                    update(cache) {
                      const cached = cache.readQuery({
                        query: GET_TORRENT_STATES,
                        data: {},
                      })

                      const state =
                        name === 'resume'
                          ? torrent.progress === 100
                            ? 'Seeding'
                            : 'Downloading'
                          : 'Paused'

                      const torrents = cached.deluge.torrents.map(torrent =>
                        torrent.id !== torrentId ? torrent : { ...torrent, state },
                      )

                      cache.writeQuery({
                        query: GET_TORRENT_STATES,
                        data: { deluge: { torrents, __typename: 'Deluge' } },
                      })
                    },
                  })
                }
              }
              const deleteAction = () => {
                const { name, extra } = pendingConfirm[torrentId]
                torrentAction({
                  variables: { name, torrentId, ...extra },
                  update(cache) {
                    const cached = cache.readQuery({
                      query: GET_TORRENT_STATES,
                      data: {},
                    })

                    cache.writeQuery({
                      query: GET_TORRENT_STATES,
                      data: {
                        deluge: {
                          torrents: cached.deluge.torrents.filter(t => t.id !== torrentId),
                          __typename: 'Deluge',
                        },
                      },
                    })
                  },
                })
              }

              if (name === 'actions') {
                return pendingConfirm[torrentId] ? (
                  <Actions key={name}>
                    <Tooltip title="cancel" theme="light">
                      <span onClick={() => askConfirm(prev => ({ ...prev, [torrentId]: null }))}>
                        <MdCancel />
                      </span>
                    </Tooltip>
                    <Tooltip title="confirm" theme="light">
                      <span onClick={deleteAction}>
                        <IoMdCheckmark fill={theme.green} />
                      </span>
                    </Tooltip>
                  </Actions>
                ) : (
                  <Actions key={name}>
                    {actions
                      .filter(({ name }) => {
                        if (name === 'remove') {
                          return true
                        }
                        return (
                          (torrent.state !== 'Paused' && name === 'pause') ||
                          (torrent.state === 'Paused' && name === 'resume')
                        )
                      })
                      .map(({ name, extra, icon }) => (
                        <Tooltip
                          title={
                            name === 'remove' && extra && extra.removeFiles
                              ? `delete & clear`
                              : name
                          }
                          theme="light"
                          key={`${name}-${!!extra}`}
                        >
                          <span onClick={() => onClickAction(name, extra)}>{icon}</span>
                        </Tooltip>
                      ))}
                  </Actions>
                )
              }

              const value = fn(get(torrent, name))

              return (
                <span style={{ width }} title={value} key={name}>
                  {value}
                </span>
              )
            })}
        </Item>
      ))}
    </div>
  )
}
