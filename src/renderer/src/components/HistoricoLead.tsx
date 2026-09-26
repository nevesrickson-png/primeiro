import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  Phone, MessageCircle, Mail, Users, CalendarDays, MoreHorizontal, ArrowRight, Pencil, Trash2, CornerDownRight, GitCommitHorizontal
} from 'lucide-react'
import { ETAPAS, TIPOS_INTERACAO, rotulo, type TipoInteracao } from '@shared/constants'
import type { HistoricoEtapa, Interacao, InteracaoInput } from '@shared/types'
import { api, chamar } from '../lib/api'
import { data as formatarData, dataHoraLocalParaISO, isoParaDataHoraLocal, tempoRelativo } from '../lib/format'
import { Confirmar, EtapaBadge } from './ui'
import { DataInput } from './inputs'
import { useToast } from './toast'
import { avisarTarefasAlteradas } from '../lib/eventos'

const ICONE: Record<TipoInteracao, typeof Phone> = {
  ligacao: Phone, whatsapp: MessageCircle, email: Mail, reuniao: Users, evento: CalendarDays, outro: MoreHorizontal
}
const COR_ICONE: Record<TipoInteracao, string> = {
  ligacao: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
  whatsapp: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  email: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  reuniao: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  evento: 'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400',
  outro: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
}

interface Formulario { tipo: TipoInteracao; data: string | null; hora: string; resumo: string; proximo_passo: string; lembrar_em: string | null }

function formularioVazio(): Formulario {
  const { data, hora } = isoParaDataHoraLocal(new Date().toISOString())
  return { tipo: 'whatsapp', data, hora, resumo: '', proximo_passo: '', lembrar_em: null }
}

export interface HistoricoLeadRef { focar: () => void }

type Item = { tipo: 'interacao'; data: string; i: Interacao } | { tipo: 'etapa'; data: string; h: HistoricoEtapa }

export const HistoricoLead = forwardRef<HistoricoLeadRef, { leadId: string; versao?: string }>(function HistoricoLead({ leadId, versao }, ref) {
  const avisar = useToast()
  const [interacoes, setInteracoes] = useState<Interacao[]>([])
  const [etapas, setEtapas] = useState<HistoricoEtapa[]>([])
  const [form, setForm] = useState<Formulario>(formularioVazio)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [excluir, setExcluir] = useState<Interacao | null>(null)
  const [salvando, setSalvando] = useState(false)
  const resumoRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({ focar: () => resumoRef.current?.focus() }))

  const carregar = useCallback(() => {
    Promise.all([chamar(api.interacoes.listar(leadId)), chamar(api.leads.historicoEtapas(leadId))])
      .then(([i, h]) => {
        setInteracoes(i)
        setEtapas(h)
      })
      .catch((e) => avisar(e.message, 'erro'))
  }, [leadId, avisar])

  useEffect(() => {
    carregar()
  }, [carregar, versao])

  const itens = useMemo<Item[]>(
    () =>
      [
        ...interacoes.map((i) => ({ tipo: 'interacao' as const, data: i.data, i })),
        ...etapas.map((h) => ({ tipo: 'etapa' as const, data: h.data, h }))
      ].sort((a, b) => b.data.localeCompare(a.data)),
    [interacoes, etapas]
  )

  async function salvar() {
    if (!form.data) return avisar('Informe a data.', 'erro')
    const dados: InteracaoInput = {
      lead_id: leadId,
      tipo: form.tipo,
      data: dataHoraLocalParaISO(form.data, form.hora),
      resumo: form.resumo,
      proximo_passo: form.proximo_passo
    }
    setSalvando(true)
    try {
      if (editandoId) await chamar(api.interacoes.atualizar(editandoId, dados))
      else await chamar(api.interacoes.criar(dados))
      // Próximo passo com data vira uma tarefa de follow-up.
      const lembrete = !editandoId && form.proximo_passo.trim() && form.lembrar_em
      if (lembrete) {
        await chamar(api.tarefas.criar({ lead_id: leadId, titulo: form.proximo_passo.trim(), data_vencimento: form.lembrar_em, tipo: 'follow_up' }))
        avisarTarefasAlteradas()
      }
      avisar(editandoId ? 'Interação atualizada.' : lembrete ? 'Interação registrada e follow-up agendado.' : 'Interação registrada.')
      setForm(formularioVazio())
      setEditandoId(null)
      carregar()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  function editar(i: Interacao) {
    const { data, hora } = isoParaDataHoraLocal(i.data)
    setEditandoId(i.id)
    setForm({ tipo: i.tipo, data, hora, resumo: i.resumo ?? '', proximo_passo: i.proximo_passo ?? '', lembrar_em: null })
    resumoRef.current?.focus()
  }

  return (
    <div className="py-6">
      {/* Formulário de nova interação */}
      <div className={clsx('card p-4', editandoId && 'ring-2 ring-brand-500/30')}>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {TIPOS_INTERACAO.map((t) => {
            const Icone = ICONE[t.value]
            const ativo = form.tipo === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, tipo: t.value }))}
                className={clsx(
                  'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition',
                  ativo ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
                )}
              >
                <Icone size={13} /> {t.label}
              </button>
            )
          })}
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-32"><DataInput value={form.data} onChange={(v) => setForm((f) => ({ ...f, data: v }))} /></div>
            <input type="time" className="input w-24 tabular-nums" value={form.hora} onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))} />
          </div>
        </div>
        <textarea
          ref={resumoRef}
          className="input"
          rows={3}
          placeholder="O que foi conversado?"
          value={form.resumo}
          onChange={(e) => setForm((f) => ({ ...f, resumo: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault()
              e.stopPropagation()
              salvar()
            }
          }}
        />
        <div className="mt-2 flex items-center gap-2">
          <CornerDownRight size={14} className="shrink-0 text-zinc-400" />
          <input className="input" placeholder="Próximo passo (opcional)" value={form.proximo_passo} onChange={(e) => setForm((f) => ({ ...f, proximo_passo: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && salvar()} />
          {!editandoId && (
            <div className="flex shrink-0 items-center gap-1.5" title="Cria uma tarefa de follow-up com o próximo passo">
              <span className="whitespace-nowrap text-xs text-zinc-500">Lembrar em</span>
              <div className="w-32"><DataInput value={form.lembrar_em} onChange={(v) => setForm((f) => ({ ...f, lembrar_em: v }))} /></div>
            </div>
          )}
          {editandoId && (
            <button className="btn-ghost" onClick={() => { setEditandoId(null); setForm(formularioVazio()) }}>Cancelar</button>
          )}
          <button className="btn-primary" onClick={salvar} disabled={salvando || (!form.resumo.trim() && !form.proximo_passo.trim())} title="Ctrl+Enter">
            {editandoId ? 'Salvar' : 'Registrar'}
          </button>
        </div>
      </div>

      {/* Linha do tempo */}
      <div className="mt-6">
        {itens.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">Nenhuma interação registrada ainda.</p>}
        <ol className="relative">
          {itens.map((item, idx) => {
            const ultimo = idx === itens.length - 1
            if (item.tipo === 'etapa') {
              const h = item.h
              return (
                <li key={'h' + h.id} className="relative flex gap-3 pb-4">
                  {!ultimo && <span className="absolute left-[15px] top-7 h-full w-px bg-zinc-200 dark:bg-zinc-800" />}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center text-zinc-400"><GitCommitHorizontal size={16} /></div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 text-xs text-zinc-500">
                    {h.etapa_de ? (
                      <>Etapa alterada: <EtapaBadge etapa={h.etapa_de} /> <ArrowRight size={12} /> <EtapaBadge etapa={h.etapa_para} /></>
                    ) : (
                      <>Lead cadastrado em <EtapaBadge etapa={h.etapa_para} /></>
                    )}
                    <span className="text-zinc-400" title={new Date(h.data).toLocaleString('pt-BR')}>· {formatarData(h.data)}</span>
                  </div>
                </li>
              )
            }
            const i = item.i
            const Icone = ICONE[i.tipo]
            return (
              <li key={i.id} className="group relative flex gap-3 pb-5">
                {!ultimo && <span className="absolute left-[15px] top-9 h-full w-px bg-zinc-200 dark:bg-zinc-800" />}
                <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', COR_ICONE[i.tipo])}><Icone size={15} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-medium">{rotulo(TIPOS_INTERACAO, i.tipo)}</span>
                      <span className="ml-2 text-xs text-zinc-400" title={tempoRelativo(i.data)}>
                        {new Date(i.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                      <button className="btn-ghost btn-sm" title="Editar" onClick={() => editar(i)}><Pencil size={12} /></button>
                      <button className="btn-ghost btn-sm hover:text-red-600" title="Excluir" onClick={() => setExcluir(i)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {i.resumo && <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{i.resumo}</p>}
                  {i.proximo_passo && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      <CornerDownRight size={11} /> {i.proximo_passo}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <Confirmar
        aberto={!!excluir}
        titulo="Excluir interação"
        mensagem="Esta interação será removida do histórico."
        textoConfirmar="Excluir"
        perigo
        onCancelar={() => setExcluir(null)}
        onConfirmar={async () => {
          await chamar(api.interacoes.excluir(excluir!.id)).catch((e) => avisar(e.message, 'erro'))
          setExcluir(null)
          carregar()
        }}
      />
    </div>
  )
})
