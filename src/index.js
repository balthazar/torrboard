import React from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'
import { ApolloProvider } from '@apollo/react-hooks'
import styled, { ThemeProvider } from 'styled-components'
import Cookies from 'js-cookie'
import { ToastProvider } from 'react-toast-notifications'

import Toolbar, { TOOLBAR_WIDTH } from './components/Toolbar'
import Home from './components/Home'
import Torrents from './components/Torrents'
import Rss from './components/Rss'
import Settings from './components/Settings'
import Login from './components/Login'
import Toast from './components/Toast'

import theme from './theme'
import apolloClient from './apollo'
import { StoreProvider, useStore } from './state'

const Container = styled.div`
  display: flex;
  background-color: ${p => p.theme.bg2};
  color: ${p => p.theme.body};

  ${p =>
    p.user
      ? `
  > div:last-child {
    flex-grow: 1;
    margin-left: ${TOOLBAR_WIDTH};
    padding: 20px;
  }
`
      : ''}

  *:focus {
    outline-style: solid;
    outline-color: #0888ee;
    outline-width: 2px;
  }
`

const Content = () => {
  const [state, dispatch] = useStore()
  console.log(state)

  return (
    <Container user={state.user}>
      {state.user ? (
        <>
          <Toolbar />
          <Router>
            <Home path="/" />
            <Torrents path="/torrents" />
            <Rss path="/rss" />
            <Settings path="/settings" />
          </Router>
        </>
      ) : (
        <Login />
      )}
    </Container>
  )
}

const App = () => {
  return (
    <StoreProvider>
      <ThemeProvider theme={theme}>
        <ToastProvider
          placement="bottom-right"
          components={{ Toast }}
          autoDismiss
          autoDismissTimeout={2500}
        >
          <ApolloProvider client={apolloClient}>
            <Content />
          </ApolloProvider>
        </ToastProvider>
      </ThemeProvider>
    </StoreProvider>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
