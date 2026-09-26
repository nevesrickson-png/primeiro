import { getDb } from './connection'
import { leadsParados } from './leads'
import { obterConfiguracoes } from './configuracoes'
import { ETAPAS, type Etapa } from '@shared/constants'
import type { DadosPainel, PeriodoPainel, TarefaAtrasada } from '@shared/types'

const ETAPAS_FUNIL = ETAPAS.map((e) => e.value).filter((e) => e !== 'perdido') as Etapa[]
const EM_NEGOCIACAO: Etapa[] = ['novo', 'primeiro_contato', 'reuniao_agendada', 'diagnostico', 'proposta']
const CONVERTIDO_IDX = ETAPAS_FUNIL.indexOf('conta_aberta')

function hojeLocalISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function obterPainel(periodo: PeriodoPainel = 0): DadosPainel {
  const db = getDb()
  const diasParado = Math.max(1, parseInt(obterConfiguracoes().dias_lead_parado, 10) || 15)
  const inicio = periodo ? new Date(Date.now() - periodo * 86_400_000).toISOString() : ''

  // Coorte: leads cadastrados no período (base de origem e conversão).
  const coorte = db
    .prepare(`SELECT id, origem, etapa FROM leads WHERE deleted_at IS NULL AND created_at >= ?`)
    .all(inicio) as { id: string; origem: string | null; etapa: Etapa }[]

  // Etapa mais avançada que cada lead da coorte já alcançou (pelo histórico e pela etapa atual).
  const maxIdx = new Map<string, number>()
  for (const l of coorte) maxIdx.set(l.id, ETAPAS_FUNIL.indexOf(l.etapa))
  const hist = db
    .prepare(
      `SELECT h.lead_id, h.etapa_para FROM historico_etapas h JOIN leads l ON l.id = h.lead_id
       WHERE h.deleted_at IS NULL AND l.deleted_at IS NULL AND l.created_at >= ?`
    )
    .all(inicio) as { lead_id: string; etapa_para: Etapa }[]
  for (const h of hist) {
    const i = ETAPAS_FUNIL.indexOf(h.etapa_para)
    if (i > (maxIdx.get(h.lead_id) ?? -1)) maxIdx.set(h.lead_id, i)
  }
  const conversao = ETAPAS_FUNIL.map((etapa, i) => ({
    etapa,
    qtd: coorte.filter((l) => (maxIdx.get(l.id) ?? 0) >= i).length
  }))
  const convertido = (id: string) => (maxIdx.get(id) ?? 0) >= CONVERTIDO_IDX

  const origens = new Map<string, { qtd: number; convertidos: number }>()
  for (const l of coorte) {
    const k = l.origem ?? 'sem_origem'
    const o = origens.get(k) ?? { qtd: 0, convertidos: 0 }
    o.qtd++
    if (convertido(l.id)) o.convertidos++
    origens.set(k, o)
  }
  const porOrigem = [...origens.entries()].map(([origem, v]) => ({ origem, ...v })).sort((a, b) => b.qtd - a.qtd)

  // Fotografia atual do funil (independe do período).
  const atuais = db
    .prepare(`SELECT etapa, count(*) AS qtd, coalesce(sum(valor_potencial), 0) AS valor FROM leads WHERE deleted_at IS NULL GROUP BY etapa`)
    .all() as { etapa: Etapa; qtd: number; valor: number }[]
  const mapaAtual = new Map(atuais.map((a) => [a.etapa, a]))
  const potencialPorEtapa = ETAPAS.map((e) => ({
    etapa: e.value as Etapa,
    qtd: mapaAtual.get(e.value)?.qtd ?? 0,
    valor: mapaAtual.get(e.value)?.valor ?? 0
  }))

  // Novos leads nos últimos 12 meses (mês no fuso local).
  const hoje = new Date()
  const meses: { mes: string; qtd: number }[] = []
  for (let k = 11; k >= 0; k--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - k, 1)
    meses.push({ mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, qtd: 0 })
  }
  const inicio12 = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1).toISOString()
  const criados = db.prepare(`SELECT created_at FROM leads WHERE deleted_at IS NULL AND created_at >= ?`).all(inicio12) as { created_at: string }[]
  for (const c of criados) {
    const d = new Date(c.created_at)
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const m = meses.find((x) => x.mes === chave)
    if (m) m.qtd++
  }

  const parados = leadsParados(diasParado, 50)

  const tarefasAtrasadas = db
    .prepare(
      `SELECT t.id, t.titulo, t.data_vencimento, t.lead_id, l.nome AS lead_nome
       FROM tarefas t LEFT JOIN leads l ON l.id = t.lead_id AND l.deleted_at IS NULL
       WHERE t.deleted_at IS NULL AND t.concluida = 0 AND t.data_vencimento IS NOT NULL AND t.data_vencimento < ?
       ORDER BY t.data_vencimento`
    )
    .all(hojeLocalISO()) as TarefaAtrasada[]

  const soma = (etapas: Etapa[], campo: 'qtd' | 'valor') =>
    potencialPorEtapa.filter((p) => etapas.includes(p.etapa)).reduce((s, p) => s + p[campo], 0)

  return {
    periodo,
    diasParado,
    kpis: {
      totalLeads: potencialPorEtapa.reduce((s, p) => s + p.qtd, 0),
      novosNoPeriodo: coorte.length,
      emNegociacao: soma(EM_NEGOCIACAO, 'qtd'),
      potencialFunil: soma(EM_NEGOCIACAO, 'valor'),
      clientesAtivos: mapaAtual.get('cliente_ativo')?.qtd ?? 0,
      taxaConversao: coorte.length ? coorte.filter((l) => convertido(l.id)).length / coorte.length : null,
      parados: parados.total,
      tarefasAtrasadas: tarefasAtrasadas.length
    },
    porOrigem,
    conversao,
    perdidos: coorte.filter((l) => l.etapa === 'perdido').length,
    potencialPorEtapa,
    novosPorMes: meses,
    parados: parados.leads,
    tarefasAtrasadas
  }
}
