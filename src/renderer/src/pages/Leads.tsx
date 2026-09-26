import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import clsx from 'clsx'
import { ArrowDownUp, Plus, Search, Users, X, Sparkles, ArrowDown, ArrowUp } from 'lucide-react'
import {
  ETAPAS, FAIXAS_PATRIMONIO, ORIGENS, PRODUTOS, SUITABILITY, rotulo
} from '@shared/constants'
import type { FiltrosLeads, LeadResumo, OrdenacaoLeads, Tag } from '@shared/types'
import { api, chamar } from '../lib/api'
import { moedaCompacta, telefone } from '../lib/format'
import { usePersistente } from '../lib/usePersistente'
import { EtapaBadge, FiltroMulti, Select, TagChip, Vazio } from '../components/ui'
import { useToast } from '../components/toast'

const FILTROS_INICIAIS: FiltrosLeads = {
  busca: '', etapas: [], origens: [], faixas_patrimonio: [], suitability: [], tag_id: null, produto: null,
  ordenacao: 'nome', direcao: 'asc'
}

const ORDENACOES: { value: OrdenacaoLeads; label: string }[] = [
  { value: 'nome', label: 'Nome' },
  { value: 'created_at', label: 'Data de cadastro' },
  { value: 'updated_at', label: 'Última atualização' },
  { value: 'valor_potencial', label: 'Valor potencial' },
  { value: 'patrimonio', label: 'Faixa de patrimônio' },
  { value: 'etapa', label: 'Etapa do funil' },
  { value: 'ultima_interacao', label: 'Última interação' }
]

const COLUNAS = 'grid-cols-[minmax(200px,2fr)_140px_minmax(120px,1fr)_130px_100px_120px_90px_minmax(100px,1fr)]'

export function Leads() {
  const navigate = useNavigate()
  const avisar = useToast()
  const [filtros, setFiltros] = usePersistente<FiltrosLeads>('filtros-leads', FILTROS_INICIAIS)
  const [leads, setLeads] = useState<LeadResumo[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [carregado, setCarregado] = useState(false)
  const [dev, setDev] = useState(false)
  const buscaRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const mapaTags = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  useEffect(() => {
    chamar(api.tags.listar()).then(setTags).catch(() => {})
    chamar(api.app.info()).then((i) => setDev(i.dev)).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelado = false
    // Consulta local é muito rápida; o pequeno atraso só evita consultas a cada tecla em digitação rápida.
    const t = setTimeout(() => {
      chamar(api.leads.listar(filtros))
        .then((r) => {
          if (!cancelado) {
            setLeads(r)
            setCarregado(true)
          }
        })
        .catch((e) => avisar(e.message, 'erro'))
    }, filtros.busca ? 60 : 0)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [filtros, avisar])

  // Atalhos: Ctrl+K ou / para buscar, Ctrl+N para novo lead.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      const digitando = ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !digitando)) {
        e.preventDefault()
        buscaRef.current?.focus()
        buscaRef.current?.select()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        navigate('/leads/novo')
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [navigate])

  const virt = useVirtualizer({
    count: leads.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 52,
    overscan: 12
  })

  const set = <K extends keyof FiltrosLeads>(k: K, v: FiltrosLeads[K]) => setFiltros((f) => ({ ...f, [k]: v }))
  const temFiltro =
    !!filtros.busca || !!filtros.etapas?.length || !!filtros.origens?.length || !!filtros.faixas_patrimonio?.length ||
    !!filtros.suitability?.length || !!filtros.tag_id || !!filtros.produto

  async function gerarFicticios() {
    try {
      const n = await chamar(api.dev.gerarLeads(50))
      avisar(`${n} leads fictícios criados.`)
      setFiltros({ ...filtros })
      chamar(api.tags.listar()).then(setTags)
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-semibold">Leads</h1>
          <span className="text-sm tabular-nums text-zinc-400">{leads.length.toLocaleString('pt-BR')}</span>
        </div>
        <div className="relative w-full max-w-md">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            ref={buscaRef}
            className="input h-8 pl-9 pr-16"
            placeholder="Buscar por nome, e-mail, telefone, empresa, observações…"
            value={filtros.busca ?? ''}
            onChange={(e) => set('busca', e.target.value)}
          />
          {filtros.busca ? (
            <button onClick={() => set('busca', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X size={14} />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-zinc-200 px-1.5 text-[10px] text-zinc-400 dark:border-zinc-700">Ctrl K</kbd>
          )}
        </div>
        <button className="btn-primary h-8" onClick={() => navigate('/leads/novo')} title="Novo lead (Ctrl+N)">
          <Plus size={15} /> Novo lead
        </button>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 px-6 py-2.5 dark:border-zinc-800">
        <FiltroMulti titulo="Etapa" opcoes={ETAPAS} valores={filtros.etapas ?? []} onChange={(v) => set('etapas', v)} />
        <FiltroMulti titulo="Origem" opcoes={ORIGENS} valores={filtros.origens ?? []} onChange={(v) => set('origens', v)} />
        <FiltroMulti titulo="Patrimônio" opcoes={FAIXAS_PATRIMONIO} valores={filtros.faixas_patrimonio ?? []} onChange={(v) => set('faixas_patrimonio', v)} />
        <FiltroMulti titulo="Suitability" opcoes={SUITABILITY} valores={filtros.suitability ?? []} onChange={(v) => set('suitability', v)} />
        <Select
          className="h-8 w-40 text-xs"
          value={filtros.tag_id ?? null}
          onChange={(v) => set('tag_id', v)}
          opcoes={tags.map((t) => ({ value: t.id, label: t.nome }))}
          vazio="Todas as tags"
        />
        <Select className="h-8 w-40 text-xs" value={filtros.produto ?? null} onChange={(v) => set('produto', v as FiltrosLeads['produto'])} opcoes={PRODUTOS} vazio="Todos os produtos" />
        {temFiltro && (
          <button className="btn-ghost btn-sm" onClick={() => setFiltros({ ...FILTROS_INICIAIS, ordenacao: filtros.ordenacao, direcao: filtros.direcao })}>
            <X size={12} /> Limpar filtros
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <ArrowDownUp size={14} className="text-zinc-400" />
          <Select className="h-8 w-44 text-xs" permitirVazio={false} value={filtros.ordenacao ?? 'nome'} onChange={(v) => set('ordenacao', (v ?? 'nome') as OrdenacaoLeads)} opcoes={ORDENACOES} />
          <button
            className="btn-secondary h-8 w-8 px-0"
            title={filtros.direcao === 'desc' ? 'Decrescente' : 'Crescente'}
            onClick={() => set('direcao', filtros.direcao === 'desc' ? 'asc' : 'desc')}
          >
            {filtros.direcao === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
          </button>
        </div>
      </div>

      {carregado && leads.length === 0 ? (
        temFiltro ? (
          <Vazio icone={<Search size={22} />} titulo="Nenhum lead encontrado" texto="Ajuste a busca ou os filtros." />
        ) : (
          <Vazio
            icone={<Users size={22} />}
            titulo="Nenhum lead cadastrado"
            texto="Comece cadastrando seu primeiro lead."
            acao={
              <>
                <button className="btn-primary" onClick={() => navigate('/leads/novo')}><Plus size={15} /> Novo lead</button>
                {dev && <button className="btn-secondary" onClick={gerarFicticios}><Sparkles size={15} /> Gerar 50 leads fictícios</button>}
              </>
            }
          />
        )
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className={clsx('grid shrink-0 gap-3 border-b border-zinc-200 px-6 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-800', COLUNAS)}>
            <span>Nome</span><span>Telefone</span><span>Cidade</span><span>Etapa</span><span>Origem</span><span>Patrimônio</span><span className="text-right">Potencial</span><span>Tags</span>
          </div>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
            <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
              {virt.getVirtualItems().map((item) => {
                const l = leads[item.index]
                return (
                  <div
                    key={l.id}
                    onClick={() => navigate(`/leads/${l.id}`)}
                    className={clsx('absolute left-0 right-0 grid cursor-pointer items-center gap-3 border-b border-zinc-100 px-6 text-sm hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900', COLUNAS)}
                    style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{l.nome}</div>
                      <div className="truncate text-xs text-zinc-500">{[l.empresa, l.email].filter(Boolean).join(' · ')}</div>
                    </div>
                    <span className="truncate tabular-nums text-zinc-600 dark:text-zinc-400">{telefone(l.whatsapp || l.telefone)}</span>
                    <span className="truncate text-zinc-600 dark:text-zinc-400">{[l.cidade, l.estado].filter(Boolean).join('/')}</span>
                    <span><EtapaBadge etapa={l.etapa} /></span>
                    <span className="truncate text-zinc-600 dark:text-zinc-400">{rotulo(ORIGENS, l.origem)}</span>
                    <span className="truncate text-xs text-zinc-600 dark:text-zinc-400">{rotulo(FAIXAS_PATRIMONIO, l.faixa_patrimonio)}</span>
                    <span className="text-right tabular-nums text-zinc-700 dark:text-zinc-300">{moedaCompacta(l.valor_potencial)}</span>
                    <span className="flex min-w-0 gap-1 overflow-hidden">
                      {l.tag_ids.map((id) => {
                        const t = mapaTags.get(id)
                        return t ? <TagChip key={id} nome={t.nome} cor={t.cor} /> : null
                      })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
