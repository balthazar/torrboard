import React from 'react'
import styled from 'styled-components'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { Tooltip } from 'react-tippy'
import { useMutation } from '@apollo/react-hooks'
import gql from 'graphql-tag'
import ptn from 'parse-torrent-name'
import uniq from 'lodash/uniq'
import get from 'lodash/get'
import { IoIosPlayCircle, IoMdEyeOff, IoMdEye } from 'react-icons/io'
import { GoFileZip } from 'react-icons/go'
import { MdDoneAll, MdContentCopy } from 'react-icons/md'
import { FiTriangle } from 'react-icons/fi'
import { BASE_URL, DOWNLOAD_DIR } from '../config'

import MediaCard from './MediaCard'


const ModalContent = styled.div`
  display: flex;
  word-break: break-word;

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
  height: 200px;
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

const SET_WATCHED = gql`
  mutation setWatched($path: String!, $value: Boolean!) {
    setWatched(path: $path, value: $value)
  }
`

const GET_WATCHED = gql`
  {
    watched
  }
`

export default ({ item, watched }) => {
  const [setWatched] = useMutation(SET_WATCHED, {
    update(cache, { data }) {
      cache.writeQuery({
        query: GET_WATCHED,
        data: { watched: data.setWatched },
      })
    },
  })

  const videos = uniq(item.videos)
    .map(v => {
      const splits = v.split('/')
      const name = splits[splits.length - 1]
      const meta = ptn(name)

      const type = get(item, 'mediaInfo.type')
      if ((!type || type === 'series') && !meta.episode && !isNaN(get(meta, 'excess.0'))) {
        meta.episode = meta.excess[0]
      }

      const url = encodeURI(`${v.replace(DOWNLOAD_DIR, BASE_URL)}`)

      const text = `${
        meta.episode
          ? `${meta.season ? `S${meta.season} ` : ''}E${meta.episode}`
          : meta.title || name
      } (${meta.resolution})`

      const num = meta.episode
        ? Number(meta.episode) + Number(meta.season ? meta.season * 100 : 0)
        : 1

      return {
        path: v,
        num,
        text,
        url,
      }
    })
    .sort((a, b) => b.num - a.num)

  return (
    <ModalContent>
      <MediaCard bg={get(item, 'mediaInfo.image')} />
      <div>
        <h3>{get(item, 'mediaInfo.title', item.name)}</h3>
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
                <Tooltip title="Launch MPV" theme="light">
                  <a
                    href={`mpv://${v.url}`}
                    onClick={() => {
                      setWatched({ variables: { path: v.path, value: true } })
                    }}
                  >
                    <IoIosPlayCircle size={20} />
                  </a>
                </Tooltip>

                <Tooltip title="Launch VLC" theme="light">
                  <a
                    href={`vlc://${v.url}`}
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
  )
}
