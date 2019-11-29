import React from 'react'
import styled from 'styled-components'
import { Link } from '@reach/router'
import { GoRss } from 'react-icons/go'
import { MdHome, MdList, MdSettings } from 'react-icons/md'

export const TOOLBAR_WIDTH = 100

const Container = styled.div`
  position: fixed;
  height: 100vh;
  width: ${TOOLBAR_WIDTH}px;
  background-color: ${p => p.theme.bg};

  display: flex;
  flex-direction: column;
  align-items: center;
`

const Logo = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 30px;

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

export default () => {
  return (
    <Container>
      <Logo>TB</Logo>
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
    </Container>
  )
}
