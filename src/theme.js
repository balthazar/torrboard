const red = '#DC1A1A'
const blue = '#0697ff'
const green = '#5cb85d'
const black = '#232323'

const colors = {
  red,
  blue,
  green,

  bg: '#1a1a1a',
  surface: '#262626',
  surfaceHover: '#2e2e2e',
  surfaceActive: '#383838',

  border: 'rgba(255, 255, 255, 0.08)',
  borderHover: 'rgba(255, 255, 255, 0.16)',
  borderActive: 'rgba(255, 255, 255, 0.24)',

  text: '#f5f5f5',
  textMuted: 'rgba(245, 245, 245, 0.65)',
  textSubtle: 'rgba(245, 245, 245, 0.4)',

  accent: blue,
  accentHover: '#3aaaff',
  success: green,
  warning: '#f0ad4e',
  error: red,
  info: blue,
}

const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '24px',
  6: '32px',
  7: '48px',
  8: '64px',
}

const font = {
  sans: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: '"Source Code Pro", "JetBrains Mono", ui-monospace, monospace',

  size: {
    xs: '11px',
    sm: '13px',
    base: '14px',
    md: '15px',
    lg: '18px',
    xl: '22px',
    '2xl': '28px',
    '3xl': '36px',
  },

  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  leading: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },

  tracking: {
    tight: '-0.01em',
    normal: '0',
    wide: '0.02em',
    wider: '0.08em',
  },
}

const radii = {
  sm: '4px',
  md: '6px',
  lg: '10px',
  xl: '16px',
  full: '9999px',
}

const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.25)',
  md: '0 4px 12px rgba(0, 0, 0, 0.35)',
  lg: '0 10px 30px rgba(0, 0, 0, 0.5)',
  glow: `0 0 0 1px ${colors.accent}33, 0 8px 24px ${colors.accent}26`,
}

const motion = {
  fast: '120ms ease',
  base: '180ms ease',
  slow: '320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
}

const z = {
  base: 0,
  toolbar: 10,
  toast: 50,
  modal: 100,
}

const breakpoints = {
  mobile: '600px',
  tablet: '900px',
}

const media = {
  mobile: `@media (max-width: ${breakpoints.mobile})`,
  tablet: `@media (max-width: ${breakpoints.tablet})`,
}

export default {
  red,
  blue,
  green,
  black,

  bg: colors.bg,
  bg2: colors.surface,
  body: colors.text,

  opacityLight: opacity => `rgba(255, 255, 255, ${opacity})`,
  opacityDark: opacity => `rgba(0, 0, 0, ${opacity})`,

  toasts: {
    error: red,
    info: blue,
    success: green,
  },

  colors,
  spacing,
  font,
  radii,
  shadows,
  motion,
  z,
  breakpoints,
  media,
}
