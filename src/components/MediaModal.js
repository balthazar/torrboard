import React from 'react'
import styled from 'styled-components'
import ptn from 'parse-torrent-name'
import { IoIosPlayCircle } from 'react-icons/io'
import { GoFileZip } from 'react-icons/go'
import { MdDoneAll, MdContentCopy } from 'react-icons/md'
import get from 'lodash/get'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { Tooltip } from 'react-tippy'

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

export default ({ item }) => {
  const videos = item.videos
    .map(v => {
      const splits = v.split('/')
      const name = splits[splits.length - 1]
      const meta = ptn(name)

      const type = get(item, 'mediaInfo.type')
      if ((!type || type === 'series') && !meta.episode && !isNaN(get(meta, 'excess.0'))) {
        meta.episode = meta.excess[0]
      }

      const url = `${v.replace('/home/media', 'http://media.balthazargronon.com')}`

      const text = `${
        meta.episode
          ? `${meta.season ? `S${meta.season} ` : ''}E${meta.episode}`
          : meta.title || name
      } (${meta.resolution})`

      const num = meta.episode
        ? Number(meta.episode) + Number(meta.season ? meta.season * 100 : 0)
        : 1

      return {
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
                  <a href={`mpv://${v.url}`}>
                    <IoIosPlayCircle size={20} />
                  </a>
                </Tooltip>

                <Tooltip title="Copy url to clipboard" theme="light">
                  <CopyToClipboard text={v.url}>
                    <a>
                      <MdContentCopy size={20} />
                    </a>
                  </CopyToClipboard>
                </Tooltip>

                <Tooltip title="Watch status" theme="light">
                  <a className="file-watched">
                    <MdDoneAll />
                  </a>
                </Tooltip>
              </Actions>
            </File>
          ))}
        </Files>
      </div>
    </ModalContent>
  )
}
