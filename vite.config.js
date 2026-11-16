import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom'],
    force: true
  },
  server: {
    port: 5174,
    strictPort: true,
    headers: {
      'Cache-Control': 'no-store'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
