import styled from 'styled-components'

export default styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${p => p.theme.spacing[2]};
  padding: 0 ${p => p.theme.spacing[4]};
  height: 40px;
  background-color: ${p => (p.disabled ? p.theme.colors.surfaceHover : p.theme.colors.accent)};
  color: ${p => (p.disabled ? p.theme.colors.textSubtle : '#fff')};
  border-radius: ${p => p.theme.radii.md};
  font-family: ${p => p.theme.font.sans};
  font-size: ${p => p.theme.font.size.sm};
  font-weight: ${p => p.theme.font.weight.semibold};
  letter-spacing: ${p => p.theme.font.tracking.wide};
  cursor: ${p => (p.disabled ? 'default' : 'pointer')};
  transition: background-color ${p => p.theme.motion.fast};

  &:hover:not(:disabled) {
    background-color: ${p => p.theme.colors.accentHover};
  }
`
