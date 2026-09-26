import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, CloudUpload, ExternalLink, RefreshCw, XCircle, Loader2 } from 'lucide-react'
import type { ConfigSync, ConflitoSync, RegistroSync, ResultadoSync } from '@shared/types'
import { api, chamar } from '../lib/api'
import { dataHora, tempoRelativo } from '../lib/format'
import { Field, Modal } from './ui'
import { useToast } from './toast'

/** Texto curto com o resultado de uma sincronização. */
export function resumoSync(r: ResultadoSync): string {
  const partes: string[] = []
  if (r.enviados) partes.push(`${r.enviados} enviado(s)`)
  if (r.recebidos + r.criadosDaPlanilha) partes.push(`${r.recebidos + r.criadosDaPlanilha} recebido(s)`)
  if (r.importadosForms) partes.push(`${r.importadosForms} novo(s) do formulário`)
  if (r.duplicadosForms) partes.push(`${r.duplicadosForms} resposta(s) de leads já existentes`)
  if (r.removidosNaPlanilha) partes.push(`${r.removidosNaPlanilha} removido(s) da planilha`)
  if (r.conflitos) partes.push(`${r.conflitos} conflito(s) para revisar`)
  return partes.length ? `Sincronizado: ${partes.join(', ')}.` : 'Sincronizado: tudo já estava em dia.'
}

const ROTULO_STATUS: Record<RegistroSync['status'], { texto: string; icone: typeof CheckCircle2; cor: string }> = {
  sucesso: { texto: 'Sucesso', icone: CheckCircle2, cor: 'text-emerald-600 dark:text-emerald-400' },
  parcial: { texto: 'Com avisos', icone: AlertTriangle, cor: 'text-amber-600 dark:text-amber-400' },
  erro: { texto: 'Erro', icone: XCircle, cor: 'text-red-600 dark:text-red-400' },
  em_andamento: { texto: 'Interrompida', icone: AlertTriangle, cor: 'text-zinc-500' }
}

export function ModalConflitos({ aberto, onFechar, onAlterado }: { aberto: boolean; onFechar: () => void; onAlterado: () => void }) {
  const avisar = useToast()
  const navigate = useNavigate()
  const [conflitos, setConflitos] = useState<ConflitoSync[]>([])

  const carregar = useCallback(() => {
    chamar(api.sync.conflitos()).then(setConflitos).catch((e) => avisar(e.message, 'erro'))
  }, [avisar])
  useEffect(() => {
    if (aberto) carregar()
  }, [aberto, carregar])

  async function resolver(id: string, acao: 'manter' | 'usar_outro') {
    try {
      await chamar(api.sync.resolverConflito(id, acao))
      if (acao === 'usar_outro') avisar('Valor aplicado no lead. Ele vai para a planilha na próxima sincronização.')
      carregar()
      onAlterado()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={`Conflitos de sincronização (${conflitos.length})`}
      largura="max-w-4xl"
      rodape={
        <>
          {conflitos.length > 0 && (
            <button className="btn-secondary" onClick={async () => { await chamar(api.sync.resolverTodos()); carregar(); onAlterado() }}>
              Aceitar todos os vencedores
            </button>
          )}
          <button className="btn-primary" onClick={onFechar}>Fechar</button>
        </>
      }
    >
      <p className="mb-3 text-xs text-zinc-500">
        O lead foi editado no app e na planilha desde a última sincronização. Venceu a edição mais recente — confira e, se preferir, use o outro valor.
      </p>
      {conflitos.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">Nenhum conflito pendente.</p>
      ) : (
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="pb-2 font-medium">Lead / campo</th>
                <th className="pb-2 font-medium">No app</th>
                <th className="pb-2 font-medium">Na planilha</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {conflitos.map((c) => (
                <tr key={c.id} className="border-t border-zinc-100 align-top dark:border-zinc-800">
                  <td className="py-2 pr-3">
                    <button className="font-medium hover:underline" onClick={() => { onFechar(); navigate(`/leads/${c.lead_id}`) }}>{c.lead_nome ?? '(lead removido)'}</button>
                    <div className="text-xs text-zinc-500">{c.campo_titulo} · {dataHora(c.created_at)}</div>
                  </td>
                  {(['local', 'planilha'] as const).map((lado) => {
                    const valor = lado === 'local' ? c.valor_local : c.valor_planilha
                    const venceu = c.vencedor === lado
                    return (
                      <td key={lado} className="max-w-[240px] py-2 pr-3">
                        <div className={clsx('whitespace-pre-wrap break-words rounded px-2 py-1', venceu ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'text-zinc-500 line-through decoration-zinc-300')}>
                          {valor || <em className="text-zinc-400">vazio</em>}
                        </div>
                        {venceu && <div className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">venceu (mais recente)</div>}
                      </td>
                    )
                  })}
                  <td className="whitespace-nowrap py-2 text-right">
                    <button className="btn-ghost btn-sm" onClick={() => resolver(c.id, 'manter')}>Manter</button>
                    <button className="btn-secondary btn-sm" onClick={() => resolver(c.id, 'usar_outro')}>Usar o outro</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

/** Bloco de Configurações → Sincronização. */
export function ConfigSincronizacao() {
  const avisar = useToast()
  const [cfg, setCfg] = useState<ConfigSync | null>(null)
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [historico, setHistorico] = useState<RegistroSync[]>([])
  const [testando, setTestando] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [conflitos, setConflitos] = useState(false)

  const carregar = useCallback(() => {
    chamar(api.sync.obterConfig()).then((c) => { setCfg(c); setUrl((u) => u || c.url) }).catch(() => {})
    chamar(api.sync.historico()).then(setHistorico).catch(() => {})
  }, [])
  useEffect(() => {
    carregar()
    const f = () => carregar()
    window.addEventListener('crm:sincronizado', f)
    return () => window.removeEventListener('crm:sincronizado', f)
  }, [carregar])

  async function salvar(e?: FormEvent) {
    e?.preventDefault()
    try {
      await chamar(api.sync.salvarConfig(url, token || undefined))
      setToken('')
      avisar('Configuração da planilha salva.')
      window.dispatchEvent(new Event('crm:sincronizado'))
      carregar()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  async function testar() {
    setTestando(true)
    try {
      const r = await chamar(api.sync.testar(url, token || undefined))
      avisar(`Conectado à planilha “${r.planilha}”.`)
    } catch (e) {
      avisar((e as Error).message, 'erro')
    } finally {
      setTestando(false)
    }
  }

  async function sincronizarAgora() {
    setSincronizando(true)
    try {
      const r = await chamar(api.sync.executar())
      avisar(resumoSync(r))
      window.dispatchEvent(new Event('crm:sincronizado'))
    } catch (e) {
      avisar((e as Error).message, 'erro')
      carregar()
    } finally {
      setSincronizando(false)
    }
  }

  const alterado = !!cfg && (url.trim() !== cfg.url || !!token)

  return (
    <div className="space-y-4">
      <form onSubmit={salvar} className="grid grid-cols-3 gap-3">
        <Field label="URL do App da Web (termina em /exec)" className="col-span-3">
          <input className="input font-mono text-xs" placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        <Field label="Token secreto" className="col-span-2" dica="Gerado pela função instalar() do Apps Script. Fica guardado só no banco criptografado.">
          <input type="password" className="input font-mono text-xs" placeholder={cfg?.tokenDefinido ? '•••••••• (definido — digite para trocar)' : 'Cole o token aqui'} value={token} onChange={(e) => setToken(e.target.value)} />
        </Field>
        <div className="col-span-3 flex flex-wrap gap-2">
          <button type="submit" className="btn-primary" disabled={!alterado}>Salvar</button>
          <button type="button" className="btn-secondary" onClick={testar} disabled={testando || !url}>{testando ? 'Testando…' : 'Testar conexão'}</button>
          <button type="button" className="btn-secondary" onClick={sincronizarAgora} disabled={sincronizando || !cfg?.url || !cfg?.tokenDefinido || alterado}>
            <RefreshCw size={14} className={clsx(sincronizando && 'animate-spin')} /> {sincronizando ? 'Sincronizando…' : 'Sincronizar agora'}
          </button>
          {cfg && cfg.conflitosPendentes > 0 && (
            <button type="button" className="btn-secondary text-amber-700 dark:text-amber-400" onClick={() => setConflitos(true)}>
              <AlertTriangle size={14} /> {cfg.conflitosPendentes} conflito(s) para revisar
            </button>
          )}
        </div>
      </form>

      <div className="rounded-md bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
        <strong>O que vai para a planilha:</strong> dados de contato, perfil, preferências, origem, etapa e tags.{' '}
        <strong>Nunca vai:</strong> faixa de patrimônio, faixa de renda, suitability, notas de sucessão e aplicações.
        Para excluir um lead, exclua no app (linhas apagadas direto na planilha voltam na próxima sincronização).
        Instruções de instalação: <code>apps-script/LEIA-ME.md</code> <ExternalLink size={10} className="inline" />
      </div>

      {historico.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Últimas sincronizações</h3>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {historico.map((h) => {
              const st = ROTULO_STATUS[h.status]
              return (
                <div key={h.id} className="flex items-start gap-3 py-1.5 text-xs">
                  <st.icone size={14} className={clsx('mt-0.5 shrink-0', st.cor)} />
                  <span className="w-32 shrink-0 tabular-nums text-zinc-500">{dataHora(h.iniciado_em)}</span>
                  <div className="min-w-0 flex-1">
                    {h.status === 'erro' ? (
                      <span className="text-red-600 dark:text-red-400">{h.mensagem}</span>
                    ) : (
                      <span>↑ {h.enviados} · ↓ {h.recebidos} · formulário {h.importados_forms}{h.conflitos ? ` · ${h.conflitos} conflito(s)` : ''}</span>
                    )}
                    {h.status === 'parcial' && h.mensagem && <div className="mt-0.5 whitespace-pre-wrap text-amber-700 dark:text-amber-400">{h.mensagem}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <ModalConflitos aberto={conflitos} onFechar={() => setConflitos(false)} onAlterado={carregar} />
    </div>
  )
}

function quando(iso: string): string {
  const d = new Date(iso)
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const rel = tempoRelativo(iso)
  return rel === 'hoje' || rel === 'ontem' ? `${rel} às ${hora}` : rel
}

/** Botão "Sincronizar" do menu lateral. */
export function BotaoSincronizar({ onSincronizado }: { onSincronizado: () => void }) {
  const avisar = useToast()
  const navigate = useNavigate()
  const [cfg, setCfg] = useState<ConfigSync | null>(null)
  const [rodando, setRodando] = useState(false)
  const [, setTique] = useState(0)

  const carregar = useCallback(() => chamar(api.sync.obterConfig()).then(setCfg).catch(() => {}), [])
  useEffect(() => {
    carregar()
    const f = () => carregar()
    window.addEventListener('crm:sincronizado', f)
    const t = setInterval(() => setTique((x) => x + 1), 60_000)
    return () => {
      window.removeEventListener('crm:sincronizado', f)
      clearInterval(t)
    }
  }, [carregar])

  async function executar() {
    const atual = await chamar(api.sync.obterConfig()).catch(() => cfg)
    setCfg(atual)
    if (!atual?.url || !atual.tokenDefinido) {
      avisar('Configure a planilha em Configurações → Sincronização.', 'erro')
      navigate('/configuracoes')
      return
    }
    setRodando(true)
    try {
      const r = await chamar(api.sync.executar())
      avisar(resumoSync(r))
      if (r.avisos.length) avisar(r.avisos.slice(0, 3).join(' '), 'erro')
      window.dispatchEvent(new Event('crm:sincronizado'))
      onSincronizado()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    } finally {
      setRodando(false)
    }
  }

  return (
    <button
      onClick={executar}
      disabled={rodando}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-zinc-600 hover:bg-zinc-200/60 disabled:opacity-70 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
      title={cfg?.ultima ? `Última sincronização: ${dataHora(cfg.ultima)}` : 'Nunca sincronizado'}
    >
      {rodando ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
      <span className="flex-1">
        <span className="block">{rodando ? 'Sincronizando…' : 'Sincronizar'}</span>
        <span className="block text-[11px] text-zinc-400">{cfg?.ultima ? quando(cfg.ultima) : cfg?.url ? 'nunca sincronizado' : 'não configurado'}</span>
      </span>
      {cfg && cfg.conflitosPendentes > 0 && (
        <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white" title="Conflitos para revisar em Configurações">{cfg.conflitosPendentes}</span>
      )}
    </button>
  )
}
