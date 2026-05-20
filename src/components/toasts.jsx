import React from 'react'
import toast, { Toaster } from 'react-hot-toast'

import Toast from './Toast'

const APPEARANCE_TO_TYPE = {
  success: 'success',
  error: 'error',
  info: 'info',
}

const renderToast = (appearance, message) =>
  toast.custom(
    t => (
      <Toast
        appearance={appearance}
        onClick={() => toast.dismiss(t.id)}
        style={{
          opacity: t.visible ? 1 : 0,
          transition: 'opacity 150ms ease',
        }}
      >
        {message}
      </Toast>
    ),
    { duration: 2500 },
  )

export const ToastProvider = ({ children }) => (
  <>
    {children}
    <Toaster
      position="bottom-right"
      gutter={8}
      // The default Toaster pins toasts ~16px from the viewport edge; with
      // our card-style toast carrying a box-shadow, the shadow gets clipped
      // by the viewport. Leave room for the shadow + breathing space.
      containerStyle={{ inset: 40 }}
      toastOptions={{
        // toast.custom still wraps each toast in a div that gets `background`
        // and `box-shadow` from react-hot-toast's internal defaults; null
        // them so only our styled Toast paints.
        style: { background: 'transparent', boxShadow: 'none', padding: 0 },
      }}
    />
  </>
)

export const useToasts = () => ({
  addToast: (message, { appearance = 'info' } = {}) => {
    const type = APPEARANCE_TO_TYPE[appearance] || 'info'
    renderToast(type, message)
  },
})
