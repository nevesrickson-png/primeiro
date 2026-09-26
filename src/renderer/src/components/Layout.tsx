import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Home, Users, KanbanSquare, BarChart3, Settings, Lock, Moon, Sun, CheckSquare } from 'lucide-react'
import { api, chamar } from '../lib/api'
import { aoAlterarTarefas } from '../lib/eventos'
import { aplicarTema, temaAtual, type Tema } from '../lib/tema'

const ITENS = [
  { to: '/inicio', label: 'Início', icone: Home },
  { to: '/tarefas', label: 'Tarefas', icone: CheckSquare },
  { to: '/leads', label: 'Leads', icone: Users },
  { to: '/funil', label: 'Funil', icone: KanbanSquare },
  { to: '/painel', label: 'Painel', icone: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icone: Settings }
]

// A notificação do dia é mostrada uma vez por desbloqueio.
let notificado = false

export function Layout({ onBloquear }: { onBloquear: () => void }) {
  const [tema, setTema] = useState<Tema>(temaAtual())
  const [pendentes, setPendentes] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const atualizar = () =>
      chamar(api.lembretes.resumo()).then((r) => setPendentes(r.atrasadas + r.hoje)).catch(() => {})
    atualizar()
    if (!notificado) {
      notificado = true
      api.lembretes.notificar()
    }
    const intervalo = setInterval(atualizar, 10 * 60 * 1000)
    const sair = aoAlterarTarefas(atualizar)
    const semNav = api.aoNavegar((rota) => navigate(rota))
    return () => {
      clearInterval(intervalo)
      sair()
      semNav()
    }
  }, [navigate])

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
              <span className="flex-1">{label}</span>
              {to === '/inicio' && pendentes > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-semibold tabular-nums text-white" title="Tarefas atrasadas e de hoje">{pendentes}</span>
              )}
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
              notificado = false
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
