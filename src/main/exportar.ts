import { writeFileSync } from 'fs'
import { getDb } from './db/connection'
import { listarLeads } from './db/leads'
import { COLUNAS_PLANILHA, paraCelula } from './sync/mapeamento'
import { FAIXAS_PATRIMONIO, FAIXAS_RENDA, SUITABILITY } from '@shared/constants'
import type { FiltrosLeads } from '@shared/types'

/** Colunas sensíveis, exportadas apenas quando o usuário pede explicitamente. */
const SENSIVEIS: { campo: string; titulo: string; formatar: (v: unknown) => string }[] = [
  { campo: 'faixa_patrimonio', titulo: 'Faixa de patrimônio', formatar: (v) => FAIXAS_PATRIMONIO.find((f) => f.value === v)?.label ?? '' },
  { campo: 'faixa_renda', titulo: 'Faixa de renda', formatar: (v) => FAIXAS_RENDA.find((f) => f.value === v)?.label ?? '' },
  { campo: 'suitability', titulo: 'Suitability', formatar: (v) => SUITABILITY.find((f) => f.value === v)?.label ?? '' },
  { campo: 'data_suitability', titulo: 'Data da suitability', formatar: (v) => (v ? String(v).split('-').reverse().join('/') : '') },
  { campo: 'sucessao_notas', titulo: 'Notas de sucessão', formatar: (v) => (v ? String(v) : '') }
]

function celulaCsv(v: string): string {
  // Neutraliza fórmulas (proteção contra "CSV injection" ao abrir no Excel).
  const seguro = /^[=+\-@\t\r]/.test(v) && !/^[-+]?\d/.test(v) ? `'${v}` : v
  return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
}

/**
 * Gera o CSV (separador ";" e BOM UTF-8, abre direto no Excel em português).
 * Usa os mesmos filtros da tela de Leads.
 */
export function gerarCsvLeads(filtros: FiltrosLeads, incluirSensiveis: boolean): { csv: string; total: number } {
  const ids = listarLeads(filtros).map((l) => l.id)
  const db = getDb()
  const porId = new Map((db.prepare('SELECT * FROM leads WHERE deleted_at IS NULL').all() as Record<string, unknown>[]).map((l) => [l.id as string, l]))
  const tags = new Map<string, string[]>()
  for (const t of db
    .prepare(`SELECT lt.lead_id, tg.nome FROM lead_tags lt JOIN tags tg ON tg.id = lt.tag_id AND tg.deleted_at IS NULL ORDER BY tg.nome`)
    .all() as { lead_id: string; nome: string }[]) {
    tags.set(t.lead_id, [...(tags.get(t.lead_id) ?? []), t.nome])
  }
  const colunas = COLUNAS_PLANILHA.filter((c) => !['updated_at', 'deleted_at', 'indicado_por'].includes(c.campo))
  const cab = [...colunas.map((c) => (c.campo === 'created_at' ? 'Cadastrado em' : c.titulo)), 'Indicado por', ...(incluirSensiveis ? SENSIVEIS.map((s) => s.titulo) : [])]
  const linhas = [cab.map(celulaCsv).join(';')]
  for (const id of ids) {
    const l = porId.get(id)
    if (!l) continue
    const valores = colunas.map((c) => {
      if (c.campo === 'tags') return paraCelula('tags', tags.get(id) ?? [])
      if (c.campo === 'created_at') return new Date(l.created_at as string).toLocaleDateString('pt-BR')
      return paraCelula(c.campo, l[c.campo])
    })
    const indicador = l.indicado_por ? (porId.get(l.indicado_por as string)?.nome as string) ?? '' : ''
    valores.push(indicador)
    if (incluirSensiveis) valores.push(...SENSIVEIS.map((s) => s.formatar(l[s.campo])))
    linhas.push(valores.map((v) => celulaCsv(v ?? '')).join(';'))
  }
  return { csv: '﻿' + linhas.join('\r\n'), total: linhas.length - 1 }
}

export function salvarCsv(caminho: string, filtros: FiltrosLeads, incluirSensiveis: boolean): number {
  const { csv, total } = gerarCsvLeads(filtros, incluirSensiveis)
  writeFileSync(caminho, csv, 'utf8')
  return total
}
