import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArrowLeft, Mail, MessageCircle, Trash2, Save, ShieldCheck, Lock, Construction, Phone, MessageSquarePlus
} from 'lucide-react'
import {
  BASES_LEGAIS, ESTADOS_CIVIS, ETAPAS, FAIXAS_PATRIMONIO, FAIXAS_RENDA, HORIZONTES, OBJETIVOS, ORIGENS,
  PRODUTOS, SUITABILITY, UFS
} from '@shared/constants'
import type { Lead, LeadInput } from '@shared/types'
import { api, chamar } from '../lib/api'
import { dataHora, idade, iniciais, linkWhatsApp, telefone } from '../lib/format'
import { Chips, Confirmar, Field, Select, Toggle } from '../components/ui'
import { DataInput, MoedaInput, TelefoneInput } from '../components/inputs'
import { TagPicker } from '../components/TagPicker'
import { LeadPicker } from '../components/LeadPicker'
import { useToast } from '../components/toast'
import { HistoricoLead, type HistoricoLeadRef } from '../components/HistoricoLead'

const VAZIO: LeadInput = {
  nome: '', telefone: null, whatsapp: null, email: null, cidade: null, estado: null, profissao: null,
  empresa: null, cargo: null, data_nascimento: null, estado_civil: null, conjuge: null, filhos: null,
  instagram: null, linkedin: null, outras_redes: null, faixa_patrimonio: null, faixa_renda: null,
  suitability: 'nao_avaliado', data_suitability: null, objetivos: [], horizonte: null, sucessao_notas: null,
  produtos_interesse: [], hobbies_rapport: null, origem: null, origem_detalhe: null, indicado_por: null,
  etapa: 'novo', motivo_perda: null, valor_potencial: null, consentimento_lgpd: false, data_consentimento: null,
  base_legal: null, observacoes: null, tag_ids: []
}

function leadParaInput(l: Lead): LeadInput {
  const r = { ...VAZIO }
  for (const k of Object.keys(VAZIO) as (keyof LeadInput)[]) {
    if (k in l) (r as Record<string, unknown>)[k] = (l as unknown as Record<string, unknown>)[k]
  }
  r.tag_ids = l.tags.map((t) => t.id)
  return r
}

const ABAS = [
  { id: 'dados', label: 'Dados' },
  { id: 'financeiro', label: 'Perfil financeiro' },
  { id: 'preferencias', label: 'Preferências' },
  { id: 'historico', label: 'Histórico', novo: false },
  { id: 'tarefas', label: 'Tarefas', fase: 4 },
  { id: 'posvenda', label: 'Pós-venda', fase: 6 }
] as const
type Aba = (typeof ABAS)[number]['id']

function Secao({ titulo, children, descricao }: { titulo: string; children: ReactNode; descricao?: ReactNode }) {
  return (
    <section className="grid grid-cols-[200px_1fr] gap-8 border-b border-zinc-100 py-6 last:border-0 dark:border-zinc-800/70">
      <div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {descricao && <p className="mt-1 text-xs leading-relaxed text-zinc-500">{descricao}</p>}
      </div>
      <div className="grid grid-cols-6 gap-x-4 gap-y-4">{children}</div>
    </section>
  )
}

export function LeadFicha() {
  const { id } = useParams()
  const novo = !id
  const navigate = useNavigate()
  const avisar = useToast()
  const [lead, setLead] = useState<Lead | null>(null)
  const [form, setForm] = useState<LeadInput>(VAZIO)
  const [original, setOriginal] = useState<string>(JSON.stringify(VAZIO))
  const [indicadoNome, setIndicadoNome] = useState<string | null>(null)
  const [aba, setAba] = useState<Aba>('dados')
  const [salvando, setSalvando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [confirmarSaida, setConfirmarSaida] = useState(false)
  const historicoRef = useRef<HistoricoLeadRef>(null)

  useEffect(() => {
    if (!id) {
      setLead(null)
      setForm(VAZIO)
      setOriginal(JSON.stringify(VAZIO))
      setIndicadoNome(null)
      return
    }
    chamar(api.leads.obter(id))
      .then((l) => {
        if (!l) {
          avisar('Lead não encontrado.', 'erro')
          navigate('/leads')
          return
        }
        const inp = leadParaInput(l)
        setLead(l)
        setForm(inp)
        setOriginal(JSON.stringify(inp))
        setIndicadoNome(l.indicado_por_nome)
      })
      .catch((e) => avisar(e.message, 'erro'))
  }, [id, navigate, avisar])

  const alterado = useMemo(() => JSON.stringify(form) !== original, [form, original])
  const set = <K extends keyof LeadInput>(k: K, v: LeadInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const txt = (k: keyof LeadInput) => ({
    value: (form[k] as string | null) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never)
  })

  const salvar = useCallback(async () => {
    if (!form.nome.trim()) {
      avisar('O nome é obrigatório.', 'erro')
      setAba('dados')
      return
    }
    setSalvando(true)
    try {
      const salvo = await chamar(novo ? api.leads.criar(form) : api.leads.atualizar(id!, form))
      const inp = leadParaInput(salvo)
      setLead(salvo)
      setForm(inp)
      setOriginal(JSON.stringify(inp))
      avisar(novo ? 'Lead cadastrado.' : 'Alterações salvas.')
      if (novo) navigate(`/leads/${salvo.id}`, { replace: true })
    } catch (e) {
      avisar((e as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }, [form, novo, id, navigate, avisar])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (alterado) salvar()
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [salvar, alterado])

  async function excluir() {
    try {
      await chamar(api.leads.excluir(id!))
      avisar('Lead excluído.')
      navigate('/leads')
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  const voltar = () => (alterado ? setConfirmarSaida(true) : navigate('/leads'))
  const wa = linkWhatsApp(form.whatsapp || form.telefone)
  const anos = idade(form.data_nascimento)

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <button className="btn-ghost btn-sm" onClick={voltar}>
            <ArrowLeft size={14} /> Leads
          </button>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <span className="truncate font-medium">{novo ? 'Novo lead' : lead?.nome}</span>
          {alterado && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">não salvo</span>}
        </div>
        <div className="flex items-center gap-2">
          {!novo && (
            <button className="btn-ghost h-8 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40" onClick={() => setConfirmarExclusao(true)}>
              <Trash2 size={14} /> Excluir
            </button>
          )}
          <button className="btn-primary h-8" onClick={salvar} disabled={salvando || (!alterado && !novo)} title="Salvar (Ctrl+S)">
            <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-8 pt-8">
          {/* Cabeçalho da ficha */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-lg font-semibold text-white">
              {iniciais(form.nome || '?')}
            </div>
            <div className="min-w-0 flex-1">
              <input
                autoFocus={novo}
                className="w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                placeholder="Nome do lead"
                {...txt('nome')}
              />
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
                {[form.profissao, form.empresa].filter(Boolean).join(' · ') || <span className="text-zinc-400">Sem profissão/empresa</span>}
                {anos !== null && <span>{anos} anos</span>}
                {(form.whatsapp || form.telefone) && (
                  <span className="inline-flex items-center gap-1 tabular-nums"><Phone size={12} />{telefone(form.whatsapp || form.telefone)}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select className="h-8 w-48 text-xs" permitirVazio={false} value={form.etapa} onChange={(v) => set('etapa', (v ?? 'novo') as LeadInput['etapa'])} opcoes={ETAPAS} />
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="btn-secondary h-8 text-xs">
                    <MessageCircle size={14} className="text-emerald-500" /> WhatsApp
                  </a>
                )}
                {form.email && (
                  <a href={`mailto:${form.email}`} className="btn-secondary h-8 text-xs">
                    <Mail size={14} /> E-mail
                  </a>
                )}
                {!novo && (
                  <button
                    className="btn-secondary h-8 text-xs"
                    onClick={() => {
                      setAba('historico')
                      setTimeout(() => historicoRef.current?.focar(), 50)
                    }}
                  >
                    <MessageSquarePlus size={14} /> Registrar interação
                  </button>
                )}
              </div>
              <div className="mt-3">
                <TagPicker selecionadas={form.tag_ids} onChange={(v) => set('tag_ids', v)} />
              </div>
            </div>
          </div>

          {/* Abas */}
          <div className="mt-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
            {ABAS.map((a) => {
              const bloqueada = novo && ('fase' in a || 'novo' in a)
              return (
                <button
                  key={a.id}
                  disabled={bloqueada}
                  onClick={() => setAba(a.id)}
                  className={clsx(
                    '-mb-px border-b-2 px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40',
                    aba === a.id
                      ? 'border-brand-600 font-medium text-zinc-900 dark:text-white'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  )}
                >
                  {a.label}
                </button>
              )
            })}
          </div>

          <div className="pb-16">
            {aba === 'dados' && (
              <>
                <Secao titulo="Contato">
                  <Field label="Telefone" className="col-span-2"><TelefoneInput value={form.telefone} onChange={(v) => set('telefone', v)} /></Field>
                  <Field label="WhatsApp" className="col-span-2"><TelefoneInput value={form.whatsapp} onChange={(v) => set('whatsapp', v)} /></Field>
                  <div className="col-span-2 flex items-end">
                    <button type="button" className="btn-ghost btn-sm mb-1" onClick={() => set('whatsapp', form.telefone)} disabled={!form.telefone}>
                      WhatsApp = telefone
                    </button>
                  </div>
                  <Field label="E-mail" className="col-span-4"><input className="input" type="email" {...txt('email')} /></Field>
                  <Field label="Cidade" className="col-span-3"><input className="input" {...txt('cidade')} /></Field>
                  <Field label="Estado" className="col-span-1">
                    <Select value={form.estado} onChange={(v) => set('estado', v)} opcoes={UFS.map((u) => ({ value: u, label: u }))} vazio="UF" />
                  </Field>
                </Secao>

                <Secao titulo="Profissional">
                  <Field label="Profissão" className="col-span-2"><input className="input" {...txt('profissao')} /></Field>
                  <Field label="Empresa" className="col-span-2"><input className="input" {...txt('empresa')} /></Field>
                  <Field label="Cargo" className="col-span-2"><input className="input" {...txt('cargo')} /></Field>
                </Secao>

                <Secao titulo="Pessoal" descricao="Informações para relacionamento e planejamento familiar.">
                  <Field label="Data de nascimento" className="col-span-2"><DataInput value={form.data_nascimento} onChange={(v) => set('data_nascimento', v)} /></Field>
                  <Field label="Estado civil" className="col-span-2"><Select value={form.estado_civil} onChange={(v) => set('estado_civil', v)} opcoes={ESTADOS_CIVIS} /></Field>
                  <Field label="Cônjuge" className="col-span-2"><input className="input" {...txt('conjuge')} /></Field>
                  <Field label="Filhos" className="col-span-6"><input className="input" placeholder="Ex.: 2 filhos — Pedro (8) e Ana (5)" {...txt('filhos')} /></Field>
                </Secao>

                <Secao titulo="Redes sociais">
                  <Field label="Instagram" className="col-span-3"><input className="input" placeholder="@usuario" {...txt('instagram')} /></Field>
                  <Field label="LinkedIn" className="col-span-3"><input className="input" placeholder="linkedin.com/in/…" {...txt('linkedin')} /></Field>
                  <Field label="Outras redes" className="col-span-6"><input className="input" {...txt('outras_redes')} /></Field>
                </Secao>

                <Secao titulo="Origem e funil">
                  <Field label="Origem" className="col-span-2"><Select value={form.origem} onChange={(v) => set('origem', v as LeadInput['origem'])} opcoes={ORIGENS} /></Field>
                  <Field label="Detalhe da origem" className="col-span-4"><input className="input" placeholder="Ex.: live de 12/05, evento X, post Y…" {...txt('origem_detalhe')} /></Field>
                  <Field label="Indicado por" className="col-span-3">
                    <LeadPicker
                      value={form.indicado_por}
                      nome={indicadoNome}
                      excluirId={id}
                      onChange={(v, n) => {
                        set('indicado_por', v)
                        setIndicadoNome(n)
                      }}
                    />
                  </Field>
                  <Field label="Valor potencial" className="col-span-3"><MoedaInput value={form.valor_potencial} onChange={(v) => set('valor_potencial', v)} /></Field>
                  <Field label="Etapa" className="col-span-3">
                    <Select permitirVazio={false} value={form.etapa} onChange={(v) => set('etapa', (v ?? 'novo') as LeadInput['etapa'])} opcoes={ETAPAS} />
                  </Field>
                  {form.etapa === 'perdido' && (
                    <Field label="Motivo da perda" className="col-span-3"><input className="input" {...txt('motivo_perda')} /></Field>
                  )}
                </Secao>

                <Secao titulo="LGPD" descricao={<span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> Registro do consentimento e da base legal para tratamento dos dados.</span>}>
                  <div className="col-span-6">
                    <Toggle
                      checked={form.consentimento_lgpd}
                      onChange={(v) => setForm((f) => ({
                        ...f,
                        consentimento_lgpd: v,
                        data_consentimento: v ? f.data_consentimento ?? new Date().toISOString().slice(0, 10) : null
                      }))}
                      label="Lead deu consentimento para contato e tratamento de dados"
                    />
                  </div>
                  {form.consentimento_lgpd && (
                    <Field label="Data do consentimento" className="col-span-2"><DataInput value={form.data_consentimento} onChange={(v) => set('data_consentimento', v)} /></Field>
                  )}
                  <Field label="Base legal" className="col-span-3"><Select value={form.base_legal} onChange={(v) => set('base_legal', v)} opcoes={BASES_LEGAIS} /></Field>
                </Secao>

                <Secao titulo="Observações">
                  <textarea className="input col-span-6" rows={5} placeholder="Anotações livres sobre o lead…" {...txt('observacoes')} />
                </Secao>
              </>
            )}

            {aba === 'financeiro' && (
              <>
                <div className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Lock size={13} /> Patrimônio, renda, suitability e notas de sucessão ficam apenas no banco local criptografado e nunca são enviados para a planilha.
                </div>
                <Secao titulo="Patrimônio e renda">
                  <Field label="Faixa de patrimônio" className="col-span-3"><Select value={form.faixa_patrimonio} onChange={(v) => set('faixa_patrimonio', v as LeadInput['faixa_patrimonio'])} opcoes={FAIXAS_PATRIMONIO} /></Field>
                  <Field label="Faixa de renda mensal" className="col-span-3"><Select value={form.faixa_renda} onChange={(v) => set('faixa_renda', v as LeadInput['faixa_renda'])} opcoes={FAIXAS_RENDA} /></Field>
                </Secao>
                <Secao titulo="Suitability">
                  <Field label="Perfil" className="col-span-3"><Select permitirVazio={false} value={form.suitability} onChange={(v) => set('suitability', (v ?? 'nao_avaliado') as LeadInput['suitability'])} opcoes={SUITABILITY} /></Field>
                  <Field label="Data da avaliação" className="col-span-3"><DataInput value={form.data_suitability} onChange={(v) => set('data_suitability', v)} /></Field>
                </Secao>
                <Secao titulo="Objetivos">
                  <div className="col-span-6"><Chips opcoes={OBJETIVOS} valores={form.objetivos} onChange={(v) => set('objetivos', v)} /></div>
                  <Field label="Horizonte de investimento" className="col-span-3"><Select value={form.horizonte} onChange={(v) => set('horizonte', v as LeadInput['horizonte'])} opcoes={HORIZONTES} /></Field>
                </Secao>
                <Secao titulo="Sucessão" descricao="Holding, testamento, previdência para sucessão, herdeiros…">
                  <textarea className="input col-span-6" rows={5} {...txt('sucessao_notas')} />
                </Secao>
              </>
            )}

            {aba === 'preferencias' && (
              <>
                <Secao titulo="Produtos de interesse">
                  <div className="col-span-6"><Chips opcoes={PRODUTOS} valores={form.produtos_interesse} onChange={(v) => set('produtos_interesse', v)} /></div>
                </Secao>
                <Secao titulo="Hobbies e rapport" descricao="Time do coração, hobbies, viagens, família — tudo que ajuda a criar conexão.">
                  <textarea className="input col-span-6" rows={6} {...txt('hobbies_rapport')} />
                </Secao>
              </>
            )}

            {aba === 'historico' && id && <HistoricoLead ref={historicoRef} leadId={id} versao={lead?.updated_at} />}

            {(aba === 'tarefas' || aba === 'posvenda') && (
              <div className="flex flex-col items-center py-20 text-center text-sm text-zinc-500">
                <Construction size={22} className="mb-2 text-zinc-400" />
                Disponível na Fase {(ABAS.find((a) => a.id === aba) as { fase?: number }).fase}.
              </div>
            )}

            {lead && (
              <p className="mt-4 text-xs text-zinc-400">
                Cadastrado em {dataHora(lead.created_at)} · Atualizado em {dataHora(lead.updated_at)}
              </p>
            )}
          </div>
        </div>
      </div>

      <Confirmar
        aberto={confirmarExclusao}
        titulo="Excluir lead"
        mensagem={<>Tem certeza que deseja excluir <strong>{lead?.nome}</strong>? Ele deixará de aparecer nas listas.</>}
        textoConfirmar="Excluir"
        perigo
        onConfirmar={excluir}
        onCancelar={() => setConfirmarExclusao(false)}
      />
      <Confirmar
        aberto={confirmarSaida}
        titulo="Descartar alterações?"
        mensagem="Há alterações não salvas nesta ficha."
        textoConfirmar="Descartar e sair"
        perigo
        onConfirmar={() => navigate('/leads')}
        onCancelar={() => setConfirmarSaida(false)}
      />
    </div>
  )
}
