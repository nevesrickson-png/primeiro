# Segurança do site — revisão item a item

Revisão feita em outubro de 2026 com base nos 20 itens do vídeo de referência (https://youtu.be/p04Ro1Yj3hg).

O site é **estático**: não tem login, senha, sessão, banco de dados próprio nem upload de arquivos. Por isso boa parte da lista não se aplica: são riscos que o site simplesmente não tem. As partes que recebem dados de fora são três: os formulários (que vão para o Apps Script e a planilha), o Planejador com IA (`functions/api/planejar.ts`) e o painel de artigos (Pages CMS, que entra com a conta do GitHub).

| # | Item do vídeo | Situação | Onde / como |
|---|---|---|---|
| 1 | Forçar HTTPS | ✅ Feito | Cloudflare: HTTPS automático + HSTS em `public/_headers`. Hostinger: redirecionamento e HSTS no `.htaccess`. CSP com `upgrade-insecure-requests`. |
| 2 | Configurar CORS corretamente | ✅ Feito | A função da IA só aceita pedidos vindos do próprio domínio (cabeçalho `Origin`) e não libera CORS para terceiros. |
| 3 | Senhas com hash seguro | ➖ Não se aplica | O site não tem contas nem senhas. O painel de artigos usa o login do GitHub. |
| 4 | Proteger cookies de sessão | ➖ Não se aplica | O site não usa cookies. |
| 5 | Remover segredos do código | ✅ Feito | A chave da Anthropic fica como *Secret* no Cloudflare; `.env` e `.dev.vars` estão no `.gitignore`. O token da sincronização do CRM nunca vai para o site (a ação pública do formulário não usa token). |
| 6 | Validar permissões em cada recurso | ✅ Feito | Só existe uma ação pública (`formularioSite`); todas as outras ações do Apps Script exigem o token secreto do CRM. |
| 7 | Expirar e invalidar sessões | ➖ Não se aplica | Sem sessões. |
| 8 | Configurar RLS | ➖ Não se aplica | Sem banco de dados no site. Os dados ficam na planilha (privada) e no CRM local criptografado. |
| 9 | Rate limit nos endpoints | ✅ Feito | IA: 5 planos por IP por hora + teto diário (com KV `LIMITES`). Formulários: até 30 envios a cada 10 min e 300 por dia, e o mesmo contato no mesmo formulário só é gravado uma vez a cada 10 min (`CacheService` no `Code.gs`). Extra recomendado: no Cloudflare, **Security → WAF → Rate limiting rules** (1 regra grátis) para `/api/*`. |
| 10 | Validar todas as entradas | ✅ Feito | Formulários: tamanho máximo por campo, e-mail validado, aceite LGPD obrigatório, campo-armadilha contra robôs. IA: texto limitado a 1.500 caracteres, números com faixa, JSON validado e resposta da IA conferida campo a campo antes de ir para a tela. |
| 11 | Prevenir SQL injection | ➖ Não se aplica | Sem SQL. Na planilha, valores que começam com `= + - @` são neutralizados (evita "injeção de fórmula"). |
| 12 | Proteger contra XSS | ✅ Feito | Textos de visitantes e da IA são escapados antes de aparecer; CSP sem `unsafe-inline` para scripts (todo JavaScript em arquivo próprio; o único script embutido é liberado por hash). |
| 13 | Proteção contra CSRF | ✅ Feito | Não há sessão para sequestrar; a função da IA confere a origem e só aceita JSON. |
| 14 | Cabeçalhos de segurança | ✅ Feito | `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`. |
| 15 | Restringir tipo e tamanho de upload | ➖ Não se aplica | O site não recebe arquivos. |
| 16 | Não expor detalhes internos nos erros | ✅ Feito | A IA e o formulário respondem mensagens genéricas; o log da função registra só o código do erro, nunca o conteúdo do pedido. |
| 17 | Criptografar dados sensíveis | ✅ Feito | O site não pede patrimônio nem renda. Tráfego sempre em HTTPS. O CRM guarda tudo em banco criptografado. |
| 18 | Dependências atualizadas | ⚠️ Acompanhar | Versões fixas no `package.json`. O `npm audit` aponta alertas no `sharp`/`esbuild`, que só rodam durante o build (não vão para o site publicado). A correção exige migrar para o Astro 7: fazer numa rodada própria, com teste completo. |
| 19 | Backups automáticos | ✅ Feito | O código e os artigos ficam no GitHub (histórico completo). A planilha tem histórico de versões do Google. O CRM faz backup criptografado ao fechar. |
| 20 | Monitoramento e alertas | ⚠️ Configurar no painel | Ativar no Cloudflare: **Notifications** (alertas de tráfego anormal e de falha no deploy) e **Web Analytics** (sem cookies). Na Anthropic: limite de gasto mensal e alerta por e-mail. |

## Para manter

- Mudou o script embutido em `src/layouts/Base.astro`? Gere o novo hash e atualize a CSP em `public/_headers` e `public/.htaccess` (instrução no topo do `_headers`).
- Vai incluir vídeo do YouTube, mapa ou outra fonte externa? Libere o domínio na CSP (`frame-src`, `img-src`…), senão ele não carrega.
- Atualizou o `Code.gs`? Publique uma **nova versão** do App da Web.
- Rode `npm audit` de tempos em tempos e antes de grandes mudanças.
