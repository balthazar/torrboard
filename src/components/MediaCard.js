import styled from 'styled-components'
import { isMobile } from 'react-device-detect'

export const CARD_HEIGHT = isMobile ? 135 : 300
export const CARD_WIDTH = isMobile ? 90 : 200

export default styled.div`
  position: relative;
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  flex-shrink: 0;
  overflow: hidden;
  word-break: break-all;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: ${p => p.theme.radii.md};
  background: ${p => (p.$bg ? `url(${p.$bg}) center/cover no-repeat` : p.theme.colors.surface)};
  border: 1px solid ${p => p.theme.colors.border};
  transition: transform ${p => p.theme.motion.base},
    border-color ${p => p.theme.motion.base},
    box-shadow ${p => p.theme.motion.base};

  ${p =>
    p.$interactive
      ? `
    cursor: pointer;
    &:hover {
      transform: translateY(-3px);
      border-color: ${p.theme.colors.borderHover};
      box-shadow: ${p.theme.shadows.md};
    }
  `
      : ''}
`
