# Site ricksonmessias.com — Briefing

> Fonte única das decisões do site. Atualize aqui antes de mudar qualquer coisa.
> Aprovado em 14/10/2026, a partir das conversas de planejamento.

## Referências
- **Biografia-mãe:** https://claude.ai/artifact/XwgDARXYnU9QWV289b3pQc (história, bios prontas, lacunas e compliance)
- **Brand book v1.1 · Lobo-guará:** https://claude.ai/artifact/QpSw5755Q1vdSpsxCvgbwV (estratégia, tom de voz, identidade visual)
- **Método de construção:** síntese de 12 vídeos sobre criar sites com Claude Code (ver "Processo" abaixo)

## O que é o site
Portal de análises de Rickson Messias, assessor de investimentos CEA na EQI. Funciona como **vitrine de autoridade**: os artigos ficam em primeiro plano, a história dele sustenta a confiança e há um caminho claro para **agendar uma conversa**.

- **Posicionamento:** o antídoto da ilusão. "Entrei pelo brilho, fiquei pela proteção."
- **Assinatura:** Patrimônio se constrói em décadas.
- **Público:** empresários, profissionais liberais e aposentados/conservadores, mais o público de formação que já acompanha o @ofilhomaisrico.
- **Idioma:** só português.

## Decisões
| Tema | Decisão |
|---|---|
| Objetivo | Vitrine de autoridade com artigos e caminho para agendar conversa |
| Escopo | Home + páginas internas (Sobre mim, Assessoria, Artigos, Livro e palestras) |
| Conteúdo | Análises e artigos autorais, nada de agregador. Começa reaproveitando roteiros do @ofilhomaisrico, do @fraudesltda e da carta mensal, depois material novo |
| Categorias | As 4 do brand book: Proteção, Patrimônio de longo prazo, Grandes mentes e legados, Bastidores do mercado |
| Visual | Sóbrio e elegante, brand book à risca. Movimento só em detalhes (lobo-guará se desenhando, filetes, textos aparecendo ao rolar). Sem vídeo pesado nem rolagem imersiva |
| Publicação | Site estático + painel leve (CMS no navegador que publica no site) |
| Agendamento | Formulário → planilha "Entradas" → CRM Assessor, com aceite LGPD |
| Newsletter | Sim: carta mensal, captura de e-mail → CRM (envio pelas campanhas do CRM) |
| Hospedagem | Hostinger, recomendada (deploy via GitHub). Domínio e hospedagem ainda não comprados |

## Identidade visual (do brand book)
| Cor | Hex | Uso |
|---|---|---|
| Azul-tinta | `#0B1A2C` | Institucional, ~25% |
| Azul-noite | `#1D3350` | Apoio escuro |
| Marfim | `#F5F1E8` | Fundo claro, ~60% |
| Pedra | `#D9D6D0` | Divisões, ~10% |
| Champanhe | `#CBB27A` | Destaque **só sobre escuro**, ~5% |
| Champanhe profundo | `#7A6438` | Destaque sobre marfim |
| Grafite | `#5E6268` | Texto de apoio sobre marfim |
| Aço | `#8C8F94` | Apoio sobre azul-tinta |

- **Tipografia:** Playfair Display (títulos, números, citações; 400 e itálico) + Manrope (texto, interface; 400 e 600 em chapéus). Máximo de duas famílias. Caixa alta só no chapéu. Alinhamento à esquerda, sem hifenização.
- **Símbolo:** lobo-guará facetado diante do sol do cerrado (SVG no brand book). Área de proteção = altura da orelha; mínimo de 120 px na assinatura e 24 px no símbolo.
- **Grafismos:** filete champanhe, malha facetada, arco do sol, horizonte de três linhas, mostrador.
- **Fotografia:** luz natural lateral, fundo azul-tinta ou marfim, roupa sóbria. Nada de maços de dinheiro, pose de guru ou banco de imagem. Imagem de IA nunca simula cliente, pessoa real ou resultado.
- **Gráficos:** séries em azul-tinta, um único destaque em champanhe profundo, eixos finos em pedra, rótulos diretos, fonte e período sempre.

## Linguagem (do brand book)
- Seis princípios: clareza antes de sofisticação; opinião com fundamento; elegância sem distância; respeito ao tempo; proteger antes de vender; verdade antes de efeito.
- **Palavras proibidas:** garantido, sem risco, dinheiro fácil, fique rico rápido, oportunidade única, "o segredo que os bancos escondem", vai explodir, emojis de foguete e de dinheiro.
- **Com cuidado:** jargão sem explicação, previsão sem data e fonte, rentabilidade sem período e risco, promessa de resultado.
- A origem em Curicica é **raiz, não bandeira**. O filme *O Lobo de Wall Street* fica no storytelling pessoal, nunca em peça comercial.
- Fraudes: desmascarar o padrão, não a pessoa; só casos públicos e com fonte; toda peça termina com proteção; nunca vender pelo medo.

## Compliance (obrigatório antes de publicar)
- **Rodapé regulatório** em todas as páginas e artigos:
  > Conteúdo de caráter informativo, que não constitui recomendação de investimento. Rentabilidade passada não é garantia de rentabilidade futura. Rickson Messias é assessor de investimentos [vinculado à EQI Investimentos], nos termos da regulamentação da CVM.
- Validar com o compliance da EQI: o texto do rodapé, a menção à EQI/XP/Bradesco, o botão de agendamento (captação direta) e o uso do nome e da marca da EQI.
- Nunca "250MM geridos" nem "gestão": assessor não faz gestão. Qualquer número de patrimônio assessorado só com fonte e aprovação.
- Casos de clientes que caíram em golpe: sempre genéricos, sem nada que identifique alguém.
- **LGPD:** aceite explícito em todo formulário, página de Política de Privacidade e aviso de cookies se houver analytics.
- O formulário **não pede faixa de patrimônio nem renda**: esses dados não podem passar pela planilha do Google (regra do CRM). Eles são coletados depois, na conversa, e ficam só no banco local criptografado.

## Integração com o CRM Assessor
- Os formulários do site gravam linhas na aba **"Entradas"** da planilha que o CRM já sincroniza. Na próxima sincronização viram leads.
- Os títulos das colunas seguem o que o importador reconhece (`src/main/sync/forms.ts`): Nome, E-mail, WhatsApp, Cidade, Profissão, Como nos conheceu, Mensagem, Aceite LGPD.
- Para diferenciar origem e interesse (Agendamento × Carta mensal × Livro × Palestra), usar a coluna "Como nos conheceu"/"Mensagem" no início. **Melhoria futura no CRM:** importar com origem "Site" e uma tag de interesse, em vez de "Google Forms".

## Processo (método dos vídeos)
1. ✅ Referências e marca definidas (brand book + biografia)
2. ✅ Briefing (este arquivo)
3. ✅ Estrutura em blocos de cada página: `site/ESTRUTURA.md` (aprovada)
4. ✅ Textos finais por bloco: `site/TEXTOS.md`
5. ✅ Direção visual: `site/direcoes/recomendada.html` (abertura noturna + corpo editorial)
6. ✅ Construção completa: `site/web` (ver `site/web/README.md`)
7. Acabamento: versão dedicada ao celular, detalhes discretos de movimento, desempenho (PageSpeed), checklist do brand book
8. Compliance da EQI → compra do domínio e da Hostinger → publicação

## Pendências
- [ ] Fotos do ensaio (retrato + ambiente)
- [ ] Comprar domínio ricksonmessias.com + plano Hostinger
- [ ] Confirmar o vínculo/texto regulatório com o compliance da EQI
- [ ] Telefone/WhatsApp público para o site
- [ ] Criar o e-mail da marca (o site usa contato@ricksonmessias.com como provisório)
- [ ] "[ano]" da visão no brand book
- [ ] Lista dos conteúdos a reaproveitar (roteiros, cartas) para os primeiros artigos
- [ ] Remuneração do assessor (FAQ "Quanto custa"), compartilhamento de dados com a EQI e uso de cookies/analytics

## Fatos confirmados (14/10/2026)
- Custódia: BTG Pactual (conta em nome do cliente).
- Valor mínimo: a partir de R$ 500 mil para investir. Aparece como aviso no formulário, sem perguntar o patrimônio. ⚖️
- Primeira conversa: cerca de 1 hora. Retorno em até 2 dias úteis.
- Eventos: Expert XP 2023 e 2024; Money Week 2026 (Santa Catarina).
- YouTube: @ofilhomaisrico.
- Anos de cada etapa: não entram no site (decisão de Rickson).
- Curso na UFRJ: citar só "Contabilidade na UFRJ", **nunca a situação do curso** (concluído ou não). Não usar "formado" nem "graduado".
