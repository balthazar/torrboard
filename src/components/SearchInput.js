import React from 'react'
import { IoMdSearch } from 'react-icons/io'
import styled from 'styled-components'
import { isMobile } from 'react-device-detect'

import Input from './Input'
import theme from '../theme'

const SearchContainer = styled.div`
  position: relative;
`

const SearchIcon = styled.div`
  position: absolute;
  left: 20px;
  top: 15px;
`

export const SearchInput = styled(Input)`
  width: 100%;
  padding: 10px 20px 10px 60px;
`

export default props => (
  <SearchContainer style={props.style}>
    <SearchIcon>
      <IoMdSearch size={20} color={theme.body} />
    </SearchIcon>

    <SearchInput type="text" placeholder="Search..." autoFocus={!isMobile} {...props} />
  </SearchContainer>
)
