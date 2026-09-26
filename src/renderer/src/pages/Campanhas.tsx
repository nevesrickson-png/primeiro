import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArrowLeft, Copy, FlaskConical, Loader2, Mail, MailX, Paperclip, Pause, Play, Plus, Send, Trash2, Users, X,
  AlertTriangle, CheckCircle2, Ban, Save, Settings
} from 'lucide-react'
import {
  ETAPAS, FAIXAS_PATRIMONIO, ORIGENS, PRODUTOS, PUBLICOS_CAMPANHA, SUITABILITY, VARIAVEIS_EMAIL, rotulo,
  type PublicoCampanha
} from '@shared/constants'
import { montarMensagem } from '@shared/emailModelo'
import type {
  Campanha, CampanhaInput, ConfigEmail, EnvioCampanha, FiltrosLeads, PreviaDestinatarios, StatusCampanha, Tag
} from '@shared/types'
import { api, chamar } from '../lib/api'
import { dataHora } from '../lib/format'
import { Confirmar, Field, FiltroMulti, Modal, Select, Toggle, Vazio } from '../components/ui'
import { useToast } from '../components/toast'

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const STATUS: Record<StatusCampanha, { label: string; cor: string }> = {
  rascunho: { label: 'Rascunho', cor: 'bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700' },
  enviando: { label: 'Enviando', cor: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-900' },
  pausada: { label: 'Pausada', cor: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900' },
  concluida: { label: 'Concluída', cor: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900' },
  cancelada: { label: 'Cancelada', cor: 'bg-zinc-100 text-zinc-500 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700' }
}

function BadgeStatus({ status }: { status: StatusCampanha }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', STATUS[status].cor)}>
      {status === 'enviando' && <Loader2 size={11} className="animate-spin" />}
      {STATUS[status].label}
    </span>
  )
}

function rotuloPublico(c: Pick<Campanha, 'publico'>): string {
  return PUBLICOS_CAMPANHA.find((p) => p.value === c.publico)?.label ?? c.publico
}

const tamanho = (b: number) => (b > 1_048_576 ? `${(b / 1_048_576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.ceil(b / 1024)} KB`)

function duracao(segundos: number): string {
  if (segundos < 90) return `${Math.max(1, Math.round(segundos))} s`
  const min = Math.round(segundos / 60)
  if (min < 90) return `${min} min`
  const h = Math.floor(min / 60)
  return `${h} h ${min % 60} min`
}

function Barra({ c }: { c: Pick<Campanha, 'total' | 'enviados' | 'erros'> }) {
  const pct = c.total ? ((c.enviados + c.erros) / c.total) * 100 : 0
  const pctErro = c.total ? (c.erros / c.total) * 100 : 0
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct - pctErro}%` }} />
      <div className="h-full bg-red-500 transition-all" style={{ width: `${pctErro}%` }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Descadastros
// ---------------------------------------------------------------------------

function ModalDescadastros({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const avisar = useToast()
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')
  const [lista, setLista] = useState<{ id: string; nome: string; email: string | null; email_descadastrado_em: string }[]>([])
  const carregar = useCallback(() => chamar(api.descadastro.listar()).then(setLista).catch(() => {}), [])
  useEffect(() => {
    if (aberto) {
      setTexto('')
      carregar()
    }
  }, [aberto, carregar])

  async function marcar() {
    try {
      const r = await chamar(api.descadastro.emails(texto))
      avisar(`${r.marcados} lead(s) descadastrado(s).${r.naoEncontrados.length ? ` Não encontrados: ${r.naoEncontrados.slice(0, 3).join(', ')}${r.naoEncontrados.length > 3 ? '…' : ''}` : ''}`)
      setTexto('')
      carregar()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Descadastros (não receber e-mails)" largura="max-w-2xl" rodape={<button className="btn-primary" onClick={onFechar}>Fechar</button>}>
      <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-300">Cole os e-mails de quem pediu para sair (por exemplo, quem respondeu "SAIR"). Eles deixam de receber qualquer campanha.</p>
      <textarea className="input font-mono text-xs" rows={3} placeholder="fulano@gmail.com, ciclana@hotmail.com…" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="mt-2 flex justify-end">
        <button className="btn-secondary" disabled={!texto.trim()} onClick={marcar}><MailX size={14} /> Descadastrar</button>
      </div>
      <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Descadastrados ({lista.length})</h3>
      <div className="max-h-64 divide-y divide-zinc-100 overflow-auto dark:divide-zinc-800">
        {lista.length === 0 && <p className="py-4 text-center text-sm text-zinc-500">Ninguém descadastrado.</p>}
        {lista.map((l) => (
          <div key={l.id} className="flex items-center gap-3 py-1.5 text-sm">
            <button className="min-w-0 flex-1 truncate text-left hover:underline" onClick={() => { onFechar(); navigate(`/leads/${l.id}`) }}>{l.nome}</button>
            <span className="truncate text-xs text-zinc-500">{l.email}</span>
            <span className="text-xs text-zinc-400">{dataHora(l.email_descadastrado_em)}</span>
            <button className="btn-ghost btn-sm" title="Voltar a receber" onClick={async () => { await chamar(api.descadastro.definir(l.id, false)); carregar() }}>Reativar</button>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Lista de campanhas
// ---------------------------------------------------------------------------

export function Campanhas() {
  const navigate = useNavigate()
  const avisar = useToast()
  const [itens, setItens] = useState<Campanha[] | null>(null)
  const [cfg, setCfg] = useState<ConfigEmail | null>(null)
  const [descadastros, setDescadastros] = useState(false)

  const carregar = useCallback(() => chamar(api.campanhas.listar()).then(setItens).catch((e) => avisar(e.message, 'erro')), [avisar])
  useEffect(() => {
    carregar()
    chamar(api.email.obterConfig()).then(setCfg).catch(() => {})
    return api.campanhas.aoProgredir(() => carregar())
  }, [carregar])

  const configurado = !!cfg?.usuario && cfg.senhaDefinida

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
        <h1 className="text-base font-semibold">E-mails em massa</h1>
        <div className="flex gap-2">
          <button className="btn-ghost h-8" onClick={() => setDescadastros(true)}><MailX size={14} /> Descadastros</button>
          <button className="btn-primary h-8" onClick={() => navigate('/campanhas/nova')}><Plus size={15} /> Nova campanha</button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6">
          {cfg && !configurado && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <span className="flex items-center gap-2"><AlertTriangle size={16} /> Configure a sua caixa de e-mail antes de enviar campanhas.</span>
              <button className="btn-secondary btn-sm" onClick={() => navigate('/configuracoes')}><Settings size={13} /> Configurar</button>
            </div>
          )}
          {itens && itens.length === 0 ? (
            <Vazio
              icone={<Mail size={22} />}
              titulo="Nenhuma campanha ainda"
              texto="Envie um e-mail personalizado para todos os leads, só para os clientes ou para qualquer lista filtrada."
              acao={<button className="btn-primary" onClick={() => navigate('/campanhas/nova')}><Plus size={15} /> Criar a primeira campanha</button>}
            />
          ) : (
            <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {itens?.map((c) => (
                <button key={c.id} onClick={() => navigate(`/campanhas/${c.id}`)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{c.nome}</span>
                      <BadgeStatus status={c.status} />
                    </div>
                    <div className="truncate text-xs text-zinc-500">{c.assunto || 'Sem assunto'} · {rotuloPublico(c)}</div>
                  </div>
                  {c.status !== 'rascunho' && (
                    <div className="w-44">
                      <Barra c={c} />
                      <div className="mt-1 text-right text-[11px] tabular-nums text-zinc-500">
                        {c.enviados}/{c.total} enviados{c.erros ? ` · ${c.erros} erro(s)` : ''}
                      </div>
                    </div>
                  )}
                  <span className="w-32 text-right text-xs text-zinc-400">{dataHora(c.iniciada_em ?? c.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <ModalDescadastros aberto={descadastros} onFechar={() => setDescadastros(false)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor (rascunho)
// ---------------------------------------------------------------------------

const MODELO_CORPO = `Olá, {{primeiro_nome}}!

Escreva aqui a sua mensagem. Você pode usar **negrito** e _itálico_, e os links viram clicáveis automaticamente.

Abraço,
`

const VAZIA: CampanhaInput = {
  nome: '', assunto: '', corpo: MODELO_CORPO, publico: 'todos', filtros: {}, incluir_sem_consentimento: false, anexos: []
}

function paraInput(c: Campanha): CampanhaInput {
  return { nome: c.nome, assunto: c.assunto, corpo: c.corpo, publico: c.publico, filtros: c.filtros, incluir_sem_consentimento: c.incluir_sem_consentimento, anexos: c.anexos }
}

function Editor({ campanha }: { campanha: Campanha | null }) {
  const navigate = useNavigate()
  const avisar = useToast()
  const [busca] = useSearchParams()
  const [form, setForm] = useState<CampanhaInput>(() => {
    if (campanha) return paraInput(campanha)
    // Vindo da tela Leads: já traz os filtros da lista.
    const f = busca.get('filtros')
    if (f) {
      try {
        const filtros = JSON.parse(f) as FiltrosLeads
        return { ...VAZIA, publico: 'personalizado', filtros }
      } catch {
        /* ignora */
      }
    }
    return VAZIA
  })
  const [salvo, setSalvo] = useState(JSON.stringify(campanha ? paraInput(campanha) : null))
  const [id, setId] = useState<string | null>(campanha?.id ?? null)
  const [previa, setPrevia] = useState<PreviaDestinatarios | null>(null)
  const [cfg, setCfg] = useState<ConfigEmail | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [enviadosHoje, setEnviadosHoje] = useState(0)
  const [confirmar, setConfirmar] = useState(false)
  const [testando, setTestando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const assuntoRef = useRef<HTMLInputElement>(null)
  const corpoRef = useRef<HTMLTextAreaElement>(null)
  const ultimoCampo = useRef<'assunto' | 'corpo'>('corpo')

  useEffect(() => {
    chamar(api.email.obterConfig()).then(setCfg).catch(() => {})
    chamar(api.tags.listar()).then(setTags).catch(() => {})
    chamar(api.email.enviadosHoje()).then(setEnviadosHoje).catch(() => {})
  }, [])

  const chavePublico = JSON.stringify([form.publico, form.filtros, form.incluir_sem_consentimento])
  useEffect(() => {
    const t = setTimeout(() => {
      chamar(api.campanhas.previa({ publico: form.publico, filtros: form.filtros, incluir_sem_consentimento: form.incluir_sem_consentimento }))
        .then(setPrevia)
        .catch((e) => avisar(e.message, 'erro'))
    }, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chavePublico, avisar])

  const set = <K extends keyof CampanhaInput>(k: K, v: CampanhaInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setFiltro = <K extends keyof FiltrosLeads>(k: K, v: FiltrosLeads[K]) => setForm((f) => ({ ...f, filtros: { ...f.filtros, [k]: v } }))

  function inserirVariavel(chave: string) {
    const token = `{{${chave}}}`
    const campo = ultimoCampo.current
    const el = campo === 'assunto' ? assuntoRef.current : corpoRef.current
    const atual = campo === 'assunto' ? form.assunto : form.corpo
    const ini = el?.selectionStart ?? atual.length
    const fim = el?.selectionEnd ?? atual.length
    const novo = atual.slice(0, ini) + token + atual.slice(fim)
    set(campo, novo)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(ini + token.length, ini + token.length)
    })
  }

  async function salvar(silencioso = false): Promise<string | null> {
    try {
      const c = await chamar(api.campanhas.salvar(id, form))
      setId(c.id)
      setSalvo(JSON.stringify(form))
      if (!id) navigate(`/campanhas/${c.id}`, { replace: true })
      if (!silencioso) avisar('Rascunho salvo.')
      return c.id
    } catch (e) {
      avisar((e as Error).message, 'erro')
      return null
    }
  }

  async function enviarTeste() {
    setTestando(true)
    try {
      const para = await chamar(api.campanhas.enviarTeste(form))
      avisar(`E-mail de teste enviado para ${para}. Confira a caixa de entrada (e o spam).`)
    } catch (e) {
      avisar((e as Error).message, 'erro')
    } finally {
      setTestando(false)
    }
  }

  async function iniciar() {
    setOcupado(true)
    try {
      const cid = await salvar(true)
      if (!cid) return
      await chamar(api.campanhas.iniciar(cid))
      avisar('Envio iniciado! Mantenha o app aberto até terminar.')
      setConfirmar(false)
      navigate(`/campanhas/${cid}`, { replace: true })
      window.dispatchEvent(new Event('crm:campanha-iniciada'))
    } catch (e) {
      avisar((e as Error).message, 'erro')
      setConfirmar(false)
    } finally {
      setOcupado(false)
    }
  }

  async function anexar() {
    try {
      const novos = await chamar(api.email.escolherAnexos())
      if (novos.length) set('anexos', [...form.anexos, ...novos.filter((n) => !form.anexos.some((a) => a.caminho === n.caminho))])
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  const exemplo = previa?.amostra[0]
  const htmlPrevia = useMemo(
    () => montarMensagem(form.assunto || '(sem assunto)', form.corpo, cfg?.rodape ?? '', { nome: exemplo?.nome ?? 'Mariana Costa Almeida', empresa: 'Clínica Sorriso', cidade: 'Campinas', profissao: 'Dentista' }),
    [form.assunto, form.corpo, cfg?.rodape, exemplo?.nome]
  )
  const alterado = JSON.stringify(form) !== salvo
  const configurado = !!cfg?.usuario && cfg.senhaDefinida
  const totalAnexos = form.anexos.reduce((s, a) => s + a.tamanho, 0)
  const podeIniciar = configurado && !!previa?.recebem && form.assunto.trim() && form.corpo.trim()
  const tempoEstimado = previa ? previa.recebem * (cfg?.intervaloSeg ?? 4) * 1.15 : 0
  const restanteHoje = Math.max(0, (cfg?.limiteDiario ?? 0) - enviadosHoje)

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button className="btn-ghost btn-sm" onClick={() => navigate('/campanhas')}><ArrowLeft size={14} /> E-mails</button>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <input className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-zinc-400" placeholder="Nome da campanha (só para você)" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
          {alterado && id && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">não salvo</span>}
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost h-8" onClick={() => salvar()}><Save size={14} /> Salvar rascunho</button>
          <button className="btn-secondary h-8" onClick={enviarTeste} disabled={testando || !configurado} title={configurado ? 'Envia para o seu próprio e-mail' : 'Configure a caixa de e-mail primeiro'}>
            <FlaskConical size={14} /> {testando ? 'Enviando…' : 'Enviar teste'}
          </button>
          <button className="btn-primary h-8" onClick={() => setConfirmar(true)} disabled={!podeIniciar}>
            <Send size={14} /> Enviar para {previa?.recebem ?? '…'}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 p-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            {!configurado && cfg && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <span className="flex items-center gap-2"><AlertTriangle size={16} /> Configure a caixa de e-mail para poder enviar.</span>
                <button className="btn-secondary btn-sm" onClick={() => navigate('/configuracoes')}>Configurar</button>
              </div>
            )}

            <section className="card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users size={15} className="text-zinc-400" /> Para quem</h2>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {PUBLICOS_CAMPANHA.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => set('publico', p.value as PublicoCampanha)}
                    className={clsx(
                      'rounded-lg border p-3 text-left transition',
                      form.publico === p.value ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-500/10' : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                    )}
                  >
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs text-zinc-500">{p.descricao}</div>
                  </button>
                ))}
              </div>
              {form.publico === 'personalizado' && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/40">
                  <input className="input h-8 w-48 text-xs" placeholder="Busca (nome, e-mail…)" value={form.filtros.busca ?? ''} onChange={(e) => setFiltro('busca', e.target.value)} />
                  <FiltroMulti titulo="Etapa" opcoes={ETAPAS} valores={form.filtros.etapas ?? []} onChange={(v) => setFiltro('etapas', v)} />
                  <FiltroMulti titulo="Origem" opcoes={ORIGENS} valores={form.filtros.origens ?? []} onChange={(v) => setFiltro('origens', v)} />
                  <FiltroMulti titulo="Patrimônio" opcoes={FAIXAS_PATRIMONIO} valores={form.filtros.faixas_patrimonio ?? []} onChange={(v) => setFiltro('faixas_patrimonio', v)} />
                  <FiltroMulti titulo="Suitability" opcoes={SUITABILITY} valores={form.filtros.suitability ?? []} onChange={(v) => setFiltro('suitability', v)} />
                  <Select className="h-8 w-36 text-xs" value={form.filtros.tag_id ?? null} onChange={(v) => setFiltro('tag_id', v)} opcoes={tags.map((t) => ({ value: t.id, label: t.nome }))} vazio="Todas as tags" />
                  <Select className="h-8 w-36 text-xs" value={form.filtros.produto ?? null} onChange={(v) => setFiltro('produto', v as FiltrosLeads['produto'])} opcoes={PRODUTOS} vazio="Todos os produtos" />
                </div>
              )}
              <div className="mt-3">
                <Toggle checked={form.incluir_sem_consentimento} onChange={(v) => set('incluir_sem_consentimento', v)} label="Incluir leads sem consentimento LGPD registrado" />
                {form.incluir_sem_consentimento && (
                  <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    Pela LGPD, e-mail de divulgação precisa de base legal (consentimento, ou legítimo interesse para quem já é cliente). Use só se tiver essa base registrada.
                  </p>
                )}
              </div>
            </section>

            <section className="card space-y-3 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Mail size={15} className="text-zinc-400" /> Mensagem</h2>
              <Field label="Assunto">
                <input ref={assuntoRef} className="input" placeholder="Ex.: {{primeiro_nome}}, novidades sobre a sua carteira" value={form.assunto} onFocus={() => (ultimoCampo.current = 'assunto')} onChange={(e) => set('assunto', e.target.value)} />
              </Field>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-1">
                  <span className="mr-1 text-xs text-zinc-500">Inserir:</span>
                  {VARIAVEIS_EMAIL.map((v) => (
                    <button key={v.chave} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => inserirVariavel(v.chave)} className="rounded-md border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800" title={`Ex.: ${v.exemplo}`}>
                      {v.descricao}
                    </button>
                  ))}
                </div>
                <textarea ref={corpoRef} className="input font-[inherit]" rows={14} value={form.corpo} onFocus={() => (ultimoCampo.current = 'corpo')} onChange={(e) => set('corpo', e.target.value)} />
                <p className="mt-1 text-[11px] text-zinc-400">**negrito** · _itálico_ · links e e-mails viram clicáveis · o rodapé de descadastro é incluído automaticamente.</p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <button type="button" className="btn-ghost btn-sm" onClick={anexar}><Paperclip size={13} /> Anexar arquivo</button>
                  {form.anexos.length > 0 && <span className={clsx('text-xs', totalAnexos > 15 * 1_048_576 ? 'text-red-600' : 'text-zinc-400')}>{tamanho(totalAnexos)} de 15 MB</span>}
                </div>
                {form.anexos.map((a) => (
                  <div key={a.caminho} className="mt-1 flex items-center gap-2 rounded-md bg-zinc-50 px-2 py-1 text-xs dark:bg-zinc-800/50">
                    <Paperclip size={12} className="text-zinc-400" />
                    <span className="flex-1 truncate">{a.nome}</span>
                    <span className="text-zinc-400">{tamanho(a.tamanho)}</span>
                    <button className="text-zinc-400 hover:text-red-600" onClick={() => set('anexos', form.anexos.filter((x) => x.caminho !== a.caminho))}><X size={12} /></button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">Destinatários</h2>
              {previa ? (
                <>
                  <div className="text-3xl font-semibold tabular-nums">{previa.recebem.toLocaleString('pt-BR')}</div>
                  <div className="text-xs text-zinc-500">pessoas vão receber</div>
                  <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                    {previa.semEmail > 0 && <li>• {previa.semEmail} sem e-mail válido</li>}
                    {previa.semConsentimento > 0 && <li>• {previa.semConsentimento} sem consentimento LGPD</li>}
                    {previa.descadastrados > 0 && <li>• {previa.descadastrados} descadastrado(s)</li>}
                    {previa.repetidos > 0 && <li>• {previa.repetidos} e-mail(s) repetido(s)</li>}
                  </ul>
                  {previa.amostra.length > 0 && (
                    <div className="mt-3 border-t border-zinc-100 pt-2 text-xs text-zinc-500 dark:border-zinc-800">
                      {previa.amostra.map((a) => <div key={a.email} className="truncate">{a.nome} &lt;{a.email}&gt;</div>)}
                      {previa.recebem > previa.amostra.length && <div>e mais {previa.recebem - previa.amostra.length}…</div>}
                    </div>
                  )}
                </>
              ) : (
                <Loader2 size={16} className="animate-spin text-zinc-400" />
              )}
            </section>
            <section className="card overflow-hidden">
              <div className="border-b border-zinc-100 px-4 py-2 text-xs dark:border-zinc-800">
                <div className="text-zinc-400">Prévia{exemplo ? ` (para ${exemplo.nome})` : ''}</div>
                <div className="truncate font-medium">{htmlPrevia.assunto}</div>
              </div>
              {/* Prévia isolada: sandbox sem scripts. */}
              <iframe title="Prévia do e-mail" sandbox="allow-same-origin" srcDoc={htmlPrevia.html} className="h-[420px] w-full bg-white" />
            </section>
          </aside>
        </div>
      </div>

      <Confirmar
        aberto={confirmar}
        titulo="Iniciar envio"
        textoConfirmar={ocupado ? 'Iniciando…' : `Enviar para ${previa?.recebem ?? 0}`}
        onCancelar={() => setConfirmar(false)}
        onConfirmar={iniciar}
        mensagem={
          <div className="space-y-2">
            <p>O e-mail <strong>“{form.assunto}”</strong> será enviado individualmente para <strong>{previa?.recebem} pessoa(s)</strong>, a partir de <strong>{cfg?.usuario}</strong>.</p>
            <p>Com intervalo de {cfg?.intervaloSeg}s entre e-mails, leva cerca de <strong>{duracao(tempoEstimado)}</strong>. Mantenha o app aberto — se fechar, o envio fica pausado e pode ser retomado.</p>
            {previa && previa.recebem > restanteHoje && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Hoje ainda cabem {restanteHoje} envio(s) no limite diário ({cfg?.limiteDiario}). Ao atingir o limite, a campanha pausa; retome no dia seguinte.
              </p>
            )}
            <p className="text-xs text-zinc-500">Dica: use “Enviar teste” antes para conferir como o e-mail chega.</p>
          </div>
        }
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Acompanhamento (campanha iniciada)
// ---------------------------------------------------------------------------

const ABAS_ENVIO = [
  { value: '', label: 'Todos' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'erro', label: 'Com erro' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'ignorado', label: 'Não enviados' }
]

function Detalhe({ inicial }: { inicial: Campanha }) {
  const navigate = useNavigate()
  const avisar = useToast()
  const [c, setC] = useState(inicial)
  const [envios, setEnvios] = useState<EnvioCampanha[]>([])
  const [aba, setAba] = useState('')
  const [cancelar, setCancelar] = useState(false)
  const [excluir, setExcluir] = useState(false)
  const [verMensagem, setVerMensagem] = useState(false)
  const [cfg, setCfg] = useState<ConfigEmail | null>(null)
  const ultimaCarga = useRef(0)

  const carregar = useCallback(() => {
    ultimaCarga.current = Date.now()
    chamar(api.campanhas.obter(c.id)).then(setC).catch(() => {})
    chamar(api.campanhas.envios(c.id, aba || undefined)).then(setEnvios).catch(() => {})
  }, [c.id, aba])

  useEffect(() => {
    carregar()
    chamar(api.email.obterConfig()).then(setCfg).catch(() => {})
  }, [carregar])

  useEffect(
    () =>
      api.campanhas.aoProgredir((p) => {
        if (p.campanhaId !== c.id) return
        setC((atual) => ({ ...atual, status: p.status, enviados: p.enviados, erros: p.erros, pendentes: p.pendentes, mensagem_status: p.mensagem }))
        // A lista de destinatários é recarregada no máximo a cada 2 s.
        if (Date.now() - ultimaCarga.current > 2000 || p.status !== 'enviando') carregar()
      }),
    [c.id, carregar]
  )

  async function acao(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn()
      avisar(msg)
      carregar()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  const restante = c.pendentes * (cfg?.intervaloSeg ?? 4) * 1.15
  const msg = montarMensagem(c.assunto, c.corpo, cfg?.rodape ?? '', { nome: 'Mariana Costa Almeida', empresa: 'Clínica Sorriso', cidade: 'Campinas', profissao: 'Dentista' })

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-2">
          <button className="btn-ghost btn-sm" onClick={() => navigate('/campanhas')}><ArrowLeft size={14} /> E-mails</button>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <span className="truncate text-sm font-medium">{c.nome}</span>
          <BadgeStatus status={c.status} />
        </div>
        <div className="flex gap-2">
          {c.status === 'enviando' && <button className="btn-secondary h-8" onClick={() => acao(() => chamar(api.campanhas.pausar(c.id)), 'Envio pausado.')}><Pause size={14} /> Pausar</button>}
          {c.status === 'pausada' && <button className="btn-primary h-8" onClick={() => acao(() => chamar(api.campanhas.retomar(c.id)), 'Envio retomado.')}><Play size={14} /> Retomar</button>}
          {(c.status === 'enviando' || c.status === 'pausada') && <button className="btn-ghost h-8 text-red-600" onClick={() => setCancelar(true)}><Ban size={14} /> Cancelar</button>}
          <button className="btn-ghost h-8" onClick={async () => { try { const n = await chamar(api.campanhas.duplicar(c.id)); navigate(`/campanhas/${n.id}`) } catch (e) { avisar((e as Error).message, 'erro') } }}><Copy size={14} /> Duplicar</button>
          {c.status !== 'enviando' && <button className="btn-ghost h-8 hover:text-red-600" title="Excluir campanha" onClick={() => setExcluir(true)}><Trash2 size={14} /></button>}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl space-y-4 p-6">
          <section className="card p-5">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <div className="text-xs text-zinc-500">“{c.assunto}” · {rotuloPublico(c)}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{c.enviados.toLocaleString('pt-BR')} <span className="text-base font-normal text-zinc-400">de {c.total.toLocaleString('pt-BR')} enviados</span></div>
              </div>
              <div className="text-right text-xs text-zinc-500">
                {c.status === 'enviando' && c.pendentes > 0 && <div>Faltam ~{duracao(restante)}</div>}
                {c.iniciada_em && <div>Iniciada {dataHora(c.iniciada_em)}</div>}
                {c.concluida_em && <div>Finalizada {dataHora(c.concluida_em)}</div>}
              </div>
            </div>
            <Barra c={c} />
            <div className="mt-3 flex gap-6 text-sm">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> {c.enviados} enviados</span>
              <span className="flex items-center gap-1.5"><AlertTriangle size={14} className="text-red-500" /> {c.erros} com erro</span>
              <span className="flex items-center gap-1.5"><Loader2 size={14} className="text-zinc-400" /> {c.pendentes} pendentes</span>
            </div>
            {c.mensagem_status && (
              <div className={clsx('mt-3 rounded-md px-3 py-2 text-sm', c.status === 'pausada' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300')}>
                {c.mensagem_status}
              </div>
            )}
            {c.status === 'enviando' && <p className="mt-3 text-xs text-zinc-400">Mantenha o app aberto. Você pode usar as outras telas normalmente enquanto envia.</p>}
          </section>

          <section className="card">
            <button className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold" onClick={() => setVerMensagem((v) => !v)}>
              Mensagem enviada <span className="text-xs font-normal text-zinc-400">{verMensagem ? 'ocultar' : 'mostrar'}</span>
            </button>
            {verMensagem && <iframe title="Mensagem" sandbox="allow-same-origin" srcDoc={msg.html} className="h-96 w-full border-t border-zinc-100 bg-white dark:border-zinc-800" />}
          </section>

          <section className="card">
            <div className="flex gap-1 border-b border-zinc-100 px-3 dark:border-zinc-800">
              {ABAS_ENVIO.map((a) => (
                <button key={a.value} onClick={() => setAba(a.value)} className={clsx('-mb-px border-b-2 px-3 py-2 text-xs', aba === a.value ? 'border-brand-600 font-medium' : 'border-transparent text-zinc-500')}>
                  {a.label}
                </button>
              ))}
            </div>
            <div className="max-h-[480px] divide-y divide-zinc-50 overflow-auto dark:divide-zinc-800/60">
              {envios.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">Nada aqui.</p>}
              {envios.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <button className="min-w-0 flex-1 text-left" onClick={() => e.lead_id && navigate(`/leads/${e.lead_id}`)}>
                    <div className="truncate font-medium hover:underline">{e.nome}</div>
                    <div className="truncate text-xs text-zinc-500">{e.email}</div>
                  </button>
                  {e.status === 'erro' && <span className="max-w-xs truncate text-xs text-red-600 dark:text-red-400" title={e.erro ?? ''}>{e.erro}</span>}
                  <span className={clsx('w-24 text-right text-xs', e.status === 'enviado' ? 'text-emerald-600 dark:text-emerald-400' : e.status === 'erro' ? 'text-red-600 dark:text-red-400' : 'text-zinc-400')}>
                    {e.status === 'enviado' ? dataHora(e.enviado_em).slice(11) : e.status === 'erro' ? 'erro' : e.status === 'ignorado' ? 'não enviado' : 'pendente'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <Confirmar aberto={cancelar} titulo="Cancelar envio" perigo textoConfirmar="Cancelar envio" mensagem={`Os ${c.pendentes} e-mail(s) ainda pendentes não serão enviados. Os já enviados continuam registrados.`}
        onCancelar={() => setCancelar(false)} onConfirmar={() => { setCancelar(false); acao(() => chamar(api.campanhas.cancelar(c.id)), 'Envio cancelado.') }} />
      <Confirmar aberto={excluir} titulo="Excluir campanha" perigo textoConfirmar="Excluir" mensagem="A campanha sai da lista. Os e-mails já enviados continuam no histórico de cada lead."
        onCancelar={() => setExcluir(false)} onConfirmar={async () => { await chamar(api.campanhas.excluir(c.id)).catch((e) => avisar(e.message, 'erro')); navigate('/campanhas') }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rota /campanhas/:id e /campanhas/nova
// ---------------------------------------------------------------------------

export function CampanhaPagina() {
  const { id } = useParams()
  const avisar = useToast()
  const navigate = useNavigate()
  const [campanha, setCampanha] = useState<Campanha | null | undefined>(id ? undefined : null)

  useEffect(() => {
    if (!id) {
      setCampanha(null)
      return
    }
    const carregar = () =>
      chamar(api.campanhas.obter(id)).then(setCampanha).catch((e) => {
        avisar(e.message, 'erro')
        navigate('/campanhas')
      })
    carregar()
    // Ao iniciar o envio, recarrega para trocar o editor pelo acompanhamento.
    window.addEventListener('crm:campanha-iniciada', carregar)
    return () => window.removeEventListener('crm:campanha-iniciada', carregar)
  }, [id, avisar, navigate])

  if (campanha === undefined) return null
  if (campanha && campanha.status !== 'rascunho') return <Detalhe key={campanha.id} inicial={campanha} />
  return <Editor key={campanha?.id ?? 'nova'} campanha={campanha} />
}
