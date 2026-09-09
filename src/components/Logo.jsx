import React, { useId, useState } from 'react'
import styled, { keyframes } from 'styled-components'

// The mark is a B cut into vertical ribbons that rise and settle into the
// glyph, the way the Netflix N assembles itself. The ribbons are plain rects
// clipped to the B outline, so the shape lives in exactly one path and the
// motion is pure CSS: no animation library, no sprite, and it scales to any
// size the toolbar or the login screen asks for.
export const B_PATH = `
  M22,10 H56 A18,19 0 0 1 56,48 H60 A20,21 0 0 1 60,90 H22 Z
  M36,22 H54 A7,7 0 0 1 54,36 H36 Z
  M36,60 H58 A8,8 0 0 1 58,76 H36 Z
`

// Tints the ribbons carry on the way up, so they read as separate folds
// mid-flight. They converge on the flat accent once settled: held permanently,
// the banding reads as a barcode rather than as a logo.
const SHADE = ['light', 'base', 'dark', 'base', 'light', 'base', 'dark']

const STRIP_X = 20
const STRIP_W = 62 / SHADE.length

const shadeFor = (theme, name) =>
  ({
    light: theme.colors.accentHover,
    base: theme.colors.accent,
    dark: '#0466b0',
  }[name])

const rise = keyframes`
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  60% {
    opacity: 1;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`

const RISE_MS = 620
const STAGGER_MS = 55

// Keyframes are defined once and shared by every strip, so the destination
// colour has to travel in as a custom property rather than an interpolation.
const settle = keyframes`
  to {
    fill: var(--settled);
  }
`

const Strip = styled.rect`
  --settled: ${p => p.theme.colors.accent};
  fill: ${p => shadeFor(p.theme, p.$shade)};
  opacity: 0;
  animation: ${rise} ${RISE_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1) ${p => p.$i * STAGGER_MS}ms
      forwards,
    ${settle} 320ms ease ${p => p.$i * STAGGER_MS + RISE_MS - 120}ms forwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    fill: var(--settled);
  }
`

const Svg = styled.svg`
  display: block;
`

// Remounting on hover is what replays the animation: restarting a CSS
// animation that has already run needs the element torn down, and a changing
// key is a great deal less machinery than juggling animation-name.
export const BMark = ({ size = 32, replayOnHover = false }) => {
  const [run, setRun] = useState(0)
  // useId keeps two marks on one page (toolbar and login never overlap today,
  // but nothing stops them) from both defining the same clipPath id.
  const uid = useId().replace(/:/g, '')
  const clipId = `b-clip-${uid}-${run}`

  return (
    <Svg
      key={run}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="bFlix"
      onMouseEnter={replayOnHover ? () => setRun(r => r + 1) : undefined}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={B_PATH} fillRule="evenodd" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {SHADE.map((shade, i) => (
          <Strip
            key={i}
            $i={i}
            $shade={shade}
            x={STRIP_X + i * STRIP_W}
            // Overlap by a hair; exact-width neighbours leave seams when the
            // browser rounds subpixel edges at small sizes.
            width={STRIP_W + 0.5}
            y={0}
            height={100}
          />
        ))}
      </g>
    </Svg>
  )
}

const Chip = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: ${p => p.theme.spacing[4]};
  flex-shrink: 0;

  width: 50px;
  height: 50px;
  border-radius: ${p => p.theme.radii.md};
  background-color: ${p => p.theme.colors.bg};
  border: 1px solid ${p => p.theme.colors.border};

  ${p => p.theme.media.mobile} {
    display: none;
  }
`

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

const Lockup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${p => p.theme.spacing[3]};
`

const Wordmark = styled.span`
  font-size: ${p => p.theme.font.size['2xl']};
  font-weight: ${p => p.theme.font.weight.bold};
  letter-spacing: ${p => p.theme.font.tracking.tight};
  color: ${p => p.theme.colors.text};
  opacity: 0;
  animation: ${fadeUp} 420ms ease forwards;
  animation-delay: 480ms;

  ${p => p.theme.media.mobile} {
    font-size: ${p => p.theme.font.size.xl};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }

  > b {
    color: ${p => p.theme.colors.accent};
    font-weight: inherit;
  }
`

// Login has room for the full lockup, and it is the one screen where the
// animation reliably gets seen.
export const LogoLockup = ({ size = 72 }) => (
  <Lockup>
    <BMark size={size} />
    <Wordmark>
      <b>b</b>Flix
    </Wordmark>
  </Lockup>
)

export default () => (
  <Chip>
    <BMark size={32} replayOnHover />
  </Chip>
)
