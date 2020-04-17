import styled from 'styled-components'
import { isMobile } from 'react-device-detect'

export const Filters = styled.div`
  margin: 10px -5px;
  display: flex;
  flex-wrap: wrap;

  > * {
    display: flex;
    flex-wrap: wrap;
    overflow: hidden;
    border-radius: 3px;
    margin: 5px;
  }
`

export const FilterValue = styled.span`
  background-color: ${p => (p.active ? p.theme.blue : p.theme.bg)};
  padding: 4px 8px;
  cursor: pointer;
  font-size: ${isMobile ? 10 : 13}px;
`
