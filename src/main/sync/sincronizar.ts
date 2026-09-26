import { randomUUID } from 'crypto'
import { getDb, usuarioAtualId } from '../db/connection'
import { obterConfiguracoes, salvarConfiguracao } from '../db/configuracoes'
import { definirTags, registrarEtapa } from '../db/leads'
import { criarTag } from '../db/tags'
import { chamarPonte } from './cliente'
import { importarEntradas, type EntradaForms } from './forms'
import { CABECALHO, CAMPOS_CONTEUDO, COLUNAS_PLANILHA, canonico, deCelula, paraCelula } from './mapeamento'
import type { ResultadoSync } from '@shared/types'

type Linha = Record<string, string>
type LeadLocal = Record<string, unknown> & { id: string; updated_at: string; deleted_at: string | null; tags: string[] }

const titulo = (campo: string) => COLUNAS_PLANILHA.find((c) => c.campo === campo)!.titulo
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const isoValido = (v: string | undefined): string | null => (v && ISO.test(v.trim()) ? v.trim() : null)

let emAndamento = false

function carregarLeadsLocais(): Map<string, LeadLocal> {
  const db = getDb()
  const leads = db.prepare('SELECT * FROM leads').all() as LeadLocal[]
  const tags = db
    .prepare(
      `SELECT lt.lead_id, t.nome FROM lead_tags lt JOIN tags t ON t.id = lt.tag_id AND t.deleted_at IS NULL
       ORDER BY t.nome COLLATE NOCASE`
    )
    .all() as { lead_id: string; nome: string }[]
  const porLead = new Map<string, string[]>()
  for (const t of tags) porLead.set(t.lead_id, [...(porLead.get(t.lead_id) ?? []), t.nome])
  return new Map(leads.map((l) => [l.id, { ...l, tags: porLead.get(l.id) ?? [] }]))
}

/** Lead local → linha da planilha (somente campos permitidos). */
export function linhaDoLead(l: LeadLocal): Linha {
  const r: Linha = {}
  for (const c of COLUNAS_PLANILHA) r[c.titulo] = paraCelula(c.campo, c.campo === 'tags' ? l.tags : l[c.campo])
  return r
}

function diferencas(local: Linha, remoto: Linha): string[] {
  return CAMPOS_CONTEUDO.filter((c) => canonico(c.campo, local[c.titulo]) !== canonico(c.campo, remoto[c.titulo])).map((c) => c.campo)
}

function tagIdsPorNome(nomes: string[]): string[] {
  return nomes.map((n) => criarTag(n, '#64748b').id)
}

/** Aplica os campos da planilha num lead local (existente ou novo). */
function aplicarDaPlanilha(remoto: Linha, local: LeadLocal | undefined, agora: string): void {
  const db = getDb()
  const valores: Record<string, unknown> = {}
  for (const c of CAMPOS_CONTEUDO) {
    if (c.campo === 'tags') continue
    const v = deCelula(c.campo, remoto[c.titulo])
    if (v === undefined) continue // valor inválido na planilha: mantém o local
    if (c.campo === 'nome' && !v) continue
    if (c.campo === 'indicado_por' && v) {
      const existe = db.prepare('SELECT 1 FROM leads WHERE id = ?').get(v)
      if (!existe || v === remoto[titulo('id')]) continue
    }
    valores[c.campo] = c.tipo === 'multi' ? JSON.stringify(v) : v
  }
  const updatedAt = isoValido(remoto.updated_at) ?? agora
  const tags = deCelula('tags', remoto[titulo('tags')]) as string[]

  if (local) {
    const campos = Object.keys(valores)
    db.prepare(`UPDATE leads SET ${campos.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(
      ...campos.map((c) => valores[c]), updatedAt, local.id
    )
    if (valores.etapa && valores.etapa !== local.etapa) registrarEtapa(local.id, local.etapa as string, valores.etapa as string, agora)
    definirTags(local.id, tagIdsPorNome(tags))
  } else {
    const id = remoto[titulo('id')]
    const usuario = usuarioAtualId()
    const etapa = (valores.etapa as string) || 'novo'
    const dados = { ...valores, etapa, nome: valores.nome || 'Sem nome' }
    const colunas = ['id', 'created_at', 'updated_at', 'responsavel_id', 'created_by', ...Object.keys(dados)]
    db.prepare(`INSERT INTO leads (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`).run(
      id, isoValido(remoto.created_at) ?? updatedAt, updatedAt, usuario, usuario, ...Object.values(dados)
    )
    registrarEtapa(id, null, etapa, agora)
    definirTags(id, tagIdsPorNome(tags))
  }
}

function registrarConflitos(logId: string, lead: LeadLocal, local: Linha, remoto: Linha, campos: string[], vencedor: 'local' | 'planilha', agora: string): void {
  const ins = getDb().prepare(
    `INSERT INTO sync_conflitos (id, created_at, updated_at, sync_log_id, lead_id, campo, valor_local, valor_planilha,
       updated_at_local, updated_at_planilha, vencedor, resolvido) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
  )
  for (const campo of campos) {
    ins.run(randomUUID(), agora, agora, logId, lead.id, campo, local[titulo(campo)] ?? '', remoto[titulo(campo)] ?? '', lead.updated_at, remoto.updated_at ?? '', vencedor)
  }
}

export async function sincronizar(): Promise<ResultadoSync> {
  if (emAndamento) throw new Error('Já existe uma sincronização em andamento.')
  const cfg = obterConfiguracoes()
  if (!cfg.sync_url || !cfg.sync_token) throw new Error('Configure a URL e o token da planilha em Configurações → Sincronização.')
  emAndamento = true
  const db = getDb()
  const logId = randomUUID()
  const inicio = new Date().toISOString()
  db.prepare(`INSERT INTO sync_log (id, created_at, updated_at, iniciado_em, status) VALUES (?, ?, ?, ?, 'em_andamento')`).run(logId, inicio, inicio, inicio)
  const r: ResultadoSync = { enviados: 0, recebidos: 0, criadosDaPlanilha: 0, removidosNaPlanilha: 0, importadosForms: 0, duplicadosForms: 0, conflitos: 0, avisos: [] }
  const ponte = <T>(acao: string, dados?: Record<string, unknown>) => chamarPonte<T>(cfg.sync_url, cfg.sync_token, acao, dados)

  try {
    // 1) Respostas do Google Forms → novos leads (antes do espelho, para já subirem nesta rodada).
    const entradas = await ponte<{ existe: boolean; linhas: EntradaForms[] }>('lerEntradas')
    // Sem aba "Entradas" (formulário ainda não criado) não é erro: apenas não há o que importar.
    if (entradas.existe && entradas.linhas.length) {
      const imp = importarEntradas(entradas.linhas)
      r.importadosForms = imp.criados
      r.duplicadosForms = imp.duplicados
      r.avisos.push(...imp.avisos)
      if (imp.marcar.length) await ponte('marcarImportadas', { itens: imp.marcar })
    }

    // 2) Espelho da aba Leads.
    const remoto = await ponte<{ cabecalho: string[]; linhas: Linha[] }>('lerLeads')
    const agora = new Date().toISOString()
    const locais = carregarLeadsLocais()
    const bases = new Map(
      (db.prepare('SELECT lead_id, local_updated_at, planilha_updated_at FROM sync_leads').all() as { lead_id: string; local_updated_at: string; planilha_updated_at: string }[]).map((b) => [b.lead_id, b])
    )
    const remotos = new Map<string, Linha>()
    for (const linha of remoto.linhas) {
      const id = (linha[titulo('id')] ?? '').trim()
      if (!id) continue
      if (remotos.has(id)) {
        r.avisos.push(`Linha duplicada na planilha para o id ${id} (ignorada).`)
        continue
      }
      remotos.set(id, linha)
    }

    const enviar = new Set<string>()
    const novasBases = new Map<string, { local: string; planilha: string }>()

    db.transaction(() => {
      for (const [id, rem] of remotos) {
        const loc = locais.get(id)
        if (!loc) {
          if (rem.deleted_at || !(rem[titulo('nome')] ?? '').trim()) continue
          aplicarDaPlanilha(rem, undefined, agora)
          r.criadosDaPlanilha++
          const upd = isoValido(rem.updated_at) ?? agora
          novasBases.set(id, { local: upd, planilha: rem.updated_at ?? '' })
          continue
        }
        if (loc.deleted_at) {
          enviar.add(id) // exclusão feita no app vence: remove a linha da planilha
          continue
        }
        const linhaLocal = linhaDoLead(loc)
        const difs = diferencas(linhaLocal, rem)
        const base = bases.get(id)
        if (!difs.length) {
          novasBases.set(id, { local: loc.updated_at, planilha: rem.updated_at ?? '' })
          continue
        }
        const mudouLocal = !base || loc.updated_at !== base.local_updated_at
        const mudouPlanilha = !base || (rem.updated_at ?? '') !== base.planilha_updated_at
        let vencedor: 'local' | 'planilha'
        if (mudouLocal && mudouPlanilha) {
          vencedor = (isoValido(rem.updated_at) ?? '') > loc.updated_at ? 'planilha' : 'local'
          registrarConflitos(logId, loc, linhaLocal, rem, difs, vencedor, agora)
          r.conflitos += difs.length
        } else {
          vencedor = mudouPlanilha ? 'planilha' : 'local'
        }
        if (vencedor === 'planilha') {
          aplicarDaPlanilha(rem, loc, agora)
          r.recebidos++
          const upd = isoValido(rem.updated_at) ?? agora
          novasBases.set(id, { local: upd, planilha: rem.updated_at ?? '' })
        } else {
          enviar.add(id)
        }
      }
      // Leads locais ausentes da planilha: novos ou removidos à mão da planilha → (re)envia.
      for (const [id, loc] of locais) {
        if (!remotos.has(id) && !loc.deleted_at) enviar.add(id)
      }
    })()

    // Após aplicar, relê os leads (valores normalizados) e confere se algum recebido ainda difere
    // (ex.: valor inválido na planilha) — nesse caso reenvia para corrigir a célula.
    const atualizados = carregarLeadsLocais()
    for (const [id, b] of novasBases) {
      const rem = remotos.get(id)
      const loc = atualizados.get(id)
      if (rem && loc && diferencas(linhaDoLead(loc), rem).length) enviar.add(id)
      if (loc) b.local = loc.updated_at
    }

    const linhas = [...enviar].map((id) => linhaDoLead(atualizados.get(id)!))
    if (linhas.length) {
      const res = await ponte<{ removidos: number }>('gravarLeads', { cabecalho: CABECALHO, linhas })
      r.removidosNaPlanilha = res.removidos ?? 0
    }
    r.enviados = linhas.filter((l) => !l.deleted_at).length

    // Atualiza as bases somente depois que a planilha confirmou a gravação.
    const upsert = db.prepare(
      `INSERT INTO sync_leads (id, created_at, updated_at, lead_id, local_updated_at, planilha_updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(lead_id) DO UPDATE SET local_updated_at = excluded.local_updated_at,
         planilha_updated_at = excluded.planilha_updated_at, updated_at = excluded.updated_at`
    )
    db.transaction(() => {
      for (const id of enviar) {
        const l = atualizados.get(id)!
        upsert.run(randomUUID(), agora, agora, id, l.updated_at, l.updated_at)
      }
      for (const [id, b] of novasBases) if (!enviar.has(id)) upsert.run(randomUUID(), agora, agora, id, b.local, b.planilha)
    })()

    const fim = new Date().toISOString()
    db.prepare(
      `UPDATE sync_log SET finalizado_em = ?, updated_at = ?, status = ?, enviados = ?, recebidos = ?, importados_forms = ?, conflitos = ?, mensagem = ? WHERE id = ?`
    ).run(fim, fim, r.avisos.length ? 'parcial' : 'sucesso', r.enviados, r.recebidos + r.criadosDaPlanilha, r.importadosForms, r.conflitos, r.avisos.join('\n') || null, logId)
    salvarConfiguracao('sync_ultima', fim)
    return r
  } catch (e) {
    const fim = new Date().toISOString()
    db.prepare(`UPDATE sync_log SET finalizado_em = ?, updated_at = ?, status = 'erro', mensagem = ? WHERE id = ?`).run(fim, fim, (e as Error).message, logId)
    throw e
  } finally {
    emAndamento = false
  }
}
