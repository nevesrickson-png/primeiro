import { copyFileSync, existsSync, readdirSync, rmSync, statSync } from 'fs'
import { basename, join } from 'path'
import { caminhoBanco, pastaBackups } from './paths'
import { estaDesbloqueado, fecharBanco, getDb } from './db/connection'
import type { Backup } from '@shared/types'

export const MANTER_BACKUPS = 10
const PREFIXO = 'crm-'
/** crm-AAAAMMDD-HHMMSS.db (ou -2, -3… se dois backups caírem no mesmo segundo). */
const ROTATIVO = /^crm-\d{8}-\d{6}(-\d+)?\.db$/

function carimbo(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/** Backups automáticos/manuais (crm-AAAAMMDD-HHMMSS.db), do mais recente para o mais antigo. */
export function listarBackups(): Backup[] {
  const pasta = pastaBackups()
  return readdirSync(pasta)
    .filter((f) => f.startsWith(PREFIXO) && f.endsWith('.db'))
    .map((f) => {
      const caminho = join(pasta, f)
      const st = statSync(caminho)
      return { arquivo: f, caminho, tamanho: st.size, data: st.mtime.toISOString(), ms: st.mtimeMs }
    })
    .sort((a, b) => b.ms - a.ms || (b.arquivo > a.arquivo ? 1 : -1))
    .map(({ ms: _ms, ...b }) => b)
}

function limparAntigos(): void {
  // Só a rotação automática conta; cópias de segurança de restauração ("antes-restauracao") são mantidas.
  const automaticos = listarBackups().filter((b) => ROTATIVO.test(b.arquivo))
  for (const b of automaticos.slice(MANTER_BACKUPS)) rmSync(b.caminho, { force: true })
}

/**
 * Copia o crm.db (já criptografado) para a pasta de backups.
 * Com o banco aberto, primeiro consolida o WAL no arquivo principal.
 */
export function fazerBackup(): Backup {
  const origem = caminhoBanco()
  if (!existsSync(origem)) throw new Error('Ainda não há banco de dados para copiar.')
  if (estaDesbloqueado()) getDb().pragma('wal_checkpoint(TRUNCATE)')
  const base = join(pastaBackups(), `${PREFIXO}${carimbo()}`)
  let destino = `${base}.db`
  for (let n = 2; existsSync(destino); n++) destino = `${base}-${n}.db`
  copyFileSync(origem, destino)
  limparAntigos()
  const st = statSync(destino)
  return { arquivo: basename(destino), caminho: destino, tamanho: st.size, data: st.mtime.toISOString() }
}

let backupAoFecharFeito = false

/** Chamado ao fechar o app: fecha o banco e faz o backup (uma única vez, só se o banco foi aberto). */
export function fecharComBackup(): void {
  if (backupAoFecharFeito) return
  const estavaAberto = estaDesbloqueado()
  fecharBanco()
  if (!estavaAberto) return
  backupAoFecharFeito = true
  try {
    fazerBackup()
  } catch (e) {
    console.error('Falha no backup automático:', e)
  }
}

/**
 * Restaura um backup: guarda uma cópia do banco atual, substitui o crm.db e bloqueia o app.
 * O usuário desbloqueia com a senha que o banco tinha na data do backup.
 */
export function restaurarBackup(caminho: string): void {
  if (!existsSync(caminho)) throw new Error('Arquivo de backup não encontrado.')
  const destino = caminhoBanco()
  if (caminho === destino) throw new Error('Escolha um arquivo de backup, não o banco em uso.')
  if (statSync(caminho).size < 1024) throw new Error('O arquivo escolhido não parece ser um banco do CRM.')
  if (estaDesbloqueado()) getDb().pragma('wal_checkpoint(TRUNCATE)')
  fecharBanco()
  if (existsSync(destino)) copyFileSync(destino, join(pastaBackups(), `${PREFIXO}antes-restauracao-${carimbo()}.db`))
  for (const extra of ['-wal', '-shm']) rmSync(destino + extra, { force: true })
  copyFileSync(caminho, destino)
}
