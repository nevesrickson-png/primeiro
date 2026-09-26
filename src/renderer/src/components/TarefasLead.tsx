import { useCallback, useEffect, useState } from 'react'
import type { Tarefa } from '@shared/types'
import { api, chamar } from '../lib/api'
import { avisarTarefasAlteradas } from '../lib/eventos'
import { NovaTarefaRapida, TarefaLinha } from './tarefas'
import { useToast } from './toast'

/** Aba Tarefas da ficha do lead. */
export function TarefasLead({ leadId }: { leadId: string; leadNome: string }) {
  const avisar = useToast()
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const carregar = useCallback(() => {
    chamar(api.tarefas.listar({ lead_id: leadId })).then(setTarefas).catch((e) => avisar(e.message, 'erro'))
  }, [leadId, avisar])
  useEffect(() => {
    carregar()
  }, [carregar])
  const alterou = () => {
    carregar()
    avisarTarefasAlteradas()
  }
  const pendentes = tarefas.filter((t) => !t.concluida)
  const concluidas = tarefas.filter((t) => t.concluida)

  return (
    <div className="py-6">
      <NovaTarefaRapida leadId={leadId} onCriada={alterou} />
      <div className="mt-4">
        {pendentes.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">Nenhuma tarefa pendente para este lead.</p>}
        {pendentes.map((t) => <TarefaLinha key={t.id} tarefa={t} onAlterada={alterou} mostrarLead={false} />)}
      </div>
      {concluidas.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Concluídas · {concluidas.length}</summary>
          <div className="mt-1">{concluidas.map((t) => <TarefaLinha key={t.id} tarefa={t} onAlterada={alterou} mostrarLead={false} />)}</div>
        </details>
      )}
    </div>
  )
}
