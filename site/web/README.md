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

## Colocar no ar (Hostinger)

1. Compre o plano (Premium já basta) e o domínio **ricksonmessias.com**.
2. No hPanel: **Arquivos → Contas FTP**, anote servidor, usuário e senha.
3. No GitHub do repositório: **Settings → Secrets and variables → Actions**
   - *Secrets*: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`
   - *Variables*: `PUBLIC_FORM_ENDPOINT` (URL do App da Web)
4. Rode o workflow **Site** (aba Actions → Site → Run workflow) ou faça qualquer mudança em `site/web` na `main`.
5. No hPanel, ative o **SSL** do domínio. O `.htaccess` já força HTTPS, tira o `www` e usa a página 404 da marca.

Se o FTP da Hostinger já abrir dentro de `public_html`, troque `server-dir` em `.github/workflows/site.yml` para `./`.

## Antes de publicar (pendências)

- [ ] Compliance da EQI: rodapé regulatório, página Assessoria, valor mínimo e política de privacidade.
- [ ] Pergunta "Quanto custa ter um assessor?": entra com a tabela padrão de assessoria que Rickson vai enviar (ver `src/pages/assessoria.astro`).
- [x] WhatsApp (21) 99205-3248, atendido pelo assistente virtual (o site avisa isso no atendimento e na privacidade).
- [x] Foto do ensaio (`public/imagens/retrato-*`, `avatar.*` e `og.png`).
- [ ] E-mail da marca (hoje `contato@ricksonmessias.com`, provisório).
- [ ] Livro: arquivo ainda não recebido; capítulos entram em `src/pages/livro-e-palestras.astro` (lista `capitulos`).
- [ ] Revisar e desmarcar "rascunho" dos primeiros artigos.
