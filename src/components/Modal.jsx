import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'
import { isMobile } from 'react-device-detect'
import { MdClose } from 'react-icons/md'

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
  from { transform: translate3d(0, -90px, 0); opacity: 0; }
  to   { transform: translate3d(0, 0, 0); opacity: 1; }
`

const slideOut = keyframes`
  from { transform: translate3d(0, 0, 0); opacity: 1; }
  to   { transform: translate3d(0, -90px, 0); opacity: 0; }
`

const Root = styled.div`
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  pointer-events: ${p => (p.$closing ? 'none' : 'auto')};
`

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  animation: ${p => (p.$closing ? fadeOut : fadeIn)} ${ANIMATION_MS}ms ease forwards;
`

const Body = styled.div`
  padding: ${isMobile ? 10 : 20}px;
  margin-top: ${isMobile ? 0 : 100}px;
  background-color: ${p => p.theme.bg2};
  color: ${p => p.theme.body};
  display: flex;
  position: relative;
  animation: ${p => (p.$closing ? slideOut : slideIn)} ${ANIMATION_MS}ms ease forwards;

  ${isMobile
    ? `
  height: 100vh;
  width: 100vw;
  `
    : `
  min-width: 400px;
  max-width: 600px;
  `}
`

const CloseButton = styled.div`
  position: absolute;
  background-color: rgba(0, 0, 0, 0.2);
  width: 100%;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;

  bottom: 0;
  right: 0;
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

  if (!mounted) return null

  return createPortal(
    <Root $closing={closing}>
      <Overlay onClick={onClose} $closing={closing} />
      <Body $closing={closing}>
        {children}
        {isMobile && (
          <CloseButton onClick={onClose}>
            <MdClose />
          </CloseButton>
        )}
      </Body>
    </Root>,
    document.body,
  )
}
