import styled from 'styled-components'

export default styled.input`
  background-color: ${p => p.theme.bg};
  color: ${p => p.theme.body};
  border-radius: 3px;
  height: 48px;
  font-size: 10pt;
  padding: 10px 20px 10px 20px;

  box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.2),
    0px 2px 1px -1px rgba(0, 0, 0, 0.2);
`
