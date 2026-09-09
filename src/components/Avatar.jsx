import React, { useRef } from 'react'
import styled from 'styled-components'
import { MdPhotoCamera } from 'react-icons/md'

import { BASE_URL } from '../config.client'

// Spread across the hue circle so adjacent names in the settings list rarely
// land on the same colour. Saturation and lightness are fixed low-ish to sit
// against the dark surface without shouting.
const hueFor = name => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360
  }
  return hash
}

const initialsFor = name =>
  name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || '?'

const Wrap = styled.div`
  position: relative;
  flex-shrink: 0;
  width: ${p => p.$size}px;
  height: ${p => p.$size}px;
  border-radius: ${p => p.theme.radii.full};
  overflow: hidden;
  cursor: ${p => (p.$editable ? 'pointer' : 'default')};

  > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

const Initials = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: hsl(${p => p.$hue}, 42%, 32%);
  color: ${p => p.theme.colors.text};
  font-weight: ${p => p.theme.font.weight.semibold};
  font-size: ${p => Math.round(p.$size * 0.38)}px;
  letter-spacing: ${p => p.theme.font.tracking.wide};
  user-select: none;
`

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.55);
  color: ${p => p.theme.colors.text};
  opacity: 0;
  transition: opacity ${p => p.theme.motion.fast};

  ${Wrap}:hover & {
    opacity: 1;
  }
`

const HiddenInput = styled.input`
  display: none;
`

// `updatedAt` is both the "does this user have a picture" flag and the
// cache-buster: the route revalidates, but the query string means a replaced
// face repaints without waiting on a conditional request.
export default ({ name, updatedAt, size = 36, onPick }) => {
  const inputRef = useRef(null)
  const editable = !!onPick

  const pick = e => {
    const file = e.target.files && e.target.files[0]
    // Reset first so picking the same file twice in a row still fires change.
    e.target.value = ''
    if (file) {
      onPick(file)
    }
  }

  return (
    <Wrap
      $size={size}
      $editable={editable}
      onClick={editable ? () => inputRef.current.click() : undefined}
      title={editable ? `Change ${name}'s picture` : name}
    >
      {updatedAt ? (
        <img
          src={`${BASE_URL}/avatar/${encodeURIComponent(name)}?v=${encodeURIComponent(updatedAt)}`}
          alt={name}
        />
      ) : (
        <Initials $hue={hueFor(name)} $size={size}>
          {initialsFor(name)}
        </Initials>
      )}

      {editable && (
        <>
          <Overlay>
            <MdPhotoCamera size={Math.round(size * 0.42)} />
          </Overlay>
          <HiddenInput
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={pick}
          />
        </>
      )}
    </Wrap>
  )
}
