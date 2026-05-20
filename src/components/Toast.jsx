import React from 'react'
import styled from 'styled-components'

const Toast = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing[3]};
  padding: ${p => p.theme.spacing[3]} ${p => p.theme.spacing[4]};
  background-color: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-left: 3px solid ${p => p.theme.toasts[p.$type]};
  border-radius: ${p => p.theme.radii.md};
  box-shadow: ${p => p.theme.shadows.md};
  color: ${p => p.theme.colors.text};
  font-size: ${p => p.theme.font.size.sm};
  font-weight: ${p => p.theme.font.weight.medium};
  cursor: pointer;
  max-width: 400px;
  min-width: 220px;
`

const Dot = styled.span`
  width: 8px;
  height: 8px;
  background-color: ${p => p.theme.toasts[p.$type]};
  border-radius: 50%;
  flex-shrink: 0;
`

export default ({ appearance: type, children }) => (
  <Toast $type={type}>
    <Dot $type={type} />
    <span>{children}</span>
  </Toast>
)
