import React from 'react'
import styled from 'styled-components'

const hexToRgb = hex =>
  hex
    .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => `#${r + r + g + g + b + b}`)
    .substring(1)
    .match(/.{2}/g)
    .map(x => parseInt(x, 16))

const Toast = styled.div`
  background-color: ${p => p.theme.bg};

  > div {
    padding: 10px 20px;
    max-width: 400px;
    cursor: pointer;
    margin-top: 5px;

    display: flex;
    align-items: center;

    box-shadow: 0 0 10px ${p => p.theme.opacityDark(0.4)};

    background-color: ${p => `rgba(${hexToRgb(p.theme.toasts[p.type]).join(', ')}, 0.4)`};
    color: ${p => p.theme.body};

    > * + * {
      margin-left: 10px;
    }
  }
`

const Dot = styled.div`
  width: 7px;
  height: 7px;
  background-color: ${p => p.theme.toasts[p.type]};
  border-radius: 50%;
`

export default ({ appearance: type, children }) => (
  <Toast type={type}>
    <div>
      <Dot type={type} />
      <span>{children}</span>
    </div>
  </Toast>
)
