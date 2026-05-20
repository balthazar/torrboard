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
      containerStyle={{ top: 16, left: 16, right: 32, bottom: 32 }}
    />
  </>
)

export const useToasts = () => ({
  addToast: (message, { appearance = 'info' } = {}) => {
    const type = APPEARANCE_TO_TYPE[appearance] || 'info'
    renderToast(type, message)
  },
})
