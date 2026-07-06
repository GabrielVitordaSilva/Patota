import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

// registerType 'autoUpdate' no vite.config ja cuida da atualizacao do
// service worker sozinho. O onNeedRefresh antigo forcava um reload imediato
// da pagina assim que uma nova versao era detectada - inclusive no meio do
// uso, o que parecia travamento/reset ao voltar pro app.
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
