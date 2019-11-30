import React, { useState } from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import get from 'lodash/get'
import { useQuery, useMutation } from '@apollo/react-hooks'

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
    label: 'DownSpeed',
    width: 80,
    fn: v => (v ? `${convertBytes(v)}/s` : ''),
  },
  {
    name: 'upload_payload_rate',
    label: 'UpSpeed',
    width: 80,
    fn: v => (v ? `${convertBytes(v)}/s` : ''),
  },
  {
    name: 'eta',
    width: 80,
    fn: v => (v ? v : ''),
  },
  {
    name: 'total_peers',
    width: 80,
    // fn: v => (v ? v : ''),
  },
  {
    name: 'total_seeds',
    width: 80,
    // fn: v => (v ? v : ''),
  },
]

const Item = styled.div`
  padding: 10px 20px;
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

export default () => {
  const { loading, data } = useQuery(GET_TORRENTS)

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
          <Item key={i}>
            <Placeloader style={{ width: '100%', height: 20 }} key={i} />
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
