import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { CalendarCheck, Pencil, Plus, Trash2, UserPlus, Users, Smile, RefreshCcw } from 'lucide-react'
import type { Indicacao, Nps, Revisao } from '@shared/types'
import { api, chamar } from '../lib/api'
import { data as formatarData, moedaCompacta } from '../lib/format'
import { Confirmar, EtapaBadge, Field } from './ui'
import { DataInput } from './inputs'
import { hojeISO, rotuloData, somarDiasISO } from './tarefas'
import { useToast } from './toast'

function Secao({ icone, titulo, descricao, children, acao }: { icone: React.ReactNode; titulo: string; descricao?: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className="border-b border-zinc-100 py-6 last:border-0 dark:border-zinc-800/70">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-zinc-400">{icone}</span>
          <div>
            <h3 className="text-sm font-semibold">{titulo}</h3>
            {descricao && <p className="text-xs text-zinc-500">{descricao}</p>}
          </div>
        </div>
        {acao}
      </div>
      {children}
    </section>
  )
}

// ---------------- Revisões ----------------

const PRAZOS = [
  { label: '3 meses', dias: 91 },
  { label: '6 meses', dias: 182 },
  { label: '12 meses', dias: 365 }
]

function Revisoes({ leadId }: { leadId: string }) {
  const avisar = useToast()
  const [itens, setItens] = useState<Revisao[]>([])
  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [excluir, setExcluir] = useState<Revisao | null>(null)
  const [form, setForm] = useState({ data: hojeISO() as string | null, notas: '', proxima: somarDiasISO(hojeISO(), 91) as string | null })

  const carregar = useCallback(() => chamar(api.posvenda.revisoes(leadId)).then(setItens).catch((e) => avisar(e.message, 'erro')), [leadId, avisar])
  useEffect(() => {
    carregar()
  }, [carregar])

  function novo() {
    setEditando(null)
    setForm({ data: hojeISO(), notas: '', proxima: somarDiasISO(hojeISO(), 91) })
    setAberto(true)
  }

  async function salvar() {
    if (!form.data) return avisar('Informe a data da revisão.', 'erro')
    const dados = { lead_id: leadId, data: form.data, notas: form.notas, proxima_revisao: form.proxima }
    try {
      if (editando) await chamar(api.posvenda.atualizarRevisao(editando, dados))
      else await chamar(api.posvenda.criarRevisao(dados))
      avisar(editando ? 'Revisão atualizada.' : 'Revisão registrada.')
      setAberto(false)
      carregar()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  const proxima = itens[0]?.proxima_revisao
  const hoje = hojeISO()

  return (
    <Secao
      icone={<RefreshCcw size={16} />}
      titulo="Revisões de carteira"
      descricao="A próxima revisão aparece na tela Início quando faltar menos de 30 dias."
      acao={!aberto && <button className="btn-secondary btn-sm" onClick={novo}><Plus size={13} /> Registrar revisão</button>}
    >
      {proxima && (
        <div className={clsx('mb-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs', proxima < hoje ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300')}>
          <CalendarCheck size={13} /> Próxima revisão: <strong>{rotuloData(proxima)}</strong>{proxima < hoje && ' (atrasada)'}
        </div>
      )}
      {aberto && (
        <div className="card mb-4 space-y-3 p-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Data da revisão"><DataInput value={form.data} onChange={(v) => setForm((f) => ({ ...f, data: v }))} /></Field>
            <Field label="Próxima revisão"><DataInput value={form.proxima} onChange={(v) => setForm((f) => ({ ...f, proxima: v }))} /></Field>
            <div className="flex items-end gap-1 pb-1">
              {PRAZOS.map((p) => (
                <button key={p.label} type="button" className="btn-ghost btn-sm" onClick={() => form.data && setForm((f) => ({ ...f, proxima: somarDiasISO(f.data!, p.dias) }))}>
                  +{p.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Notas">
            <textarea autoFocus className="input" rows={3} placeholder="O que foi revisado, mudanças na alocação, novos objetivos…" value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} />
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setAberto(false)}>Cancelar</button>
            <button className="btn-primary" onClick={salvar}>Salvar</button>
          </div>
        </div>
      )}
      {itens.length === 0 && !aberto && <p className="text-sm text-zinc-500">Nenhuma revisão registrada.</p>}
      <ol className="space-y-3">
        {itens.map((r) => (
          <li key={r.id} className="group flex gap-3">
            <div className="w-24 shrink-0 text-xs tabular-nums text-zinc-500">{formatarData(r.data)}</div>
            <div className="min-w-0 flex-1">
              {r.notas && <p className="whitespace-pre-wrap text-sm">{r.notas}</p>}
              {r.proxima_revisao && <p className="mt-0.5 text-xs text-zinc-500">Próxima: {formatarData(r.proxima_revisao)}</p>}
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
              <button className="btn-ghost btn-sm" title="Editar" onClick={() => { setEditando(r.id); setForm({ data: r.data, notas: r.notas ?? '', proxima: r.proxima_revisao }); setAberto(true) }}><Pencil size={12} /></button>
              <button className="btn-ghost btn-sm hover:text-red-600" title="Excluir" onClick={() => setExcluir(r)}><Trash2 size={12} /></button>
            </div>
          </li>
        ))}
      </ol>
      <Confirmar aberto={!!excluir} titulo="Excluir revisão" mensagem="Esta revisão será removida." textoConfirmar="Excluir" perigo onCancelar={() => setExcluir(null)}
        onConfirmar={async () => { await chamar(api.posvenda.excluirRevisao(excluir!.id)).catch((e) => avisar(e.message, 'erro')); setExcluir(null); carregar() }} />
    </Secao>
  )
}

// ---------------- Indicações ----------------

function Indicacoes({ leadId, leadNome }: { leadId: string; leadNome: string }) {
  const navigate = useNavigate()
  const [itens, setItens] = useState<Indicacao[]>([])
  useEffect(() => {
    chamar(api.posvenda.indicacoes(leadId)).then(setItens).catch(() => {})
  }, [leadId])
  const convertidos = itens.filter((i) => i.etapa === 'conta_aberta' || i.etapa === 'cliente_ativo').length

  return (
    <Secao
      icone={<Users size={16} />}
      titulo={`Indicações recebidas${itens.length ? ` (${itens.length})` : ''}`}
      descricao={itens.length ? `${convertidos} viraram clientes.` : 'Leads que chegaram por indicação deste lead.'}
      acao={
        <button className="btn-secondary btn-sm" onClick={() => navigate(`/leads/novo?indicado_por=${leadId}&indicado_nome=${encodeURIComponent(leadNome)}`)}>
          <UserPlus size={13} /> Cadastrar indicação
        </button>
      }
    >
      {itens.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma indicação ainda. Que tal pedir uma na próxima conversa?</p>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {itens.map((i) => (
            <button key={i.id} onClick={() => navigate(`/leads/${i.id}`)} className="flex w-full items-center gap-3 px-1 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{i.nome}</span>
              <EtapaBadge etapa={i.etapa} />
              <span className="w-20 text-right text-xs tabular-nums text-zinc-500">{moedaCompacta(i.valor_potencial)}</span>
              <span className="w-24 text-right text-xs text-zinc-400">{formatarData(i.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </Secao>
  )
}

// ---------------- NPS ----------------

function corNota(n: number, ativo = true): string {
  if (!ativo) return 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
  if (n <= 6) return 'border-red-500 bg-red-500 text-white'
  if (n <= 8) return 'border-amber-500 bg-amber-500 text-white'
  return 'border-emerald-500 bg-emerald-500 text-white'
}
const categoria = (n: number) => (n <= 6 ? 'Detrator' : n <= 8 ? 'Neutro' : 'Promotor')

function NpsLead({ leadId }: { leadId: string }) {
  const avisar = useToast()
  const [itens, setItens] = useState<Nps[]>([])
  const [nota, setNota] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')
  const [data, setData] = useState<string | null>(hojeISO())
  const [geral, setGeral] = useState<{ nps: number | null; respostas: number } | null>(null)

  const carregar = useCallback(() => {
    chamar(api.posvenda.nps(leadId)).then(setItens).catch((e) => avisar(e.message, 'erro'))
    chamar(api.posvenda.resumoNps()).then(setGeral).catch(() => {})
  }, [leadId, avisar])
  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvar() {
    if (nota === null || !data) return
    try {
      await chamar(api.posvenda.criarNps({ lead_id: leadId, data, nota, comentario }))
      avisar('Nota de NPS registrada.')
      setNota(null)
      setComentario('')
      carregar()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  return (
    <Secao
      icone={<Smile size={16} />}
      titulo="NPS"
      descricao="“De 0 a 10, quanto você recomendaria meu trabalho a um amigo?”"
      acao={geral && geral.nps !== null && (
        <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" title="Última nota de cada cliente nos últimos 12 meses">
          NPS da carteira: <strong className="tabular-nums">{geral.nps}</strong> · {geral.respostas} resposta(s)
        </span>
      )}
    >
      <div className="card mb-4 p-4">
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 11 }, (_, n) => (
            <button key={n} type="button" onClick={() => setNota(n)} className={clsx('h-9 w-9 rounded-md border text-sm font-semibold tabular-nums transition', corNota(n, nota === n))}>
              {n}
            </button>
          ))}
          {nota !== null && <span className="ml-2 self-center text-xs text-zinc-500">{categoria(nota)}</span>}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input className="input" placeholder="Comentário do cliente (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && salvar()} />
          <div className="w-32 shrink-0"><DataInput value={data} onChange={setData} /></div>
          <button className="btn-primary" disabled={nota === null || !data} onClick={salvar}>Registrar</button>
        </div>
      </div>
      {itens.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma nota registrada.</p>
      ) : (
        <ol className="space-y-2">
          {itens.map((n) => (
            <li key={n.id} className="group flex items-start gap-3">
              <span className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold', corNota(n.nota))}>{n.nota}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-zinc-500">{formatarData(n.data)} · {categoria(n.nota)}</div>
                {n.comentario && <p className="text-sm">“{n.comentario}”</p>}
              </div>
              <button className="btn-ghost btn-sm opacity-0 hover:text-red-600 group-hover:opacity-100" title="Excluir" onClick={async () => { await chamar(api.posvenda.excluirNps(n.id)); carregar() }}>
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </Secao>
  )
}

export function PosVendaLead({ leadId, leadNome }: { leadId: string; leadNome: string }) {
  return (
    <div>
      <Revisoes leadId={leadId} />
      <Indicacoes leadId={leadId} leadNome={leadNome} />
      <NpsLead leadId={leadId} />
    </div>
  )
}
