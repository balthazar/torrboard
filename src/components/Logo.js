import React from 'react'
import styled from 'styled-components'

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 30px;
  flex-shrink: 0;

  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: ${p => p.theme.opacityLight(0.2)};
`

export default () => (
  <Logo>
    <img src="http://media.balthazargronon.com/dl/statics/torrboard.png" width="25" />
  </Logo>
)
