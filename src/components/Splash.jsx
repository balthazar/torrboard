import React, { useEffect, useMemo, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import get from 'lodash/get'

import { LogoLockup } from './Logo'
import { useStore } from '../state'
import greeting from '../fn/greeting'

// The splash overlays the app rather than gating it: everything mounts and
// fetches underneath while this is on screen, so the second it costs is free
// and a slow query never hides behind it.
const SESSION_KEY = 'bflix:splashed'

const FADE_MS = 320
const FADE_AT = 1900
// Lands at 620 + 320 = 940ms, alongside the wordmark (900ms) and the last
// ribbon (950ms). Everything is then settled and still for the ~950ms before
// FADE_AT, which is what makes the greeting readable rather than something
// that flashes past while it is still animating in.
const GREETING_DELAY = 620
const GREETING_MS = 320

// Reduced motion skips the assembly, but the greeting still has to be readable:
// with nothing animating it is legible from the first frame, so a shorter hold
// buys the same reading time the animated path gets after it settles.
const REDUCED = { fadeAt: 1100, fade: 200 }

const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// Storage throws outright in some privacy modes rather than returning null, and
// a splash is not worth an exception on boot. When it is unreadable we play:
// erring toward the intended experience beats erring toward a blank moment.
const claimFirstLoad = () => {
  try {
    if (window.sessionStorage.getItem(SESSION_KEY)) {
      return false
    }
    window.sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // ignore
  }

  return true
}

const fadeUp = keyframes`
  from {
    transform: translateY(6px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${p => p.theme.z.splash};

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${p => p.theme.spacing[5]};

  background-color: ${p => p.theme.colors.bg};

  opacity: ${p => (p.$leaving ? 0 : 1)};
  transition: opacity ${p => p.$fade}ms ease;
  // Swallow clicks while it covers the app, so nothing is hit blind, then get
  // out of the way the moment the fade starts.
  pointer-events: ${p => (p.$leaving ? 'none' : 'auto')};
`

const Greeting = styled.span`
  font-size: ${p => p.theme.font.size.md};
  color: ${p => p.theme.colors.textMuted};
  padding: 0 ${p => p.theme.spacing[5]};
  text-align: center;
  opacity: 0;
  animation: ${fadeUp} ${GREETING_MS}ms ease ${GREETING_DELAY}ms forwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`

export default () => {
  const [state] = useStore()

  // Decided once, on the first render: the flag is claimed here so a remount
  // (or React's development double-invoke) cannot play it twice.
  const [playing, setPlaying] = useState(claimFirstLoad)
  const [leaving, setLeaving] = useState(false)

  const reduced = useMemo(prefersReducedMotion, [])
  const fadeAt = reduced ? REDUCED.fadeAt : FADE_AT
  const fade = reduced ? REDUCED.fade : FADE_MS

  // The name comes off the JWT cookie, decoded synchronously in the store, so
  // it is already here on the first frame with no request to wait on.
  const name = get(state, 'user.name')
  const line = useMemo(() => greeting(name), [name])

  useEffect(() => {
    if (!playing) {
      return undefined
    }

    const toFade = setTimeout(() => setLeaving(true), fadeAt)
    const toEnd = setTimeout(() => setPlaying(false), fadeAt + fade)

    return () => {
      clearTimeout(toFade)
      clearTimeout(toEnd)
    }
  }, [playing, fadeAt, fade])

  if (!playing) {
    return null
  }

  return (
    <Overlay $leaving={leaving} $fade={fade} aria-hidden="true">
      <LogoLockup size={96} />
      {line && <Greeting>{line}</Greeting>}
    </Overlay>
  )
}
