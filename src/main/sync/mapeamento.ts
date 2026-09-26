import {
  BASES_LEGAIS, ESTADOS_CIVIS, ETAPAS, HORIZONTES, OBJETIVOS, ORIGENS, PRODUTOS, type Opcao
} from '@shared/constants'

/**
 * Colunas da aba "Leads". Os valores vão em formato legível (rótulos, dd/mm/aaaa,
 * telefone com máscara, R$) para permitir edição na planilha.
 *
 * NUNCA sincronizados (ficam só no banco local criptografado):
 * faixa_patrimonio, faixa_renda, suitability, data_suitability, sucessao_notas e aplicações.
 */
export const COLUNAS_PLANILHA: { campo: string; titulo: string; tipo: TipoColuna; opcoes?: readonly Opcao[] }[] = [
  { campo: 'id', titulo: 'id', tipo: 'texto' },
  { campo: 'nome', titulo: 'Nome', tipo: 'texto' },
  { campo: 'telefone', titulo: 'Telefone', tipo: 'telefone' },
  { campo: 'whatsapp', titulo: 'WhatsApp', tipo: 'telefone' },
  { campo: 'email', titulo: 'E-mail', tipo: 'email' },
  { campo: 'cidade', titulo: 'Cidade', tipo: 'texto' },
  { campo: 'estado', titulo: 'UF', tipo: 'uf' },
  { campo: 'profissao', titulo: 'Profissão', tipo: 'texto' },
  { campo: 'empresa', titulo: 'Empresa', tipo: 'texto' },
  { campo: 'cargo', titulo: 'Cargo', tipo: 'texto' },
  { campo: 'data_nascimento', titulo: 'Nascimento', tipo: 'data' },
  { campo: 'estado_civil', titulo: 'Estado civil', tipo: 'opcao', opcoes: ESTADOS_CIVIS },
  { campo: 'conjuge', titulo: 'Cônjuge', tipo: 'texto' },
  { campo: 'filhos', titulo: 'Filhos', tipo: 'texto' },
  { campo: 'instagram', titulo: 'Instagram', tipo: 'texto' },
  { campo: 'linkedin', titulo: 'LinkedIn', tipo: 'texto' },
  { campo: 'outras_redes', titulo: 'Outras redes', tipo: 'texto' },
  { campo: 'objetivos', titulo: 'Objetivos', tipo: 'multi', opcoes: OBJETIVOS },
  { campo: 'horizonte', titulo: 'Horizonte', tipo: 'opcao', opcoes: HORIZONTES },
  { campo: 'produtos_interesse', titulo: 'Produtos de interesse', tipo: 'multi', opcoes: PRODUTOS },
  { campo: 'hobbies_rapport', titulo: 'Hobbies e rapport', tipo: 'texto' },
  { campo: 'origem', titulo: 'Origem', tipo: 'opcao', opcoes: ORIGENS },
  { campo: 'origem_detalhe', titulo: 'Detalhe da origem', tipo: 'texto' },
  { campo: 'indicado_por', titulo: 'Indicado por (id)', tipo: 'texto' },
  { campo: 'etapa', titulo: 'Etapa', tipo: 'opcao', opcoes: ETAPAS },
  { campo: 'motivo_perda', titulo: 'Motivo da perda', tipo: 'texto' },
  { campo: 'valor_potencial', titulo: 'Valor potencial', tipo: 'moeda' },
  { campo: 'consentimento_lgpd', titulo: 'Consentimento LGPD', tipo: 'bool' },
  { campo: 'data_consentimento', titulo: 'Data do consentimento', tipo: 'data' },
  { campo: 'base_legal', titulo: 'Base legal', tipo: 'opcao', opcoes: BASES_LEGAIS },
  { campo: 'tags', titulo: 'Tags', tipo: 'tags' },
  { campo: 'observacoes', titulo: 'Observações', tipo: 'texto' },
  { campo: 'created_at', titulo: 'created_at', tipo: 'texto' },
  { campo: 'updated_at', titulo: 'updated_at', tipo: 'texto' },
  { campo: 'deleted_at', titulo: 'deleted_at', tipo: 'texto' }
]

type TipoColuna = 'texto' | 'telefone' | 'email' | 'uf' | 'data' | 'opcao' | 'multi' | 'moeda' | 'bool' | 'tags'

/** Campos de conteúdo comparados/aplicados (sem os técnicos). */
export const CAMPOS_CONTEUDO = COLUNAS_PLANILHA.filter((c) => !['id', 'created_at', 'updated_at', 'deleted_at'].includes(c.campo))

/** Campos que jamais podem aparecer na planilha (verificado em teste). */
export const CAMPOS_PROIBIDOS = ['faixa_patrimonio', 'faixa_renda', 'suitability', 'data_suitability', 'sucessao_notas']

export const CABECALHO = COLUNAS_PLANILHA.map((c) => c.titulo)

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

function opcaoPorTexto(opcoes: readonly Opcao[], texto: string): string | null {
  const t = semAcento(texto)
  if (!t) return null
  return opcoes.find((o) => semAcento(o.label) === t || semAcento(o.value) === t)?.value ?? null
}

const p2 = (n: number) => String(n).padStart(2, '0')
const fmtNum = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatarTelefone(d: string | null): string {
  if (!d) return ''
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

export function parseData(v: string): string | null {
  const t = v.trim()
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t)
  if (m) return `${m[3]}-${p2(Number(m[2]))}-${p2(Number(m[1]))}`
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

export function parseMoeda(v: string): number | null {
  let t = v.replace(/R\$|\s| /g, '')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if (!/^\d+(\.\d{1,2})?$/.test(t)) t = t.replace(/\./g, '')
  const n = Number(t)
  return isNaN(n) ? null : n
}

export function parseBool(v: string): boolean {
  return /^(sim|s|true|1|x|verdadeiro|aceito|yes)$/i.test(semAcento(v))
}

/** Valor local (como está no banco) → texto da célula. */
export function paraCelula(campo: string, valor: unknown): string {
  const col = COLUNAS_PLANILHA.find((c) => c.campo === campo)!
  if (valor === null || valor === undefined || valor === '') return col.tipo === 'bool' ? 'Não' : ''
  switch (col.tipo) {
    case 'telefone':
      return formatarTelefone(String(valor))
    case 'data': {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor))
      return m ? `${m[3]}/${m[2]}/${m[1]}` : String(valor)
    }
    case 'opcao':
      return col.opcoes!.find((o) => o.value === valor)?.label ?? String(valor)
    case 'multi': {
      const arr: string[] = Array.isArray(valor) ? valor : JSON.parse(String(valor) || '[]')
      return arr.map((v) => col.opcoes!.find((o) => o.value === v)?.label ?? v).join(', ')
    }
    case 'moeda':
      return `R$ ${fmtNum.format(Number(valor))}`
    case 'bool':
      return valor === 1 || valor === true ? 'Sim' : 'Não'
    case 'tags':
      return (valor as string[]).join(', ')
    default:
      return String(valor)
  }
}

/** Texto da célula → valor local. Devolve `undefined` quando o texto é inválido (mantém o valor local). */
export function deCelula(campo: string, texto: string | undefined): unknown {
  const col = COLUNAS_PLANILHA.find((c) => c.campo === campo)!
  const t = (texto ?? '').trim()
  switch (col.tipo) {
    case 'telefone': {
      let d = t.replace(/\D/g, '')
      if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
      return d || null
    }
    case 'email':
      return t ? t.toLowerCase() : null
    case 'uf':
      return t ? t.toUpperCase().slice(0, 2) : null
    case 'data':
      return t ? parseData(t) ?? undefined : null
    case 'opcao': {
      if (!t) return campo === 'etapa' ? undefined : null
      return opcaoPorTexto(col.opcoes!, t) ?? undefined
    }
    case 'multi':
      return t
        .split(/[,;]/)
        .map((x) => opcaoPorTexto(col.opcoes!, x))
        .filter((x): x is string => !!x)
    case 'moeda':
      return t ? parseMoeda(t) ?? undefined : null
    case 'bool':
      return parseBool(t) ? 1 : 0
    case 'tags':
      return [...new Set(t.split(/[,;]/).map((x) => x.trim()).filter(Boolean))]
    default:
      return t || null
  }
}

/** Forma canônica (texto de célula) usada para comparar local × planilha sem falsos conflitos de formatação. */
export function canonico(campo: string, texto: string | undefined): string {
  const v = deCelula(campo, texto)
  if (v === undefined) return `inválido:${(texto ?? '').trim()}`
  const col = COLUNAS_PLANILHA.find((c) => c.campo === campo)!
  if (col.tipo === 'multi' || col.tipo === 'tags') return [...(v as string[])].map((x) => x.toLowerCase()).sort().join('|')
  return v === null ? '' : String(v)
}
