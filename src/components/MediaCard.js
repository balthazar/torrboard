import styled from 'styled-components'
import { isMobile } from 'react-device-detect'

export const CARD_HEIGHT = isMobile ? 135 : 300
export const CARD_WIDTH = isMobile ? 90 : 200

export default styled.div`
  background: ${p => (p.bg ? `url(${p.bg})` : p.theme.bg)};
  background-size: cover;
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  margin: 5px;
  word-break: break-all;
  flex-shrink: 0;
  overflow: hidden;

  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  ${p =>
    p.interactive
      ? `
  cursor: pointer;
  border: 2px solid ${p.theme.black};
  &:hover {
    border-color: ${p.theme.blue};
  }
`
      : ''};
`
