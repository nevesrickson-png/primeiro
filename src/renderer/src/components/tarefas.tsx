import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Check, Pencil, Trash2, Plus, User, CalendarClock, RefreshCcw, Circle } from 'lucide-react'
import { TIPOS_TAREFA, type TipoTarefa } from '@shared/constants'
import type { Tarefa, TarefaInput } from '@shared/types'
import { api, chamar } from '../lib/api'
import { data as formatarData } from '../lib/format'
import { Confirmar, Field, Modal, Select } from './ui'
import { DataInput } from './inputs'
import { LeadPicker } from './LeadPicker'
import { useToast } from './toast'

export function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function somarDiasISO(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const r = new Date(a, m - 1, d + dias)
  return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}-${String(r.getDate()).padStart(2, '0')}`
}

/** "Hoje", "Amanhã", "Ontem", "sex, 03/10" ou dd/mm/aaaa. */
export function rotuloData(iso: string): string {
  const hoje = hojeISO()
  if (iso === hoje) return 'Hoje'
  if (iso === somarDiasISO(hoje, 1)) return 'Amanhã'
  if (iso === somarDiasISO(hoje, -1)) return 'Ontem'
  const [a, m, d] = iso.split('-').map(Number)
  const dt = new Date(a, m - 1, d)
  const dif = Math.round((dt.getTime() - new Date(hoje + 'T00:00:00').getTime()) / 86_400_000)
  if (dif > 0 && dif < 7) return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')
  return formatarData(iso)
}

function BadgeData({ data, concluida }: { data: string | null; concluida: boolean }) {
  if (!data) return <span className="text-xs text-zinc-400">sem data</span>
  const hoje = hojeISO()
  const cor = concluida
    ? 'text-zinc-400'
    : data < hoje
      ? 'text-red-600 dark:text-red-400'
      : data === hoje
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-zinc-500'
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap text-xs tabular-nums', cor)}>
      <CalendarClock size={12} /> {rotuloData(data)}
    </span>
  )
}

const ICONE_TIPO: Record<TipoTarefa, typeof Circle> = { follow_up: User, revisao: RefreshCcw, outro: Circle }

export function TarefaLinha({ tarefa, onAlterada, mostrarLead = true }: { tarefa: Tarefa; onAlterada: () => void; mostrarLead?: boolean }) {
  const navigate = useNavigate()
  const avisar = useToast()
  const [editando, setEditando] = useState(false)
  const [excluir, setExcluir] = useState(false)
  const [concluindo, setConcluindo] = useState(false)
  const Icone = ICONE_TIPO[tarefa.tipo]

  async function alternar() {
    setConcluindo(true)
    try {
      await chamar(api.tarefas.concluir(tarefa.id, !tarefa.concluida))
      if (!tarefa.concluida) avisar('Tarefa concluída.')
      onAlterada()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    } finally {
      setConcluindo(false)
    }
  }

  return (
    <div className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
      <button
        onClick={alternar}
        disabled={concluindo}
        title={tarefa.concluida ? 'Reabrir' : 'Concluir'}
        className={clsx(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition',
          tarefa.concluida ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-zinc-300 hover:border-emerald-500 hover:bg-emerald-50 dark:border-zinc-600 dark:hover:bg-emerald-500/10'
        )}
      >
        {tarefa.concluida && <Check size={11} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={clsx('truncate text-sm', tarefa.concluida && 'text-zinc-400 line-through')}>{tarefa.titulo}</div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1"><Icone size={11} /> {TIPOS_TAREFA.find((t) => t.value === tarefa.tipo)?.label}</span>
          {mostrarLead && tarefa.lead_id && tarefa.lead_nome && (
            <button className="truncate hover:text-brand-600 hover:underline" onClick={() => navigate(`/leads/${tarefa.lead_id}`)}>
              {tarefa.lead_nome}
            </button>
          )}
        </div>
      </div>
      <BadgeData data={tarefa.data_vencimento} concluida={tarefa.concluida} />
      <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
        <button className="btn-ghost btn-sm" title="Editar" onClick={() => setEditando(true)}><Pencil size={12} /></button>
        <button className="btn-ghost btn-sm hover:text-red-600" title="Excluir" onClick={() => setExcluir(true)}><Trash2 size={12} /></button>
      </div>
      <EditarTarefa aberto={editando} tarefa={tarefa} onFechar={() => setEditando(false)} onSalva={onAlterada} />
      <Confirmar
        aberto={excluir}
        titulo="Excluir tarefa"
        mensagem={<>Excluir a tarefa <strong>{tarefa.titulo}</strong>?</>}
        textoConfirmar="Excluir"
        perigo
        onCancelar={() => setExcluir(false)}
        onConfirmar={async () => {
          await chamar(api.tarefas.excluir(tarefa.id)).catch((e) => avisar(e.message, 'erro'))
          setExcluir(false)
          onAlterada()
        }}
      />
    </div>
  )
}

/** Criação/edição completa num diálogo. Sem `tarefa`, cria uma nova. */
export function EditarTarefa({ aberto, tarefa, leadFixo, onFechar, onSalva }: {
  aberto: boolean
  tarefa?: Tarefa
  leadFixo?: { id: string; nome: string }
  onFechar: () => void
  onSalva: () => void
}) {
  const avisar = useToast()
  const [form, setForm] = useState<TarefaInput>({ lead_id: null, titulo: '', data_vencimento: hojeISO(), tipo: 'follow_up' })
  const [leadNome, setLeadNome] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    if (tarefa) {
      setForm({ lead_id: tarefa.lead_id, titulo: tarefa.titulo, data_vencimento: tarefa.data_vencimento, tipo: tarefa.tipo })
      setLeadNome(tarefa.lead_nome)
    } else {
      setForm({ lead_id: leadFixo?.id ?? null, titulo: '', data_vencimento: hojeISO(), tipo: 'follow_up' })
      setLeadNome(leadFixo?.nome ?? null)
    }
  }, [aberto, tarefa, leadFixo])

  async function salvar(e?: FormEvent) {
    e?.preventDefault()
    try {
      if (tarefa) await chamar(api.tarefas.atualizar(tarefa.id, form))
      else await chamar(api.tarefas.criar(form))
      avisar(tarefa ? 'Tarefa atualizada.' : 'Tarefa criada.')
      onSalva()
      onFechar()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={tarefa ? 'Editar tarefa' : 'Nova tarefa'}
      rodape={
        <>
          <button className="btn-secondary" onClick={onFechar}>Cancelar</button>
          <button className="btn-primary" onClick={() => salvar()}>Salvar</button>
        </>
      }
    >
      <form onSubmit={salvar} className="space-y-3">
        <Field label="Título">
          <input autoFocus className="input" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vencimento"><DataInput value={form.data_vencimento} onChange={(v) => setForm((f) => ({ ...f, data_vencimento: v }))} /></Field>
          <Field label="Tipo">
            <Select permitirVazio={false} value={form.tipo} onChange={(v) => setForm((f) => ({ ...f, tipo: (v ?? 'follow_up') as TipoTarefa }))} opcoes={TIPOS_TAREFA} />
          </Field>
        </div>
        {!leadFixo && (
          <Field label="Lead (opcional)">
            <LeadPicker value={form.lead_id} nome={leadNome} onChange={(id, nome) => { setForm((f) => ({ ...f, lead_id: id })); setLeadNome(nome) }} />
          </Field>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

const ATALHOS_DATA: { label: string; dias: number | null }[] = [
  { label: 'Hoje', dias: 0 },
  { label: 'Amanhã', dias: 1 },
  { label: '+3 dias', dias: 3 },
  { label: '+1 semana', dias: 7 },
  { label: 'Sem data', dias: null }
]

/** Linha de criação rápida: digite o título, escolha a data e pressione Enter. */
export function NovaTarefaRapida({ leadId, onCriada }: { leadId?: string; onCriada: () => void }) {
  const avisar = useToast()
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState<string | null>(hojeISO())
  const [tipo, setTipo] = useState<TipoTarefa>('follow_up')

  async function criar() {
    if (!titulo.trim()) return
    try {
      await chamar(api.tarefas.criar({ lead_id: leadId ?? null, titulo, data_vencimento: data, tipo }))
      setTitulo('')
      avisar('Tarefa criada.')
      onCriada()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <Plus size={15} className="ml-1 shrink-0 text-zinc-400" />
        <input
          className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
          placeholder="Nova tarefa… (Enter para criar)"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && criar()}
        />
        <div className="w-32"><DataInput value={data} onChange={setData} /></div>
        <Select className="w-32" permitirVazio={false} value={tipo} onChange={(v) => setTipo((v ?? 'follow_up') as TipoTarefa)} opcoes={TIPOS_TAREFA} />
        <button className="btn-primary" onClick={criar} disabled={!titulo.trim()}>Criar</button>
      </div>
      <div className="mt-1.5 flex gap-1 pl-7">
        {ATALHOS_DATA.map((a) => {
          const valor = a.dias === null ? null : somarDiasISO(hojeISO(), a.dias)
          return (
            <button
              key={a.label}
              type="button"
              onClick={() => setData(valor)}
              className={clsx('rounded px-1.5 py-0.5 text-[11px]', data === valor ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800')}
            >
              {a.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
