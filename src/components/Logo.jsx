import React from 'react'
import styled from 'styled-components'

import { IMAGE_URL } from '../config.client'

const Logo = styled.div`
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

export default () => (
  <Logo>
    <img src={IMAGE_URL} width={32} />
  </Logo>
)
