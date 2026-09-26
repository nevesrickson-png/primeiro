import { getDb } from './connection'

export const PADROES: Record<string, string> = {
  dias_lead_parado: '15'
}

export function obterConfiguracoes(): Record<string, string> {
  const linhas = getDb().prepare('SELECT chave, valor FROM configuracoes').all() as { chave: string; valor: string }[]
  const r = { ...PADROES }
  for (const l of linhas) r[l.chave] = l.valor
  return r
}

export function salvarConfiguracao(chave: string, valor: string): void {
  getDb()
    .prepare(
      `INSERT INTO configuracoes (chave, valor, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at`
    )
    .run(chave, valor, new Date().toISOString())
}
