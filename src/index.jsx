import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import styled, { ThemeProvider } from 'styled-components'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import { ToastProvider } from './components/toasts'

import Toolbar from './components/Toolbar'
import Home from './components/Home'
import Torrents from './components/Torrents'
import Rss from './components/Rss'
import Settings from './components/Settings'
import Login from './components/Login'
import TorrentDropZone from './components/TorrentDropZone'

import theme from './theme'
import apolloClient from './apollo'
import { StoreProvider, useStore } from './state'
const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: ${p => p.theme.colors.bg};
  color: ${p => p.theme.colors.text};

  --toolbar-w: 100px;
  --bottombar-h: 0px;

  ${p => p.theme.media.mobile} {
    --toolbar-w: 0px;
    --bottombar-h: 56px;
  }

  ${p =>
    p.$user
      ? `
  > div:last-child {
    flex-grow: 1;
    min-width: 0;
    padding-left: calc(var(--toolbar-w) + ${p.theme.spacing[5]});
    padding-right: ${p.theme.spacing[5]};
    padding-top: ${p.theme.spacing[5]};
    padding-bottom: calc(var(--bottombar-h) + ${p.theme.spacing[5]});

    ${p.theme.media.mobile} {
      padding-left: ${p.theme.spacing[3]};
      padding-right: ${p.theme.spacing[3]};
      padding-top: ${p.theme.spacing[3]};
      padding-bottom: calc(var(--bottombar-h) + ${p.theme.spacing[3]});
    }
  }
`
      : ''}

  *:focus-visible {
    outline: 1px solid ${p => p.theme.colors.accent};
    outline-offset: 2px;
  }

  input:focus-visible,
  textarea:focus-visible {
    outline: none;
  }
`

const Content = () => {
  const [state] = useStore()

  return (
    <Container $user={state.user}>
      {state.user ? (
        <>
          <Toolbar />
          <TorrentDropZone />
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
        <ToastProvider>
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
