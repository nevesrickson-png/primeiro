import { randomUUID } from 'crypto'
import { getDb } from './connection'
import type { Tag } from '@shared/types'

export function listarTags(): (Tag & { total: number })[] {
  return getDb()
    .prepare(
      `SELECT t.id, t.nome, t.cor,
              (SELECT count(*) FROM lead_tags lt JOIN leads l ON l.id = lt.lead_id
               WHERE lt.tag_id = t.id AND l.deleted_at IS NULL) AS total
       FROM tags t WHERE t.deleted_at IS NULL ORDER BY t.nome COLLATE NOCASE`
    )
    .all() as (Tag & { total: number })[]
}

export function criarTag(nome: string, cor: string): Tag {
  const n = nome.trim()
  if (!n) throw new Error('Informe o nome da tag.')
  const db = getDb()
  const existente = db
    .prepare('SELECT id, nome, cor FROM tags WHERE nome = ? COLLATE NOCASE AND deleted_at IS NULL')
    .get(n) as Tag | undefined
  if (existente) return existente
  const id = randomUUID()
  const ts = new Date().toISOString()
  db.prepare('INSERT INTO tags (id, created_at, updated_at, nome, cor) VALUES (?, ?, ?, ?, ?)').run(id, ts, ts, n, cor)
  return { id, nome: n, cor }
}

export function atualizarTag(id: string, nome: string, cor: string): void {
  const n = nome.trim()
  if (!n) throw new Error('Informe o nome da tag.')
  getDb()
    .prepare('UPDATE tags SET nome = ?, cor = ?, updated_at = ? WHERE id = ?')
    .run(n, cor, new Date().toISOString(), id)
}

export function excluirTag(id: string): void {
  const db = getDb()
  const ts = new Date().toISOString()
  db.transaction(() => {
    db.prepare('UPDATE tags SET deleted_at = ?, updated_at = ? WHERE id = ?').run(ts, ts, id)
    db.prepare('DELETE FROM lead_tags WHERE tag_id = ?').run(id)
  })()
}
