import React, { Fragment, useState } from 'react'
import styled from 'styled-components'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import Tippy from '@tippyjs/react'
import { gql, useMutation } from '@apollo/client'
import ptn from 'parse-torrent-name'
import get from 'lodash/get'
import { IoIosPlayCircle, IoMdEyeOff, IoMdEye } from 'react-icons/io'
import { GoFileZip } from 'react-icons/go'
import {
  MdContentCopy,
  MdClose,
  MdPlayArrow,
  MdSettings,
  MdStar,
} from 'react-icons/md'
import { FiTriangle } from 'react-icons/fi'
import { FaChromecast } from 'react-icons/fa'
import { isMobile } from 'react-device-detect'

import { DOWNLOAD_URL, DOWNLOAD_DIR } from '../config.client'
import { useStore } from '../state'
import MediaCard, { CARD_WIDTH, CARD_HEIGHT } from './MediaCard'
import VideoDisplay from './VideoDisplay'
import Button from './Button'

// Match the poster's height (CARD_HEIGHT = 300) at a 16:9 aspect so the
// trailer slot and poster line up at the same row height in the hero.
const TRAILER_HEIGHT = 300
const TRAILER_WIDTH = Math.round((TRAILER_HEIGHT * 16) / 9)

const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${p => p.theme.spacing[2]};
  margin-bottom: ${p => p.theme.spacing[3]};
`

const IconButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: ${p => p.theme.radii.full};
  background-color: ${p => p.theme.colors.surfaceHover};
  color: ${p => p.theme.colors.textMuted};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color ${p => p.theme.motion.fast},
    color ${p => p.theme.motion.fast};

  &:hover {
    background-color: ${p => p.theme.colors.surfaceActive};
    color: ${p => p.theme.colors.text};
  }
`

const Hero = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${p => p.theme.spacing[5]};
  margin-bottom: ${p => p.theme.spacing[5]};
`

const HeroInfo = styled.div`
  flex: 1 1 280px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing[3]};
`

const HeroTitle = styled.h2`
  font-size: ${p => p.theme.font.size['2xl']};
  font-weight: ${p => p.theme.font.weight.semibold};
  line-height: ${p => p.theme.font.leading.tight};
  letter-spacing: ${p => p.theme.font.tracking.tight};
`

const HeroMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${p => p.theme.spacing[3]};
  font-size: ${p => p.theme.font.size.sm};
  font-family: ${p => p.theme.font.mono};
  color: ${p => p.theme.colors.textMuted};

  > * {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  > * + *::before {
    content: '·';
    margin-right: ${p => p.theme.spacing[3]};
    color: ${p => p.theme.colors.textSubtle};
  }
`

const HeroPlot = styled.p`
  font-size: ${p => p.theme.font.size.sm};
  color: ${p => p.theme.colors.textMuted};
  line-height: ${p => p.theme.font.leading.relaxed};
  max-width: 72ch;
`

const TrailerArea = styled.div`
  flex: 0 0 ${TRAILER_WIDTH}px;
  width: ${TRAILER_WIDTH}px;
  height: ${TRAILER_HEIGHT}px;

  @media (max-width: 720px) {
    flex: 1 1 100%;
    width: 100%;
  }
`

const TrailerPlaceholder = styled.button`
  width: 100%;
  height: 100%;
  border-radius: ${p => p.theme.radii.md};
  background-color: ${p => p.theme.colors.surface};
  border: 1px dashed ${p => p.theme.colors.border};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${p => p.theme.spacing[2]};
  color: ${p => p.theme.colors.textMuted};
  cursor: pointer;
  font-size: ${p => p.theme.font.size.xs};
  font-weight: ${p => p.theme.font.weight.medium};
  letter-spacing: ${p => p.theme.font.tracking.wider};
  text-transform: uppercase;
  transition: background-color ${p => p.theme.motion.fast},
    color ${p => p.theme.motion.fast},
    border-color ${p => p.theme.motion.fast};

  &:hover {
    background-color: ${p => p.theme.colors.surfaceHover};
    border-color: ${p => p.theme.colors.borderHover};
    color: ${p => p.theme.colors.text};
  }

  svg {
    color: ${p => p.theme.colors.accent};
  }
`

const Unrar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${p => p.theme.spacing[2]};
  padding: ${p => p.theme.spacing[2]} ${p => p.theme.spacing[3]};
  background-color: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.md};
  font-size: ${p => p.theme.font.size.sm};
  color: ${p => p.theme.colors.textMuted};
  width: fit-content;
`

const FilesSection = styled.div`
  display: flex;
  flex-direction: column;
`

const SeasonHeader = styled.div`
  font-size: ${p => p.theme.font.size.xs};
  font-weight: ${p => p.theme.font.weight.semibold};
  letter-spacing: ${p => p.theme.font.tracking.wider};
  text-transform: uppercase;
  color: ${p => p.theme.colors.textSubtle};
  padding-bottom: ${p => p.theme.spacing[2]};
  margin: ${p => p.theme.spacing[4]} 0 ${p => p.theme.spacing[1]};
  border-bottom: 1px solid ${p => p.theme.colors.border};

  &:first-child {
    margin-top: 0;
  }
`

const FileRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing[3]};
  padding: ${p => p.theme.spacing[2]} ${p => p.theme.spacing[3]};
  border-radius: ${p => p.theme.radii.md};
  transition: background-color ${p => p.theme.motion.fast};

  ${p =>
    p.$watched
      ? `
    color: ${p.theme.colors.textSubtle};
  `
      : ''}

  &:hover {
    background-color: ${p => p.theme.colors.surfaceHover};
  }
`

const EpisodeLabel = styled.span`
  font-family: ${p => p.theme.font.mono};
  font-size: ${p => p.theme.font.size.sm};
  font-weight: ${p => p.theme.font.weight.medium};
  color: ${p => p.theme.colors.text};
  flex-shrink: 0;
  min-width: 44px;
`

const FileTitle = styled.span`
  flex: 1;
  font-size: ${p => p.theme.font.size.sm};
  color: ${p => p.theme.colors.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ResolutionBadge = styled.span`
  font-family: ${p => p.theme.font.mono};
  font-size: ${p => p.theme.font.size.xs};
  color: ${p => p.theme.colors.textSubtle};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.sm};
  padding: 2px 6px;
  flex-shrink: 0;
`

const FileActions = styled.div`
  display: flex;
  gap: ${p => p.theme.spacing[1]};
  flex-shrink: 0;

  > a,
  > span {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${p => p.theme.colors.textMuted};
    border-radius: ${p => p.theme.radii.full};
    cursor: pointer;
    transition: background-color ${p => p.theme.motion.fast},
      color ${p => p.theme.motion.fast};
  }

  > a:hover,
  > span:hover {
    background-color: ${p => p.theme.colors.surfaceActive};
    color: ${p => p.theme.colors.text};
  }
`

const ImdbPopover = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing[2]};
  padding: ${p => p.theme.spacing[3]};
  min-width: 240px;
`

const ImdbLabel = styled.label`
  font-size: ${p => p.theme.font.size.xs};
  font-weight: ${p => p.theme.font.weight.semibold};
  letter-spacing: ${p => p.theme.font.tracking.wider};
  text-transform: uppercase;
  color: ${p => p.theme.colors.textSubtle};
`

const ImdbRow = styled.div`
  display: flex;
  gap: ${p => p.theme.spacing[2]};

  input {
    flex: 1;
    height: 32px;
    background-color: ${p => p.theme.colors.bg};
    color: ${p => p.theme.colors.text};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.sm};
    padding: 0 ${p => p.theme.spacing[2]};
    font-size: ${p => p.theme.font.size.sm};
    font-family: ${p => p.theme.font.mono};

    &:focus {
      border-color: ${p => p.theme.colors.accent};
    }
  }

  button {
    height: 32px;
    padding: 0 ${p => p.theme.spacing[3]};
    font-size: ${p => p.theme.font.size.xs};
    font-weight: ${p => p.theme.font.weight.semibold};
    letter-spacing: ${p => p.theme.font.tracking.wide};
    text-transform: uppercase;
    background-color: ${p => p.theme.colors.accent};
    color: #fff;
    border-radius: ${p => p.theme.radii.sm};
    cursor: pointer;
  }
`

const TrailerOverlay = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: ${p => p.theme.radii.md};
  overflow: hidden;
  background-color: #000;

  iframe {
    border-radius: ${p => p.theme.radii.md};
  }
`

const SET_WATCHED = gql`
  mutation setWatched($path: String!, $value: Boolean!) {
    setWatched(path: $path, value: $value)
  }
`

const SET_IMDB = gql`
  mutation setImdb($oldId: String, $torrentIds: [String], $newId: String!) {
    setImdb(oldId: $oldId, torrentIds: $torrentIds, newId: $newId)
  }
`

const CAST = gql`
  mutation cast($title: String!, $url: String!, $image: String) {
    cast(title: $title, url: $url, image: $image)
  }
`

const GET_WATCHED = gql`
  {
    watched
  }
`

const parseVideo = (path, type) => {
  const splits = path.split('/')
  const name = splits[splits.length - 1]
  const meta = ptn(name)

  if ((!type || type === 'series') && !meta.episode) {
    const stem = name
      .replace(/\.[a-z0-9]{2,4}$/i, '')
      .replace(/\b(x|h)\.?26[45]\b/gi, '')
      .replace(/\b10\s?bit\b/gi, '')
      .replace(/\b(720|1080|2160|480)p\b/gi, '')

    const seMatch = stem.match(/\bS(\d{1,2})\s?E(\d{1,3})\b/i)
    const xMatch = !seMatch && stem.match(/\b(\d{1,2})x(\d{1,3})\b/)
    const epMatch =
      !seMatch &&
      !xMatch &&
      stem.match(/(?:^|[\s._-])(?:E|Ep|Episode)\s?(\d{1,3})(?!\d)/i)
    const dashMatch =
      !seMatch &&
      !xMatch &&
      !epMatch &&
      stem.match(/(?:^|[\s._-])-\s*(\d{1,3})(?:v\d)?(?=\s|[._-]|$)/)

    if (seMatch) {
      meta.season = Number(seMatch[1])
      meta.episode = Number(seMatch[2])
    } else if (xMatch) {
      meta.season = Number(xMatch[1])
      meta.episode = Number(xMatch[2])
    } else if (epMatch) {
      meta.episode = Number(epMatch[1])
    } else if (dashMatch) {
      meta.episode = Number(dashMatch[1])
    }
  }

  return { path, name, meta }
}

export default ({ item, watched, onClose }) => {
  const [state] = useStore()
  const [newId, setNewId] = useState(item.mediaInfo ? item.mediaInfo.imdbID : '')
  const [showTrailer, setShowTrailer] = useState(false)

  const [setWatched] = useMutation(SET_WATCHED, {
    update(cache, { data }) {
      cache.writeQuery({
        query: GET_WATCHED,
        data: { watched: data.setWatched },
      })
    },
  })

  const [setImdb] = useMutation(SET_IMDB)
  const doChangeImdb = () => {
    setImdb({
      variables: { torrentIds: item.ids, newId, oldId: get(item, 'mediaInfo.imdbID') },
    })
    setNewId('')
  }

  const [cast] = useMutation(CAST)

  const isAdmin = get(state, 'user.name') === 'master'
  const isCaster = isAdmin || get(state, 'user.name') === 'nataliya'

  const type = get(item, 'mediaInfo.type')

  const videos = item.videos.map(p => {
    const { path, name, meta } = parseVideo(p, type)
    const url = encodeURI(`${path.replace(DOWNLOAD_DIR, DOWNLOAD_URL)}`)
    return {
      path,
      name,
      url,
      season: meta.season != null ? Number(meta.season) : null,
      episode: meta.episode != null ? Number(meta.episode) : null,
      title: meta.title,
      resolution: meta.resolution || null,
    }
  })

  const title = get(item, 'mediaInfo.title', videos.length ? videos[0].title || item.name : item.name)
  const image = get(item, 'mediaInfo.image')
  const year = get(item, 'mediaInfo.year')
  const rating = get(item, 'mediaInfo.rating')
  const plot = get(item, 'mediaInfo.plot')

  const seasonsSet = new Set()
  videos.forEach(v => {
    if (v.season != null) seasonsSet.add(v.season)
  })
  const isSeries = type === 'series' || seasonsSet.size > 0 || videos.length > 1

  const doCast = url => cast({ variables: { title, url, image } })

  const groups = videos.reduce((acc, v) => {
    const key = v.season != null ? String(v.season) : '_'
    if (!acc[key]) acc[key] = []
    acc[key].push(v)
    return acc
  }, {})

  Object.keys(groups).forEach(k => {
    groups[k].sort((a, b) => (a.episode || 0) - (b.episode || 0))
  })

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === '_') return 1
    if (b === '_') return -1
    return Number(a) - Number(b)
  })

  return (
    <div>
      <TopBar>
        <Tippy content="Trailer" theme="light">
          <IconButton onClick={() => setShowTrailer(t => !t)}>
            {showTrailer ? <MdClose size={18} /> : <MdPlayArrow size={20} />}
          </IconButton>
        </Tippy>
        {isAdmin && (
          <Tippy
            interactive
            trigger="click"
            placement="bottom-end"
            content={
              <ImdbPopover>
                <ImdbLabel>IMDB ID</ImdbLabel>
                <ImdbRow>
                  <input
                    type="text"
                    value={newId}
                    onChange={e => setNewId(e.target.value)}
                    placeholder="tt0123456"
                  />
                  <button onClick={doChangeImdb}>Set</button>
                </ImdbRow>
              </ImdbPopover>
            }
          >
            <IconButton>
              <MdSettings size={18} />
            </IconButton>
          </Tippy>
        )}
        <Tippy content="Close (Esc)" theme="light">
          <IconButton onClick={onClose}>
            <MdClose size={18} />
          </IconButton>
        </Tippy>
      </TopBar>

      <Hero>
        <MediaCard $bg={image} style={{ width: CARD_WIDTH, height: CARD_HEIGHT, flexShrink: 0 }} />

        <HeroInfo>
          <HeroTitle>{title}</HeroTitle>
          <HeroMeta>
            {year && <span>{year}</span>}
            {rating && (
              <span>
                <MdStar size={12} />
                {rating}
              </span>
            )}
            {isSeries && seasonsSet.size > 0 && (
              <span>
                {seasonsSet.size} season{seasonsSet.size === 1 ? '' : 's'}
              </span>
            )}
            {isSeries && (
              <span>
                {videos.length} episode{videos.length === 1 ? '' : 's'}
              </span>
            )}
          </HeroMeta>
          {plot && <HeroPlot>{plot}</HeroPlot>}
          {item.rar && !videos.length && (
            <Unrar>
              <GoFileZip />
              <span>RAR archive</span>
            </Unrar>
          )}
        </HeroInfo>

        <TrailerArea>
          {showTrailer ? (
            <TrailerOverlay>
              <VideoDisplay
                query={title}
                videoSize={{ width: TRAILER_WIDTH, height: TRAILER_HEIGHT }}
              />
            </TrailerOverlay>
          ) : (
            <TrailerPlaceholder onClick={() => setShowTrailer(true)}>
              <MdPlayArrow size={32} />
              <span>Watch trailer</span>
            </TrailerPlaceholder>
          )}
        </TrailerArea>
      </Hero>

      <FilesSection>
        {sortedKeys.map(key => (
          <Fragment key={key}>
            {key !== '_' && <SeasonHeader>Season {key}</SeasonHeader>}
            {groups[key].map(v => (
              <FileRow key={v.url} $watched={watched[v.path]}>
                <EpisodeLabel>
                  {v.episode != null ? `E${String(v.episode).padStart(2, '0')}` : '—'}
                </EpisodeLabel>
                <FileTitle>{v.title || v.name}</FileTitle>
                {v.resolution && <ResolutionBadge>{v.resolution}</ResolutionBadge>}
                <FileActions>
                  {isCaster && (
                    <Tippy content="Cast" theme="light">
                      <a onClick={() => doCast(v.url)}>
                        <FaChromecast size={16} />
                      </a>
                    </Tippy>
                  )}
                  <Tippy content="MPV" theme="light">
                    <a
                      href={`mpv://${encodeURIComponent(v.url)}`}
                      onClick={() => setWatched({ variables: { path: v.path, value: true } })}
                    >
                      <IoIosPlayCircle size={18} />
                    </a>
                  </Tippy>
                  <Tippy content="VLC" theme="light">
                    <a
                      href={`vlc://${encodeURIComponent(v.url)}`}
                      onClick={() => setWatched({ variables: { path: v.path, value: true } })}
                    >
                      <FiTriangle size={15} />
                    </a>
                  </Tippy>
                  <Tippy content="Copy URL" theme="light">
                    <span>
                      <CopyToClipboard text={v.url}>
                        <a>
                          <MdContentCopy size={16} />
                        </a>
                      </CopyToClipboard>
                    </span>
                  </Tippy>
                  <Tippy
                    content={watched[v.path] ? 'Mark unwatched' : 'Mark watched'}
                    theme="light"
                  >
                    <a
                      onClick={() =>
                        setWatched({ variables: { path: v.path, value: !watched[v.path] } })
                      }
                    >
                      {watched[v.path] ? <IoMdEyeOff size={18} /> : <IoMdEye size={18} />}
                    </a>
                  </Tippy>
                </FileActions>
              </FileRow>
            ))}
          </Fragment>
        ))}
      </FilesSection>
    </div>
  )
}
