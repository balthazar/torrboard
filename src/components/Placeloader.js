import styled, { keyframes } from 'styled-components'

const loaderAnim = keyframes`
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: 0 0;
  }
`

export default styled.div`
  animation: ${loaderAnim} ${p => p.time || 1000}ms linear infinite;
  background-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.25) 100%);
  background-size: 200%;
`
