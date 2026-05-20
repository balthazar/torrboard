import styled from 'styled-components'
import { isMobile } from 'react-device-detect'

export const CARD_HEIGHT = isMobile ? 135 : 300
export const CARD_WIDTH = isMobile ? 90 : 200

export default styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: ${CARD_WIDTH} / ${CARD_HEIGHT};
  flex-shrink: 0;
  overflow: hidden;
  word-break: break-all;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: ${p => p.theme.radii.md};
  background-color: ${p => p.theme.colors.surface};
  background-image: ${p => (p.$bg ? `url(${p.$bg})` : 'none')};
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  /* Clip the cover to padding-box so a translucent border doesn't blend with
     the poster image; let the surface color fill the border-box behind it. */
  background-clip: padding-box, border-box;
  border: 1px solid ${p => p.theme.colors.border};
  transition: transform ${p => p.theme.motion.base},
    border-color ${p => p.theme.motion.base},
    box-shadow ${p => p.theme.motion.base};

  ${p =>
    p.$interactive
      ? `
    cursor: pointer;
    /* Promote to its own GPU layer so the background image is rasterized
       once and the hover translate doesn't re-snap sub-pixel offsets,
       which made off-aspect posters (the 380x562 OMDB crops) jitter. */
    will-change: transform;
    transform: translateZ(0);
    &:hover {
      transform: translate3d(0, -3px, 0);
      border-color: ${p.theme.colors.borderHover};
      box-shadow: ${p.theme.shadows.md};
    }
  `
      : ''}
`
