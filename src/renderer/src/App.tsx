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
import { EmBreve } from './pages/EmBreve'
import { Funil } from './pages/Funil'
import { Painel } from './pages/Painel'

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
              <Route path="/" element={<Navigate to="/leads" replace />} />
              <Route path="/inicio" element={<EmBreve titulo="Início" fase={4} texto="Agenda do dia com tarefas, follow-ups, aniversários, vencimentos e leads parados." />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/novo" element={<LeadFicha />} />
              <Route path="/leads/:id" element={<LeadFicha />} />
              <Route path="/funil" element={<Funil />} />
              <Route path="/painel" element={<Painel />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="*" element={<Navigate to="/leads" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      )}
    </ToastProvider>
  )
}
