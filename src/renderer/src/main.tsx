import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { aplicarTema, temaAtual } from './lib/tema'
import './index.css'

aplicarTema(temaAtual())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
