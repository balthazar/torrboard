import styled from 'styled-components'

export const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${p => p.theme.spacing[5]};
  margin: ${p => p.theme.spacing[3]} 0;

  > * {
    display: flex;
    flex-wrap: wrap;
    gap: ${p => p.theme.spacing[2]};
  }
`

export const FilterValue = styled.span`
  padding: 5px ${p => p.theme.spacing[3]};
  border-radius: ${p => p.theme.radii.full};
  font-size: ${p => p.theme.font.size.xs};
  font-weight: ${p => p.theme.font.weight.medium};
  letter-spacing: ${p => p.theme.font.tracking.wide};
  text-transform: uppercase;
  cursor: pointer;
  user-select: none;
  transition: background-color ${p => p.theme.motion.fast},
    color ${p => p.theme.motion.fast},
    border-color ${p => p.theme.motion.fast};

  background-color: ${p => (p.$active ? p.theme.colors.accent : 'transparent')};
  color: ${p => (p.$active ? '#fff' : p.theme.colors.textMuted)};
  border: 1px solid ${p => (p.$active ? p.theme.colors.accent : p.theme.colors.border)};

  &:hover {
    color: ${p => (p.$active ? '#fff' : p.theme.colors.text)};
    border-color: ${p => (p.$active ? p.theme.colors.accent : p.theme.colors.borderHover)};
  }
`
