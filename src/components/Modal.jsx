import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'

const ANIMATION_MS = 200

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`

const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`

const slideIn = keyframes`
  from { transform: translate3d(0, 24px, 0); opacity: 0; }
  to   { transform: translate3d(0, 0, 0); opacity: 1; }
`

const slideOut = keyframes`
  from { transform: translate3d(0, 0, 0); opacity: 1; }
  to   { transform: translate3d(0, 24px, 0); opacity: 0; }
`

const Root = styled.div`
  position: fixed;
  z-index: ${p => p.theme.z.modal};
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  pointer-events: ${p => (p.$closing ? 'none' : 'auto')};
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  animation: ${p => (p.$closing ? fadeOut : fadeIn)} ${ANIMATION_MS}ms ease forwards;
`

const Body = styled.div`
  position: relative;
  background-color: ${p => p.theme.colors.surface};
  color: ${p => p.theme.colors.text};
  border-radius: ${p => p.theme.radii.lg};
  margin-top: ${p => p.theme.spacing[7]};
  padding: ${p => p.theme.spacing[5]};
  width: 100%;
  max-width: 900px;
  max-height: calc(100vh - ${p => p.theme.spacing[8]});
  overflow-y: auto;
  overscroll-behavior: contain;
  animation: ${p => (p.$closing ? slideOut : slideIn)} ${ANIMATION_MS}ms ease forwards;

  ${p => p.theme.media.mobile} {
    margin-top: 0;
    padding: ${p => p.theme.spacing[3]};
    border-radius: 0;
    height: 100vh;
    max-height: 100vh;
    max-width: none;
    width: 100vw;
  }
`

export default ({ isOpened, onClose, children }) => {
  const [mounted, setMounted] = useState(isOpened)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (isOpened) {
      setMounted(true)
      setClosing(false)
      return undefined
    }
    if (!mounted) return undefined
    setClosing(true)
    const t = setTimeout(() => setMounted(false), ANIMATION_MS)
    return () => clearTimeout(t)
  }, [isOpened, mounted])

  useEffect(() => {
    if (!isOpened) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpened])

  useEffect(() => {
    if (!isOpened) return undefined
    const onKey = e => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpened, onClose])

  if (!mounted) return null

  return createPortal(
    <Root $closing={closing}>
      <Overlay onClick={onClose} $closing={closing} />
      <Body $closing={closing} onClick={e => e.stopPropagation()}>
        {children}
      </Body>
    </Root>,
    document.body,
  )
}
