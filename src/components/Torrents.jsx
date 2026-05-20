import React, { useState } from 'react'
import styled from 'styled-components'
import get from 'lodash/get'
import { gql, useQuery, useMutation } from '@apollo/client'
import {
  IoIosArrowRoundDown,
  IoIosArrowRoundUp,
  IoMdCheckmark,
  IoMdPlay,
  IoMdPause,
} from 'react-icons/io'
import { MdCancel } from 'react-icons/md'
import { FiDelete, FiTrash2 } from 'react-icons/fi'
import Tippy from '@tippyjs/react'
import { isMobile } from 'react-device-detect'

import SearchInput from './SearchInput'
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

const stateColor = (state, theme) => {
  if (state === 'Seeding') return theme.colors.accent
  if (state === 'Paused') return theme.colors.textSubtle
  if (state === 'Downloading') return theme.colors.success
  return theme.colors.warning
}



const ratesFmt = v => (v ? `${convertBytes(v)}/s` : '')
const percentFmt = v => (v === 100 || v == null ? '' : `${Number(v).toFixed(0)}%`)
const ratioFmt = v => (v == null ? '' : Number(v).toFixed(2))
const etaFmt = v => (v ? `${(v / 60).toFixed(0)}m` : '')
const nonneg = v => Math.max(0, Number(v) || 0)

const columns = [
  { key: 'name', label: 'Name', size: 'minmax(0, 1fr)', mono: false },
  { key: 'total_size', label: 'Size', size: '80px', fn: convertBytes, hide: isMobile },
  { key: 'ratio', label: 'Ratio', size: '60px', fn: ratioFmt, hide: isMobile },
  {
    key: 'download_payload_rate',
    label: <IoIosArrowRoundDown size={16} />,
    size: '90px',
    fn: ratesFmt,
    hide: isMobile,
  },
  {
    key: 'upload_payload_rate',
    label: <IoIosArrowRoundUp size={16} />,
    size: '90px',
    fn: ratesFmt,
    hide: isMobile,
  },
  { key: 'progress', label: '%', size: '50px', fn: percentFmt, hide: isMobile },
  { key: 'eta', label: 'ETA', size: '70px', fn: etaFmt },
  { key: 'total_peers', label: 'Peers', size: '50px', fn: nonneg, hide: isMobile },
  { key: 'total_seeds', label: 'Seeds', size: '50px', fn: nonneg, hide: isMobile },
  { key: 'actions', label: '', size: '160px' },
]

const visibleColumns = columns.filter(c => !c.hide)
const gridTemplate = visibleColumns.map(c => c.size).join(' ')

const Heading = styled.div`
  display: grid;
  grid-template-columns: ${gridTemplate};
  gap: ${p => p.theme.spacing[4]};
  padding: ${p => p.theme.spacing[2]} ${p => p.theme.spacing[4]};
  margin-bottom: ${p => p.theme.spacing[1]};
  font-size: ${p => p.theme.font.size.xs};
  font-weight: ${p => p.theme.font.weight.semibold};
  letter-spacing: ${p => p.theme.font.tracking.wider};
  text-transform: uppercase;
  color: ${p => p.theme.colors.textSubtle};
  border-bottom: 1px solid ${p => p.theme.colors.border};
`

const HeadingCell = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const Row = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: ${gridTemplate};
  gap: ${p => p.theme.spacing[4]};
  align-items: center;
  padding: ${p => p.theme.spacing[2]} ${p => p.theme.spacing[4]};
  margin-bottom: ${p => p.theme.spacing[1]};
  border-radius: ${p => p.theme.radii.md};
  background-color: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  font-size: ${p => p.theme.font.size.sm};
  transition: background-color ${p => p.theme.motion.fast},
    border-color ${p => p.theme.motion.fast};
  overflow: hidden;

  &:hover {
    border-color: ${p => p.theme.colors.borderHover};
  }

  /* state indicator (left bar) */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: ${p => stateColor(p.$state, p.theme)};
  }

  /* progress fill */
  &::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 0;
    bottom: 0;
    width: ${p => (p.$progress >= 100 ? 0 : p.$progress)}%;
    background-color: ${p => p.theme.colors.accent};
    opacity: 0.06;
    pointer-events: none;
    transition: width ${p => p.theme.motion.slow};
  }
`

const Cell = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  position: relative;
  z-index: 1;
  font-family: ${p => (p.$mono ? p.theme.font.mono : 'inherit')};
  color: ${p => (p.$primary ? p.theme.colors.text : p.theme.colors.textMuted)};
`

const Actions = styled.span`
  display: flex;
  justify-content: flex-end;
  gap: ${p => p.theme.spacing[1]};
  position: relative;
  z-index: 1;
`

const ActionButton = styled.span`
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${p => p.theme.radii.full};
  color: ${p => p.theme.colors.textMuted};
  cursor: pointer;
  transition: background-color ${p => p.theme.motion.fast},
    color ${p => p.theme.motion.fast};

  &:hover {
    background-color: ${p => p.theme.colors.surfaceActive};
    color: ${p => (p.$danger ? p.theme.colors.error : p.theme.colors.text)};
  }
`

const ConfirmActions = styled.span`
  display: flex;
  justify-content: flex-end;
  gap: ${p => p.theme.spacing[1]};
  position: relative;
  z-index: 1;
  font-family: ${p => p.theme.font.mono};
  font-size: ${p => p.theme.font.size.xs};
  text-transform: uppercase;
  color: ${p => p.theme.colors.textMuted};
`

const ConfirmText = styled.span`
  align-self: center;
  margin-right: ${p => p.theme.spacing[2]};
  letter-spacing: ${p => p.theme.font.tracking.wide};
`

const SkeletonRow = styled.div`
  margin-bottom: ${p => p.theme.spacing[1]};
  border-radius: ${p => p.theme.radii.md};
  background-color: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  padding: ${p => p.theme.spacing[2]} ${p => p.theme.spacing[4]};
`

const actionDefs = [
  { name: 'resume', icon: <IoMdPlay size={16} />, tip: 'Resume' },
  { name: 'pause', icon: <IoMdPause size={16} />, tip: 'Pause' },
  { name: 'remove', icon: <FiDelete size={16} />, tip: 'Remove' },
  {
    name: 'remove',
    icon: <FiTrash2 size={16} />,
    extra: { removeFiles: true },
    tip: 'Remove & delete files',
    danger: true,
  },
]

export default () => {
  const [query, setQuery] = useState('')
  const [pendingConfirm, askConfirm] = useState({})
  const { loading, data } = useQuery(GET_TORRENTS, {
    pollInterval: 1e3,
  })

  const [torrentAction] = useMutation(TORRENT_ACTION)

  const list = get(data, 'deluge.torrents', [])
    .slice()
    .filter(t =>
      t.name
        .toLowerCase()
        .replace(/\./g, ' ')
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.time_added - a.time_added)

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <SearchInput onChange={e => setQuery(e.target.value)} />
      </div>

      <Heading>
        {visibleColumns.map(col => (
          <HeadingCell key={col.key}>{col.label}</HeadingCell>
        ))}
      </Heading>

      {loading &&
        [...Array(20).keys()].map(i => (
          <SkeletonRow key={i}>
            <Placeloader
              time={Math.max(1000, Math.floor(Math.random() * 3000))}
              style={{ width: '100%', height: 20 }}
            />
          </SkeletonRow>
        ))}

      {list.map(torrent => {
        const torrentId = torrent.id
        const isConfirming = !!pendingConfirm[torrentId]

        const onClickAction = (name, extra) => {
          if (name === 'remove') {
            askConfirm(prev => ({ ...prev, [torrentId]: { name, extra } }))
          } else {
            torrentAction({
              variables: { name, torrentId, ...extra },
              update(cache) {
                const cached = cache.readQuery({ query: GET_TORRENT_STATES, data: {} })
                const newState =
                  name === 'resume'
                    ? torrent.progress === 100
                      ? 'Seeding'
                      : 'Downloading'
                    : 'Paused'
                const torrents = cached.deluge.torrents.map(t =>
                  t.id !== torrentId ? t : { ...t, state: newState },
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
              const cached = cache.readQuery({ query: GET_TORRENT_STATES, data: {} })
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

        return (
          <Row key={torrentId} $state={torrent.state} $progress={torrent.progress || 0}>
            {visibleColumns.map(col => {
              if (col.key === 'actions') {
                return isConfirming ? (
                  <ConfirmActions key="actions">
                    <ConfirmText>Delete?</ConfirmText>
                    <Tippy content="Cancel" theme="light">
                      <ActionButton
                        onClick={() =>
                          askConfirm(prev => ({ ...prev, [torrentId]: null }))
                        }
                      >
                        <MdCancel size={18} />
                      </ActionButton>
                    </Tippy>
                    <Tippy content="Confirm delete" theme="light">
                      <ActionButton $danger onClick={deleteAction}>
                        <IoMdCheckmark size={18} />
                      </ActionButton>
                    </Tippy>
                  </ConfirmActions>
                ) : (
                  <Actions key="actions">
                    {actionDefs
                      .filter(({ name }) => {
                        if (name === 'remove') return true
                        return (
                          (torrent.state !== 'Paused' && name === 'pause') ||
                          (torrent.state === 'Paused' && name === 'resume')
                        )
                      })
                      .map(({ name, extra, icon, tip, danger }) => (
                        <Tippy content={tip} theme="light" key={`${name}-${!!extra}`}>
                          <ActionButton
                            $danger={danger}
                            onClick={() => onClickAction(name, extra)}
                          >
                            {icon}
                          </ActionButton>
                        </Tippy>
                      ))}
                  </Actions>
                )
              }

              const value = (col.fn || (x => x))(get(torrent, col.key))
              const isName = col.key === 'name'
              const isNumeric = col.key !== 'name'

              return (
                <Cell
                  key={col.key}
                  $mono={isNumeric}
                  $primary={isName}
                  title={typeof value === 'string' ? value : undefined}
                >
                  {value}
                </Cell>
              )
            })}
          </Row>
        )
      })}
    </div>
  )
}
