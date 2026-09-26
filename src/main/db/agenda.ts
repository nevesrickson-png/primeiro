import { getDb } from './connection'
import { listarTarefas } from './tarefas'
import { leadsParados } from './leads'
import { obterConfiguracoes } from './configuracoes'
import { dataLocalISO, diasEntre, somarDias } from './datas'
import type { Agenda, Aniversariante, ResumoLembretes, Vencimento } from '@shared/types'

/** Aniversários de hoje até `dias` dias à frente. 29/02 vira 28/02 em anos não bissextos. */
export function aniversariantes(dias = 7): Aniversariante[] {
  const hoje = dataLocalISO()
  const anoAtual = Number(hoje.slice(0, 4))
  const linhas = getDb()
    .prepare(`SELECT id, nome, data_nascimento, whatsapp, telefone FROM leads WHERE deleted_at IS NULL AND data_nascimento IS NOT NULL AND etapa != 'perdido'`)
    .all() as { id: string; nome: string; data_nascimento: string; whatsapp: string | null; telefone: string | null }[]
  const r: Aniversariante[] = []
  for (const l of linhas) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(l.data_nascimento)
    if (!m) continue
    const [, anoN, mes, dia] = m
    for (const ano of [anoAtual, anoAtual + 1]) {
      const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0
      const d = mes === '02' && dia === '29' && !bissexto ? '28' : dia
      const proximo = `${ano}-${mes}-${d}`
      const falta = diasEntre(hoje, proximo)
      if (falta >= 0) {
        if (falta <= dias) {
          r.push({ id: l.id, nome: l.nome, data_nascimento: l.data_nascimento, proximo, idade: ano - Number(anoN), dias: falta, whatsapp: l.whatsapp || l.telefone })
        }
        break
      }
    }
  }
  return r.sort((a, b) => a.dias - b.dias || a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Vencimentos de aplicações e próximas revisões de carteira nos próximos `dias` dias (inclui atrasados até 7 dias). */
export function vencimentos(dias = 30): Vencimento[] {
  const hoje = dataLocalISO()
  const inicio = somarDias(hoje, -7)
  const fim = somarDias(hoje, dias)
  const db = getDb()
  const apl = db
    .prepare(
      `SELECT a.id, a.lead_id, l.nome AS lead_nome, a.produto AS descricao, a.valor, a.data_vencimento AS data
       FROM aplicacoes a JOIN leads l ON l.id = a.lead_id AND l.deleted_at IS NULL
       WHERE a.deleted_at IS NULL AND a.data_vencimento BETWEEN ? AND ?`
    )
    .all(inicio, fim) as Omit<Vencimento, 'tipo' | 'dias'>[]
  // Só a revisão mais recente de cada lead conta (a próxima revisão prevista).
  const rev = db
    .prepare(
      `SELECT r.id, r.lead_id, l.nome AS lead_nome, 'Revisão de carteira' AS descricao, NULL AS valor, r.proxima_revisao AS data
       FROM revisoes_carteira r JOIN leads l ON l.id = r.lead_id AND l.deleted_at IS NULL
       WHERE r.deleted_at IS NULL AND r.proxima_revisao BETWEEN ? AND ?
         AND r.data = (SELECT max(r2.data) FROM revisoes_carteira r2 WHERE r2.lead_id = r.lead_id AND r2.deleted_at IS NULL)`
    )
    .all(inicio, fim) as Omit<Vencimento, 'tipo' | 'dias'>[]
  return [
    ...apl.map((v) => ({ ...v, tipo: 'aplicacao' as const, dias: diasEntre(hoje, v.data) })),
    ...rev.map((v) => ({ ...v, tipo: 'revisao' as const, dias: diasEntre(hoje, v.data) }))
  ].sort((a, b) => a.data.localeCompare(b.data))
}

export function obterAgenda(): Agenda {
  const diasParado = Math.max(1, parseInt(obterConfiguracoes().dias_lead_parado, 10) || 15)
  return {
    hoje: dataLocalISO(),
    diasParado,
    tarefasAtrasadas: listarTarefas({ filtro: 'atrasadas' }),
    tarefasHoje: listarTarefas({ filtro: 'hoje' }),
    tarefasProximas: listarTarefas({ filtro: 'proximas' }),
    aniversariantes: aniversariantes(7),
    vencimentos: vencimentos(30),
    parados: leadsParados(diasParado, 20)
  }
}

export function resumoLembretes(): ResumoLembretes {
  const hoje = dataLocalISO()
  const db = getDb()
  const contar = (sql: string, ...p: unknown[]) => (db.prepare(sql).get(...p) as { n: number }).n
  const base = `SELECT count(*) AS n FROM tarefas t LEFT JOIN leads l ON l.id = t.lead_id AND l.deleted_at IS NULL
                WHERE t.deleted_at IS NULL AND t.concluida = 0 AND (t.lead_id IS NULL OR l.id IS NOT NULL)`
  return {
    atrasadas: contar(`${base} AND t.data_vencimento < ?`, hoje),
    hoje: contar(`${base} AND t.data_vencimento = ?`, hoje),
    aniversariosHoje: aniversariantes(0).length,
    vencimentos7dias: vencimentos(7).filter((v) => v.dias >= 0).length
  }
}
