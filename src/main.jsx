import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import DialogHost from './components/common/DialogHost.jsx'
import TooltipHost from './components/common/TooltipHost.jsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { registerServiceWorker } from './services/push'
import { dialog } from './utils/dialog'

// Route every remaining window.alert() through the styled modal
window.__nativeAlert = window.alert.bind(window)
window.alert = (msg) => { dialog.alert(msg) }

registerServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <DialogHost />
        <TooltipHost />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
