import React, { useEffect } from 'react'
import styled from 'styled-components'
import { useQuery, useMutation } from '@apollo/react-hooks'
import gql from 'graphql-tag'
import { Link } from '@reach/router'
import { GoRss } from 'react-icons/go'
import { MdHome, MdList, MdSettings, MdPowerSettingsNew } from 'react-icons/md'
import { IoIosArrowRoundDown, IoIosArrowRoundUp } from 'react-icons/io'
import { AiFillDatabase } from 'react-icons/ai'
import Cookies from 'js-cookie'
import get from 'lodash/get'
import { useToasts } from 'react-toast-notifications'
import { isMobile } from 'react-device-detect'

import convertBytes from '../fn/convertBytes'
import fakeAudio from '../fn/fakeAudio'
import { useStore } from '../state'
import { TOOLBAR_WIDTH } from '../config'
import Logo from './Logo'

const GET_STATS = gql`
  {
    deluge {
      stats {
        upSpeed
        dlSpeed
        freeSpace
      }
    }
    playback {
      title
      image
      pos
      duration
      playing
    }
  }
`

const CAST_ACTION = gql`
  mutation castAction($name: String!) {
    castAction(name: $name)
  }
`

const Container = styled.div`
  position: fixed;
  height: 100vh;
  width: ${TOOLBAR_WIDTH}px;
  background-color: ${p => p.theme.bg};

  display: flex;
  flex-direction: column;
  align-items: center;
`

const Menu = styled.div`
  margin-top: 50px;
  font-size: 20px;
  flex-grow: 1;
`

const LinkContainer = styled.div`
  width: ${TOOLBAR_WIDTH}px;
  height: ${TOOLBAR_WIDTH}px;
  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  transition: background-color 150ms ease-in;
  &:hover {
    background-color: ${p => p.theme.opacityDark(0.2)};
  }

  > * {
    display: flex;
    align-items: center;
    justify-content: center;
    // Remove outline space
    width: ${TOOLBAR_WIDTH - 4}px;
    height: ${TOOLBAR_WIDTH - 4}px;
  }
`

const Stats = styled.div`
  width: ${TOOLBAR_WIDTH}px;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  padding: 10px;

  > * {
    display: flex;
    align-items: center;
    > * + * {
      margin-left: 5px;
    }
  }

  > * + * {
    margin-top: 10px;
  }
`

export default () => {
  const [state, dispatch] = useStore()

  const { loading, data } = useQuery(GET_STATS, {
    pollInterval: 1e3,
    skip: get(state, 'user.name') !== 'master',
  })

  const [castAction] = useMutation(CAST_ACTION)

  const { addToast } = useToasts()

  useEffect(() => {
    if (!isMobile) {
      return
    }

    if (!get(data, 'playback.title')) {
      return fakeAudio(true)
    }

    fakeAudio()

    const { image, title, pos, duration, playing } = data.playback

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: pos && duration ? `${pos}/${duration}` : 'Loading..',
      artwork: [{ src: image, sizes: '512x512', type: 'image/png' }],
    })

    // Register actions
    ;['play', 'pause', 'seekbackward', 'seekforward', 'nexttrack'].forEach(name => {
      navigator.mediaSession.setActionHandler(name, () => {
        castAction({ variables: { name } })
        if (name === 'nexttrack') {
          fakeAudio(true)
        }

        if (['play', 'pause'].includes(name)) {
          fakeAudio(null, name)
        }
      })
    })
  }, [get(data, 'playback.title'), get(data, 'playback.pos'), get(data, 'playback.playing')])

  const disconnect = () => {
    Cookies.remove('token')
    dispatch({ type: 'LOGOUT' })
    addToast("You're out.", { appearance: 'info' })
  }

  const isAdmin = get(state, 'user.name') === 'master'

  return (
    <Container>
      <Logo />

      <Menu>
        <LinkContainer>
          <Link to="/">
            <MdHome />
          </Link>
        </LinkContainer>

        {isAdmin && (
          <LinkContainer>
            <Link to="/torrents">
              <MdList />
            </Link>
          </LinkContainer>
        )}

        {isAdmin && (
          <LinkContainer>
            <Link to="/rss">
              <GoRss />
            </Link>
          </LinkContainer>
        )}

        {isAdmin && (
          <LinkContainer>
            <Link to="/settings">
              <MdSettings />
            </Link>
          </LinkContainer>
        )}

        <LinkContainer>
          <a onClick={disconnect}>
            <MdPowerSettingsNew />
          </a>
        </LinkContainer>
      </Menu>

      {data && !isMobile && !loading && (
        <Stats>
          <span>
            <IoIosArrowRoundUp />
            <span>{convertBytes(data.deluge.stats.upSpeed)}</span>
          </span>
          <span>
            <IoIosArrowRoundDown />
            <span>{convertBytes(data.deluge.stats.dlSpeed)}</span>
          </span>
          <span>
            <AiFillDatabase />
            <span>{convertBytes(data.deluge.stats.freeSpace)}</span>
          </span>
        </Stats>
      )}
    </Container>
  )
}
