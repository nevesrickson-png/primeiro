import Database from 'better-sqlite3-multiple-ciphers'
import { existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { aplicarMigrations } from './migrations'

let db: Database.Database | null = null
let usuarioPadraoId: string | null = null

function escaparSenha(senha: string): string {
  return senha.replace(/'/g, "''")
}

function abrirComSenha(caminho: string, senha: string): Database.Database {
  const conn = new Database(caminho)
  try {
    conn.pragma(`cipher='sqlcipher'`)
    conn.pragma(`key='${escaparSenha(senha)}'`)
    // Força a leitura: com senha errada o SQLite acusa "file is not a database".
    conn.prepare('SELECT count(*) FROM sqlite_master').get()
    conn.pragma('journal_mode = WAL')
    conn.pragma('foreign_keys = ON')
    conn.pragma('synchronous = NORMAL')
    return conn
  } catch (e) {
    conn.close()
    throw e
  }
}

function garantirUsuarioPadrao(conn: Database.Database): string {
  const existente = conn
    .prepare(`SELECT id FROM usuarios WHERE deleted_at IS NULL AND papel = 'titular' LIMIT 1`)
    .get() as { id: string } | undefined
  if (existente) return existente.id
  const id = randomUUID()
  const agora = new Date().toISOString()
  conn
    .prepare(
      `INSERT INTO usuarios (id, created_at, updated_at, nome, papel) VALUES (?, ?, ?, 'Assessor', 'titular')`
    )
    .run(id, agora, agora)
  return id
}

function inicializar(conn: Database.Database): void {
  aplicarMigrations(conn)
  usuarioPadraoId = garantirUsuarioPadrao(conn)
  db = conn
}

export function bancoExiste(caminho: string): boolean {
  return existsSync(caminho)
}

export function criarBanco(caminho: string, senha: string): void {
  if (existsSync(caminho)) throw new Error('Já existe um banco de dados nesta pasta.')
  inicializar(abrirComSenha(caminho, senha))
}

export function desbloquear(caminho: string, senha: string): void {
  let conn: Database.Database
  try {
    conn = abrirComSenha(caminho, senha)
  } catch (e) {
    const msg = (e as Error).message ?? ''
    if (/not a database|encrypted/i.test(msg)) throw new Error('Senha incorreta.')
    throw e
  }
  inicializar(conn)
}

export function trocarSenha(senhaAtual: string, novaSenha: string, caminho: string): void {
  const conn = getDb()
  // Confirma a senha atual abrindo uma segunda conexão somente leitura.
  try {
    const teste = abrirComSenha(caminho, senhaAtual)
    teste.close()
  } catch {
    throw new Error('Senha atual incorreta.')
  }
  // rekey não funciona em modo WAL: volta temporariamente para DELETE.
  conn.pragma('journal_mode = DELETE')
  conn.pragma(`rekey='${escaparSenha(novaSenha)}'`)
  conn.pragma('journal_mode = WAL')
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Banco de dados bloqueado.')
  return db
}

export function estaDesbloqueado(): boolean {
  return db !== null
}

export function usuarioAtualId(): string | null {
  return usuarioPadraoId
}

export function fecharBanco(): void {
  if (db) {
    try {
      db.pragma('wal_checkpoint(TRUNCATE)')
    } catch {
      /* ignora */
    }
    db.close()
    db = null
  }
}
