import { randomUUID } from 'crypto'
import { getDb } from './connection'
import type { Aplicacao, AplicacaoInput } from '@shared/types'

// Aplicações são dados financeiros sensíveis: ficam só no banco local (nunca vão para a planilha).

const COLUNAS = 'id, lead_id, produto, valor, data_vencimento, created_at, updated_at'

function validar(a: AplicacaoInput): AplicacaoInput {
  const produto = a.produto?.trim()
  if (!produto) throw new Error('Informe o produto.')
  if (a.data_vencimento && !/^\d{4}-\d{2}-\d{2}$/.test(a.data_vencimento)) throw new Error('Data de vencimento inválida.')
  const valor = a.valor === null || a.valor === undefined || isNaN(Number(a.valor)) ? null : Number(a.valor)
  return { ...a, produto, valor, data_vencimento: a.data_vencimento || null }
}

export function listarAplicacoes(leadId: string): Aplicacao[] {
  return getDb()
    .prepare(
      `SELECT ${COLUNAS} FROM aplicacoes WHERE lead_id = ? AND deleted_at IS NULL
       ORDER BY data_vencimento IS NULL, data_vencimento`
    )
    .all(leadId) as Aplicacao[]
}

export function criarAplicacao(input: AplicacaoInput): Aplicacao {
  const a = validar(input)
  const id = randomUUID()
  const ts = new Date().toISOString()
  const db = getDb()
  db.prepare(
    `INSERT INTO aplicacoes (id, created_at, updated_at, lead_id, produto, valor, data_vencimento) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, ts, ts, a.lead_id, a.produto, a.valor, a.data_vencimento)
  return db.prepare(`SELECT ${COLUNAS} FROM aplicacoes WHERE id = ?`).get(id) as Aplicacao
}

export function atualizarAplicacao(id: string, input: AplicacaoInput): Aplicacao {
  const a = validar(input)
  const db = getDb()
  db.prepare(`UPDATE aplicacoes SET produto = ?, valor = ?, data_vencimento = ?, updated_at = ? WHERE id = ?`).run(
    a.produto, a.valor, a.data_vencimento, new Date().toISOString(), id
  )
  return db.prepare(`SELECT ${COLUNAS} FROM aplicacoes WHERE id = ?`).get(id) as Aplicacao
}

export function excluirAplicacao(id: string): void {
  const ts = new Date().toISOString()
  getDb().prepare('UPDATE aplicacoes SET deleted_at = ?, updated_at = ? WHERE id = ?').run(ts, ts, id)
}
