import { app } from 'electron'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

/**
 * Pasta onde ficam crm.db e backups/.
 * - .exe portátil: PORTABLE_EXECUTABLE_DIR (pasta real do .exe, não a pasta temporária de extração)
 * - empacotado não portátil: pasta do executável
 * - desenvolvimento: ./data na raiz do projeto
 * Nunca usa AppData.
 */
export function pastaDados(): string {
  let pasta: string
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    pasta = process.env.PORTABLE_EXECUTABLE_DIR
  } else if (app.isPackaged) {
    pasta = dirname(process.execPath)
  } else {
    pasta = join(app.getAppPath(), 'data')
  }
  mkdirSync(pasta, { recursive: true })
  return pasta
}

export function caminhoBanco(): string {
  return join(pastaDados(), 'crm.db')
}

export function pastaBackups(): string {
  const pasta = join(pastaDados(), 'backups')
  mkdirSync(pasta, { recursive: true })
  return pasta
}
