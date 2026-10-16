/**
 * Seção Mercados: editorias, ativos da faixa de cotações e formatação.
 * Usado pelas páginas (build), pelo navegador (faixa ao vivo) e pela função /api/cotacoes.
 */

export const EDITORIAS = {
  mercados: { nome: 'Mercados', descricao: 'Bolsa, juros, câmbio e o humor do dia.' },
  economia: { nome: 'Economia', descricao: 'Selic, inflação, contas públicas e atividade.' },
  empresas: { nome: 'Empresas', descricao: 'Resultados, dividendos, fusões e governança.' },
  fiis: { nome: 'Fundos imobiliários', descricao: 'Rendimentos, vacância, emissões e gestão.' },
  internacional: { nome: 'Internacional', descricao: 'Fed, Wall Street, China e commodities.' }
} as const
export type Editoria = keyof typeof EDITORIAS
export const LISTA_EDITORIAS = Object.keys(EDITORIAS) as Editoria[]

export type TipoAtivo = 'indice' | 'acao' | 'fii' | 'moeda' | 'cripto' | 'commodity'
export interface AtivoConfig { id: string; rotulo: string; yahoo: string; tipo: TipoAtivo }

/** Ativos fixos da faixa, na ordem em que aparecem. `id` é o código exibido. */
export const ATIVOS: AtivoConfig[] = [
  { id: 'IBOV', rotulo: 'Ibovespa', yahoo: '^BVSP', tipo: 'indice' },
  { id: 'IFIX', rotulo: 'IFIX', yahoo: 'IFIX.SA', tipo: 'indice' },
  { id: 'USDBRL', rotulo: 'Dólar', yahoo: 'BRL=X', tipo: 'moeda' },
  { id: 'EURBRL', rotulo: 'Euro', yahoo: 'EURBRL=X', tipo: 'moeda' },
  { id: 'SPX', rotulo: 'S&P 500', yahoo: '^GSPC', tipo: 'indice' },
  { id: 'NDX', rotulo: 'Nasdaq', yahoo: '^IXIC', tipo: 'indice' },
  { id: 'BRENT', rotulo: 'Petróleo Brent', yahoo: 'BZ=F', tipo: 'commodity' },
  { id: 'BTC', rotulo: 'Bitcoin', yahoo: 'BTC-USD', tipo: 'cripto' },
  { id: 'PETR4', rotulo: 'Petrobras', yahoo: 'PETR4.SA', tipo: 'acao' },
  { id: 'VALE3', rotulo: 'Vale', yahoo: 'VALE3.SA', tipo: 'acao' },
  { id: 'ITUB4', rotulo: 'Itaú', yahoo: 'ITUB4.SA', tipo: 'acao' },
  { id: 'BBAS3', rotulo: 'Banco do Brasil', yahoo: 'BBAS3.SA', tipo: 'acao' },
  { id: 'HGLG11', rotulo: 'CSHG Logística', yahoo: 'HGLG11.SA', tipo: 'fii' },
  { id: 'KNRI11', rotulo: 'Kinea Renda Imob.', yahoo: 'KNRI11.SA', tipo: 'fii' },
  { id: 'MXRF11', rotulo: 'Maxi Renda', yahoo: 'MXRF11.SA', tipo: 'fii' },
  { id: 'XPML11', rotulo: 'XP Malls', yahoo: 'XPML11.SA', tipo: 'fii' }
]

/** Taxas do Banco Central (séries SGS). */
export const TAXAS = [
  { id: 'SELIC', rotulo: 'Selic', serie: 432, unidade: '% a.a.' },
  { id: 'CDI', rotulo: 'CDI', serie: 4389, unidade: '% a.a.' },
  { id: 'IPCA', rotulo: 'IPCA 12 meses', serie: 13522, unidade: '%' }
] as const

/** Código de ativo aceito nas notícias e na API (PETR4, HGLG11, ^BVSP, BRL=X…). */
export const CODIGO_VALIDO = /^[A-Z0-9^=.\-]{1,12}$/

/** Converte um código da B3 (PETR4, HGLG11) para o símbolo do Yahoo (PETR4.SA). */
export function simboloYahoo(codigo: string): string {
  const fixo = ATIVOS.find((a) => a.id === codigo)
  if (fixo) return fixo.yahoo
  return /^[A-Z]{4}\d{1,2}$/.test(codigo) ? `${codigo}.SA` : codigo
}

export function tipoPorCodigo(codigo: string): TipoAtivo {
  const fixo = ATIVOS.find((a) => a.id === codigo)
  if (fixo) return fixo.tipo
  return /^[A-Z]{4}11$/.test(codigo) ? 'fii' : 'acao'
}

export interface Cotacao { id: string; rotulo: string; tipo: TipoAtivo; preco: number; variacao: number; moeda: string }
export interface Taxa { id: string; rotulo: string; valor: number; data: string; unidade: string }
export interface RespostaCotacoes { atualizado: string; ativos: Cotacao[]; taxas: Taxa[]; fonte: string }

const nf = (casas: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
/** Preço com casas adequadas ao tipo: índices sem centavos, câmbio com 4 casas. */
export function formatarPreco(c: Pick<Cotacao, 'tipo' | 'preco' | 'moeda' | 'id'>): string {
  if (c.tipo === 'indice') return nf(0).format(c.preco)
  if (c.tipo === 'moeda') return `R$ ${nf(4).format(c.preco)}`
  if (c.tipo === 'cripto') return `US$ ${nf(0).format(c.preco)}`
  if (c.moeda === 'USD') return `US$ ${nf(2).format(c.preco)}`
  return `R$ ${nf(2).format(c.preco)}`
}
export function formatarVariacao(v: number): string {
  const s = nf(2).format(Math.abs(v))
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${s}%`
}

const TZ = 'America/Sao_Paulo'
/** "16 out 2026 · 17:56" no horário de Brasília. */
export function dataHora(d: Date): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.day} ${String(p.month).replace('.', '')} ${p.year} · ${p.hour}:${p.minute}`
}
export const hora = (d: Date) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(d)
export const dataExtensa = (d: Date) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d)
