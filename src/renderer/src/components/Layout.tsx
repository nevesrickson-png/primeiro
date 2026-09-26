import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import { Home, Users, KanbanSquare, BarChart3, Settings, Lock, Moon, Sun } from 'lucide-react'
import { api } from '../lib/api'
import { aplicarTema, temaAtual, type Tema } from '../lib/tema'

const ITENS = [
  { to: '/inicio', label: 'Início', icone: Home },
  { to: '/leads', label: 'Leads', icone: Users },
  { to: '/funil', label: 'Funil', icone: KanbanSquare },
  { to: '/painel', label: 'Painel', icone: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icone: Settings }
]

export function Layout({ onBloquear }: { onBloquear: () => void }) {
  const [tema, setTema] = useState<Tema>(temaAtual())

  function alternarTema() {
    const t = tema === 'escuro' ? 'claro' : 'escuro'
    aplicarTema(t)
    setTema(t)
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/70 dark:border-zinc-800/80 dark:bg-zinc-950/40">
        <div className="flex h-14 items-center gap-2 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">CA</div>
          <span className="text-sm font-semibold">CRM Assessor</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {ITENS.map(({ to, label, icone: Icone }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition',
                  isActive
                    ? 'bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700'
                    : 'text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800/60'
                )
              }
            >
              <Icone size={16} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-0.5 border-t border-zinc-200 p-2 dark:border-zinc-800">
          <button onClick={alternarTema} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800/60">
            {tema === 'escuro' ? <Sun size={16} /> : <Moon size={16} />}
            {tema === 'escuro' ? 'Modo claro' : 'Modo escuro'}
          </button>
          <button
            onClick={async () => {
              await api.auth.bloquear()
              onBloquear()
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
          >
            <Lock size={16} /> Bloquear
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
