import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import logoPng from './assets/logo_simple.png'

// Ensure the favicon shows our app logo in the browser tab
const ensureFavicon = () => {
  const existing = document.querySelector("link[rel~='icon']")
  const link = existing || document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.href = logoPng
  if (!existing) {
    document.head.appendChild(link)
  }
}

ensureFavicon()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
