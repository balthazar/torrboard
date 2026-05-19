import React from 'react'
import { IoMdSearch } from 'react-icons/io'
import styled from 'styled-components'
import { isMobile } from 'react-device-detect'

const SearchContainer = styled.div`
  position: relative;
  width: 100%;
`

const SearchIcon = styled.div`
  position: absolute;
  left: ${p => p.theme.spacing[4]};
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  color: ${p => p.theme.colors.textMuted};
  pointer-events: none;
`

const StyledInput = styled.input`
  width: 100%;
  height: 44px;
  background-color: ${p => p.theme.colors.surface};
  color: ${p => p.theme.colors.text};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.lg};
  padding: 0 ${p => p.theme.spacing[4]} 0 44px;
  font-family: ${p => p.theme.font.sans};
  font-size: ${p => p.theme.font.size.base};
  transition: border-color ${p => p.theme.motion.base},
    box-shadow ${p => p.theme.motion.base};

  &::placeholder {
    color: ${p => p.theme.colors.textSubtle};
  }

  &:hover {
    border-color: ${p => p.theme.colors.borderHover};
  }

  &:focus {
    border-color: ${p => p.theme.colors.accent};
    box-shadow: 0 0 0 3px ${p => p.theme.colors.accent}26;
  }
`

export default ({ inputRef, style, ...rest }) => (
  <SearchContainer style={style}>
    <SearchIcon>
      <IoMdSearch size={18} />
    </SearchIcon>

    <StyledInput
      ref={inputRef}
      type="text"
      placeholder="Search...  /  to focus"
      autoFocus={!isMobile}
      {...rest}
    />
  </SearchContainer>
)
