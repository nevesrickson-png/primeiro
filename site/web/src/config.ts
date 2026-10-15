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
  // Só dígitos com DDI. Atendido pelo assistente virtual (IA) de Rickson; o site avisa isso.
  whatsapp: '5521992053248' as string | null,
  whatsappRotulo: 'WhatsApp · assistente virtual',
  whatsappMensagem: 'Olá! Vim pelo site ricksonmessias.com e gostaria de falar com o Rickson.',
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
  // Foto do ensaio (public/imagens/retrato-{480,800}.{webp,jpg}). null = painel da marca no lugar.
  retrato: '/imagens/retrato' as string | null,
  // Foto só na página Sobre mim (decisão de Rickson). Avatar dos artigos usa o símbolo.
  avatar: null as string | null
}

export function linkWhatsapp(): string | null {
  if (!SITE.whatsapp) return null
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(SITE.whatsappMensagem)}`
}

export const FORM_ENDPOINT: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? ''

export const MENU = [
  { rotulo: 'Artigos', href: '/artigos' },
  { rotulo: 'Ferramentas', href: '/ferramentas' },
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

/** Ferramentas de planejamento e análise (cálculos no navegador, nada é enviado). */
export const FERRAMENTAS = [
  { slug: 'planejador-ia', grupo: 'Planejar', nome: 'Planejador com IA', pergunta: 'Por onde eu começo?', texto: 'Conte seus objetivos com as suas palavras. A IA organiza as prioridades e transforma tudo em metas, valores e hábitos.', icone: 'faisca' },
  { slug: 'meus-objetivos', grupo: 'Planejar', nome: 'Meus objetivos', pergunta: 'Quando eu realizo o meu objetivo?', texto: 'Viagem, carro, entrada da casa, estudos: quanto guardar por mês e o dia em que você chega lá.', icone: 'alvo' },
  { slug: 'independencia-financeira', grupo: 'Planejar', nome: 'Independência financeira', pergunta: 'Quanto preciso juntar para viver de renda?', texto: 'Calcula o patrimônio necessário e o aporte mensal para a renda que você quer, em valores de hoje.', icone: 'sol' },
  { slug: 'juros-compostos', grupo: 'Planejar', nome: 'Juros compostos', pergunta: 'Quanto meu dinheiro pode virar em décadas?', texto: 'Projeta aportes mensais no tempo e mostra quanto veio do seu bolso e quanto veio dos juros.', icone: 'curva' },
  { slug: 'custo-das-taxas', grupo: 'Comparar', nome: 'O custo das taxas', pergunta: 'Quanto uma taxa de 2% ao ano me custa?', texto: 'Compara a mesma carteira com taxas diferentes. A lição de John Bogle, em reais.', icone: 'taxa' },
  { slug: 'renda-fixa', grupo: 'Comparar', nome: 'CDB × LCI/LCA', pergunta: 'Qual paga mais depois do imposto?', texto: 'Compara títulos tributados e isentos no mesmo prazo e calcula a taxa equivalente.', icone: 'balanca' },
  { slug: 'reserva-de-emergencia', grupo: 'Planejar', nome: 'Reserva de emergência', pergunta: 'De quanto é a minha reserva?', texto: 'Define a meta pelo seu tipo de renda e quanto tempo leva para chegar lá.', icone: 'escudo' },
  { slug: 'financiamento', grupo: 'Decidir', nome: 'Financiamento SAC × Price', pergunta: 'Quanto vou pagar de juros no financiamento?', texto: 'Compara SAC e Price, parcela a parcela, e mostra quanto custa a dívida até o fim.', icone: 'casa' },
  { slug: 'poupanca-ou-cdi', grupo: 'Comparar', nome: 'Poupança × CDB', pergunta: 'A poupança ainda vale a pena?', texto: 'Compara a regra da poupança com um CDB depois do imposto, no mesmo prazo.', icone: 'cofre' },
  { slug: 'a-vista-ou-parcelado', grupo: 'Decidir', nome: 'À vista ou parcelado', pergunta: 'Pago à vista com desconto ou parcelo sem juros?', texto: 'Mostra qual sai mais barato considerando o rendimento do dinheiro e o desconto mínimo que compensa.', icone: 'cartao' },
  { slug: 'poder-de-compra', grupo: 'Decidir', nome: 'Inflação e poder de compra', pergunta: 'Quanto meu dinheiro perde parado?', texto: 'Mostra quanto será preciso no futuro para comprar o mesmo que hoje.', icone: 'termometro' },
  { slug: 'detector-de-golpes', grupo: 'Proteger', nome: 'Detector de golpes', pergunta: 'Essa proposta é confiável?', texto: 'Dez perguntas que separam investimento de pirâmide. Responda antes de transferir qualquer valor.', icone: 'lupa' }
] as const
