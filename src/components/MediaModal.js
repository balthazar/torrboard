import React, { useState } from 'react'
import styled from 'styled-components'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { Tooltip } from 'react-tippy'
import { useMutation } from '@apollo/react-hooks'
import gql from 'graphql-tag'
import ptn from 'parse-torrent-name'
import get from 'lodash/get'
import { IoIosPlayCircle, IoMdEyeOff, IoMdEye } from 'react-icons/io'
import { GoFileZip } from 'react-icons/go'
import { MdDoneAll, MdContentCopy } from 'react-icons/md'
import { FiTriangle } from 'react-icons/fi'
import { FaChromecast } from 'react-icons/fa'
import { isMobile } from 'react-device-detect'

import { DOWNLOAD_URL, DOWNLOAD_DIR } from '../config'
import { useStore } from '../state'
import MediaCard from './MediaCard'
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

  > * > * {
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
      if ((!type || type === 'series') && !meta.episode && !isNaN(get(meta, 'excess.0'))) {
        meta.episode = meta.excess[0]
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
        <MediaCard bg={image} />
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

                  <Tooltip title="Launch MPV" theme="light">
                    <a
                      href={`mpv://${encodeURIComponent(v.url)}`}
                      onClick={() => {
                        setWatched({ variables: { path: v.path, value: true } })
                      }}
                    >
                      <IoIosPlayCircle size={20} />
                    </a>
                  </Tooltip>

                  <Tooltip title="Launch VLC" theme="light">
                    <a
                      href={`vlc://${encodeURIComponent(v.url)}`}
                      onClick={() => {
                        setWatched({ variables: { path: v.path, value: true } })
                      }}
                    >
                      <FiTriangle size={17} />
                    </a>
                  </Tooltip>

                  <Tooltip title="Copy URL" theme="light">
                    <CopyToClipboard text={v.url}>
                      <a>
                        <MdContentCopy size={20} />
                      </a>
                    </CopyToClipboard>
                  </Tooltip>

                  <Tooltip title={watched[v.path] ? 'Set unwatched' : 'Set watched'} theme="light">
                    <a
                      onClick={() =>
                        setWatched({ variables: { path: v.path, value: !watched[v.path] } })
                      }
                    >
                      {watched[v.path] ? <IoMdEyeOff size={20} /> : <IoMdEye size={20} />}
                    </a>
                  </Tooltip>

                  {watched[v.path] && (
                    <Tooltip title="Watched" theme="light">
                      <a>
                        <MdDoneAll />
                      </a>
                    </Tooltip>
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
