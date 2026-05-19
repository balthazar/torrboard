import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'src',
  plugins: [react({ include: /\.(js|jsx|tsx)$/ })],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 1234,
  },
  define: {
    'process.env.BASE_URL': JSON.stringify(process.env.BASE_URL || ''),
    'process.env.DOWNLOAD_URL': JSON.stringify(process.env.DOWNLOAD_URL || ''),
    'process.env.DOWNLOAD_DIR': JSON.stringify(process.env.DOWNLOAD_DIR || ''),
  },
})
