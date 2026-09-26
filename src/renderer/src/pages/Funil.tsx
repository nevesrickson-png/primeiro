import { DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import clsx from 'clsx'
import { KanbanSquare, List, Search, X, Clock, MessageSquare } from 'lucide-react'
import { ETAPAS, FAIXAS_PATRIMONIO, ORIGENS, rotulo, type Etapa } from '@shared/constants'
import type { FiltrosLeads, LeadResumo, Tag } from '@shared/types'
import { api, chamar } from '../lib/api'
import { diasDesde, moedaCompacta, tempoRelativo } from '../lib/format'
import { usePersistente } from '../lib/usePersistente'
import { COR_ETAPA } from '../lib/cores'
import { FiltroMulti, Select, TagChip } from '../components/ui'
import { MotivoPerda } from '../components/MotivoPerda'
import { useToast } from '../components/toast'

type Visao = 'kanban' | 'lista'
interface EstadoFunil extends FiltrosLeads { visao: Visao }

const INICIAL: EstadoFunil = { visao: 'kanban', busca: '', origens: [], faixas_patrimonio: [], tag_id: null }
const TIPO_DRAG = 'application/x-crm-lead'
const ALTURA_CARD = 96

function DiasNaEtapa({ desde }: { desde: string | null }) {
  const d = diasDesde(desde)
  if (d === null) return null
  return (
    <span
      title={`Nesta etapa há ${d} dia(s)`}
      className={clsx('inline-flex items-center gap-0.5 tabular-nums', d > 30 ? 'text-red-500' : d > 14 ? 'text-amber-500' : 'text-zinc-400')}
    >
      <Clock size={11} /> {d}d
    </span>
  )
}

function Card({ lead, mapaTags, onAbrir, arrastando, onDragStart, onDragEnd }: {
  lead: LeadResumo
  mapaTags: Map<string, Tag>
  onAbrir: () => void
  arrastando: boolean
  onDragStart: (e: DragEvent) => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onAbrir}
      className={clsx(
        'flex h-[88px] cursor-grab flex-col justify-between rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm transition hover:border-zinc-300 hover:shadow active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700',
        arrastando && 'opacity-40'
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{lead.nome}</div>
        <div className="truncate text-xs text-zinc-500">{[lead.empresa, lead.cidade].filter(Boolean).join(' · ') || rotulo(ORIGENS, lead.origem)}</div>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">{moedaCompacta(lead.valor_potencial) || '—'}</span>
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex min-w-0 gap-1 overflow-hidden">
            {lead.tag_ids.slice(0, 2).map((id) => {
              const t = mapaTags.get(id)
              return t ? <span key={id} className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.cor }} title={t.nome} /> : null
            })}
          </span>
          <DiasNaEtapa desde={lead.etapa_desde} />
        </div>
      </div>
    </div>
  )
}

function Coluna({ etapa, leads, mapaTags, arrastandoId, setArrastandoId, onSoltar, onAbrir }: {
  etapa: Etapa
  leads: LeadResumo[]
  mapaTags: Map<string, Tag>
  arrastandoId: string | null
  setArrastandoId: (id: string | null) => void
  onSoltar: (leadId: string, etapa: Etapa) => void
  onAbrir: (id: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [sobre, setSobre] = useState(false)
  const virt = useVirtualizer({
    count: leads.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ALTURA_CARD,
    overscan: 6
  })
  const total = leads.reduce((s, l) => s + (l.valor_potencial ?? 0), 0)

  return (
    <div
      className={clsx(
        'flex w-72 shrink-0 flex-col rounded-xl border bg-zinc-50/80 transition dark:bg-zinc-900/40',
        sobre ? 'border-brand-400 bg-brand-50/50 dark:border-brand-600 dark:bg-brand-500/5' : 'border-zinc-200/70 dark:border-zinc-800/70'
      )}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(TIPO_DRAG)) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          if (!sobre) setSobre(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setSobre(false)
        const id = e.dataTransfer.getData(TIPO_DRAG)
        if (id) onSoltar(id, etapa)
      }}
    >
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', COR_ETAPA[etapa])}>{rotulo(ETAPAS, etapa)}</span>
          <span className="text-xs tabular-nums text-zinc-400">{leads.length}</span>
        </div>
        <span className="text-xs font-medium tabular-nums text-zinc-500" title="Valor potencial somado">{moedaCompacta(total)}</span>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {leads.length === 0 ? (
          <div className="mt-1 rounded-lg border border-dashed border-zinc-300 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700">
            Arraste leads para cá
          </div>
        ) : (
          <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
            {virt.getVirtualItems().map((item) => {
              const l = leads[item.index]
              return (
                <div key={l.id} className="absolute left-0 right-0" style={{ transform: `translateY(${item.start}px)` }}>
                  <Card
                    lead={l}
                    mapaTags={mapaTags}
                    arrastando={arrastandoId === l.id}
                    onAbrir={() => onAbrir(l.id)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(TIPO_DRAG, l.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setArrastandoId(l.id)
                    }}
                    onDragEnd={() => setArrastandoId(null)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const COLUNAS_LISTA = 'grid-cols-[minmax(220px,2fr)_190px_110px_150px_100px_120px]'

function VisaoLista({ leads, onMover, onAbrir }: {
  leads: LeadResumo[]
  onMover: (id: string, etapa: Etapa) => void
  onAbrir: (id: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // Agrupa por etapa na ordem do funil, com um cabeçalho por grupo.
  const linhas = useMemo(() => {
    const r: ({ tipo: 'grupo'; etapa: Etapa; qtd: number; total: number } | { tipo: 'lead'; lead: LeadResumo })[] = []
    for (const e of ETAPAS) {
      const doGrupo = leads.filter((l) => l.etapa === e.value)
      if (!doGrupo.length) continue
      r.push({ tipo: 'grupo', etapa: e.value, qtd: doGrupo.length, total: doGrupo.reduce((s, l) => s + (l.valor_potencial ?? 0), 0) })
      for (const l of doGrupo) r.push({ tipo: 'lead', lead: l })
    }
    return r
  }, [leads])
  const virt = useVirtualizer({
    count: linhas.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (linhas[i].tipo === 'grupo' ? 40 : 48),
    overscan: 12
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={clsx('grid shrink-0 gap-3 border-b border-zinc-200 px-6 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-800', COLUNAS_LISTA)}>
        <span>Nome</span><span>Etapa</span><span>Na etapa</span><span>Última interação</span><span className="text-right">Potencial</span><span>Origem</span>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
          {virt.getVirtualItems().map((item) => {
            const linha = linhas[item.index]
            const estilo = { height: item.size, transform: `translateY(${item.start}px)` }
            if (linha.tipo === 'grupo') {
              return (
                <div key={'g' + linha.etapa} style={estilo} className="absolute left-0 right-0 flex items-end gap-2 bg-zinc-50/80 px-6 pb-1.5 dark:bg-zinc-900/40">
                  <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', COR_ETAPA[linha.etapa])}>{rotulo(ETAPAS, linha.etapa)}</span>
                  <span className="text-xs text-zinc-400">{linha.qtd} · {moedaCompacta(linha.total)}</span>
                </div>
              )
            }
            const l = linha.lead
            return (
              <div
                key={l.id}
                style={estilo}
                onClick={() => onAbrir(l.id)}
                className={clsx('absolute left-0 right-0 grid cursor-pointer items-center gap-3 border-b border-zinc-100 px-6 text-sm hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900', COLUNAS_LISTA)}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{l.nome}</div>
                  <div className="truncate text-xs text-zinc-500">{[l.empresa, l.cidade].filter(Boolean).join(' · ')}</div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <Select className="h-8 text-xs" permitirVazio={false} value={l.etapa} onChange={(v) => v && onMover(l.id, v as Etapa)} opcoes={ETAPAS} />
                </div>
                <span className="text-xs"><DiasNaEtapa desde={l.etapa_desde} /></span>
                <span className="flex items-center gap-1 truncate text-xs text-zinc-500">
                  {l.ultima_interacao ? <><MessageSquare size={11} /> {tempoRelativo(l.ultima_interacao)}</> : <span className="text-zinc-400">nenhuma</span>}
                </span>
                <span className="text-right tabular-nums text-zinc-700 dark:text-zinc-300">{moedaCompacta(l.valor_potencial)}</span>
                <span className="truncate text-xs text-zinc-500">{rotulo(ORIGENS, l.origem)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Funil() {
  const navigate = useNavigate()
  const avisar = useToast()
  const [estado, setEstado] = usePersistente<EstadoFunil>('estado-funil', INICIAL)
  const [leads, setLeads] = useState<LeadResumo[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [pendentePerda, setPendentePerda] = useState<LeadResumo | null>(null)
  const mapaTags = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  const { visao, ...filtros } = estado
  const chaveFiltros = JSON.stringify(filtros)

  const carregar = useCallback(() => {
    return chamar(api.leads.listar({ ...JSON.parse(chaveFiltros), ordenacao: 'valor_potencial', direcao: 'desc' }))
      .then(setLeads)
      .catch((e) => avisar(e.message, 'erro'))
  }, [chaveFiltros, avisar])

  useEffect(() => {
    const t = setTimeout(carregar, estado.busca ? 60 : 0)
    return () => clearTimeout(t)
  }, [carregar, estado.busca])

  useEffect(() => {
    chamar(api.tags.listar()).then(setTags).catch(() => {})
  }, [])

  const porEtapa = useMemo(() => {
    const m = new Map<Etapa, LeadResumo[]>(ETAPAS.map((e) => [e.value, []]))
    for (const l of leads) m.get(l.etapa)?.push(l)
    return m
  }, [leads])

  async function mover(id: string, etapa: Etapa, motivo?: string | null) {
    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.etapa === etapa) return
    const anterior = leads
    // Atualização otimista: o card muda de coluna na hora.
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, etapa, etapa_desde: new Date().toISOString() } : l)))
    try {
      await chamar(api.leads.moverEtapa(id, etapa, motivo ?? null))
      avisar(`${lead.nome} → ${rotulo(ETAPAS, etapa)}`)
    } catch (e) {
      setLeads(anterior)
      avisar((e as Error).message, 'erro')
    }
  }

  function pedirMover(id: string, etapa: Etapa) {
    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.etapa === etapa) return
    if (etapa === 'perdido') setPendentePerda(lead)
    else mover(id, etapa)
  }

  const set = <K extends keyof EstadoFunil>(k: K, v: EstadoFunil[K]) => setEstado((s) => ({ ...s, [k]: v }))
  const temFiltro = !!estado.busca || !!estado.origens?.length || !!estado.faixas_patrimonio?.length || !!estado.tag_id
  const ativos = leads.filter((l) => l.etapa !== 'perdido' && l.etapa !== 'cliente_ativo')
  const totalFunil = ativos.reduce((s, l) => s + (l.valor_potencial ?? 0), 0)

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-semibold">Funil</h1>
          <span className="text-sm text-zinc-400">
            {ativos.length} em negociação · <span className="tabular-nums">{moedaCompacta(totalFunil)}</span> potencial
          </span>
        </div>
        <div className="flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
          {([['kanban', 'Kanban', KanbanSquare], ['lista', 'Lista', List]] as const).map(([v, label, Icone]) => (
            <button
              key={v}
              onClick={() => set('visao', v)}
              className={clsx('flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium', visao === v ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200')}
            >
              <Icone size={14} /> {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 px-6 py-2.5 dark:border-zinc-800">
        <div className="relative w-64">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input className="input h-8 pl-8 text-xs" placeholder="Filtrar leads…" value={estado.busca ?? ''} onChange={(e) => set('busca', e.target.value)} />
        </div>
        <FiltroMulti titulo="Origem" opcoes={ORIGENS} valores={estado.origens ?? []} onChange={(v) => set('origens', v)} />
        <FiltroMulti titulo="Patrimônio" opcoes={FAIXAS_PATRIMONIO} valores={estado.faixas_patrimonio ?? []} onChange={(v) => set('faixas_patrimonio', v)} />
        <Select className="h-8 w-40 text-xs" value={estado.tag_id ?? null} onChange={(v) => set('tag_id', v)} opcoes={tags.map((t) => ({ value: t.id, label: t.nome }))} vazio="Todas as tags" />
        {temFiltro && (
          <button className="btn-ghost btn-sm" onClick={() => setEstado({ ...INICIAL, visao })}>
            <X size={12} /> Limpar filtros
          </button>
        )}
        {tags.length > 0 && estado.tag_id && mapaTags.get(estado.tag_id) && (
          <TagChip nome={mapaTags.get(estado.tag_id)!.nome} cor={mapaTags.get(estado.tag_id)!.cor} />
        )}
      </div>

      {visao === 'kanban' ? (
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
          {ETAPAS.map((e) => (
            <Coluna
              key={e.value}
              etapa={e.value}
              leads={porEtapa.get(e.value) ?? []}
              mapaTags={mapaTags}
              arrastandoId={arrastandoId}
              setArrastandoId={setArrastandoId}
              onSoltar={pedirMover}
              onAbrir={(id) => navigate(`/leads/${id}`)}
            />
          ))}
        </div>
      ) : (
        <VisaoLista leads={leads} onMover={pedirMover} onAbrir={(id) => navigate(`/leads/${id}`)} />
      )}

      <MotivoPerda
        aberto={!!pendentePerda}
        nome={pendentePerda?.nome}
        onCancelar={() => setPendentePerda(null)}
        onConfirmar={(motivo) => {
          const l = pendentePerda!
          setPendentePerda(null)
          mover(l.id, 'perdido', motivo)
        }}
      />
    </div>
  )
}
