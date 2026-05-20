import React from 'react'
import styled from 'styled-components'

import { IMAGE_URL, TOOLBAR_WIDTH } from '../config.client'

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: ${p => p.theme.spacing[4]};
  flex-shrink: 0;

  width: ${TOOLBAR_WIDTH / 2}px;
  height: ${TOOLBAR_WIDTH / 2}px;
  border-radius: ${p => p.theme.radii.md};
  background-color: ${p => p.theme.colors.bg};
  border: 1px solid ${p => p.theme.colors.border};
`

export default () => (
  <Logo>
    <img src={IMAGE_URL} width={TOOLBAR_WIDTH / 3} />
  </Logo>
)
