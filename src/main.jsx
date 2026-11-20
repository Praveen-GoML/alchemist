import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import DialogHost from './components/common/DialogHost.jsx'
import TooltipHost from './components/common/TooltipHost.jsx'
import { registerServiceWorker } from './services/push'
import { dialog } from './utils/dialog'

// Route every remaining window.alert() through the styled modal
window.__nativeAlert = window.alert.bind(window)
window.alert = (msg) => { dialog.alert(msg) }

registerServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <DialogHost />
      <TooltipHost />
    </ErrorBoundary>
  </StrictMode>,
)
