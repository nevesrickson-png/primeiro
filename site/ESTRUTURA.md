# Site ricksonmessias.com — Estrutura em blocos (wireframe)

> Etapa 3 do processo: **só estrutura, sem design**. Para cada página, os blocos em ordem, o que cada um diz, o elemento visual previsto e a ação. Aprove, corte ou reordene antes de passarmos ao visual.
> Textos entre aspas são rascunhos de direção, não a copy final. Regras de tom e compliance: `site/BRIEFING.md`.

## Mapa do site

```
ricksonmessias.com
├── /                      Home
├── /sobre                 Sobre mim
├── /assessoria            Assessoria (com formulário de agendamento)
├── /artigos               Artigos (lista + filtro por categoria)
│   ├── /artigos/protecao
│   ├── /artigos/patrimonio
│   ├── /artigos/grandes-mentes
│   ├── /artigos/bastidores
│   └── /artigos/<titulo>  Página de artigo (modelo)
├── /livro-e-palestras     Livro e palestras
├── /privacidade           Política de privacidade (LGPD)
├── /obrigado              Confirmação após formulário
└── /404                   Página não encontrada
```

---

## Elementos globais (todas as páginas)

### Cabeçalho
- Assinatura horizontal (lobo-guará + RICKSON MESSIAS) à esquerda.
- Menu: Artigos · Sobre · Assessoria · Livro e palestras.
- Botão à direita: **Agendar conversa** → /assessoria#agendar.
- No celular: menu recolhido; o botão continua visível.
- Fixo ao rolar, compacto, fundo marfim com filete pedra embaixo.

### Rodapé (fundo azul-tinta)
1. Assinatura + frase "Patrimônio se constrói em décadas." (Playfair itálico, champanhe).
2. **Carta mensal:** campo de e-mail + aceite LGPD + botão "Receber a carta".
3. Três colunas de links: Navegação | Redes (@ofilhomaisrico, YouTube, LinkedIn, @fraudesltda "por Rickson Messias") | Contato (e-mail, WhatsApp).
4. Horizonte de três linhas (grafismo) separando a área legal.
5. **Rodapé regulatório** (texto completo do briefing) + link Política de privacidade + © ano.

---

## 1. Home `/`
Objetivo: em 10 segundos, quem é, por que confiar e o que ler agora. Artigos em primeiro plano.

| # | Bloco | Conteúdo | Visual | Ação |
|---|---|---|---|---|
| 1 | **Abertura (hero)** | Chapéu "Assessor de investimentos · CEA". Título "Patrimônio se constrói em décadas." Linha de apoio: "Análises sobre patrimônio de longo prazo, grandes investidores e proteção contra fraudes." | Fundo azul-tinta; o lobo-guará facetado se desenha em traço champanhe e o arco do sol surge atrás (a única animação de destaque do site). Foto do ensaio à direita quando existir. | Primário: **Ler as análises** (rola até o bloco 2). Secundário: **Agendar conversa** |
| 2 | **Análises recentes** | 1 artigo em destaque (grande) + 3 a 5 recentes em lista: categoria, título, resumo de 1 linha, data, tempo de leitura | Fundo marfim; cartões sóbrios com filete champanhe profundo no topo do destaque | Ver todos os artigos |
| 3 | **Quatro territórios** | As 4 categorias com a frase do "porquê" do brand book: Proteção ("Foi o que me fez ficar no mercado."), Patrimônio, Grandes mentes, Bastidores | Linha de 4 colunas numeradas 01–04 em Playfair | Cada um leva à categoria |
| 4 | **Quem escreve** | Retrato + 50 palavras: "Entrei no mercado pelo brilho. Fiquei pela proteção." + CEA, Bradesco → Rico → EQI | Duas colunas: foto e texto; citação em Playfair itálico | Conhecer minha história → /sobre |
| 5 | **Proteção contra fraudes** | "Toda pirâmide promete a mesma coisa. Veja o padrão." 3 sinais de alerta curtos + link para artigos de Proteção e para o @fraudesltda | Fundo azul-tinta; malha facetada discreta ao fundo | Ler sobre proteção |
| 6 | **Pilares** | Paciência · Profundidade · Proteção, uma frase cada | Três linhas horizontais com filete pedra (como no brand book) | Nenhuma (respiro) |
| 7 | **Convite para a conversa** | "Quanto tempo você levou para construir o que tem?" + para quem é (empresários, profissionais liberais, aposentados) + o que acontece na primeira conversa | Bloco marfim mais escuro, arco do sol emoldurando a pergunta | **Agendar conversa** |
| 8 | **Livro** | *O Poder dos ETF's*: 2 linhas + "em breve" | Capa (ou mockup) + texto | Entrar na lista de espera |
| — | Rodapé global | (com carta mensal) | | |

---

## 2. Sobre mim `/sobre`
Objetivo: confiança pela história, sem tom de pena (raiz, não bandeira). Base: "Sobre mim" e "Biografia completa" da biografia-mãe.

| # | Bloco | Conteúdo | Visual | Ação |
|---|---|---|---|---|
| 1 | **Abertura** | "Entrei no mercado financeiro pelo brilho. Fiquei pela proteção." | Retrato grande, fundo azul-tinta, título em Playfair | — |
| 2 | **A história** | Texto "Sobre mim" em primeira pessoa (Curicica, a professora, as aulas no ensino médio, o filme, os amigos e as pirâmides, o banco, o ofício) | Coluna de leitura estreita, intertítulos em Playfair itálico | — |
| 3 | **Linha do tempo** | Origem → Burle Marx → Colégio QI → UFRJ → jovem aprendiz → estágios → Bradesco (CEA em 9 meses) → PAAP/B7 → Rico → EQI | Linha vertical com marcos; cada marco revela ao rolar | — |
| 4 | **O que me move** | Pai; o filho e o legado; "como se fosse o único que eu tenho" | Citação grande, arco do sol | — |
| 5 | **Valores** | Os cinco: Integridade, Cuidado, Estudo contínuo, Longo prazo, Legado | 5 cartões numerados | — |
| 6 | **Formação e certificações** | CEA (Anbima), UFRJ (Contabilidade, sem citar situação do curso), PAAP, CFP em preparação, 3–7 h de estudo por semana, eventos (Expert XP 2023 e 2024, Money Week 2026) | Lista limpa com o mostrador (selo) | — |
| 7 | **Onde me acompanhar** | @ofilhomaisrico, YouTube, LinkedIn, @fraudesltda | Linha de links com ícones simples | Seguir |
| 8 | **Convite** | "Se fizer sentido para você, vamos conversar." | Faixa simples | Agendar conversa |

---

## 3. Assessoria `/assessoria`
Objetivo: explicar o trabalho com clareza e converter em agendamento. **Página que mais precisa de validação do compliance.**

| # | Bloco | Conteúdo | Visual | Ação |
|---|---|---|---|---|
| 1 | **Abertura** | "Primeiro proteger, depois crescer." + proposta de valor em 1 frase | Fundo azul-tinta | Agendar conversa (âncora) |
| 2 | **Para quem** | Empresários · Profissionais liberais · Aposentados e conservadores, com a dor de cada um (texto do brand book) | 3 cartões | — |
| 3 | **Como trabalho** | 4 passos: conversa inicial → diagnóstico e perfil (suitability) → estratégia diversificada → acompanhamento próximo e revisões | Passos numerados em linha, filete champanhe | — |
| 4 | **Diferenciais** | Cuidado de quem construiu · Profundidade técnica · Olho treinado contra fraudes · Tecnologia própria | 4 colunas numeradas | — |
| 5 | **O que você pode esperar** | Atendimento próximo, explicação clara, riscos ditos antes do retorno. **Sem promessa de rentabilidade.** | Lista curta em duas colunas | — |
| 6 | **Perguntas frequentes** | Quanto custa? Como funciona o vínculo com a EQI? Preciso de um valor mínimo? Meu dinheiro fica onde? Como é a primeira conversa? (respostas validadas pelo compliance) | Acordeão | — |
| 7 | **Agendar conversa** `#agendar` | Formulário: Nome · E-mail · WhatsApp · Cidade · Profissão · "Você é…" (empresário / profissional liberal / aposentado / outro) · "O que você gostaria de conversar?" (Mensagem) · Como me conheceu · ☐ Aceite LGPD | Formulário em marfim, botão azul-tinta | Enviar → /obrigado |
| 8 | **Rodapé regulatório reforçado** | Texto completo + vínculo com a EQI | — | — |

> O formulário **não pede patrimônio nem renda** (ver briefing). Esses dados vêm na conversa e ficam só no CRM.

---

## 4. Artigos `/artigos` e categorias
Objetivo: biblioteca de autoridade fácil de navegar.

| # | Bloco | Conteúdo | Visual | Ação |
|---|---|---|---|---|
| 1 | **Abertura** | "Análises" + 1 linha: "Patrimônio, grandes investidores e proteção, com fonte, data e risco." | Fundo marfim, título grande | — |
| 2 | **Filtro por categoria** | Todas · Proteção · Patrimônio · Grandes mentes · Bastidores | Abas/pílulas discretas | Filtra a lista |
| 3 | **Destaque** | Último artigo (ou um fixado) | Cartão largo | Ler |
| 4 | **Lista** | Cartões: categoria, título, resumo, data, tempo de leitura; paginação | Grade de 2–3 colunas (1 no celular) | Ler |
| 5 | **Carta mensal** | "Receba a carta mensal" | Faixa azul-tinta | Inscrever |

Cada categoria (`/artigos/protecao` etc.) usa o mesmo modelo, com a frase do "porquê" daquele território na abertura.

---

## 5. Página de artigo (modelo)
| # | Bloco | Conteúdo | Visual | Ação |
|---|---|---|---|---|
| 1 | **Cabeçalho do artigo** | Categoria (chapéu) · Título · Subtítulo · Data · Tempo de leitura · Autor | Coluna de leitura | — |
| 2 | **Imagem de capa** (opcional) | Foto ou imagem de IA dentro das regras do brand book | Largura da coluna | — |
| 3 | **Texto** | Conclusão no início ("Em resumo"), corpo, intertítulos, citações, gráficos com fonte e período | Tipografia editorial confortável, ~70 caracteres por linha | — |
| 4 | **Se for sobre fraude** | Caixa fixa "Sinais de alerta" + "O que fazer antes de investir" (regra do brand book) | Caixa com filete champanhe | — |
| 5 | **Rodapé regulatório do artigo** | Texto completo | Texto pequeno em grafite | — |
| 6 | **Sobre o autor** | Mini-bio de uma linha + foto | Faixa | Sobre mim |
| 7 | **Carta mensal** | Caixa de inscrição | — | Inscrever |
| 8 | **Leia também** | 3 artigos da mesma categoria | Cartões | Ler |
| 9 | **Conversa** (discreto) | "Quer olhar isso para o seu caso? Vamos conversar." | Linha simples | Agendar |
| — | Compartilhar | WhatsApp · LinkedIn · copiar link | Ícones pequenos | — |

---

## 6. Livro e palestras `/livro-e-palestras`
| # | Bloco | Conteúdo | Visual | Ação |
|---|---|---|---|---|
| 1 | **O livro** | *O Poder dos ETF's: a única estratégia de investimento realmente comprovada*. O que é: a história dos fundos de índice, de Markowitz e Bogle ao primeiro ETF da B3 | Capa/mockup + texto | — |
| 2 | **O que você vai encontrar** | Sumário resumido (8 capítulos) | Lista numerada em Playfair | — |
| 3 | **Lista de espera** | Nome · E-mail · ☐ LGPD | Formulário curto | Entrar na lista |
| 4 | **Palestras** | Tema central: "Como reconhecer e se proteger de fraudes financeiras", com a apresentação de palestrante (texto da biografia) | Foto em evento quando existir | — |
| 5 | **Eventos e participações** | Expert XP, Money Week (com anos, quando confirmados) | Lista com o mostrador | — |
| 6 | **Convidar para palestrar** | Nome · E-mail · WhatsApp · Empresa/evento · Mensagem · ☐ LGPD | Formulário | Enviar convite |

---

## 7. Páginas de apoio
- **/privacidade:** quais dados são coletados (formulários), para quê (contato, carta mensal), onde ficam (planilha Google → CRM local criptografado), por quanto tempo, como pedir exclusão, contato do responsável. Texto a validar.
- **/obrigado:** confirmação, o que acontece agora ("Respondo em até [__] dias úteis"), 3 artigos para ler enquanto isso.
- **/404:** "Este caminho não existe, mas o horizonte continua lá." Lobo-guará olhando o horizonte + links para Home e Artigos.

---

## Formulários → CRM (resumo)
| Formulário | Onde aparece | Campos | No CRM |
|---|---|---|---|
| Agendar conversa | /assessoria, botões em todo o site | Nome, E-mail, WhatsApp, Cidade, Profissão, Perfil, Mensagem, Como conheceu, LGPD | Lead novo, etapa "novo", mensagem = interesse |
| Carta mensal | Rodapé, artigos, /artigos | E-mail (+ nome opcional), LGPD | Lead com tag "carta mensal" (melhoria no CRM) |
| Lista do livro | /livro-e-palestras, Home | Nome, E-mail, LGPD | Lead com tag "livro" |
| Convite de palestra | /livro-e-palestras | Nome, E-mail, WhatsApp, Empresa, Mensagem, LGPD | Lead com tag "palestra" |

---

## Para você decidir nesta revisão
1. A Home abre com **artigos** (bloco 2) logo após o hero. Concorda ou prefere a história antes?
2. O **bloco de fraudes na Home** fica (é o diferencial mais forte) ou vai só para os artigos?
3. **Perguntas frequentes da Assessoria:** as 5 perguntas fazem sentido? Quer incluir alguma?
4. Formulário de agendamento: o campo **"Você é…"** ajuda a qualificar sem pedir patrimônio. Ok?
5. Algo que falta ou que você cortaria?
