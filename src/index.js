import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import styled, { ThemeProvider } from 'styled-components'
import { ToastProvider } from 'react-toast-notifications'

import Toolbar from './components/Toolbar'
import Home from './components/Home'
import Torrents from './components/Torrents'
import Rss from './components/Rss'
import Settings from './components/Settings'
import Login from './components/Login'
import Toast from './components/Toast'

import theme from './theme'
import apolloClient from './apollo'
import { StoreProvider, useStore } from './state'
import { TOOLBAR_WIDTH } from './config.client'

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
  const [state] = useStore()

  return (
    <Container user={state.user}>
      {state.user ? (
        <>
          <Toolbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/torrents" element={<Torrents />} />
            <Route path="/rss" element={<Rss />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </>
      ) : (
        <Routes>
          <Route path="/invite/:inviteCode" element={<Login />} />
          <Route path="*" element={<Login />} />
        </Routes>
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
            <BrowserRouter>
              <Content />
            </BrowserRouter>
          </ApolloProvider>
        </ToastProvider>
      </ThemeProvider>
    </StoreProvider>
  )
}

createRoot(document.getElementById('root')).render(<App />)

if (module.hot) {
  module.hot.accept()
}
