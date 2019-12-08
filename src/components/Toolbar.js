import React from 'react'
import styled from 'styled-components'
import { useQuery } from '@apollo/react-hooks'
import gql from 'graphql-tag'
import { Link } from '@reach/router'
import { GoRss } from 'react-icons/go'
import { MdHome, MdList, MdSettings, MdPowerSettingsNew } from 'react-icons/md'
import { IoIosArrowRoundDown, IoIosArrowRoundUp } from 'react-icons/io'
import { AiFillDatabase } from 'react-icons/ai'
import Cookies from 'js-cookie'
import get from 'lodash/get'
import { useToasts } from 'react-toast-notifications'

import convertBytes from '../fn/convertBytes'
import { useStore } from '../state'
import Logo from './Logo'

export const TOOLBAR_WIDTH = 100

const GET_STATS = gql`
  {
    deluge {
      stats {
        upSpeed
        dlSpeed
        freeSpace
      }
    }
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

  const { addToast } = useToasts()

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

      {data && !loading && (
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
