import { randomUUID } from 'crypto'
import { getDb, usuarioAtualId } from './connection'
import { dataLocalISO, somarDias } from './datas'
import { TIPOS_TAREFA } from '@shared/constants'
import type { FiltroTarefas, Tarefa, TarefaInput } from '@shared/types'

const SELECT = `
  SELECT t.id, t.lead_id, t.titulo, t.data_vencimento, t.tipo, t.concluida, t.concluida_em,
         t.created_at, t.updated_at, l.nome AS lead_nome
  FROM tarefas t LEFT JOIN leads l ON l.id = t.lead_id AND l.deleted_at IS NULL`

type Linha = Omit<Tarefa, 'concluida'> & { concluida: number }
const converter = (l: Linha): Tarefa => ({ ...l, concluida: l.concluida === 1 })

function validar(t: TarefaInput): TarefaInput {
  const titulo = t.titulo?.trim()
  if (!titulo) throw new Error('Informe o título da tarefa.')
  if (!TIPOS_TAREFA.some((x) => x.value === t.tipo)) throw new Error('Tipo de tarefa inválido.')
  if (t.data_vencimento && !/^\d{4}-\d{2}-\d{2}$/.test(t.data_vencimento)) throw new Error('Data de vencimento inválida.')
  return { ...t, titulo, lead_id: t.lead_id || null, data_vencimento: t.data_vencimento || null }
}

/** Consulta base usada pela tela de tarefas, pela ficha e pela agenda. */
export function listarTarefas(opcoes: { filtro?: FiltroTarefas; lead_id?: string; limite?: number } = {}): Tarefa[] {
  const hoje = dataLocalISO()
  const where = ['t.deleted_at IS NULL', '(t.lead_id IS NULL OR l.id IS NOT NULL)']
  const params: unknown[] = []
  let ordem = `t.concluida, t.data_vencimento IS NULL, t.data_vencimento, t.created_at`
  switch (opcoes.filtro) {
    case 'pendentes':
      where.push('t.concluida = 0')
      break
    case 'atrasadas':
      where.push('t.concluida = 0 AND t.data_vencimento < ?')
      params.push(hoje)
      break
    case 'hoje':
      where.push('t.concluida = 0 AND t.data_vencimento = ?')
      params.push(hoje)
      break
    case 'proximas':
      where.push('t.concluida = 0 AND t.data_vencimento > ? AND t.data_vencimento <= ?')
      params.push(hoje, somarDias(hoje, 7))
      break
    case 'sem_data':
      where.push('t.concluida = 0 AND t.data_vencimento IS NULL')
      break
    case 'concluidas':
      where.push('t.concluida = 1')
      ordem = 't.concluida_em DESC'
      break
  }
  if (opcoes.lead_id) {
    where.push('t.lead_id = ?')
    params.push(opcoes.lead_id)
  }
  const limite = opcoes.limite ? `LIMIT ${Math.floor(opcoes.limite)}` : ''
  return (getDb().prepare(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY ${ordem} ${limite}`).all(...params) as Linha[]).map(converter)
}

function obter(id: string): Tarefa {
  const l = getDb().prepare(`${SELECT} WHERE t.id = ?`).get(id) as Linha | undefined
  if (!l) throw new Error('Tarefa não encontrada.')
  return converter(l)
}

export function criarTarefa(input: TarefaInput): Tarefa {
  const t = validar(input)
  const id = randomUUID()
  const ts = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO tarefas (id, created_at, updated_at, lead_id, titulo, data_vencimento, concluida, tipo, responsavel_id)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .run(id, ts, ts, t.lead_id, t.titulo, t.data_vencimento, t.tipo, usuarioAtualId())
  return obter(id)
}

export function atualizarTarefa(id: string, input: TarefaInput): Tarefa {
  const t = validar(input)
  getDb()
    .prepare(`UPDATE tarefas SET lead_id = ?, titulo = ?, data_vencimento = ?, tipo = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
    .run(t.lead_id, t.titulo, t.data_vencimento, t.tipo, new Date().toISOString(), id)
  return obter(id)
}

export function concluirTarefa(id: string, concluida: boolean): Tarefa {
  const ts = new Date().toISOString()
  getDb()
    .prepare(`UPDATE tarefas SET concluida = ?, concluida_em = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
    .run(concluida ? 1 : 0, concluida ? ts : null, ts, id)
  return obter(id)
}

export function excluirTarefa(id: string): void {
  const ts = new Date().toISOString()
  getDb().prepare('UPDATE tarefas SET deleted_at = ?, updated_at = ? WHERE id = ?').run(ts, ts, id)
}
