import styled from 'styled-components'

export default styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  position: absolute;
  top: 50%;
  left: 50%;

  transform: translate(-50%, -50%);

  > div:first-child {
    margin-bottom: 30px;
  }

  > input {
    width: 300px;
    & + input {
      margin-top: 10px;
    }
  }
`
