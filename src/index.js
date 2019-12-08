import React from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'
import { ApolloProvider } from '@apollo/react-hooks'
import styled, { ThemeProvider } from 'styled-components'

import Toolbar, { TOOLBAR_WIDTH } from './components/Toolbar'
import Home from './components/Home'
import Torrents from './components/Torrents'
import Rss from './components/Rss'
import Settings from './components/Settings'

import theme from './theme'
import apolloClient from './apollo'

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
    <ApolloProvider client={apolloClient}>
      <ThemeProvider theme={theme}>
        <Container>
          <Toolbar />
          <Router>
            <Home path="/" />
            <Torrents path="/torrents" />
            <Rss path="/rss" />
            <Settings path="/settings" />
          </Router>
        </Container>
      </ThemeProvider>
    </ApolloProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
