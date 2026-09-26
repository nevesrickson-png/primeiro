import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import { CheckCircle2, Plus } from 'lucide-react'
import type { FiltroTarefas, Tarefa } from '@shared/types'
import { api, chamar } from '../lib/api'
import { avisarTarefasAlteradas } from '../lib/eventos'
import { usePersistente } from '../lib/usePersistente'
import { EditarTarefa, NovaTarefaRapida, TarefaLinha } from '../components/tarefas'
import { Vazio } from '../components/ui'
import { useToast } from '../components/toast'

const ABAS: { value: FiltroTarefas; label: string }[] = [
  { value: 'pendentes', label: 'Pendentes' },
  { value: 'atrasadas', label: 'Atrasadas' },
  { value: 'hoje', label: 'Hoje' },
  { value: 'proximas', label: 'Próximos 7 dias' },
  { value: 'sem_data', label: 'Sem data' },
  { value: 'concluidas', label: 'Concluídas' }
]

export function Tarefas() {
  const avisar = useToast()
  const [estado, setEstado] = usePersistente<{ filtro: FiltroTarefas }>('tarefas', { filtro: 'pendentes' })
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [nova, setNova] = useState(false)

  const carregar = useCallback(() => {
    chamar(api.tarefas.listar({ filtro: estado.filtro, limite: estado.filtro === 'concluidas' ? 300 : undefined }))
      .then(setTarefas)
      .catch((e) => avisar(e.message, 'erro'))
  }, [estado.filtro, avisar])

  useEffect(() => {
    carregar()
  }, [carregar])

  const alterou = () => {
    carregar()
    avisarTarefasAlteradas()
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-semibold">Tarefas</h1>
          <span className="text-sm tabular-nums text-zinc-400">{tarefas.length}</span>
        </div>
        <button className="btn-primary h-8" onClick={() => setNova(true)}><Plus size={15} /> Nova tarefa</button>
      </header>
      <div className="flex shrink-0 gap-1 border-b border-zinc-200 px-6 dark:border-zinc-800">
        {ABAS.map((a) => (
          <button
            key={a.value}
            onClick={() => setEstado({ filtro: a.value })}
            className={clsx('-mb-px border-b-2 px-3 py-2 text-sm', estado.filtro === a.value ? 'border-brand-600 font-medium' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200')}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-6">
          {estado.filtro !== 'concluidas' && <div className="mb-4"><NovaTarefaRapida onCriada={alterou} /></div>}
          {tarefas.length === 0 ? (
            <Vazio icone={<CheckCircle2 size={22} />} titulo="Nada por aqui" texto={estado.filtro === 'concluidas' ? 'Nenhuma tarefa concluída ainda.' : 'Nenhuma tarefa neste filtro.'} />
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {tarefas.map((t) => <TarefaLinha key={t.id} tarefa={t} onAlterada={alterou} />)}
            </div>
          )}
        </div>
      </div>
      <EditarTarefa aberto={nova} onFechar={() => setNova(false)} onSalva={alterou} />
    </div>
  )
}
