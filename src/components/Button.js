import styled from 'styled-components'

export default styled.button`
  background-color: ${p => (p.disabled ? '#ececec' : p.theme.blue)};
  padding: 10px;
  border-radius: 3px;
  cursor: ${p => (p.disabled ? 'default' : 'pointer')};
`
