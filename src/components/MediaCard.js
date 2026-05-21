import styled from 'styled-components'

export const CARD_HEIGHT = 300
export const CARD_WIDTH = 200

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
  background-clip: padding-box, border-box;
  border: 1px solid ${p => p.theme.colors.border};
  transition: transform ${p => p.theme.motion.base},
    border-color ${p => p.theme.motion.base},
    box-shadow ${p => p.theme.motion.base};

  ${p =>
    p.$interactive
      ? `
    cursor: pointer;
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
