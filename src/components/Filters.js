import styled from 'styled-components'

export const Filters = styled.div`
  margin: 20px 0;
  display: flex;

  > * {
    display: flex;
    flex-wrap: wrap;
    overflow: hidden;
    border-radius: 3px;
  }

  > * + * {
    margin-left: 20px;
  }
`

export const FilterValue = styled.span`
  background-color: ${p => (p.active ? p.theme.blue : p.theme.bg)};
  padding: 4px 8px;
  cursor: pointer;
  font-size: 13px;
`
