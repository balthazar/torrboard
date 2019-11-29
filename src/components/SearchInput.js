import React from 'react'
import { IoMdSearch } from 'react-icons/io'
import styled from 'styled-components'

import theme from '../theme'

export const SearchContainer = styled.div`
  position: relative;
`

export const SearchIcon = styled.div`
  position: absolute;
  left: 20px;
  top: 15px;
`

export const SearchInput = styled.input`
  background-color: ${p => p.theme.bg};
  color: ${p => p.theme.body};
  border-radius: 3px;
  height: 48px;
  width: 100%;
  padding: 10px 20px 10px 60px;
  font-size: 10pt;

  box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.2),
    0px 2px 1px -1px rgba(0, 0, 0, 0.2);
`

export default props => (
  <SearchContainer className="search-container">
    <SearchIcon>
      <IoMdSearch size={20} color={theme.body} />
    </SearchIcon>

    <SearchInput type="text" placeholder="Search..." autoFocus {...props} />
  </SearchContainer>
)
