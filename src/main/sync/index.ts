import { getDb } from '../db/connection'
import { obterConfiguracoes, salvarConfiguracao } from '../db/configuracoes'
import { definirTags, registrarEtapa } from '../db/leads'
import { criarTag } from '../db/tags'
import { chamarPonte, validarUrl } from './cliente'
import { COLUNAS_PLANILHA, deCelula } from './mapeamento'
import type { ConfigSync, ConflitoSync, RegistroSync } from '@shared/types'

export { sincronizar } from './sincronizar'

function contarConflitos(): number {
  return (getDb().prepare('SELECT count(*) AS n FROM sync_conflitos WHERE resolvido = 0 AND deleted_at IS NULL').get() as { n: number }).n
}

export function obterConfigSync(): ConfigSync {
  const c = obterConfiguracoes()
  return { url: c.sync_url ?? '', tokenDefinido: !!c.sync_token, ultima: c.sync_ultima ?? null, conflitosPendentes: contarConflitos() }
}

/** Salva URL e (opcionalmente) um novo token. Token vazio mantém o atual. */
export function salvarConfigSync(url: string, token?: string): void {
  salvarConfiguracao('sync_url', url.trim() ? validarUrl(url) : '')
  if (token && token.trim()) salvarConfiguracao('sync_token', token.trim())
}

export async function testarConexao(url?: string, token?: string): Promise<{ planilha: string }> {
  const c = obterConfiguracoes()
  const u = url?.trim() || c.sync_url
  const t = token?.trim() || c.sync_token
  if (!u || !t) throw new Error('Informe a URL e o token.')
  return chamarPonte<{ planilha: string }>(u, t, 'ping')
}

export function historicoSync(limite = 15): RegistroSync[] {
  return getDb()
    .prepare(
      `SELECT id, iniciado_em, finalizado_em, status, enviados, recebidos, importados_forms, conflitos, mensagem
       FROM sync_log WHERE deleted_at IS NULL ORDER BY iniciado_em DESC LIMIT ?`
    )
    .all(limite) as RegistroSync[]
}

export function listarConflitos(): ConflitoSync[] {
  const linhas = getDb()
    .prepare(
      `SELECT c.id, c.lead_id, l.nome AS lead_nome, c.campo, c.valor_local, c.valor_planilha, c.updated_at_local,
              c.updated_at_planilha, c.vencedor, c.created_at
       FROM sync_conflitos c LEFT JOIN leads l ON l.id = c.lead_id
       WHERE c.resolvido = 0 AND c.deleted_at IS NULL ORDER BY c.created_at DESC, l.nome`
    )
    .all() as Omit<ConflitoSync, 'campo_titulo'>[]
  return linhas.map((c) => ({ ...c, campo_titulo: COLUNAS_PLANILHA.find((x) => x.campo === c.campo)?.titulo ?? c.campo }))
}

/**
 * Resolve um conflito. "manter" aceita o valor vencedor; "usar_outro" grava no lead o valor
 * que perdeu (e atualiza updated_at, para a próxima sincronização levar à planilha).
 */
export function resolverConflito(id: string, acao: 'manter' | 'usar_outro'): void {
  const db = getDb()
  const c = db.prepare('SELECT * FROM sync_conflitos WHERE id = ?').get(id) as
    | { lead_id: string; campo: string; valor_local: string; valor_planilha: string; vencedor: string }
    | undefined
  if (!c) throw new Error('Conflito não encontrado.')
  const agora = new Date().toISOString()
  db.transaction(() => {
    if (acao === 'usar_outro') {
      const texto = c.vencedor === 'planilha' ? c.valor_local : c.valor_planilha
      const col = COLUNAS_PLANILHA.find((x) => x.campo === c.campo)
      const lead = db.prepare('SELECT etapa FROM leads WHERE id = ? AND deleted_at IS NULL').get(c.lead_id) as { etapa: string } | undefined
      if (col && lead) {
        const v = deCelula(c.campo, texto)
        if (v === undefined) throw new Error('O valor escolhido é inválido e não pode ser aplicado.')
        if (c.campo === 'tags') {
          definirTags(c.lead_id, (v as string[]).map((n) => criarTag(n, '#64748b').id))
          db.prepare('UPDATE leads SET updated_at = ? WHERE id = ?').run(agora, c.lead_id)
        } else {
          db.prepare(`UPDATE leads SET ${c.campo} = ?, updated_at = ? WHERE id = ?`).run(col.tipo === 'multi' ? JSON.stringify(v) : v, agora, c.lead_id)
          if (c.campo === 'etapa' && v !== lead.etapa) registrarEtapa(c.lead_id, lead.etapa, v as string, agora)
        }
      }
    }
    db.prepare('UPDATE sync_conflitos SET resolvido = 1, updated_at = ? WHERE id = ?').run(agora, id)
  })()
}

export function resolverTodosConflitos(): number {
  const agora = new Date().toISOString()
  return getDb().prepare('UPDATE sync_conflitos SET resolvido = 1, updated_at = ? WHERE resolvido = 0').run(agora).changes
}
