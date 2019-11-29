import styled from 'styled-components'

export const CARD_HEIGHT = 300
export const CARD_WIDTH = 200

export default styled.div`
  background: ${p => (p.bg ? `url(${p.bg})` : p.theme.bg)};
  background-size: cover;
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  margin: 5px;
  word-break: break-all;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

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
