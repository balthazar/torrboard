import React, { useEffect } from 'react'
import styled from 'styled-components'
import { gql, useQuery, useMutation } from '@apollo/client'
import { NavLink } from 'react-router-dom'
import { GoRss } from 'react-icons/go'
import { MdHome, MdList, MdSettings, MdPowerSettingsNew } from 'react-icons/md'
import { IoIosArrowRoundDown, IoIosArrowRoundUp } from 'react-icons/io'
import { AiFillDatabase } from 'react-icons/ai'
import Cookies from 'js-cookie'
import get from 'lodash/get'
import { useToasts } from './toasts'
import { isMobile } from 'react-device-detect'

import convertBytes from '../fn/convertBytes'
import fakeAudio from '../fn/fakeAudio'
import { useStore } from '../state'
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
  z-index: ${p => p.theme.z.toolbar};
  background-color: ${p => p.theme.colors.surface};
  border-right: 1px solid ${p => p.theme.colors.border};

  top: 0;
  left: 0;
  width: 100px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;

  ${p => p.theme.media.mobile} {
    top: auto;
    bottom: 0;
    right: 0;
    width: auto;
    height: 56px;
    flex-direction: row;
    border-right: none;
    border-top: 1px solid ${p => p.theme.colors.border};
  }
`

const Menu = styled.nav`
  margin-top: ${p => p.theme.spacing[5]};
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${p => p.theme.spacing[1]};
  width: 100%;

  ${p => p.theme.media.mobile} {
    margin-top: 0;
    flex-direction: row;
    gap: 0;
    height: 100%;
  }
`

const navStyles = `
  position: relative;
  width: 100px;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`

const NavItem = styled(NavLink)`
  ${navStyles}
  color: ${p => p.theme.colors.textMuted};
  text-decoration: none;
  transition: color ${p => p.theme.motion.fast},
    background-color ${p => p.theme.motion.fast};

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 30%;
    bottom: 30%;
    width: 3px;
    border-radius: 0 2px 2px 0;
    background-color: transparent;
    transition: background-color ${p => p.theme.motion.fast};
  }

  &:hover {
    color: ${p => p.theme.colors.text};
    background-color: ${p => p.theme.colors.surfaceHover};
  }

  &.active {
    color: ${p => p.theme.colors.accent};
    background-color: ${p => p.theme.colors.surfaceHover};
  }

  &.active::before {
    background-color: ${p => p.theme.colors.accent};
  }

  ${p => p.theme.media.mobile} {
    flex: 1;
    width: auto;
    height: 100%;

    &::before {
      left: 50%;
      top: auto;
      bottom: 0;
      width: 24px;
      height: 3px;
      border-radius: 2px 2px 0 0;
      transform: translateX(-50%);
    }
  }
`

const Disconnect = styled.button`
  ${navStyles}
  color: ${p => p.theme.colors.textMuted};
  background: none;
  transition: color ${p => p.theme.motion.fast},
    background-color ${p => p.theme.motion.fast};

  &:hover {
    color: ${p => p.theme.colors.error};
    background-color: ${p => p.theme.colors.surfaceHover};
  }

  ${p => p.theme.media.mobile} {
    flex: 1;
    width: auto;
    height: 100%;
  }
`

const Stats = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${p => p.theme.spacing[2]};
  padding: ${p => p.theme.spacing[3]} 0;
  margin-bottom: ${p => p.theme.spacing[2]};
  width: 100px;
  border-top: 1px solid ${p => p.theme.colors.border};
  padding-top: ${p => p.theme.spacing[3]};

  ${p => p.theme.media.mobile} {
    display: none;
  }
`

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-family: ${p => p.theme.font.mono};
  font-size: ${p => p.theme.font.size.xs};
  color: ${p => p.theme.colors.textMuted};

  > svg {
    color: ${p => p.theme.colors.textSubtle};
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

    const { image, title, pos, duration, playing } = data.playback

    fakeAudio(false, playing ? 'play' : 'pause')

    if (!('mediaSession' in navigator)) {
      return
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: pos && duration ? `${pos}/${duration}` : 'Loading..',
      artwork: [{ src: image, sizes: '512x512', type: 'image/png' }],
    })

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
        <NavItem to="/" end>
          <MdHome size={20} />
        </NavItem>

        {isAdmin && (
          <NavItem to="/torrents">
            <MdList size={20} />
          </NavItem>
        )}

        {isAdmin && (
          <NavItem to="/rss">
            <GoRss size={18} />
          </NavItem>
        )}

        {isAdmin && (
          <NavItem to="/settings">
            <MdSettings size={20} />
          </NavItem>
        )}

        <Disconnect onClick={disconnect} aria-label="Sign out">
          <MdPowerSettingsNew size={20} />
        </Disconnect>
      </Menu>

      {data && !isMobile && !loading && (
        <Stats>
          <Stat>
            <IoIosArrowRoundUp size={16} />
            <span>{convertBytes(data.deluge.stats.upSpeed)}</span>
          </Stat>
          <Stat>
            <IoIosArrowRoundDown size={16} />
            <span>{convertBytes(data.deluge.stats.dlSpeed)}</span>
          </Stat>
          <Stat>
            <AiFillDatabase size={13} />
            <span>{convertBytes(data.deluge.stats.freeSpace)}</span>
          </Stat>
        </Stats>
      )}
    </Container>
  )
}
