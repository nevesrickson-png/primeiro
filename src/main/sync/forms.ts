import { getDb } from '../db/connection'
import { criarLead } from '../db/leads'
import { criarInteracao } from '../db/interacoes'
import { parseBool, parseData } from './mapeamento'
import { UFS } from '@shared/constants'
import type { LeadInput } from '@shared/types'

export interface EntradaForms {
  linha: number
  conferencia: string
  valores: Record<string, string>
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Descobre o campo do lead a partir do título da pergunta do formulário. */
function campoDaPergunta(titulo: string): string | null {
  const t = norm(titulo)
  if (t.includes('carimbo') || t.includes('timestamp') || t === 'data/hora') return 'carimbo'
  if (t.includes('lgpd') || t.includes('aceite') || t.includes('consent') || t.includes('concordo') || t.includes('privacidade')) return 'lgpd'
  if (t.includes('mail')) return 'email'
  if (t.includes('whats') || t.includes('telefone') || t.includes('celular') || t.includes('fone')) return 'telefone'
  if (t.includes('nome') && !t.includes('indic') && !t.includes('empresa')) return 'nome'
  if (t.includes('cidade')) return 'cidade'
  if (t === 'uf' || t.startsWith('estado') || t.includes('(uf)')) return 'estado'
  if (t.includes('profiss') || t.includes('ocupa')) return 'profissao'
  if (t.includes('empresa')) return 'empresa'
  if (t.includes('conheceu') || t.includes('origem') || t.includes('onde nos')) return 'como_conheceu'
  if (t.includes('mensagem') || t.includes('observa') || t.includes('comentario') || t.includes('duvida')) return 'mensagem'
  return null
}

/** Aceite LGPD: caixa marcada (texto do aceite) ou "sim". */
function aceitou(v: string): boolean {
  const t = norm(v)
  if (!t) return false
  if (/^(nao|n|no|false|0)$/.test(t) || t.startsWith('nao ')) return false
  return parseBool(t) || t.includes('concordo') || t.includes('aceito') || t.includes('li e') || t.length > 3
}

function procurarDuplicado(email: string | null, fone: string | null): { id: string; consentimento_lgpd: number } | undefined {
  const db = getDb()
  if (email) {
    const r = db.prepare('SELECT id, consentimento_lgpd FROM leads WHERE deleted_at IS NULL AND email = ? LIMIT 1').get(email)
    if (r) return r as { id: string; consentimento_lgpd: number }
  }
  if (fone && fone.length >= 10) {
    const fim = fone.slice(-8)
    const r = db
      .prepare(`SELECT id, consentimento_lgpd FROM leads WHERE deleted_at IS NULL AND (substr(telefone, -8) = ? OR substr(whatsapp, -8) = ?) LIMIT 1`)
      .get(fim, fim)
    if (r) return r as { id: string; consentimento_lgpd: number }
  }
  return undefined
}

export function importarEntradas(linhas: EntradaForms[]): {
  criados: number
  duplicados: number
  avisos: string[]
  marcar: { linha: number; conferencia: string; lead_id: string }[]
} {
  const r = { criados: 0, duplicados: 0, avisos: [] as string[], marcar: [] as { linha: number; conferencia: string; lead_id: string }[] }
  const db = getDb()
  db.transaction(() => {
    for (const e of linhas) {
      const d: Record<string, string> = {}
      for (const [pergunta, valor] of Object.entries(e.valores)) {
        const campo = campoDaPergunta(pergunta)
        if (campo && !d[campo]) d[campo] = String(valor ?? '').trim()
      }
      const nome = d.nome?.trim()
      if (!nome) {
        r.avisos.push(`Linha ${e.linha} da aba Entradas sem nome: não importada.`)
        continue
      }
      let fone = (d.telefone ?? '').replace(/\D/g, '')
      if (fone.length > 11 && fone.startsWith('55')) fone = fone.slice(2)
      const email = d.email ? d.email.toLowerCase() : null
      const consentiu = aceitou(d.lgpd ?? '')
      const dataResposta = parseData(d.carimbo ?? '') ?? new Date().toISOString().slice(0, 10)
      const uf = (d.estado ?? '').toUpperCase().trim()

      const dup = procurarDuplicado(email, fone || null)
      if (dup) {
        // Já existe: registra o novo contato no histórico em vez de duplicar o lead.
        criarInteracao({
          lead_id: dup.id,
          tipo: 'outro',
          data: new Date().toISOString(),
          resumo: `Preencheu novamente o formulário de captura (Google Forms)${d.mensagem ? `: "${d.mensagem}"` : '.'}`,
          proximo_passo: 'Retornar o contato'
        })
        if (consentiu && !dup.consentimento_lgpd) {
          db.prepare(`UPDATE leads SET consentimento_lgpd = 1, data_consentimento = ?, base_legal = 'consentimento', updated_at = ? WHERE id = ?`).run(
            dataResposta, new Date().toISOString(), dup.id
          )
        }
        r.duplicados++
        r.marcar.push({ linha: e.linha, conferencia: e.conferencia, lead_id: dup.id })
        continue
      }

      const input: LeadInput = {
        nome, telefone: fone || null, whatsapp: fone || null, email,
        cidade: d.cidade || null, estado: (UFS as readonly string[]).includes(uf) ? uf : null,
        profissao: d.profissao || null, empresa: d.empresa || null, cargo: null, data_nascimento: null,
        estado_civil: null, conjuge: null, filhos: null, instagram: null, linkedin: null, outras_redes: null,
        faixa_patrimonio: null, faixa_renda: null, suitability: 'nao_avaliado', data_suitability: null,
        objetivos: [], horizonte: null, sucessao_notas: null, produtos_interesse: [], hobbies_rapport: null,
        origem: 'google_forms',
        origem_detalhe: d.como_conheceu ? `Formulário de captura · conheceu por: ${d.como_conheceu}` : 'Formulário de captura',
        indicado_por: null, etapa: 'novo', motivo_perda: null, valor_potencial: null,
        consentimento_lgpd: consentiu, data_consentimento: consentiu ? dataResposta : null,
        base_legal: consentiu ? 'consentimento' : null,
        observacoes: d.mensagem ? `Mensagem no formulário: ${d.mensagem}` : null,
        tag_ids: []
      }
      const lead = criarLead(input)
      if (!consentiu) r.avisos.push(`${nome} foi importado sem aceite LGPD — confirme o consentimento antes de contatar.`)
      r.criados++
      r.marcar.push({ linha: e.linha, conferencia: e.conferencia, lead_id: lead.id })
    }
  })()
  return r
}
