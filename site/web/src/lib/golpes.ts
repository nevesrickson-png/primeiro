/** Perguntas do Detector de golpes: "sim" soma o peso. Baseadas nos padrões das pirâmides e fraudes documentadas. */
export const PERGUNTAS_GOLPE = [
  { pergunta: 'Promete retorno fixo e alto, como se fosse garantido?', peso: 3, sinal: 'Retorno alto e garantido: no mercado, retorno maior sempre vem com risco maior.' },
  { pergunta: 'Diz que não existe risco nenhum?', peso: 3, sinal: 'Ninguém pode afirmar que um investimento não tem risco.' },
  { pergunta: 'O retorno é igual todo mês, sem nunca oscilar, nem em crise?', peso: 2, sinal: 'Constância perfeita foi o disfarce de Madoff por décadas.' },
  { pergunta: 'Paga bônus ou comissão para você trazer novas pessoas?', peso: 3, sinal: 'Ganho por indicação: o dinheiro de quem entra paga quem já está.' },
  { pergunta: 'Pressiona para decidir rápido (“só hoje”, “últimas vagas”)?', peso: 2, sinal: 'Pressa existe para impedir que você pergunte e pesquise.' },
  { pergunta: 'Pede transferência para conta de pessoa física ou carteira cripto de terceiros?', peso: 3, sinal: 'Investimento regular fica em conta no seu nome, em instituição autorizada.' },
  { pergunta: 'A empresa não aparece como autorizada na CVM ou no Banco Central?', peso: 3, sinal: 'Sem autorização, não há fiscalização nem proteção ao investidor.' },
  { pergunta: 'A explicação de como o dinheiro rende é vaga ou complicada demais?', peso: 2, sinal: 'Explicação que ninguém consegue verificar é a embalagem clássica do golpe.' },
  { pergunta: 'Dificulta saques ou cobra “taxa” para liberar o seu dinheiro?', peso: 3, sinal: 'Saque travado ou taxa de liberação é sinal de que o dinheiro já não existe.' },
  { pergunta: 'Você conheceu por grupo, rede social ou influenciador mostrando ganhos?', peso: 1, sinal: 'Prova social (prints de ganhos) é a principal ferramenta de recrutamento.' }
] as const
export const PESO_MAXIMO = PERGUNTAS_GOLPE.reduce((s, q) => s + q.peso, 0)
