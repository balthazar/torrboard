import React from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'
import styled, { ThemeProvider } from 'styled-components'

import Toolbar, { TOOLBAR_WIDTH } from './components/Toolbar'
import Home from './components/Home'
import Torrents from './components/Torrents'
import Settings from './components/Settings'

import theme from './theme'

const Container = styled.div`
  display: flex;
  background-color: ${p => p.theme.bg2};
  color: ${p => p.theme.body};

  > div:last-child {
    flex-grow: 1;
    margin-left: ${TOOLBAR_WIDTH};
    padding: 20px;
  }

  *:focus {
    outline-style: solid;
    outline-color: #0888ee;
    outline-width: 2px;
  }
`

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <Container>
        <Toolbar />
        <Router>
          <Home path="/" />
          <Settings path="/settings" />
          <Torrents path="/torrents" />
        </Router>
      </Container>
    </ThemeProvider>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
