import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import { registerSW } from 'virtual:pwa-register'
import App from './App'

// Офлайн-режим и установка на телефон. Новая версия сайта подхватывается автоматически.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
