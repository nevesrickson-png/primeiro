import { randomUUID } from 'crypto'
import { getDb, usuarioAtualId } from './connection'
import { TIPOS_INTERACAO } from '@shared/constants'
import type { Interacao, InteracaoInput } from '@shared/types'

const COLUNAS = 'id, lead_id, tipo, data, resumo, proximo_passo, created_at, updated_at'

function validar(i: InteracaoInput): InteracaoInput {
  if (!TIPOS_INTERACAO.some((t) => t.value === i.tipo)) throw new Error('Tipo de interação inválido.')
  if (!i.data || isNaN(Date.parse(i.data))) throw new Error('Informe a data da interação.')
  const resumo = i.resumo?.trim() || null
  const proximo = i.proximo_passo?.trim() || null
  if (!resumo && !proximo) throw new Error('Escreva um resumo da interação.')
  return { ...i, data: new Date(i.data).toISOString(), resumo, proximo_passo: proximo }
}

export function listarInteracoes(leadId: string): Interacao[] {
  return getDb()
    .prepare(`SELECT ${COLUNAS} FROM interacoes WHERE lead_id = ? AND deleted_at IS NULL ORDER BY data DESC`)
    .all(leadId) as Interacao[]
}

export function criarInteracao(input: InteracaoInput): Interacao {
  const i = validar(input)
  const db = getDb()
  const existe = db.prepare('SELECT 1 FROM leads WHERE id = ? AND deleted_at IS NULL').get(i.lead_id)
  if (!existe) throw new Error('Lead não encontrado.')
  const id = randomUUID()
  const ts = new Date().toISOString()
  db.prepare(
    `INSERT INTO interacoes (id, created_at, updated_at, lead_id, tipo, data, resumo, proximo_passo, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, ts, ts, i.lead_id, i.tipo, i.data, i.resumo, i.proximo_passo, usuarioAtualId())
  return db.prepare(`SELECT ${COLUNAS} FROM interacoes WHERE id = ?`).get(id) as Interacao
}

export function atualizarInteracao(id: string, input: InteracaoInput): Interacao {
  const i = validar(input)
  const db = getDb()
  db.prepare(
    `UPDATE interacoes SET tipo = ?, data = ?, resumo = ?, proximo_passo = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`
  ).run(i.tipo, i.data, i.resumo, i.proximo_passo, new Date().toISOString(), id)
  const r = db.prepare(`SELECT ${COLUNAS} FROM interacoes WHERE id = ?`).get(id) as Interacao | undefined
  if (!r) throw new Error('Interação não encontrada.')
  return r
}

export function excluirInteracao(id: string): void {
  const ts = new Date().toISOString()
  getDb().prepare('UPDATE interacoes SET deleted_at = ?, updated_at = ? WHERE id = ?').run(ts, ts, id)
}
