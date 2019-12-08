import React from 'react'
import styled from 'styled-components'
import { useQuery } from '@apollo/react-hooks'
import gql from 'graphql-tag'
import { Link } from '@reach/router'
import { GoRss } from 'react-icons/go'
import { MdHome, MdList, MdSettings } from 'react-icons/md'
import { IoIosArrowRoundDown, IoIosArrowRoundUp } from 'react-icons/io'
import { AiFillDatabase } from 'react-icons/ai'

import convertBytes from '../fn/convertBytes'

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

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 30px;
  flex-shrink: 0;

  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: ${p => p.theme.opacityLight(0.2)};
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
  const { loading, data } = useQuery(GET_STATS, {
    pollInterval: 1e3,
  })

  return (
    <Container>
      <Logo>
        <img src="http://media.balthazargronon.com/dl/statics/torrboard.png" width="25" />
      </Logo>

      <Menu>
        <LinkContainer>
          <Link to="/">
            <MdHome />
          </Link>
        </LinkContainer>

        <LinkContainer>
          <Link to="/torrents">
            <MdList />
          </Link>
        </LinkContainer>

        <LinkContainer>
          <Link to="/rss">
            <GoRss />
          </Link>
        </LinkContainer>

        <LinkContainer>
          <Link to="/settings">
            <MdSettings />
          </Link>
        </LinkContainer>
      </Menu>

      {!loading && (
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
