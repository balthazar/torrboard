import React from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import get from 'lodash/get'
import { useQuery, useMutation } from '@apollo/react-hooks'
import { IoIosArrowRoundDown, IoIosArrowRoundUp, IoMdPlay, IoMdPause } from 'react-icons/io'
import { FiDelete, FiTrash2 } from 'react-icons/fi'
import { Tooltip } from 'react-tippy'

import Placeloader from './Placeloader'
import convertBytes from '../fn/convertBytes'

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
    width: 300,
  },
  {
    name: 'total_size',
    label: 'Size',
    width: 80,
    fn: convertBytes,
  },
  {
    name: 'ratio',
    width: 50,
    fn: v => v.toLocaleString(undefined, { maximumFractionDigits: 2 }),
  },
  {
    name: 'download_payload_rate',
    label: <IoIosArrowRoundDown />,
    width: 80,
    fn: v => (v ? `${convertBytes(v)}/s` : ''),
  },
  {
    name: 'upload_payload_rate',
    label: <IoIosArrowRoundUp />,
    width: 80,
    fn: v => (v ? `${convertBytes(v)}/s` : ''),
  },
  {
    name: 'progress',
    label: '%',
    width: 50,
    fn: v => (v === 100 ? '' : v.toLocaleString(undefined, { maximumFractionDigits: 1 })),
  },
  {
    name: 'eta',
    width: 80,
    fn: v => (v ? `${(v / 60).toFixed(0)}m` : ''),
  },
  {
    name: 'total_peers',
    label: 'Peers',
    width: 50,
    fn: v => Math.max(0, v),
  },
  {
    name: 'total_seeds',
    label: 'Seeds',
    width: 50,
    fn: v => Math.max(0, v),
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
  const { loading, data } = useQuery(GET_TORRENTS, {
    pollInterval: 1e3,
  })

  const [torrentAction] = useMutation(TORRENT_ACTION)

  const list = get(data, 'deluge.torrents', []).sort((a, b) => b.time_added - a.time_added)

  return (
    <div>
      <Item heading>
        {fields.map(({ name, label, width }) => (
          <span key={name} style={{ width }}>
            {name === 'state' ? '' : label || name}
          </span>
        ))}
      </Item>

      {loading &&
        [...Array(20).keys()].map(i => (
          <Item loading="true" key={i}>
            <Placeloader style={{ width: '100%', height: 40 }} key={i} />
          </Item>
        ))}

      {list.map(torrent => (
        <Item key={torrent.id}>
          {fields.map(({ name, fn = f => f, width }) => {
            if (name === 'state') {
              return (
                <span style={{ width }} key={name}>
                  <State value={torrent.state} />
                </span>
              )
            }

            const torrentId = torrent.id

            if (name === 'actions') {
              return (
                <Actions key={name}>
                  {actions.map(({ name, extra, icon }) => (
                    <Tooltip
                      title={
                        name === 'remove' && extra && extra.removeFiles ? `delete & clear` : name
                      }
                      key={`${name}-${!!extra}`}
                    >
                      <span
                        onClick={() => torrentAction({ variables: { name, torrentId, ...extra } })}
                      >
                        {icon}
                      </span>
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
