import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { AuthStatus } from '@shared/types'
import { api, chamar } from './lib/api'
import { ToastProvider } from './components/toast'
import { Layout } from './components/Layout'
import { Bloqueio } from './pages/Bloqueio'
import { Leads } from './pages/Leads'
import { LeadFicha } from './pages/LeadFicha'
import { Configuracoes } from './pages/Configuracoes'
import { Inicio } from './pages/Inicio'
import { Tarefas } from './pages/Tarefas'
import { Funil } from './pages/Funil'
import { Painel } from './pages/Painel'
import { CampanhaPagina, Campanhas } from './pages/Campanhas'

export default function App() {
  const [status, setStatus] = useState<AuthStatus | null>(null)

  const atualizar = () => chamar(api.auth.status()).then(setStatus)
  useEffect(() => {
    atualizar()
  }, [])

  if (!status) return null

  return (
    <ToastProvider>
      {!status.desbloqueado ? (
        <Bloqueio status={status} onDesbloqueado={atualizar} />
      ) : (
        <HashRouter>
          <Routes>
            <Route element={<Layout onBloquear={atualizar} />}>
              <Route path="/" element={<Navigate to="/inicio" replace />} />
              <Route path="/inicio" element={<Inicio />} />
              <Route path="/tarefas" element={<Tarefas />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/novo" element={<LeadFicha />} />
              <Route path="/leads/:id" element={<LeadFicha />} />
              <Route path="/funil" element={<Funil />} />
              <Route path="/painel" element={<Painel />} />
              <Route path="/campanhas" element={<Campanhas />} />
              <Route path="/campanhas/nova" element={<CampanhaPagina />} />
              <Route path="/campanhas/:id" element={<CampanhaPagina />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="*" element={<Navigate to="/inicio" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      )}
    </ToastProvider>
  )
}
