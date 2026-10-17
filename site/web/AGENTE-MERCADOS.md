# Agente de Mercados: como publicar notícias no site

A seção **Mercados** (`/mercados`) lê as notícias da pasta `site/web/src/content/noticias/`. Cada notícia é um arquivo Markdown. O agente de IA publica criando um arquivo nessa pasta no GitHub; o Cloudflare Pages reconstrói o site sozinho em cerca de 2 minutos.

## 1. Arquivo

- Caminho: `site/web/src/content/noticias/<slug>.md`
- `slug`: minúsculas, sem acento, palavras separadas por hífen, até 80 caracteres e **único**. Sugestão: `AAAA-MM-DD-assunto-curto` (ex.: `2026-10-16-copom-mantem-selic`).
- O endereço da notícia fica `/mercados/<slug>`.

## 2. Cabeçalho (frontmatter)

```yaml
---
titulo: "Copom mantém a Selic em 13,75% e reforça cautela"        # 10 a 140 caracteres
linha_fina: "Comitê indicou vigilância com as expectativas; juros futuros recuaram."  # 20 a 300
editoria: economia          # mercados | economia | empresas | fiis | internacional
data: 2026-10-16T18:10:00-03:00   # data e hora com fuso de Brasília
atualizado: null            # opcional, mesmo formato, quando a notícia for corrigida
autor: Redação              # padrão "Redação"
ia: true                    # true mostra o selo "Produzido com IA" (obrigatório para texto do agente)
tickers: [SELIC]            # até 8 códigos: PETR4, HGLG11, IBOV, IFIX, USDBRL, SELIC, CDI, IPCA…
fontes:                     # pelo menos 1 fonte primária, com link
  - nome: Banco Central do Brasil — comunicado do Copom
    url: https://www.bcb.gov.br/
imagem: null                # opcional: SÓ caminho no próprio site, /imagens/noticias/arquivo.jpg (sem imagem, o site gera uma arte)
imagem_alt: null
imagem_credito: null
destaque: false             # true coloca como manchete da capa (só uma por vez)
urgente: false              # true mostra a etiqueta "Última hora"
rascunho: false             # true = não aparece no site publicado
---
```

Os códigos de `tickers` aparecem como etiquetas com a cotação ao vivo. Ações e FIIs da B3 usam o código normal (`PETR4`, `HGLG11`). Também valem: `IBOV`, `IFIX`, `USDBRL`, `EURBRL`, `SPX`, `NDX`, `BRENT`, `BTC`, `SELIC`, `CDI`, `IPCA`.

## 3. Corpo (Markdown)

1. **Lide** (1º parágrafo): o que aconteceu, quando e por que importa para quem investe.
2. `## O que mudou`: números com fonte e data, comparação com o anterior e com o esperado.
3. `## O que observar`: próximos eventos e riscos.
4. Tabelas Markdown são permitidas (no celular, elas rolam de lado).
5. Tamanho ideal: de 250 a 600 palavras.
6. **Não use HTML ativo** (`<script>`, `<iframe>`, formulários, `onclick=`, links `javascript:`). Uma notícia com isso é retirada do site automaticamente, para proteger contra textos de terceiros com código embutido.

## 4. Regras editoriais (obrigatórias)

- Só fatos verificáveis, sempre com fonte primária em `fontes` (comunicado, fato relevante, release de resultados, IBGE, Banco Central, CVM, B3).
- **Nunca** recomendar compra, venda ou manutenção de ativos, nem preço-alvo próprio. Projeções só citando quem as fez.
- Não copiar textos de outros veículos: escrever com palavras próprias e citar a fonte.
- Sem promessa de rentabilidade, sem sensacionalismo e sem emojis.
- Datas e horas no fuso de Brasília; números no padrão brasileiro (13,75%; R$ 1,2 bilhão).
- Erros: corrigir o texto, preencher `atualizado` e escrever no fim: *"Correção: …"*.
- Recomendação de compliance: comece com `rascunho: true` e aprove pelo painel (seção 6) até ter confiança no agente.

## 5. Como publicar (API do GitHub)

1. No GitHub, crie um **token fine-grained**: Settings → Developer settings → Fine-grained tokens.
   - Repositório: só `nevesrickson-png/primeiro`.
   - Permissão: **Contents: Read and write**.
2. O agente cria o arquivo com uma chamada (o conteúdo vai em Base64):

```bash
curl -X PUT \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/nevesrickson-png/primeiro/contents/site/web/src/content/noticias/2026-10-16-copom-mantem-selic.md \
  -d '{
    "message": "Mercados: Copom mantém a Selic",
    "branch": "claude/wonderful-bell-2bt1o5",
    "content": "<conteúdo do arquivo em Base64>"
  }'
```

- **Imagem:** envie antes o arquivo para `site/web/public/imagens/noticias/<nome>.jpg` com a mesma chamada (conteúdo em Base64) e use `imagem: /imagens/noticias/<nome>.jpg`. Imagens de outros sites são bloqueadas pela política de segurança. Só use imagens com direito de uso.
- Links das `fontes` precisam começar com `https://`.
- Para **editar** uma notícia, faça um GET no mesmo endereço, pegue o `sha` e envie-o junto no PUT.
- Use o branch de produção configurado no Cloudflare. Hoje é `claude/wonderful-bell-2bt1o5`; mude aqui se passar a ser `main`.
- Se o cabeçalho tiver erro (campo faltando, editoria inválida), o build falha e o site continua na versão anterior. Nada quebra no ar, mas a notícia não entra. O motivo aparece no log do deploy no Cloudflare.

## 6. Revisar e aprovar pelo painel

Em https://app.pagescms.org, com a conta do GitHub, abra o repositório e use a coleção **Notícias (Mercados)**. Dá para ler, corrigir e desmarcar `Rascunho` para publicar.

## 7. Cotações

A faixa do topo e os indicadores vêm de `/api/cotacoes` (`functions/api/cotacoes.ts`): Banco Central (Selic, CDI, IPCA) e Yahoo Finance (bolsa, FIIs, câmbio e exterior), com atraso e cache de 5 minutos. Para usar a brapi.dev nas ações e FIIs da B3, cadastre a variável `BRAPI_TOKEN` no Cloudflare. A lista de ativos da faixa fica em `src/lib/mercados.ts` (`ATIVOS`).
