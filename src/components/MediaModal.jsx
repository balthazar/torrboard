import React, { useState } from 'react'
import styled from 'styled-components'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import Tippy from '@tippyjs/react'
import { gql, useMutation } from '@apollo/client'
import ptn from 'parse-torrent-name'
import get from 'lodash/get'
import { IoIosPlayCircle, IoMdEyeOff, IoMdEye } from 'react-icons/io'
import { GoFileZip } from 'react-icons/go'
import { MdDoneAll, MdContentCopy } from 'react-icons/md'
import { FiTriangle } from 'react-icons/fi'
import { FaChromecast } from 'react-icons/fa'
import { isMobile } from 'react-device-detect'

import { DOWNLOAD_URL, DOWNLOAD_DIR } from '../config.client'
import { useStore } from '../state'
import MediaCard, { CARD_WIDTH, CARD_HEIGHT } from './MediaCard'
import VideoDisplay from './VideoDisplay'
import Button from './Button'

const ModalContent = styled.div`
  display: flex;
  word-break: break-word;
  margin-bottom: 10px;

  h3 {
    font-size: 25px;
  }

  > div {
    > * + * {
      margin-top: 20px;
    }
  }

  > * + * {
    margin-left: 20px;
  }
`

const Files = styled.div`
  max-height: 200px;
  overflow: auto;
  display: flex;
  flex-direction: column;
`

const File = styled.div`
  font-size: 13px;
  background-color: ${p => p.theme.bg};
  padding: 10px;
  margin: 5px;

  display: flex;
  flex-direction: column;
  word-break: break-all;

  > * + * {
    margin-top: 5px;
  }
`

const Actions = styled.div`
  display: flex;

  > * {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 25px;
    height: 25px;
    cursor: pointer;
  }

  > * + * {
    margin-left: 10px;
  }
`

const Unrar = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: ${p => p.theme.opacityDark(0.2)};

  > * + * {
    margin-left: 10px;
  }
`

const ImdbSet = styled.div`
  display: flex;
  align-items: center;
  margin-top: 10px;

  input {
    height: 25px;
    padding: 4px;
    color: black;
  }

  button {
    height: 25px;
    background-color: rgba(0, 0, 0, 0.2);
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    padding: 2px 10px;
    font-size: 10px;
  }
`

const TrailerButton = styled(Button)`
  background-color: rgba(0, 0, 0, 0.2);
  font-size: 13px;

  transition: background-color 250ms ease-in;
  &:hover {
    background-color: rgba(0, 0, 0, 0.4);
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

export default ({ item, watched }) => {
  const [state] = useStore()
  const [newId, setNewId] = useState(item.mediaInfo ? item.mediaInfo.imdbID : '')
  const [showTrailer, toggleTrailer] = useState(false)
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

  const doCast = url => {
    cast({
      variables: { title, url, image },
    })
  }

  const isAdmin = get(state, 'user.name') === 'master'
  const isCaster = isAdmin || get(state, 'user.name') === 'nataliya'

  const videos = item.videos
    .map(v => {
      const splits = v.split('/')
      const name = splits[splits.length - 1]
      const meta = ptn(name)

      const type = get(item, 'mediaInfo.type')
      if ((!type || type === 'series') && !meta.episode) {
        // Strip extension and known noise so digits inside codecs/release tags can't win.
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

      const url = encodeURI(`${v.replace(DOWNLOAD_DIR, DOWNLOAD_URL)}`)

      const text = `${
        meta.episode
          ? `${meta.season ? `S${meta.season} ` : ''}E${meta.episode}`
          : meta.title || name
      }${meta.resolution ? ` (${meta.resolution})` : ''}`

      const num = meta.episode
        ? Number(meta.episode) + Number(meta.season ? meta.season * 100 : 0)
        : 1

      return {
        path: v,
        num,
        text,
        title: meta.title,
        url,
      }
    })
    .sort((a, b) => b.num - a.num)

  const title = get(item, 'mediaInfo.title', videos.length ? videos[0].title : item.name)
  const image = get(item, 'mediaInfo.image')

  return (
    <div>
      <ModalContent>
        <MediaCard $bg={image} style={{ width: CARD_WIDTH, height: CARD_HEIGHT, flexShrink: 0 }} />
        <div>
          <h3>{title}</h3>
          {get(item, 'mediaInfo.year') && <i>{get(item, 'mediaInfo.year')}</i>}
          <div>{get(item, 'mediaInfo.plot')}</div>

          {item.rar && !item.videos.length && (
            <Unrar>
              <span>{'RAR'}</span>
              <GoFileZip />
            </Unrar>
          )}

          <Files>
            {videos.map(v => (
              <File key={v.url}>
                <div>{v.text}</div>
                <Actions>
                  {isCaster && (
                    <a onClick={() => doCast(v.url)}>
                      <FaChromecast size={20} />
                    </a>
                  )}

                  <Tippy content="Launch MPV" theme="light">
                    <a
                      href={`mpv://${encodeURIComponent(v.url)}`}
                      onClick={() => {
                        setWatched({ variables: { path: v.path, value: true } })
                      }}
                    >
                      <IoIosPlayCircle size={20} />
                    </a>
                  </Tippy>

                  <Tippy content="Launch VLC" theme="light">
                    <a
                      href={`vlc://${encodeURIComponent(v.url)}`}
                      onClick={() => {
                        setWatched({ variables: { path: v.path, value: true } })
                      }}
                    >
                      <FiTriangle size={17} />
                    </a>
                  </Tippy>

                  <Tippy content="Copy URL" theme="light">
                    <span>
                      <CopyToClipboard text={v.url}>
                        <a>
                          <MdContentCopy size={20} />
                        </a>
                      </CopyToClipboard>
                    </span>
                  </Tippy>

                  <Tippy content={watched[v.path] ? 'Set unwatched' : 'Set watched'} theme="light">
                    <a
                      onClick={() =>
                        setWatched({ variables: { path: v.path, value: !watched[v.path] } })
                      }
                    >
                      {watched[v.path] ? <IoMdEyeOff size={20} /> : <IoMdEye size={20} />}
                    </a>
                  </Tippy>

                  {watched[v.path] && (
                    <Tippy content="Watched" theme="light">
                      <a>
                        <MdDoneAll />
                      </a>
                    </Tippy>
                  )}
                </Actions>
              </File>
            ))}
          </Files>
        </div>
      </ModalContent>

      <div>
        {showTrailer ? (
          <VideoDisplay
            query={title}
            videoSize={{ width: 450 / (isMobile ? 1.5 : 1), height: 300 / (isMobile ? 1.5 : 1) }}
          />
        ) : (
          <TrailerButton onClick={() => toggleTrailer(true)}>SHOW TRAILER</TrailerButton>
        )}
      </div>

      {isAdmin && !isMobile && (
        <ImdbSet>
          <input type="text" value={newId} onChange={e => setNewId(e.target.value)} />
          <Button onClick={doChangeImdb}>SET IMDB</Button>
        </ImdbSet>
      )}
    </div>
  )
}
