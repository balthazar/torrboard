import React from 'react'
import styled from 'styled-components'

import { IMAGE_URL, TOOLBAR_WIDTH } from '../config'

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 30px;
  flex-shrink: 0;

  width: ${TOOLBAR_WIDTH / 2}px;
  height: ${TOOLBAR_WIDTH / 2}px;
  border-radius: 50%;
  background-color: ${p => p.theme.opacityLight(0.2)};
`

export default () => (
  <Logo>
    <img src={IMAGE_URL} width={TOOLBAR_WIDTH / 4} />
  </Logo>
)
