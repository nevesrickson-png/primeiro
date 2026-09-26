import { BrowserWindow } from 'electron'
import { existsSync, statSync } from 'fs'
import { basename } from 'path'
import { randomUUID } from 'crypto'
import { estaDesbloqueado, getDb, usuarioAtualId } from '../db/connection'
import { listarLeads } from '../db/leads'
import { criarInteracao } from '../db/interacoes'
import { dataLocalISO } from '../db/datas'
import { criarTransporte, mensagemErroSmtp, obterConfigEmail } from './config'
import { montarMensagem, variaveisDesconhecidas, type DadosDestinatario } from '@shared/emailModelo'
import type { Etapa } from '@shared/constants'
import type {
  Anexo, Campanha, CampanhaInput, EnvioCampanha, FiltrosLeads, PreviaDestinatarios, ProgressoCampanha
} from '@shared/types'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LIMITE_ANEXOS = 15 * 1024 * 1024
const agora = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// Público
// ---------------------------------------------------------------------------

const FILTRO_PUBLICO: Record<string, FiltrosLeads> = {
  todos: {},
  clientes: { etapas: ['conta_aberta', 'cliente_ativo'] as Etapa[] },
  negociacao: { etapas: ['novo', 'primeiro_contato', 'reuniao_agendada', 'diagnostico', 'proposta'] as Etapa[] }
}

function filtrosDoPublico(c: Pick<CampanhaInput, 'publico' | 'filtros'>): FiltrosLeads {
  return c.publico === 'personalizado' ? { ...c.filtros, ordenacao: 'nome', direcao: 'asc' } : { ...FILTRO_PUBLICO[c.publico], ordenacao: 'nome' }
}

interface Destinatario extends DadosDestinatario {
  lead_id: string
  email: string
}

/** Resolve quem recebe: aplica os filtros e exclui sem e-mail, sem consentimento, descadastrados e repetidos. */
function resolverPublico(c: Pick<CampanhaInput, 'publico' | 'filtros' | 'incluir_sem_consentimento'>): { lista: Destinatario[]; previa: PreviaDestinatarios } {
  const ids = listarLeads(filtrosDoPublico(c)).map((l) => l.id)
  const db = getDb()
  const porId = new Map(
    (db.prepare(`SELECT id, nome, email, empresa, cidade, profissao, consentimento_lgpd, email_descadastrado_em FROM leads WHERE deleted_at IS NULL`).all() as {
      id: string; nome: string; email: string | null; empresa: string | null; cidade: string | null; profissao: string | null
      consentimento_lgpd: number; email_descadastrado_em: string | null
    }[]).map((l) => [l.id, l])
  )
  const previa: PreviaDestinatarios = { recebem: 0, semEmail: 0, semConsentimento: 0, descadastrados: 0, repetidos: 0, amostra: [] }
  const vistos = new Set<string>()
  const lista: Destinatario[] = []
  for (const id of ids) {
    const l = porId.get(id)
    if (!l) continue
    const email = (l.email ?? '').trim().toLowerCase()
    if (!email || !EMAIL.test(email)) { previa.semEmail++; continue }
    if (l.email_descadastrado_em) { previa.descadastrados++; continue }
    if (!l.consentimento_lgpd && !c.incluir_sem_consentimento) { previa.semConsentimento++; continue }
    if (vistos.has(email)) { previa.repetidos++; continue }
    vistos.add(email)
    lista.push({ lead_id: l.id, email, nome: l.nome, empresa: l.empresa, cidade: l.cidade, profissao: l.profissao })
  }
  previa.recebem = lista.length
  previa.amostra = lista.slice(0, 5).map((d) => ({ nome: d.nome ?? '', email: d.email }))
  return { lista, previa }
}

export function previaDestinatarios(c: Pick<CampanhaInput, 'publico' | 'filtros' | 'incluir_sem_consentimento'>): PreviaDestinatarios {
  return resolverPublico(c).previa
}

// ---------------------------------------------------------------------------
// Anexos (só arquivos escolhidos no diálogo do sistema nesta sessão ou já salvos na campanha)
// ---------------------------------------------------------------------------

const anexosPermitidos = new Set<string>()

export function registrarAnexosEscolhidos(caminhos: string[]): Anexo[] {
  return caminhos.map((c) => {
    anexosPermitidos.add(c)
    return { nome: basename(c), caminho: c, tamanho: statSync(c).size }
  })
}

function validarAnexos(anexos: Anexo[], jaSalvos: Anexo[]): Anexo[] {
  const salvos = new Set(jaSalvos.map((a) => a.caminho))
  const r = anexos.map((a) => {
    if (!anexosPermitidos.has(a.caminho) && !salvos.has(a.caminho)) throw new Error('Anexo inválido: escolha o arquivo pelo botão "Anexar".')
    if (!existsSync(a.caminho)) throw new Error(`O anexo "${a.nome}" não foi encontrado. Remova e anexe de novo.`)
    return { nome: basename(a.caminho), caminho: a.caminho, tamanho: statSync(a.caminho).size }
  })
  if (r.reduce((s, a) => s + a.tamanho, 0) > LIMITE_ANEXOS) throw new Error('Os anexos passam de 15 MB. Envie arquivos menores ou use um link.')
  return r
}

// ---------------------------------------------------------------------------
// Campanhas (CRUD)
// ---------------------------------------------------------------------------

type Linha = Omit<Campanha, 'filtros' | 'anexos' | 'incluir_sem_consentimento' | 'enviados' | 'erros' | 'pendentes'> & {
  filtros: string; anexos: string; incluir_sem_consentimento: number
}

const SELECT = `
  SELECT c.id, c.nome, c.assunto, c.corpo, c.publico, c.filtros, c.incluir_sem_consentimento, c.anexos, c.status,
         c.mensagem_status, c.total, c.iniciada_em, c.concluida_em, c.created_at, c.updated_at,
         (SELECT count(*) FROM campanha_envios e WHERE e.campanha_id = c.id AND e.status = 'enviado') AS enviados,
         (SELECT count(*) FROM campanha_envios e WHERE e.campanha_id = c.id AND e.status = 'erro') AS erros,
         (SELECT count(*) FROM campanha_envios e WHERE e.campanha_id = c.id AND e.status = 'pendente') AS pendentes
  FROM campanhas c`

function converter(l: Linha & { enviados: number; erros: number; pendentes: number }): Campanha {
  return { ...l, filtros: JSON.parse(l.filtros || '{}'), anexos: JSON.parse(l.anexos || '[]'), incluir_sem_consentimento: l.incluir_sem_consentimento === 1 }
}

export function listarCampanhas(): Campanha[] {
  return (getDb().prepare(`${SELECT} WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC`).all() as never[]).map(converter)
}

export function obterCampanha(id: string): Campanha {
  const l = getDb().prepare(`${SELECT} WHERE c.id = ? AND c.deleted_at IS NULL`).get(id)
  if (!l) throw new Error('Campanha não encontrada.')
  return converter(l as never)
}

function normalizar(c: CampanhaInput, anexosSalvos: Anexo[]): CampanhaInput {
  if (!['todos', 'clientes', 'negociacao', 'personalizado'].includes(c.publico)) throw new Error('Público inválido.')
  return {
    ...c,
    nome: c.nome?.trim() || c.assunto?.trim() || 'Campanha sem nome',
    assunto: c.assunto ?? '',
    corpo: c.corpo ?? '',
    filtros: c.publico === 'personalizado' ? c.filtros ?? {} : {},
    anexos: validarAnexos(c.anexos ?? [], anexosSalvos)
  }
}

export function salvarCampanha(id: string | null, input: CampanhaInput): Campanha {
  const db = getDb()
  const ts = agora()
  if (id) {
    const atual = obterCampanha(id)
    if (atual.status !== 'rascunho') throw new Error('Só é possível editar campanhas em rascunho.')
    const c = normalizar(input, atual.anexos)
    db.prepare(
      `UPDATE campanhas SET nome = ?, assunto = ?, corpo = ?, publico = ?, filtros = ?, incluir_sem_consentimento = ?, anexos = ?, updated_at = ? WHERE id = ?`
    ).run(c.nome, c.assunto, c.corpo, c.publico, JSON.stringify(c.filtros), c.incluir_sem_consentimento ? 1 : 0, JSON.stringify(c.anexos), ts, id)
    return obterCampanha(id)
  }
  const c = normalizar(input, [])
  const novo = randomUUID()
  db.prepare(
    `INSERT INTO campanhas (id, created_at, updated_at, nome, assunto, corpo, publico, filtros, incluir_sem_consentimento, anexos, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(novo, ts, ts, c.nome, c.assunto, c.corpo, c.publico, JSON.stringify(c.filtros), c.incluir_sem_consentimento ? 1 : 0, JSON.stringify(c.anexos), usuarioAtualId())
  return obterCampanha(novo)
}

export function duplicarCampanha(id: string): Campanha {
  const c = obterCampanha(id)
  c.anexos.forEach((a) => anexosPermitidos.add(a.caminho))
  return salvarCampanha(null, { ...c, nome: `${c.nome} (cópia)`, anexos: c.anexos.filter((a) => existsSync(a.caminho)) })
}

export function excluirCampanha(id: string): void {
  const c = obterCampanha(id)
  if (c.status === 'enviando') throw new Error('Pause ou cancele o envio antes de excluir.')
  const ts = agora()
  getDb().prepare('UPDATE campanhas SET deleted_at = ?, updated_at = ? WHERE id = ?').run(ts, ts, id)
}

export function listarEnvios(campanhaId: string, status?: string): EnvioCampanha[] {
  const params: unknown[] = [campanhaId]
  let filtro = ''
  if (status) {
    filtro = 'AND status = ?'
    params.push(status)
  }
  return getDb()
    .prepare(`SELECT id, lead_id, nome, email, status, erro, enviado_em FROM campanha_envios WHERE campanha_id = ? ${filtro}
              ORDER BY CASE status WHEN 'erro' THEN 0 WHEN 'enviado' THEN 1 ELSE 2 END, enviado_em DESC, nome LIMIT 2000`)
    .all(...params) as EnvioCampanha[]
}

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------

function validarConteudo(c: Pick<CampanhaInput, 'assunto' | 'corpo'>): void {
  if (!c.assunto.trim()) throw new Error('Escreva o assunto do e-mail.')
  if (!c.corpo.trim()) throw new Error('Escreva a mensagem.')
  const desconhecidas = variaveisDesconhecidas(c.assunto + ' ' + c.corpo)
  if (desconhecidas.length) throw new Error(`Variável desconhecida: {{${desconhecidas[0]}}}. Use os botões de variáveis.`)
}

function remetente() {
  const cfg = obterConfigEmail()
  return { from: cfg.remetenteNome ? { name: cfg.remetenteNome, address: cfg.usuario } : cfg.usuario, replyTo: cfg.responderPara || undefined, rodape: cfg.rodape }
}

/** Envia a mensagem de teste para a própria caixa (ou outro e-mail), com dados de exemplo. */
export async function enviarTeste(input: CampanhaInput, para?: string): Promise<string> {
  validarConteudo(input)
  const anexos = validarAnexos(input.anexos ?? [], input.anexos ?? [])
  const cfg = obterConfigEmail()
  const destino = (para || cfg.usuario).trim()
  if (!EMAIL.test(destino)) throw new Error('E-mail de teste inválido.')
  const { from, replyTo, rodape } = remetente()
  const m = montarMensagem(input.assunto, input.corpo, rodape, { nome: 'Mariana Costa Almeida', empresa: 'Clínica Sorriso', cidade: 'Campinas', profissao: 'Dentista' })
  const t = criarTransporte()
  try {
    await t.sendMail({ from, replyTo, to: destino, subject: `[TESTE] ${m.assunto}`, text: m.texto, html: m.html, attachments: anexos.map((a) => ({ filename: a.nome, path: a.caminho })) })
  } catch (e) {
    throw new Error(mensagemErroSmtp(e))
  } finally {
    t.close()
  }
  return destino
}

export function enviadosHoje(): number {
  const hoje = dataLocalISO()
  const inicio = new Date(`${hoje}T00:00:00`).toISOString()
  return (getDb().prepare(`SELECT count(*) AS n FROM campanha_envios WHERE status = 'enviado' AND enviado_em >= ?`).get(inicio) as { n: number }).n
}

function progresso(id: string): ProgressoCampanha {
  const c = obterCampanha(id)
  return { campanhaId: id, status: c.status, total: c.total, enviados: c.enviados, erros: c.erros, pendentes: c.pendentes, mensagem: c.mensagem_status }
}

function avisarTela(id: string): void {
  try {
    const p = progresso(id)
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send('campanha:progresso', p)
  } catch {
    /* banco fechado */
  }
}

function definirStatus(id: string, status: Campanha['status'], mensagem: string | null, extra = ''): void {
  getDb().prepare(`UPDATE campanhas SET status = ?, mensagem_status = ?, updated_at = ? ${extra} WHERE id = ?`).run(status, mensagem, agora(), id)
}

let motor: { campanhaId: string; parar: boolean } | null = null
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function campanhaEmAndamento(): string | null {
  return motor?.campanhaId ?? null
}

/** Congela a lista de destinatários e começa a enviar. */
export function iniciarCampanha(id: string): Campanha {
  const c = obterCampanha(id)
  if (c.status !== 'rascunho') throw new Error('Esta campanha já foi iniciada.')
  validarConteudo(c)
  validarAnexos(c.anexos, c.anexos)
  criarTransporte().close() // valida que a caixa está configurada
  if (motor) throw new Error('Já existe uma campanha sendo enviada. Aguarde ou pause-a.')
  const { lista } = resolverPublico(c)
  if (!lista.length) throw new Error('Nenhum destinatário: revise o público (e-mail, consentimento e descadastros).')
  const db = getDb()
  const ts = agora()
  const ins = db.prepare(`INSERT INTO campanha_envios (id, created_at, updated_at, campanha_id, lead_id, email, nome) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  db.transaction(() => {
    for (const d of lista) ins.run(randomUUID(), ts, ts, id, d.lead_id, d.email, d.nome)
    db.prepare(`UPDATE campanhas SET status = 'enviando', mensagem_status = NULL, total = ?, iniciada_em = ?, updated_at = ? WHERE id = ?`).run(lista.length, ts, ts, id)
  })()
  void executar(id)
  return obterCampanha(id)
}

export function retomarCampanha(id: string): Campanha {
  const c = obterCampanha(id)
  if (c.status !== 'pausada') throw new Error('Só campanhas pausadas podem ser retomadas.')
  if (motor) throw new Error('Já existe uma campanha sendo enviada.')
  criarTransporte().close()
  definirStatus(id, 'enviando', null)
  void executar(id)
  return obterCampanha(id)
}

export function pausarCampanha(id: string): Campanha {
  if (motor?.campanhaId === id) motor.parar = true
  const c = obterCampanha(id)
  if (c.status === 'enviando') definirStatus(id, 'pausada', 'Pausada por você.')
  avisarTela(id)
  return obterCampanha(id)
}

export function cancelarCampanha(id: string): Campanha {
  if (motor?.campanhaId === id) motor.parar = true
  const c = obterCampanha(id)
  if (c.status === 'enviando' || c.status === 'pausada') {
    const db = getDb()
    db.transaction(() => {
      db.prepare(`UPDATE campanha_envios SET status = 'ignorado', updated_at = ? WHERE campanha_id = ? AND status = 'pendente'`).run(agora(), id)
      definirStatus(id, 'cancelada', 'Cancelada por você.', ', concluida_em = ' + `'${agora()}'`)
    })()
  }
  avisarTela(id)
  return obterCampanha(id)
}

/** Para o motor sem alterar o status (usado ao bloquear/fechar o app; ao reabrir vira "pausada"). */
export function pararMotor(): void {
  if (motor) motor.parar = true
}

/** Campanhas que estavam "enviando" quando o app fechou passam a "pausada". */
export function recuperarInterrompidas(): void {
  getDb()
    .prepare(`UPDATE campanhas SET status = 'pausada', mensagem_status = 'Envio interrompido quando o app foi fechado. Clique em Retomar.', updated_at = ? WHERE status = 'enviando'`)
    .run(agora())
}

async function executar(id: string): Promise<void> {
  motor = { campanhaId: id, parar: false }
  const eu = motor
  const cfg = obterConfigEmail()
  let transporte: ReturnType<typeof criarTransporte> | null = null
  try {
    transporte = criarTransporte()
    const c = obterCampanha(id)
    const { from, replyTo, rodape } = remetente()
    const anexos = c.anexos.map((a) => ({ filename: a.nome, path: a.caminho }))
    const db = getDb()
    const proximo = db.prepare(`SELECT id, lead_id, email, nome FROM campanha_envios WHERE campanha_id = ? AND status = 'pendente' ORDER BY rowid LIMIT 1`)
    const dadosLead = db.prepare(`SELECT nome, empresa, cidade, profissao, email_descadastrado_em FROM leads WHERE id = ?`)
    const marcar = db.prepare(`UPDATE campanha_envios SET status = ?, erro = ?, enviado_em = ?, updated_at = ? WHERE id = ?`)

    while (!eu.parar && estaDesbloqueado()) {
      if (enviadosHoje() >= cfg.limiteDiario) {
        definirStatus(id, 'pausada', `Limite diário de ${cfg.limiteDiario} e-mails atingido. Retome amanhã (ou ajuste o limite em Configurações → E-mail).`)
        break
      }
      const envio = proximo.get(id) as { id: string; lead_id: string | null; email: string; nome: string | null } | undefined
      if (!envio) {
        definirStatus(id, 'concluida', null, `, concluida_em = '${agora()}'`)
        break
      }
      const lead = envio.lead_id ? (dadosLead.get(envio.lead_id) as (DadosDestinatario & { email_descadastrado_em: string | null }) | undefined) : undefined
      if (lead?.email_descadastrado_em) {
        // Pediu descadastro depois que a campanha começou: não envia.
        marcar.run('ignorado', 'Descadastrado durante a campanha', null, agora(), envio.id)
        continue
      }
      const m = montarMensagem(c.assunto, c.corpo, rodape, lead ?? { nome: envio.nome, empresa: null, cidade: null, profissao: null })
      try {
        await transporte.sendMail({ from, replyTo, to: envio.nome ? { name: envio.nome, address: envio.email } : envio.email, subject: m.assunto, text: m.texto, html: m.html, attachments: anexos })
        if (!estaDesbloqueado()) break
        const ts = agora()
        marcar.run('enviado', null, ts, ts, envio.id)
        if (envio.lead_id) {
          criarInteracao({ lead_id: envio.lead_id, tipo: 'email', data: ts, resumo: `E-mail em massa: "${m.assunto}" (campanha ${c.nome})`, proximo_passo: null })
        }
      } catch (e) {
        if (!estaDesbloqueado()) break
        const err = e as { code?: string; responseCode?: number }
        const doDestinatario = err.code === 'EENVELOPE' || (err.responseCode !== undefined && err.responseCode >= 550 && err.responseCode <= 553)
        if (doDestinatario) {
          marcar.run('erro', mensagemErroSmtp(e), null, agora(), envio.id)
        } else {
          // Problema de conexão, autenticação ou limite do servidor: pausa e mantém o destinatário pendente.
          definirStatus(id, 'pausada', mensagemErroSmtp(e))
          break
        }
      }
      avisarTela(id)
      // Intervalo entre e-mails (evita bloqueio por excesso de envios); interrompível.
      for (let t = 0; t < cfg.intervaloSeg * 10 && !eu.parar; t++) await esperar(100)
    }
  } catch (e) {
    if (estaDesbloqueado()) definirStatus(id, 'pausada', (e as Error).message)
  } finally {
    transporte?.close()
    if (motor === eu) motor = null
    avisarTela(id)
  }
}

// ---------------------------------------------------------------------------
// Descadastro
// ---------------------------------------------------------------------------

export function definirDescadastro(leadId: string, descadastrado: boolean): void {
  // Não altera updated_at: é um dado local (não sincronizado).
  getDb().prepare('UPDATE leads SET email_descadastrado_em = ? WHERE id = ?').run(descadastrado ? agora() : null, leadId)
}

/** Descadastra vários e-mails de uma vez (ex.: quem respondeu "SAIR"). Devolve quantos leads foram marcados. */
export function descadastrarEmails(texto: string): { marcados: number; naoEncontrados: string[] } {
  const emails = [...new Set((texto.match(/[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g) ?? []).map((e) => e.toLowerCase()))]
  const db = getDb()
  const upd = db.prepare(`UPDATE leads SET email_descadastrado_em = ? WHERE lower(email) = ? AND deleted_at IS NULL AND email_descadastrado_em IS NULL`)
  const existe = db.prepare(`SELECT 1 FROM leads WHERE lower(email) = ? AND deleted_at IS NULL`)
  let marcados = 0
  const naoEncontrados: string[] = []
  const ts = agora()
  db.transaction(() => {
    for (const e of emails) {
      if (!existe.get(e)) naoEncontrados.push(e)
      else marcados += upd.run(ts, e).changes
    }
  })()
  return { marcados, naoEncontrados }
}

export function listarDescadastrados(): { id: string; nome: string; email: string | null; email_descadastrado_em: string }[] {
  return getDb()
    .prepare(`SELECT id, nome, email, email_descadastrado_em FROM leads WHERE email_descadastrado_em IS NOT NULL AND deleted_at IS NULL ORDER BY email_descadastrado_em DESC`)
    .all() as { id: string; nome: string; email: string | null; email_descadastrado_em: string }[]
}
