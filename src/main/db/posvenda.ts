import { randomUUID } from 'crypto'
import { getDb } from './connection'
import type { Indicacao, Nps, NpsInput, Revisao, RevisaoInput } from '@shared/types'

const DATA = /^\d{4}-\d{2}-\d{2}$/
const agora = () => new Date().toISOString()

// ---------- Revisões de carteira ----------

const COL_REV = 'id, lead_id, data, notas, proxima_revisao, created_at, updated_at'

function validarRevisao(r: RevisaoInput): RevisaoInput {
  if (!r.data || !DATA.test(r.data)) throw new Error('Informe a data da revisão.')
  if (r.proxima_revisao && !DATA.test(r.proxima_revisao)) throw new Error('Data da próxima revisão inválida.')
  if (r.proxima_revisao && r.proxima_revisao <= r.data) throw new Error('A próxima revisão deve ser depois da data da revisão.')
  return { ...r, notas: r.notas?.trim() || null, proxima_revisao: r.proxima_revisao || null }
}

export function listarRevisoes(leadId: string): Revisao[] {
  return getDb()
    .prepare(`SELECT ${COL_REV} FROM revisoes_carteira WHERE lead_id = ? AND deleted_at IS NULL ORDER BY data DESC, created_at DESC`)
    .all(leadId) as Revisao[]
}

export function criarRevisao(input: RevisaoInput): Revisao {
  const r = validarRevisao(input)
  const id = randomUUID()
  const ts = agora()
  const db = getDb()
  db.prepare(
    `INSERT INTO revisoes_carteira (id, created_at, updated_at, lead_id, data, notas, proxima_revisao) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, ts, ts, r.lead_id, r.data, r.notas, r.proxima_revisao)
  return db.prepare(`SELECT ${COL_REV} FROM revisoes_carteira WHERE id = ?`).get(id) as Revisao
}

export function atualizarRevisao(id: string, input: RevisaoInput): Revisao {
  const r = validarRevisao(input)
  const db = getDb()
  db.prepare(`UPDATE revisoes_carteira SET data = ?, notas = ?, proxima_revisao = ?, updated_at = ? WHERE id = ?`).run(
    r.data, r.notas, r.proxima_revisao, agora(), id
  )
  return db.prepare(`SELECT ${COL_REV} FROM revisoes_carteira WHERE id = ?`).get(id) as Revisao
}

export function excluirRevisao(id: string): void {
  const ts = agora()
  getDb().prepare('UPDATE revisoes_carteira SET deleted_at = ?, updated_at = ? WHERE id = ?').run(ts, ts, id)
}

// ---------- NPS ----------

const COL_NPS = 'id, lead_id, data, nota, comentario, created_at, updated_at'

function validarNps(n: NpsInput): NpsInput {
  if (!n.data || !DATA.test(n.data)) throw new Error('Informe a data da pesquisa.')
  const nota = Number(n.nota)
  if (!Number.isInteger(nota) || nota < 0 || nota > 10) throw new Error('A nota deve ser de 0 a 10.')
  return { ...n, nota, comentario: n.comentario?.trim() || null }
}

export function listarNps(leadId: string): Nps[] {
  return getDb()
    .prepare(`SELECT ${COL_NPS} FROM nps WHERE lead_id = ? AND deleted_at IS NULL ORDER BY data DESC, created_at DESC`)
    .all(leadId) as Nps[]
}

export function criarNps(input: NpsInput): Nps {
  const n = validarNps(input)
  const id = randomUUID()
  const ts = agora()
  const db = getDb()
  db.prepare(`INSERT INTO nps (id, created_at, updated_at, lead_id, data, nota, comentario) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id, ts, ts, n.lead_id, n.data, n.nota, n.comentario
  )
  return db.prepare(`SELECT ${COL_NPS} FROM nps WHERE id = ?`).get(id) as Nps
}

export function excluirNps(id: string): void {
  const ts = agora()
  getDb().prepare('UPDATE nps SET deleted_at = ?, updated_at = ? WHERE id = ?').run(ts, ts, id)
}

/**
 * NPS geral da carteira: última nota de cada cliente nos últimos 12 meses.
 * NPS = % promotores (9–10) − % detratores (0–6).
 */
export function resumoNps(): { nps: number | null; respostas: number; promotores: number; neutros: number; detratores: number } {
  const desde = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10)
  const notas = getDb()
    .prepare(
      `SELECT n.nota FROM nps n JOIN leads l ON l.id = n.lead_id AND l.deleted_at IS NULL
       WHERE n.deleted_at IS NULL AND n.data >= ?
         AND n.id = (SELECT n2.id FROM nps n2 WHERE n2.lead_id = n.lead_id AND n2.deleted_at IS NULL
                     ORDER BY n2.data DESC, n2.created_at DESC LIMIT 1)`
    )
    .all(desde) as { nota: number }[]
  const promotores = notas.filter((n) => n.nota >= 9).length
  const detratores = notas.filter((n) => n.nota <= 6).length
  const total = notas.length
  return {
    nps: total ? Math.round(((promotores - detratores) / total) * 100) : null,
    respostas: total,
    promotores,
    neutros: total - promotores - detratores,
    detratores
  }
}

// ---------- Indicações ----------

export function indicacoesRecebidas(leadId: string): Indicacao[] {
  return getDb()
    .prepare(
      `SELECT id, nome, etapa, valor_potencial, created_at FROM leads
       WHERE indicado_por = ? AND deleted_at IS NULL ORDER BY created_at DESC`
    )
    .all(leadId) as Indicacao[]
}
