/** Dados do site num lugar só. Campos `null` ainda não foram definidos e somem da página. */
export const SITE = {
  nome: 'Rickson Messias',
  url: 'https://ricksonmessias.com',
  titulo: 'Rickson Messias · Assessor de investimentos CEA',
  descricao:
    'Análises sobre patrimônio de longo prazo, as lições dos grandes investidores e como se proteger de fraudes. Por Rickson Messias, assessor de investimentos certificado CEA.',
  assinatura: 'Patrimônio se constrói em décadas.',
  // Provisório até o e-mail da marca existir.
  email: 'contato@ricksonmessias.com',
  // Só dígitos com DDI, ex.: '5521999999999'. null = o WhatsApp não aparece no site.
  whatsapp: null as string | null,
  redes: [
    { nome: 'Instagram', rotulo: '@ofilhomaisrico', url: 'https://instagram.com/ofilhomaisrico' },
    { nome: 'YouTube', rotulo: '@ofilhomaisrico', url: 'https://youtube.com/@ofilhomaisrico' },
    { nome: 'LinkedIn', rotulo: 'Rickson Messias', url: 'https://www.linkedin.com/in/rickson-messias-cea' },
    { nome: '@fraudesltda', rotulo: 'por Rickson Messias', url: 'https://instagram.com/fraudesltda' }
  ],
  // Validar com o compliance da EQI antes de publicar.
  rodapeRegulatorio:
    'Conteúdo de caráter informativo, que não constitui recomendação de investimento. Rentabilidade passada não é garantia de rentabilidade futura. Rickson Messias é assessor de investimentos vinculado à EQI Investimentos, nos termos da regulamentação da CVM.',
  prazoRetorno: 'até 2 dias úteis',
  // Fotos do ensaio: coloque em public/imagens/ e informe o caminho (ex.: '/imagens/retrato.jpg').
  retrato: null as string | null
}

export const FORM_ENDPOINT: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? ''

export const MENU = [
  { rotulo: 'Artigos', href: '/artigos' },
  { rotulo: 'Sobre', href: '/sobre' },
  { rotulo: 'Assessoria', href: '/assessoria' },
  { rotulo: 'Livro e palestras', href: '/livro-e-palestras' }
]

export const CATEGORIAS = {
  protecao: {
    nome: 'Proteção',
    titulo: 'Proteção',
    porque: 'Foi o que me fez ficar no mercado.',
    texto: 'Pirâmides, golpes e promessas que não fecham. Como funcionam e como reconhecer antes de cair.'
  },
  patrimonio: {
    nome: 'Patrimônio',
    titulo: 'Patrimônio de longo prazo',
    porque: 'Transformar renda em patrimônio.',
    texto: 'Alocação, juros compostos, previdência e sucessão, explicados sem jargão.'
  },
  'grandes-mentes': {
    nome: 'Grandes mentes',
    titulo: 'Grandes mentes e legados',
    porque: 'Estudar quem chegou antes.',
    texto: 'Investidores e famílias que construíram em décadas, e o que eles ensinam hoje.'
  },
  bastidores: {
    nome: 'Bastidores',
    titulo: 'Bastidores do mercado',
    porque: 'Quem cuida do que é dos outros não para de aprender.',
    texto: 'Eventos, conversas com gestores e estrategistas, certificações e estudo.'
  }
} as const

export type Categoria = keyof typeof CATEGORIAS
