import { app } from 'electron'
import nodemailer from 'nodemailer'
import { obterConfiguracoes, salvarConfiguracao } from '../db/configuracoes'
import { PROVEDORES_EMAIL, type ProvedorEmail } from '@shared/constants'
import type { ConfigEmail, ConfigEmailInput, SegurancaSmtp } from '@shared/types'

export const RODAPE_PADRAO =
  'Você recebe este e-mail porque tem relacionamento comigo ou autorizou o contato. Se não quiser mais receber, é só responder com a palavra SAIR.'

export function obterConfigEmail(): ConfigEmail {
  const c = obterConfiguracoes()
  const provedor = (c.email_provedor as ProvedorEmail) || 'gmail'
  const preset = PROVEDORES_EMAIL.find((p) => p.value === provedor) ?? PROVEDORES_EMAIL[0]
  return {
    provedor,
    host: c.email_host ?? preset.host,
    porta: Number(c.email_porta) || preset.porta,
    seguranca: (c.email_seguranca as SegurancaSmtp) || preset.seguranca,
    usuario: c.email_usuario ?? '',
    senhaDefinida: !!c.email_senha,
    remetenteNome: c.email_remetente_nome ?? '',
    responderPara: c.email_responder_para ?? '',
    intervaloSeg: Number(c.email_intervalo_seg) || 4,
    limiteDiario: Number(c.email_limite_diario) || preset.limite,
    rodape: c.email_rodape ?? RODAPE_PADRAO
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ehLocal = (host: string) => ['localhost', '127.0.0.1'].includes(host.trim().toLowerCase())

export function salvarConfigEmail(e: ConfigEmailInput): void {
  const host = e.host.trim()
  if (!host) throw new Error('Informe o servidor SMTP.')
  const porta = Math.floor(Number(e.porta))
  if (!porta || porta < 1 || porta > 65535) throw new Error('Porta inválida.')
  if (!['ssl', 'starttls', 'nenhuma'].includes(e.seguranca)) throw new Error('Tipo de segurança inválido.')
  // Sem criptografia, a senha trafegaria aberta: só é aceito para um servidor de testes local em desenvolvimento.
  if (e.seguranca === 'nenhuma' && !(ehLocal(host) && !app.isPackaged)) throw new Error('Use SSL/TLS ou STARTTLS: sem criptografia a senha trafega aberta.')
  if (!EMAIL.test(e.usuario.trim())) throw new Error('Informe o e-mail (usuário) da caixa de envio.')
  if (e.responderPara.trim() && !EMAIL.test(e.responderPara.trim())) throw new Error('E-mail de resposta inválido.')
  const intervalo = Math.min(120, Math.max(1, Number(e.intervaloSeg) || 4))
  const limite = Math.min(5000, Math.max(1, Math.floor(Number(e.limiteDiario) || 200)))
  const valores: Record<string, string> = {
    email_provedor: e.provedor,
    email_host: host,
    email_porta: String(porta),
    email_seguranca: e.seguranca,
    email_usuario: e.usuario.trim(),
    email_remetente_nome: e.remetenteNome.trim(),
    email_responder_para: e.responderPara.trim(),
    email_intervalo_seg: String(intervalo),
    email_limite_diario: String(limite),
    email_rodape: e.rodape.trim()
  }
  for (const [k, v] of Object.entries(valores)) salvarConfiguracao(k, v)
  if (e.senha && e.senha.trim()) salvarConfiguracao('email_senha', e.senha.replace(/\s+/g, ''))
}

/** Cria o transporte SMTP com a configuração salva (a senha só existe no processo principal). */
export function criarTransporte() {
  const cfg = obterConfigEmail()
  const senha = obterConfiguracoes().email_senha
  if (!cfg.usuario || !senha || !cfg.host) throw new Error('Configure a caixa de e-mail em Configurações → E-mail.')
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.porta,
    secure: cfg.seguranca === 'ssl',
    requireTLS: cfg.seguranca === 'starttls',
    ignoreTLS: cfg.seguranca === 'nenhuma',
    auth: { user: cfg.usuario, pass: senha },
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000
  })
}

/** Traduz os erros mais comuns do SMTP para mensagens úteis. */
export function mensagemErroSmtp(e: unknown): string {
  const err = e as { code?: string; responseCode?: number; response?: string; message?: string }
  if (err.code === 'EAUTH') return 'Usuário ou senha recusados pelo servidor. No Gmail/Yahoo/Outlook use uma "senha de app".'
  if (err.code === 'ESOCKET' || err.code === 'ECONNECTION' || err.code === 'EDNS') return 'Não foi possível conectar ao servidor de e-mail. Confira servidor, porta, segurança e a internet.'
  if (err.code === 'ETIMEDOUT') return 'O servidor de e-mail demorou demais para responder.'
  if (err.responseCode === 421 || err.responseCode === 450 || err.responseCode === 451 || err.responseCode === 454)
    return 'O servidor pediu para esperar (limite de envio temporário). Tente retomar mais tarde.'
  if (err.responseCode && err.responseCode >= 500) return `Recusado pelo servidor: ${(err.response || err.message || '').slice(0, 200)}`
  return err.message || String(e)
}

export async function testarConexaoEmail(): Promise<void> {
  const t = criarTransporte()
  try {
    await t.verify()
  } catch (e) {
    throw new Error(mensagemErroSmtp(e))
  } finally {
    t.close()
  }
}
