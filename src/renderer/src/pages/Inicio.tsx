import { ReactNode, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { AlertTriangle, CalendarDays, Cake, CheckCircle2, Clock, Landmark, MessageCircle, RefreshCcw, Sun, Sunrise, Moon } from 'lucide-react'
import type { Agenda, Tarefa } from '@shared/types'
import { api, chamar } from '../lib/api'
import { aoAlterarTarefas, avisarTarefasAlteradas } from '../lib/eventos'
import { data as formatarData, diasDesde, linkWhatsApp, moeda, moedaCompacta } from '../lib/format'
import { EtapaBadge } from '../components/ui'
import { NovaTarefaRapida, TarefaLinha, rotuloData } from '../components/tarefas'
import { useToast } from '../components/toast'

function Bloco({ icone, titulo, qtd, destaque, children, acao }: {
  icone: ReactNode; titulo: string; qtd?: number; destaque?: 'vermelho' | 'ambar'; children: ReactNode; acao?: ReactNode
}) {
  return (
    <section className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-zinc-400">{icone}</span> {titulo}
          {qtd !== undefined && (
            <span className={clsx('rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
              qtd && destaque === 'vermelho' ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                : qtd && destaque === 'ambar' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800')}>
              {qtd}
            </span>
          )}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  )
}

function GrupoTarefas({ titulo, tarefas, cor, onAlterada }: { titulo: string; tarefas: Tarefa[]; cor?: string; onAlterada: () => void }) {
  if (!tarefas.length) return null
  return (
    <div className="mt-3">
      <div className={clsx('mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide', cor ?? 'text-zinc-400')}>{titulo} · {tarefas.length}</div>
      {tarefas.map((t) => <TarefaLinha key={t.id} tarefa={t} onAlterada={onAlterada} />)}
    </div>
  )
}

function saudacao(): { texto: string; icone: ReactNode } {
  const h = new Date().getHours()
  if (h < 12) return { texto: 'Bom dia', icone: <Sunrise size={20} className="text-amber-500" /> }
  if (h < 18) return { texto: 'Boa tarde', icone: <Sun size={20} className="text-amber-500" /> }
  return { texto: 'Boa noite', icone: <Moon size={20} className="text-indigo-400" /> }
}

export function Inicio() {
  const navigate = useNavigate()
  const avisar = useToast()
  const [agenda, setAgenda] = useState<Agenda | null>(null)

  const carregar = useCallback(() => {
    chamar(api.agenda.obter()).then(setAgenda).catch((e) => avisar(e.message, 'erro'))
  }, [avisar])

  useEffect(() => {
    carregar()
    return aoAlterarTarefas(carregar)
  }, [carregar])

  if (!agenda) return null
  const alterou = () => avisarTarefasAlteradas()
  const s = saudacao()
  const dataLonga = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const hojeTexto = dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1)
  const totalTarefas = agenda.tarefasAtrasadas.length + agenda.tarefasHoje.length
  const aniversariosHoje = agenda.aniversariantes.filter((a) => a.dias === 0)

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">{s.icone} {s.texto}!</h1>
            <p className="mt-1 text-sm text-zinc-500">{hojeTexto}</p>
          </div>
          <div className="flex gap-4 text-sm text-zinc-500">
            {agenda.tarefasAtrasadas.length > 0 && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><AlertTriangle size={14} /> {agenda.tarefasAtrasadas.length} atrasada(s)</span>}
            <span>{agenda.tarefasHoje.length} tarefa(s) hoje</span>
            {aniversariosHoje.length > 0 && <span className="inline-flex items-center gap-1 text-pink-600 dark:text-pink-400"><Cake size={14} /> {aniversariosHoje.length} aniversário(s)</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Coluna das tarefas */}
          <div className="space-y-4">
            <Bloco icone={<CheckCircle2 size={16} />} titulo="Tarefas e follow-ups" qtd={totalTarefas} destaque={agenda.tarefasAtrasadas.length ? 'vermelho' : 'ambar'}
              acao={<button className="btn-ghost btn-sm" onClick={() => navigate('/tarefas')}>Ver todas</button>}>
              <NovaTarefaRapida onCriada={alterou} />
              <GrupoTarefas titulo="Atrasadas" tarefas={agenda.tarefasAtrasadas} cor="text-red-500" onAlterada={alterou} />
              <GrupoTarefas titulo="Hoje" tarefas={agenda.tarefasHoje} cor="text-amber-600 dark:text-amber-400" onAlterada={alterou} />
              <GrupoTarefas titulo="Próximos 7 dias" tarefas={agenda.tarefasProximas} onAlterada={alterou} />
              {totalTarefas + agenda.tarefasProximas.length === 0 && (
                <p className="py-8 text-center text-sm text-zinc-500">Nenhuma tarefa pendente para os próximos dias. 🎉</p>
              )}
            </Bloco>

            <Bloco icone={<Clock size={16} />} titulo={`Leads parados há mais de ${agenda.diasParado} dias`} qtd={agenda.parados.total} destaque="ambar"
              acao={<button className="btn-ghost btn-sm" onClick={() => navigate('/configuracoes')}>Ajustar dias</button>}>
              {agenda.parados.leads.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">Nenhum lead parado. 👏</p>
              ) : (
                <div className="max-h-80 overflow-auto">
                  {agenda.parados.leads.map((l) => (
                    <button key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{l.nome}</div>
                        <div className="truncate text-xs text-zinc-500">{l.empresa}</div>
                      </div>
                      <EtapaBadge etapa={l.etapa} />
                      <span className="w-16 text-right text-xs tabular-nums text-amber-600 dark:text-amber-400">{diasDesde(l.ultima_atividade)} dias</span>
                      <span className="w-16 text-right text-xs tabular-nums text-zinc-500">{moedaCompacta(l.valor_potencial)}</span>
                    </button>
                  ))}
                  {agenda.parados.total > agenda.parados.leads.length && (
                    <p className="px-2 pt-2 text-xs text-zinc-400">Mostrando os {agenda.parados.leads.length} mais antigos de {agenda.parados.total}.</p>
                  )}
                </div>
              )}
            </Bloco>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-4">
            <Bloco icone={<Cake size={16} />} titulo="Aniversários" qtd={agenda.aniversariantes.length}>
              {agenda.aniversariantes.length === 0 ? (
                <p className="py-4 text-center text-sm text-zinc-500">Nenhum aniversário nos próximos 7 dias.</p>
              ) : (
                agenda.aniversariantes.map((a) => {
                  const wa = linkWhatsApp(a.whatsapp)
                  return (
                    <div key={a.id} className={clsx('flex items-center gap-3 rounded-md px-2 py-1.5', a.dias === 0 && 'bg-pink-50 dark:bg-pink-500/10')}>
                      <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/leads/${a.id}`)}>
                        <div className="truncate text-sm font-medium hover:underline">{a.nome}</div>
                        <div className="text-xs text-zinc-500">{a.idade} anos · {formatarData(a.proximo).slice(0, 5)}</div>
                      </button>
                      <span className={clsx('text-xs font-medium', a.dias === 0 ? 'text-pink-600 dark:text-pink-400' : 'text-zinc-500')}>
                        {a.dias === 0 ? 'Hoje 🎂' : rotuloData(a.proximo)}
                      </span>
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost btn-sm text-emerald-600" title="Dar parabéns pelo WhatsApp">
                          <MessageCircle size={14} />
                        </a>
                      )}
                    </div>
                  )
                })
              )}
            </Bloco>

            <Bloco icone={<Landmark size={16} />} titulo="Vencimentos em 30 dias" qtd={agenda.vencimentos.length}>
              {agenda.vencimentos.length === 0 ? (
                <p className="py-4 text-center text-sm text-zinc-500">Nenhum vencimento nos próximos 30 dias.</p>
              ) : (
                <div className="max-h-96 overflow-auto">
                  {agenda.vencimentos.map((v) => (
                    <button key={v.tipo + v.id} onClick={() => navigate(`/leads/${v.lead_id}`)} className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <span className="text-zinc-400">{v.tipo === 'revisao' ? <RefreshCcw size={14} /> : <CalendarDays size={14} />}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{v.lead_nome}</div>
                        <div className="truncate text-xs text-zinc-500">{v.descricao}{v.valor !== null && ` · ${moeda(v.valor)}`}</div>
                      </div>
                      <span className={clsx('whitespace-nowrap text-xs tabular-nums', v.dias < 0 ? 'text-red-600 dark:text-red-400' : v.dias <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500')}>
                        {v.dias < 0 ? `venceu ${formatarData(v.data)}` : rotuloData(v.data)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Bloco>
          </div>
        </div>
      </div>
    </div>
  )
}
