import React, { Fragment, useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { gql, useQuery } from '@apollo/client'
import get from 'lodash/get'
import uniq from 'lodash/uniq'
import ptn from 'parse-torrent-name'
import { useToasts } from './toasts'
import { MdDoneAll, MdStar, MdSortByAlpha, MdSchedule } from 'react-icons/md'

import Placeloader from './Placeloader'
import SearchInput from './SearchInput'
import MediaCard, { CARD_HEIGHT, CARD_WIDTH } from './MediaCard'
import MediaModal from './MediaModal'
import Modal from './Modal'
import { FilterValue } from './Filters'

import apiHandlers from '../fn/apiHandlers'
import { useStore } from '../state'

const GET_MEDIAS = gql`
  query Medias {
    watched
    deluge {
      torrents {
        id
        name
        videos
        time_added
        rar
        state
        meta {
          title
          resolution
          episode
          season
        }
        mediaInfo {
          imdbID
          title
          type
          image
          plot
          rating
          tags
          year
        }
      }
    }
  }
`

const ControlBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: ${p => p.theme.spacing[5]};
  margin: ${p => p.theme.spacing[3]} 0;

  ${p => p.theme.media.mobile} {
    gap: ${p => p.theme.spacing[3]};
  }
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

const SearchSlot = styled.div`
  flex: 1 1 220px;
  min-width: 200px;
  max-width: 420px;
  margin-left: auto;

  ${p => p.theme.media.mobile} {
    flex-basis: 100%;
    max-width: none;
    margin-left: 0;
    order: -1;
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${CARD_WIDTH}px, 1fr));
  gap: ${p => p.theme.spacing[3]};
  padding: ${p => p.theme.spacing[3]} 0;

  ${p => p.theme.media.mobile} {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: ${p => p.theme.spacing[2]};
    padding: ${p => p.theme.spacing[2]} 0;
  }
`

const CardFallback = styled.div`
  padding: ${p => p.theme.spacing[3]};
  font-size: ${p => p.theme.font.size.sm};
  font-weight: ${p => p.theme.font.weight.medium};
  color: ${p => p.theme.colors.textMuted};
  line-height: ${p => p.theme.font.leading.normal};
  text-align: center;
  word-break: break-word;
`

const TitleOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: ${p => p.theme.spacing[3]};
  padding-top: ${p => p.theme.spacing[6]};
  color: ${p => p.theme.colors.text};
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.92),
    rgba(0, 0, 0, 0.6) 55%,
    transparent
  );
  opacity: 0;
  transform: translateY(8px);
  transition: opacity ${p => p.theme.motion.base},
    transform ${p => p.theme.motion.base};
  pointer-events: none;
  word-break: break-word;

  ${MediaCard}:hover & {
    opacity: 1;
    transform: translateY(0);
  }
`

const OverlayTitle = styled.div`
  font-size: ${p => p.theme.font.size.sm};
  font-weight: ${p => p.theme.font.weight.semibold};
  letter-spacing: ${p => p.theme.font.tracking.tight};
  line-height: ${p => p.theme.font.leading.tight};
  margin-bottom: ${p => p.theme.spacing[2]};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const OverlayMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing[2]};
  font-size: ${p => p.theme.font.size.xs};
  color: ${p => p.theme.colors.textMuted};
  font-family: ${p => p.theme.font.mono};

  > * {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  > * + *::before {
    content: '·';
    margin-right: ${p => p.theme.spacing[2]};
    color: ${p => p.theme.colors.textSubtle};
  }
`

const WatchedBadge = styled.div`
  display: ${p => (p.$visible ? 'flex' : 'none')};
  position: absolute;
  top: ${p => p.theme.spacing[2]};
  right: ${p => p.theme.spacing[2]};
  width: 22px;
  height: 22px;
  border-radius: ${p => p.theme.radii.full};
  background-color: ${p => p.theme.colors.success};
  color: #fff;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  box-shadow: ${p => p.theme.shadows.sm};
`

const Meta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${p => p.theme.spacing[1]};
  margin: ${p => p.theme.spacing[3]} 0 0;
  font-size: ${p => p.theme.font.size.xs};
  color: ${p => p.theme.colors.textSubtle};
  font-family: ${p => p.theme.font.mono};
  letter-spacing: ${p => p.theme.font.tracking.wide};
  text-transform: uppercase;
`

const ExpansionPanel = styled.div`
  grid-column: 1 / -1;
  position: relative;
  background-color: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.lg};
  display: grid;
  grid-template-rows: ${p => (p.$closing ? '0fr' : '1fr')};
  opacity: ${p => (p.$closing ? 0 : 1)};
  transition: grid-template-rows ${p => p.theme.motion.slow},
    opacity ${p => p.theme.motion.base};

  @starting-style {
    grid-template-rows: 0fr;
    opacity: 0;
  }
`

const ExpansionInner = styled.div`
  overflow: hidden;
`

const ExpansionContent = styled.div`
  padding: ${p => p.theme.spacing[5]};

  ${p => p.theme.media.mobile} {
    padding: ${p => p.theme.spacing[3]};
  }
`

const EXPANSION_ANIM_MS = 320

export default () => {
  const [query, setQuery] = useState('')
  const [sortBy, setSort] = useState('time')
  const [selectedKey, setSelectedKey] = useState(null)
  const [closing, setClosing] = useState(false)
  const [category, setCategory] = useState(null)
  const { addToast } = useToasts()
  const [, dispatch] = useStore()

  const [isNarrow, setIsNarrow] = useState(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mql = window.matchMedia('(max-width: 600px)')
    const handler = e => setIsNarrow(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const gridRef = useRef(null)
  const searchRef = useRef(null)
  const closeTimerRef = useRef(null)
  const expansionRef = useRef(null)
  const [cols, setCols] = useState(1)

  const { loading, data } = useQuery(GET_MEDIAS, {
    pollInterval: 10e3,
    ...apiHandlers({
      addToast,
      onError: ({ msg }) => {
        if (msg.includes('fuck out')) {
          dispatch({ type: 'LOGOUT' })
        }
      },
    }),
  })

  useEffect(() => {
    if (!gridRef.current) return undefined
    const measure = () => {
      if (!gridRef.current) return
      const cs = window.getComputedStyle(gridRef.current)
      const colCount = cs.gridTemplateColumns.split(' ').filter(Boolean).length
      setCols(Math.max(1, colCount))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(gridRef.current)
    return () => observer.disconnect()
  }, [])

  const closeExpansion = () => {
    if (selectedKey === null) return
    setClosing(true)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setSelectedKey(null)
      setClosing(false)
    }, EXPANSION_ANIM_MS)
  }

  useEffect(() => {
    if (selectedKey === null || closing || isNarrow) return
    // Wait for the open animation to finish so the panel has its full height
    // when we measure the scroll target. Otherwise nearest-block alignment
    // sees a 0-height row and undershoots.
    const t = setTimeout(() => {
      const el = expansionRef.current
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, EXPANSION_ANIM_MS)
    return () => clearTimeout(t)
  }, [selectedKey, closing, isNarrow])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape' && selectedKey !== null) {
        closeExpansion()
        return
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedKey])

  const watched = get(data, 'watched', []).reduce((acc, path) => ((acc[path] = true), acc), {})

  const reduced = get(data, 'deluge.torrents', [])
    .slice()
    .sort((a, b) =>
      sortBy === 'time'
        ? b.time_added - a.time_added
        : get(a, 'mediaInfo.title', a.name).localeCompare(get(b, 'mediaInfo.title', b.name)),
    )
    .reduce((acc, cur) => {
      const key = get(cur, 'mediaInfo.imdbID') || get(cur, 'meta.title') || cur.name

      if (category && !(get(cur, 'mediaInfo.tags') || []).includes(category)) {
        return acc
      }

      if (
        query &&
        !get(cur, 'mediaInfo.title', cur.name)
          .toLowerCase()
          .includes(query.toLowerCase())
      ) {
        return acc
      }

      if (!acc[key]) {
        acc[key] = { ...cur, ids: [cur.id] }
      } else {
        acc[key].videos = acc[key].videos.concat(cur.videos).sort((a, b) => b - a)
        acc[key].ids.push(cur.id)
      }

      return acc
    }, {})

  const list = Object.keys(reduced)
    .map(k => {
      const obj = reduced[k]
      const videos = uniq(obj.videos)
      const isWatched = videos.length && !videos.some(path => !watched[path])

      const seasons = new Set()
      videos.forEach(v => {
        const meta = ptn(v.split('/').pop())
        if (meta.season != null) seasons.add(meta.season)
      })

      return {
        ...obj,
        videos,
        isWatched,
        episodes: videos.length,
        seasons: seasons.size,
        _key: obj.ids[0],
      }
    })
    .filter(item => item.videos.length || item.rar)

  const selectedIndex = selectedKey !== null ? list.findIndex(it => it._key === selectedKey) : -1
  const selectedItem = selectedIndex >= 0 ? list[selectedIndex] : null
  const expandedRow = selectedIndex >= 0 ? Math.floor(selectedIndex / cols) : -1

  const onCardClick = item => {
    if (selectedKey === item._key && !closing) {
      closeExpansion()
      return
    }
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setClosing(false)
    setSelectedKey(item._key)
  }

  const SORT_OPTIONS = [
    { value: 'time', label: 'recent', icon: <MdSchedule size={13} /> },
    { value: 'alpha', label: 'A-Z', icon: <MdSortByAlpha size={13} /> },
  ]

  return (
    <div>
      <ControlBar>
        <ControlGroup>
          <ControlLabel>Sort by</ControlLabel>
          <ControlPills>
            {SORT_OPTIONS.map(({ value, label, icon }) => (
              <FilterValue $active={sortBy === value} key={value} onClick={() => setSort(value)}>
                {icon}
                {label}
              </FilterValue>
            ))}
          </ControlPills>
        </ControlGroup>

        <ControlGroup>
          <ControlLabel>Genre</ControlLabel>
          <ControlPills>
            {['action', 'animation', 'sci-fi', 'drama', 'horror'].map(value => (
              <FilterValue
                $active={category === value}
                key={value}
                onClick={() => setCategory(category === value ? null : value)}
              >
                {value}
              </FilterValue>
            ))}
          </ControlPills>
        </ControlGroup>

        <SearchSlot>
          <SearchInput inputRef={searchRef} onChange={e => setQuery(e.target.value)} />
        </SearchSlot>
      </ControlBar>

      <Meta>
        {loading ? (
          <Placeloader style={{ width: 60, height: 11 }} />
        ) : (
          <span>{list.length} items</span>
        )}
        {category && <span>filter: {category}</span>}
      </Meta>

      <Grid ref={gridRef}>
        {loading &&
          [...Array(30).keys()].map(id => (
            <MediaCard key={id}>
              <Placeloader
                time={Math.max(1000, Math.floor(Math.random() * 3000))}
                style={{ height: '100%', width: '100%' }}
              />
            </MediaCard>
          ))}

        {list.map((item, i) => {
          const image = get(item, 'mediaInfo.image')
          const title = get(item, 'mediaInfo.title') || item.name
          const year = get(item, 'mediaInfo.year')
          const rating = get(item, 'mediaInfo.rating')
          const type = get(item, 'mediaInfo.type')
          const isSeries = type === 'series' || item.seasons > 0 || item.episodes > 1

          const row = Math.floor(i / cols)
          const isLastInRow = (i + 1) % cols === 0
          const isLastItem = i === list.length - 1
          const showExpansionHere = row === expandedRow && (isLastInRow || isLastItem)

          return (
            <Fragment key={item._key}>
              <MediaCard onClick={() => onCardClick(item)} $bg={image} $interactive>
                {!image && <CardFallback>{title}</CardFallback>}
                {image && (
                  <TitleOverlay>
                    <OverlayTitle>{title}</OverlayTitle>
                    <OverlayMeta>
                      {year && <span>{year}</span>}
                      {isSeries && item.seasons > 0 && (
                        <span>
                          {item.seasons} season{item.seasons === 1 ? '' : 's'}
                        </span>
                      )}
                      {isSeries && (
                        <span>
                          {item.episodes} ep{item.episodes === 1 ? '' : 's'}
                        </span>
                      )}
                      {!isSeries && rating && (
                        <span>
                          <MdStar size={11} />
                          {rating}
                        </span>
                      )}
                    </OverlayMeta>
                  </TitleOverlay>
                )}

                <WatchedBadge $visible={item.isWatched} title="Watched">
                  <MdDoneAll />
                </WatchedBadge>
              </MediaCard>

              {!isNarrow && showExpansionHere && selectedItem && (
                <ExpansionPanel ref={expansionRef} $closing={closing}>
                  <ExpansionInner>
                    <ExpansionContent>
                      <MediaModal
                        item={selectedItem}
                        watched={watched}
                        onClose={closeExpansion}
                      />
                    </ExpansionContent>
                  </ExpansionInner>
                </ExpansionPanel>
              )}
            </Fragment>
          )
        })}
      </Grid>

      {isNarrow && (
        <Modal isOpened={selectedItem !== null && !closing} onClose={closeExpansion}>
          {selectedItem && (
            <MediaModal item={selectedItem} watched={watched} onClose={closeExpansion} />
          )}
        </Modal>
      )}
    </div>
  )
}
