import { randomUUID } from 'crypto'
import { getDb, usuarioAtualId } from './connection'
import { FAIXAS_PATRIMONIO, ETAPAS } from '@shared/constants'
import type { Etapa } from '@shared/constants'
import type { FiltrosLeads, HistoricoEtapa, Lead, LeadInput, LeadResumo, Tag } from '@shared/types'

const agora = (): string => new Date().toISOString()
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

/** Campos simples (texto/número) gravados diretamente. */
const CAMPOS_TEXTO = [
  'nome', 'telefone', 'whatsapp', 'email', 'cidade', 'estado', 'profissao', 'empresa', 'cargo',
  'data_nascimento', 'estado_civil', 'conjuge', 'filhos', 'instagram', 'linkedin', 'outras_redes',
  'faixa_patrimonio', 'faixa_renda', 'suitability', 'data_suitability', 'horizonte',
  'sucessao_notas', 'hobbies_rapport', 'origem', 'origem_detalhe', 'indicado_por', 'etapa',
  'motivo_perda', 'valor_potencial', 'data_consentimento', 'base_legal', 'observacoes'
] as const

type LinhaLead = Record<string, unknown>

function soDigitos(v: string | null | undefined): string | null {
  if (!v) return null
  const d = v.replace(/\D/g, '')
  return d || null
}

function textoOuNull(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/** Normaliza a entrada vinda da interface antes de gravar. */
function normalizar(input: LeadInput): Record<string, unknown> {
  const nome = textoOuNull(input.nome)
  if (!nome) throw new Error('O nome é obrigatório.')
  const r: Record<string, unknown> = {}
  for (const c of CAMPOS_TEXTO) r[c] = textoOuNull((input as unknown as Record<string, unknown>)[c])
  r.nome = nome
  r.telefone = soDigitos(input.telefone)
  r.whatsapp = soDigitos(input.whatsapp)
  r.email = textoOuNull(input.email)?.toLowerCase() ?? null
  r.estado = textoOuNull(input.estado)?.toUpperCase() ?? null
  r.valor_potencial =
    input.valor_potencial === null || input.valor_potencial === undefined || isNaN(Number(input.valor_potencial))
      ? null
      : Number(input.valor_potencial)
  r.suitability = input.suitability || 'nao_avaliado'
  r.etapa = input.etapa || 'novo'
  if (r.etapa !== 'perdido') r.motivo_perda = null
  r.objetivos = JSON.stringify(input.objetivos ?? [])
  r.produtos_interesse = JSON.stringify(input.produtos_interesse ?? [])
  r.consentimento_lgpd = input.consentimento_lgpd ? 1 : 0
  if (!input.consentimento_lgpd) r.data_consentimento = null
  return r
}

function linhaParaLead(l: LinhaLead, tags: Tag[]): Lead {
  return {
    ...(l as unknown as Lead),
    objetivos: JSON.parse((l.objetivos as string) || '[]'),
    produtos_interesse: JSON.parse((l.produtos_interesse as string) || '[]'),
    consentimento_lgpd: l.consentimento_lgpd === 1,
    tags
  }
}

function registrarEtapa(leadId: string, de: string | null, para: string, data: string): void {
  getDb()
    .prepare(
      `INSERT INTO historico_etapas (id, created_at, updated_at, lead_id, etapa_de, etapa_para, data, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(randomUUID(), data, data, leadId, de, para, data, usuarioAtualId())
}

function definirTags(leadId: string, tagIds: string[]): void {
  const db = getDb()
  const ts = agora()
  db.prepare('DELETE FROM lead_tags WHERE lead_id = ?').run(leadId)
  const ins = db.prepare(
    'INSERT OR IGNORE INTO lead_tags (id, created_at, updated_at, lead_id, tag_id) VALUES (?, ?, ?, ?, ?)'
  )
  for (const t of new Set(tagIds)) ins.run(randomUUID(), ts, ts, leadId, t)
}

function tagsDoLead(leadId: string): Tag[] {
  return getDb()
    .prepare(
      `SELECT t.id, t.nome, t.cor FROM lead_tags lt JOIN tags t ON t.id = lt.tag_id
       WHERE lt.lead_id = ? AND t.deleted_at IS NULL ORDER BY t.nome COLLATE NOCASE`
    )
    .all(leadId) as Tag[]
}

export function obterLead(id: string): Lead | null {
  const l = getDb()
    .prepare(
      `SELECT l.*, i.nome AS indicado_por_nome FROM leads l
       LEFT JOIN leads i ON i.id = l.indicado_por AND i.deleted_at IS NULL
       WHERE l.id = ? AND l.deleted_at IS NULL`
    )
    .get(id) as LinhaLead | undefined
  return l ? linhaParaLead(l, tagsDoLead(id)) : null
}

export function criarLead(input: LeadInput): Lead {
  const db = getDb()
  const id = randomUUID()
  const ts = agora()
  const dados = normalizar(input)
  const usuario = usuarioAtualId()
  const colunas = ['id', 'created_at', 'updated_at', 'responsavel_id', 'created_by', ...Object.keys(dados)]
  const valores = [id, ts, ts, usuario, usuario, ...Object.values(dados)]
  db.transaction(() => {
    db.prepare(
      `INSERT INTO leads (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`
    ).run(...valores)
    registrarEtapa(id, null, dados.etapa as string, ts)
    definirTags(id, input.tag_ids ?? [])
  })()
  return obterLead(id)!
}

export function atualizarLead(id: string, input: LeadInput): Lead {
  const db = getDb()
  const atual = db.prepare('SELECT etapa FROM leads WHERE id = ? AND deleted_at IS NULL').get(id) as
    | { etapa: string }
    | undefined
  if (!atual) throw new Error('Lead não encontrado.')
  if (input.indicado_por === id) throw new Error('Um lead não pode indicar a si mesmo.')
  const ts = agora()
  const dados = normalizar(input)
  const sets = Object.keys(dados).map((c) => `${c} = ?`)
  db.transaction(() => {
    db.prepare(`UPDATE leads SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).run(
      ...Object.values(dados),
      ts,
      id
    )
    if (atual.etapa !== dados.etapa) registrarEtapa(id, atual.etapa, dados.etapa as string, ts)
    definirTags(id, input.tag_ids ?? [])
  })()
  return obterLead(id)!
}

/** Soft delete. */
export function excluirLead(id: string): void {
  const ts = agora()
  const db = getDb()
  db.transaction(() => {
    db.prepare('UPDATE leads SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL').run(ts, ts, id)
  })()
}

/** Converte o texto digitado em consulta FTS5: todos os termos, por prefixo. */
function consultaFts(busca: string): string | null {
  const termos = busca
    .normalize('NFKC')
    .split(/\s+/)
    .map((t) => t.replace(/["*():^{}[\]]/g, '').replace(/[-+.@]/g, ' ').trim())
    .flatMap((t) => t.split(/\s+/))
    .filter(Boolean)
  if (!termos.length) return null
  return termos.map((t) => `"${t}"*`).join(' ')
}

const ordemPatrimonio = `CASE l.faixa_patrimonio ${FAIXAS_PATRIMONIO.map((f, i) => `WHEN '${f.value}' THEN ${i + 1}`).join(' ')} ELSE 0 END`
const ordemEtapa = `CASE l.etapa ${ETAPAS.map((e, i) => `WHEN '${e.value}' THEN ${i}`).join(' ')} ELSE 99 END`

export function listarLeads(f: FiltrosLeads = {}): LeadResumo[] {
  const where: string[] = ['l.deleted_at IS NULL']
  const params: unknown[] = []

  const busca = f.busca?.trim()
  if (busca) {
    const fts = consultaFts(busca)
    const digitos = busca.replace(/\D/g, '')
    const soNumero = /^[\d\s()+-.]+$/.test(busca) && digitos.length >= 3
    if (soNumero) {
      // Trecho de telefone em qualquer posição (ex.: últimos 4 dígitos).
      where.push(`(l.telefone LIKE ? OR l.whatsapp LIKE ?)`)
      params.push(`%${digitos}%`, `%${digitos}%`)
    } else if (fts) {
      where.push(`l.id IN (SELECT lead_id FROM leads_fts WHERE leads_fts MATCH ?)`)
      params.push(fts)
    }
  }
  const emLista = (coluna: string, valores?: string[]): void => {
    if (valores && valores.length) {
      where.push(`${coluna} IN (${valores.map(() => '?').join(', ')})`)
      params.push(...valores)
    }
  }
  emLista('l.etapa', f.etapas)
  emLista('l.origem', f.origens)
  emLista('l.faixa_patrimonio', f.faixas_patrimonio)
  emLista('l.suitability', f.suitability)
  if (f.tag_id) {
    where.push('EXISTS (SELECT 1 FROM lead_tags lt WHERE lt.lead_id = l.id AND lt.tag_id = ?)')
    params.push(f.tag_id)
  }
  if (f.produto) {
    where.push('EXISTS (SELECT 1 FROM json_each(l.produtos_interesse) WHERE value = ?)')
    params.push(f.produto)
  }

  const dir = f.direcao === 'desc' ? 'DESC' : 'ASC'
  const ordem = f.ordenacao ?? 'nome'
  const orderBy: Record<string, string> = {
    nome: 'l.nome COLLATE NOCASE',
    created_at: 'l.created_at',
    updated_at: 'l.updated_at',
    valor_potencial: 'coalesce(l.valor_potencial, -1)',
    etapa: ordemEtapa,
    patrimonio: ordemPatrimonio,
    ultima_interacao: `coalesce(ultima_interacao, '')`
  }

  const linhas = getDb()
    .prepare(
      `SELECT l.id, l.nome, l.telefone, l.whatsapp, l.email, l.cidade, l.estado, l.empresa, l.etapa,
              l.origem, l.faixa_patrimonio, l.suitability, l.valor_potencial, l.created_at, l.updated_at,
              (SELECT group_concat(lt.tag_id) FROM lead_tags lt WHERE lt.lead_id = l.id) AS tags_csv,
              (SELECT max(h.data) FROM historico_etapas h
                WHERE h.lead_id = l.id AND h.etapa_para = l.etapa AND h.deleted_at IS NULL) AS etapa_desde,
              (SELECT max(i.data) FROM interacoes i WHERE i.lead_id = l.id AND i.deleted_at IS NULL) AS ultima_interacao
       FROM leads l
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy[ordem] ?? orderBy.nome} ${dir}, l.nome COLLATE NOCASE`
    )
    .all(...params) as (LeadResumo & { tags_csv: string | null })[]

  const resultado = linhas.map(({ tags_csv, ...l }) => ({
    ...l,
    tag_ids: tags_csv ? tags_csv.split(',') : []
  }))
  // Ordenação alfabética correta em português (acentos), que o NOCASE do SQLite não faz.
  if (ordem === 'nome') {
    resultado.sort((a, b) => collator.compare(a.nome, b.nome) * (dir === 'DESC' ? -1 : 1))
  }
  return resultado
}

/** Busca rápida para o seletor "Indicado por". */
export function buscarLeadsPorNome(texto: string, excluirId?: string, limite = 10): { id: string; nome: string; cidade: string | null }[] {
  const fts = consultaFts(texto)
  if (!fts) return []
  return getDb()
    .prepare(
      `SELECT l.id, l.nome, l.cidade FROM leads l
       WHERE l.deleted_at IS NULL AND l.id != ?
         AND l.id IN (SELECT lead_id FROM leads_fts WHERE leads_fts MATCH ?)
       ORDER BY l.nome COLLATE NOCASE LIMIT ?`
    )
    .all(excluirId ?? '', `nome : (${fts})`, limite) as { id: string; nome: string; cidade: string | null }[]
}

export function contarLeads(): number {
  return (getDb().prepare('SELECT count(*) AS n FROM leads WHERE deleted_at IS NULL').get() as { n: number }).n
}

/**
 * Muda a etapa de um lead (arrastar no Kanban, seletor na lista) e grava o histórico.
 * Ao sair de "perdido" o motivo da perda é limpo.
 */
export function moverEtapa(id: string, etapa: Etapa, motivoPerda?: string | null): void {
  if (!ETAPAS.some((e) => e.value === etapa)) throw new Error('Etapa inválida.')
  const db = getDb()
  const atual = db.prepare('SELECT etapa, motivo_perda FROM leads WHERE id = ? AND deleted_at IS NULL').get(id) as
    | { etapa: string; motivo_perda: string | null }
    | undefined
  if (!atual) throw new Error('Lead não encontrado.')
  if (atual.etapa === etapa && etapa !== 'perdido') return
  const ts = agora()
  const motivo = etapa === 'perdido' ? textoOuNull(motivoPerda) ?? atual.motivo_perda : null
  db.transaction(() => {
    db.prepare('UPDATE leads SET etapa = ?, motivo_perda = ?, updated_at = ? WHERE id = ?').run(etapa, motivo, ts, id)
    if (atual.etapa !== etapa) registrarEtapa(id, atual.etapa, etapa, ts)
  })()
}

export function historicoEtapas(leadId: string): HistoricoEtapa[] {
  return getDb()
    .prepare(
      `SELECT id, lead_id, etapa_de, etapa_para, data FROM historico_etapas
       WHERE lead_id = ? AND deleted_at IS NULL ORDER BY data DESC`
    )
    .all(leadId) as HistoricoEtapa[]
}
