import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    // Force periodic checks so installed PWAs pick up new builds on mobile.
    setInterval(() => {
      registration.update()
    }, 60 * 1000)
  },
  onNeedRefresh() {
    updateSW(true)
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
