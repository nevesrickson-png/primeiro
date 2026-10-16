# Site ricksonmessias.com

Site estático em [Astro](https://astro.build), com o visual do brand book (Lobo-guará). Decisões, textos e estrutura: `site/BRIEFING.md`, `site/TEXTOS.md` e `site/ESTRUTURA.md`.

## Rodar no computador

```bash
cd site/web
npm install
npm run dev        # http://localhost:4321 (mostra também os rascunhos)
npm run build      # gera o site final em dist/ (sem rascunhos)
```

Para testar os formulários sem a planilha real, rode o simulador da ponte em outro terminal e aponte o site para ele:

```bash
node scripts/simulador-planilha.cjs 8765            # na raiz do repositório
PUBLIC_FORM_ENDPOINT=http://127.0.0.1:8765/exec npm run dev
# o que chegou na aba "Entradas": http://127.0.0.1:8765/planilha
```

## Onde mudar cada coisa

| O quê | Onde |
|---|---|
| E-mail, WhatsApp, redes, rodapé regulatório, foto do retrato | `src/config.ts` |
| Textos das páginas | `src/pages/*.astro` |
| Artigos | `src/content/artigos/*.md` (ou pelo painel, abaixo) |
| Cores, fontes, espaçamentos | `src/styles/global.css` |
| Imagens | `public/imagens/` |

Campos `null` em `src/config.ts` (WhatsApp, retrato) simplesmente não aparecem no site até serem preenchidos.

## Ferramentas (simuladores)

Doze ferramentas em `/ferramentas`, em quatro grupos (Planejar, Comparar, Decidir, Proteger): planejador com IA, meus objetivos, independência financeira, juros compostos, custo das taxas, CDB × LCI/LCA, reserva de emergência, SAC × Price, poupança × CDB, à vista × parcelado, poder de compra (inflação) e detector de golpes. Os cálculos rodam no navegador do visitante (nada é enviado), a simulação fica na URL para compartilhar e o botão "Conversar sobre isso" leva ao agendamento com o assunto preenchido.

Quando a pessoa alcança um objetivo, aparece uma celebração (confete nas cores da marca e um cartão de conquista); as metas mostram barra de progresso com marcos de 25/50/75/100%.

- Cálculos: `src/lib/financas.ts` (testes em `testes/`, rode `npm test`).
- Telas: `src/pages/ferramentas/*.astro`; lógica de cada uma: `src/scripts/ferramentas-paginas.ts`; celebração: `src/scripts/celebracao.ts`.
- Perguntas do detector de golpes: `src/lib/golpes.ts`.
- Lista e textos dos cartões: `FERRAMENTAS` em `src/config.ts`.
- Regras de IR da renda fixa (tabela regressiva) estão em `aliquotaIR`; revise se a lei mudar.

### Planejador com IA

A pessoa descreve os objetivos com as próprias palavras e recebe um plano: metas em ordem de prioridade, quanto guardar por mês em cada uma, o primeiro passo de cada meta, um checklist de hábitos (salvo no navegador, com celebração ao completar) e o balanço "cabe ou não cabe no seu mês". A IA só organiza e prioriza; os valores mensais são recalculados no navegador com `financas.ts`.

- Página: `src/pages/ferramentas/planejador-ia.astro` + `src/scripts/planejador.ts`.
- Servidor: `functions/api/planejar.ts` (Cloudflare Pages Function, SDK oficial da Anthropic, modelo `claude-opus-5-5` com resposta em JSON estruturado). Se o modelo recusar um pedido, a API tenta de novo sozinha num modelo reserva (`fallbacks: "default"`).
- Proteções: só aceita pedidos do próprio site, campo-armadilha, texto limitado a 1.500 caracteres, limite de 5 planos por IP por hora (e teto diário com KV), mensagens de erro genéricas, nada é gravado em log.
- Sem a chave configurada (ou rodando `npm run dev`), a página continua funcionando com o **plano de exemplo**.

Para ativar no Cloudflare Pages: **Settings → Variables and Secrets** → adicione `ANTHROPIC_API_KEY` como *Secret* (a chave vem de console.anthropic.com). Opcional: crie um KV namespace e ligue-o ao projeto com o nome `LIMITES` (**Settings → Bindings**) para o limite valer em todos os servidores. No console da Anthropic, defina um **limite de gasto mensal** para não haver surpresa. Para usar um modelo mais barato, defina `CLAUDE_MODELO`.

Para testar a IA no computador: `npm run build`, crie `site/web/.dev.vars` com `ANTHROPIC_API_KEY=...` (o arquivo não vai para o Git) e rode `npx wrangler pages dev dist`.

## Mercados (notícias e cotações)

Seção `/mercados` em formato de jornal financeiro: faixa de cotações no topo, manchete, últimas, indicadores (Selic, CDI, IPCA, Ibovespa, IFIX, câmbio, S&P 500), tabelas de ações e FIIs, editorias (Mercados, Economia, Empresas, Fundos imobiliários, Internacional), página de cada notícia com os ativos citados e cotação ao vivo, feed RSS (`/mercados/rss.xml`) e chamada para ferramentas e contato.

- Notícias: `src/content/noticias/*.md`, publicadas pelo agente de IA. Formato e regras em **`AGENTE-MERCADOS.md`**. As 8 notícias que vêm no projeto são exemplos em rascunho (não aparecem no site publicado).
- Cotações: `functions/api/cotacoes.ts` (Banco Central + Yahoo Finance, grátis e sem chave; `BRAPI_TOKEN` opcional). Lista de ativos em `src/lib/mercados.ts`.
- Visual: `src/styles/mercados.css`; moldura da seção: `src/layouts/Mercados.astro`.
- Para ver as notícias de exemplo no site publicado, crie no Cloudflare a variável `PUBLIC_MOSTRAR_RASCUNHOS` = `1`, refaça o deploy e depois apague a variável.

## Publicar artigos (painel)

1. Entre em **https://app.pagescms.org** com a conta do GitHub e abra o repositório `primeiro`.
2. Em **Artigos**, crie ou edite. Preencha título, resumo, categoria, data e o texto.
3. Deixe **Rascunho** marcado enquanto revisa. Desmarque para publicar.
4. Salvar grava no GitHub. Na branch `main`, o site é publicado sozinho em ~2 minutos.

Artigos de **Proteção** ganham automaticamente a caixa "Antes de investir"; os "Sinais de alerta" de cada caso são preenchidos no painel. Todo artigo leva o rodapé regulatório. Antes de publicar, passe pelo checklist do brand book (fonte e data em todo número, risco antes do retorno, nenhuma palavra proibida).

## Formulários → CRM

Os quatro formulários (agendar conversa, carta mensal, lista do livro, convite de palestra) enviam para a mesma ponte do Google Apps Script do CRM (`apps-script/Code.gs`, ação pública `formularioSite`). Cada envio vira uma linha na aba **Entradas**; no próximo **Sincronizar** do CRM, vira lead com origem **Site** e o nome do formulário no detalhe da origem.

- O site não pede patrimônio nem renda (dados sensíveis não passam pela planilha).
- Proteções: aceite LGPD obrigatório, campo-armadilha contra robôs, limites de tamanho e neutralização de fórmulas.
- Depois de atualizar o `Code.gs` no Apps Script, publique uma **nova versão** do App da Web (Implantar → Gerenciar implantações → Editar → Nova versão). A URL continua a mesma.
- A URL do App da Web vai na variável `PUBLIC_FORM_ENDPOINT`. Sem ela, os formulários avisam "ainda não conectado" em vez de perder o contato.

## Testar sem complicação

1. **No celular ou computador, sem instalar nada:** com o Cloudflare Pages ligado ao GitHub (passo a passo abaixo), cada envio ao branch `claude/wonderful-bell-2bt1o5` gera um endereço de prévia (`https://claude-wonderful-bell-2bt1o5.<projeto>.pages.dev`; o link também aparece no painel da Cloudflare e no GitHub). É só abrir o link. O branch `main` vira o site oficial.
2. **No computador:** `cd site/web && npm install && npm run dev` e abra `http://localhost:4321`.
3. **Ferramentas:** cada simulação fica no endereço; copie o link para mostrar a alguém exatamente o que você viu.

Comparativo das 10 hospedagens e do domínio: `site/HOSPEDAGEM.md`. Revisão de segurança: `site/SEGURANCA.md`.

## Colocar no ar

O site é **estático**: depois do `npm run build`, são só arquivos HTML, CSS e imagens. Não precisa de servidor Node.js, e por isso pode ficar em hospedagem gratuita.

### Recomendado: Cloudflare Pages (grátis)

Plano gratuito com builds automáticos a partir do GitHub (inclusive repositório privado), HTTPS e domínio próprio.

1. Crie a conta em **dash.cloudflare.com** e vá em **Workers e Pages → Criar → Pages → Conectar ao Git**.
2. Autorize o GitHub e escolha o repositório `primeiro` e o branch do site.
3. Configurações de build:
   - Framework: **Astro**
   - Diretório raiz: `site/web`
   - Comando de build: `npm run build`
   - Diretório de saída: `dist`
   - Variáveis de ambiente: `NODE_VERSION` = `22` e, quando a ponte estiver publicada, `PUBLIC_FORM_ENDPOINT` = URL do App da Web do Apps Script
4. Salvar e implantar. Em ~2 minutos o site fica no ar em `https://<nome-do-projeto>.pages.dev` para testar.
5. Domínio: em **Domínios personalizados**, adicione `ricksonmessias.com`. Se comprar o domínio na própria Cloudflare (Registrar, preço de custo), a ligação é automática; se comprar em outro lugar, aponte os DNS para a Cloudflare.

Cada mudança enviada ao branch (inclusive pelo painel de artigos) publica o site sozinha. Cabeçalhos de segurança e cache: `public/_headers`. O Planejador com IA só funciona aqui (Cloudflare), porque precisa de uma função no servidor.

### Alternativa: Hostinger (pago)

Se preferir a Hostinger, o plano mais simples basta (não precisa do plano com Node.js). O workflow `.github/workflows/site.yml` publica por FTP a cada mudança na `main`:

1. No hPanel: **Arquivos → Contas FTP**, anote servidor, usuário e senha.
2. No GitHub: **Settings → Secrets and variables → Actions** → *Secrets* `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` e *Variables* `PUBLIC_FORM_ENDPOINT`.
3. Rode o workflow **Site** (aba Actions). Ative o SSL no hPanel; o `.htaccess` força HTTPS e usa a página 404 da marca.

Se o FTP já abrir dentro de `public_html`, troque `server-dir` no workflow para `./`.

Na Hostinger o Planejador com IA fica no modo exemplo (a hospedagem compartilhada não roda a função `functions/api/planejar.ts`).

## Antes de publicar (pendências)

- [ ] Compliance da EQI: rodapé regulatório, página Assessoria, valor mínimo e política de privacidade.
- [x] Pergunta "Quanto custa ter um assessor?" e seção Remuneração (tabela padrão EQI, `src/pages/assessoria.astro`). Validar a redação com o compliance.
- [x] WhatsApp (21) 99205-3248, atendido pelo assistente virtual (o site avisa isso no atendimento e na privacidade).
- [x] Foto do ensaio (`public/imagens/retrato-*`, `avatar.*` e `og.png`).
- [ ] E-mail da marca (hoje `contato@ricksonmessias.com`, provisório).
- [x] Livro: *A Revolução dos ETFs* (título, subtítulo e sumário do repositório `livros-`). A capa no site é uma composição da marca; quando a capa nova ficar pronta, ela entra no lugar.
- [ ] Revisar e desmarcar "rascunho" dos primeiros artigos.
