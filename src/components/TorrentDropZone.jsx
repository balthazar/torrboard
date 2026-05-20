import React, { useEffect, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { gql, useMutation } from '@apollo/client'
import { FiDownloadCloud } from 'react-icons/fi'

import { useToasts } from './toasts'

const DOWNLOAD = gql`
  mutation download($link: String!) {
    download(link: $link)
  }
`

const UPLOAD_TORRENT = gql`
  mutation uploadTorrent($filename: String!, $filedump: String!) {
    uploadTorrent(filename: $filename, filedump: $filedump)
  }
`

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  /* Must accept pointer events so the drop lands on us, not on whatever the
     cursor happens to be over (which might be a link/iframe that triggers the
     browser's default open-file behavior). */
  pointer-events: auto;
  background: rgba(6, 9, 16, 0.82);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 120ms ease both;
`

const Panel = styled.div`
  border: 2px dashed ${p => p.theme.colors.accent};
  border-radius: ${p => p.theme.radii.lg};
  padding: ${p => p.theme.spacing[7]} ${p => p.theme.spacing[8]};
  background: ${p => p.theme.colors.surface};
  color: ${p => p.theme.colors.text};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${p => p.theme.spacing[3]};
  font-size: ${p => p.theme.font.size.md};
  font-weight: ${p => p.theme.font.weight.semibold};
  letter-spacing: ${p => p.theme.font.tracking.wide};
  box-shadow: ${p => p.theme.shadows.lg};
  pointer-events: none;
`

const Hint = styled.div`
  font-size: ${p => p.theme.font.size.xs};
  color: ${p => p.theme.colors.textMuted};
  font-weight: ${p => p.theme.font.weight.normal};
  letter-spacing: normal;
`

const TORRENT_EXT = /\.torrent$/i
const URL_RE = /^(https?:\/\/|magnet:\?)/i

const readAsBase64 = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Read failed'))
    reader.onload = () => {
      const result = reader.result || ''
      const comma = result.indexOf(',')
      resolve(comma === -1 ? result : result.slice(comma + 1))
    }
    reader.readAsDataURL(file)
  })

const isTorrentFile = f =>
  f && (f.type === 'application/x-bittorrent' || TORRENT_EXT.test(f.name || ''))

const extractLink = dt => {
  const uriList = dt.getData('text/uri-list')
  if (uriList) {
    const first = uriList.split(/\r?\n/).find(l => l && !l.startsWith('#'))
    if (first && URL_RE.test(first)) return first.trim()
  }
  const plain = dt.getData('text/plain')
  if (plain && URL_RE.test(plain.trim())) return plain.trim()
  return null
}

export default () => {
  const [active, setActive] = useState(false)
  const dragDepth = useRef(0)
  const { addToast } = useToasts()
  const [download] = useMutation(DOWNLOAD)
  const [uploadTorrent] = useMutation(UPLOAD_TORRENT)

  useEffect(() => {
    const reset = () => {
      dragDepth.current = 0
      setActive(false)
    }
    // We unconditionally preventDefault on dragenter/over and unconditionally
    // show the overlay. Earlier attempts gated on dataTransfer.types but
    // Firefox masks file payload types during drag, so the gate dropped real
    // file drags and the browser fell back to "open the .torrent". Whether
    // the drop is actually usable is decided in onDrop.
    const onDragEnter = e => {
      e.preventDefault()
      dragDepth.current += 1
      setActive(true)
    }
    const onDragOver = e => {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
      setActive(true)
    }
    const onDragLeave = e => {
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0 || e.relatedTarget === null) {
        reset()
      }
    }
    const onDrop = async e => {
      e.preventDefault()
      reset()

      const dt = e.dataTransfer
      if (!dt) return

      const files = Array.from(dt.files || []).filter(isTorrentFile)
      const link = files.length ? null : extractLink(dt)

      if (!files.length && !link) {
        const dropped = Array.from(dt.files || [])
        if (dropped.length) {
          addToast(`${dropped[0].name} isn't a .torrent file`, { appearance: 'error' })
        } else {
          addToast('Drop a .torrent file or a torrent/magnet link', {
            appearance: 'error',
          })
        }
        return
      }

      if (files.length) {
        for (const file of files) {
          try {
            const filedump = await readAsBase64(file)
            await uploadTorrent({ variables: { filename: file.name, filedump } })
            addToast(`Added ${file.name}`, { appearance: 'success' })
          } catch (err) {
            addToast(`Failed to add ${file.name}: ${err.message}`, {
              appearance: 'error',
            })
          }
        }
        return
      }

      try {
        await download({ variables: { link } })
        addToast('Added torrent from link', { appearance: 'success' })
      } catch (err) {
        addToast(`Failed to add link: ${err.message}`, { appearance: 'error' })
      }
    }
    const onDragEnd = reset

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragend', onDragEnd)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragend', onDragEnd)
    }
  }, [download, uploadTorrent, addToast])

  if (!active) return null

  return (
    <Overlay>
      <Panel>
        <FiDownloadCloud size={36} />
        <div>Drop to add to Deluge</div>
        <Hint>.torrent file, magnet link, or torrent URL</Hint>
      </Panel>
    </Overlay>
  )
}
