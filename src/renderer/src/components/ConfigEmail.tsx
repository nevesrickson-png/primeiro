import { FormEvent, useEffect, useState } from 'react'
import { CheckCircle2, Info } from 'lucide-react'
import { PROVEDORES_EMAIL, type ProvedorEmail } from '@shared/constants'
import type { ConfigEmail as TConfigEmail, ConfigEmailInput, SegurancaSmtp } from '@shared/types'
import { api, chamar } from '../lib/api'
import { Field, Select } from './ui'
import { useToast } from './toast'

const SEGURANCAS: { value: SegurancaSmtp; label: string }[] = [
  { value: 'ssl', label: 'SSL/TLS (porta 465)' },
  { value: 'starttls', label: 'STARTTLS (porta 587)' },
  { value: 'nenhuma', label: 'Nenhuma (só teste local)' }
]

/** Configurações → E-mail (caixa usada para envios em massa). */
export function ConfigEmail() {
  const avisar = useToast()
  const [cfg, setCfg] = useState<TConfigEmail | null>(null)
  const [form, setForm] = useState<ConfigEmailInput | null>(null)
  const [testando, setTestando] = useState(false)
  const [hoje, setHoje] = useState(0)

  const carregar = () =>
    chamar(api.email.obterConfig()).then((c) => {
      setCfg(c)
      const { senhaDefinida: _s, ...resto } = c
      setForm({ ...resto, senha: '' })
    })
  useEffect(() => {
    carregar()
    chamar(api.email.enviadosHoje()).then(setHoje).catch(() => {})
  }, [])

  if (!form || !cfg) return null
  const set = <K extends keyof ConfigEmailInput>(k: K, v: ConfigEmailInput[K]) => setForm((f) => ({ ...f!, [k]: v }))
  const preset = PROVEDORES_EMAIL.find((p) => p.value === form.provedor)!

  function escolherProvedor(v: ProvedorEmail) {
    const p = PROVEDORES_EMAIL.find((x) => x.value === v)!
    setForm((f) => ({ ...f!, provedor: v, host: p.host || f!.host, porta: p.porta, seguranca: p.seguranca, limiteDiario: p.limite }))
  }

  async function salvar(e?: FormEvent) {
    e?.preventDefault()
    try {
      await chamar(api.email.salvarConfig(form!))
      avisar('Configuração de e-mail salva.')
      await carregar()
      return true
    } catch (err) {
      avisar((err as Error).message, 'erro')
      return false
    }
  }

  async function testar() {
    setTestando(true)
    try {
      if (!(await salvar())) return
      await chamar(api.email.testarConexao())
      avisar('Conexão com a caixa de e-mail funcionando!')
    } catch (e) {
      avisar((e as Error).message, 'erro')
    } finally {
      setTestando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid grid-cols-6 gap-3">
        <Field label="Provedor" className="col-span-3">
          <Select permitirVazio={false} value={form.provedor} onChange={(v) => escolherProvedor((v ?? 'gmail') as ProvedorEmail)} opcoes={PROVEDORES_EMAIL} />
        </Field>
        <Field label="Seu e-mail (usuário)" className="col-span-3">
          <input className="input" type="email" placeholder="voce@gmail.com" value={form.usuario} onChange={(e) => set('usuario', e.target.value)} />
        </Field>
        <div className="col-span-6 flex gap-2 rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
          <Info size={14} className="mt-0.5 shrink-0" /> {preset.ajuda}
        </div>
        <Field label="Senha de app" className="col-span-3" dica="Fica guardada só no banco criptografado.">
          <input className="input" type="password" autoComplete="new-password" placeholder={cfg.senhaDefinida ? '•••••••• (definida — digite para trocar)' : 'Cole a senha de app'} value={form.senha} onChange={(e) => set('senha', e.target.value)} />
        </Field>
        <Field label="Nome do remetente" className="col-span-3" dica="Como aparece para quem recebe.">
          <input className="input" placeholder="Ex.: João Silva | Assessor de Investimentos" value={form.remetenteNome} onChange={(e) => set('remetenteNome', e.target.value)} />
        </Field>
        <Field label="Servidor SMTP" className="col-span-3">
          <input className="input font-mono text-xs" value={form.host} onChange={(e) => set('host', e.target.value)} />
        </Field>
        <Field label="Porta" className="col-span-1">
          <input className="input tabular-nums" type="number" value={form.porta} onChange={(e) => set('porta', Number(e.target.value))} />
        </Field>
        <Field label="Segurança" className="col-span-2">
          <Select permitirVazio={false} value={form.seguranca} onChange={(v) => set('seguranca', (v ?? 'ssl') as SegurancaSmtp)} opcoes={SEGURANCAS} />
        </Field>
        <Field label="Responder para (opcional)" className="col-span-3" dica="Se quiser receber as respostas em outro e-mail.">
          <input className="input" type="email" value={form.responderPara} onChange={(e) => set('responderPara', e.target.value)} />
        </Field>
        <Field label="Intervalo entre e-mails" className="col-span-1" dica="segundos">
          <input className="input tabular-nums" type="number" min={1} max={120} value={form.intervaloSeg} onChange={(e) => set('intervaloSeg', Number(e.target.value))} />
        </Field>
        <Field label="Limite por dia" className="col-span-2" dica={`Enviados hoje: ${hoje}. Gmail comum aceita ~500/dia.`}>
          <input className="input tabular-nums" type="number" min={1} value={form.limiteDiario} onChange={(e) => set('limiteDiario', Number(e.target.value))} />
        </Field>
        <Field label="Rodapé (descadastro)" className="col-span-6" dica="Vai no fim de todos os e-mails em massa. Exigido por boas práticas e pela LGPD: ofereça sempre uma forma de sair da lista.">
          <textarea className="input" rows={2} value={form.rodape} onChange={(e) => set('rodape', e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn-primary">Salvar</button>
        <button type="button" className="btn-secondary" onClick={testar} disabled={testando}>
          <CheckCircle2 size={14} /> {testando ? 'Testando…' : 'Salvar e testar conexão'}
        </button>
      </div>
    </form>
  )
}
