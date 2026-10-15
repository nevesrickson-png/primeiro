# Hospedagem e domínio: 10 opções com custo-benefício

Pesquisa de outubro de 2026. Preços mudam: confira no site de cada empresa antes de contratar. Valores em dólar convertidos de forma aproximada.

**O que o site precisa:** hospedar arquivos estáticos (HTML, CSS, imagens) e, para o Planejador com IA, rodar uma pequena função no servidor (`functions/api/planejar.ts`). Não precisa de servidor Node.js ligado o tempo todo nem de banco de dados.

## Comparativo

| # | Hospedagem | Custo | Planejador com IA | Facilidade | Observação |
|---|---|---|---|---|---|
| 1 | **Cloudflare Pages** ⭐ | **Grátis** | ✅ Roda (Pages Functions) | Muito fácil: liga no GitHub e publica sozinho | 500 builds/mês, tráfego de arquivos estáticos ilimitado, funções dentro da cota grátis do Workers (100 mil pedidos/dia). Prévia automática para cada branch. Domínio a preço de custo no mesmo painel. |
| 2 | Netlify | Grátis (300 créditos/mês); Personal US$ 9/mês | ✅ Roda | Muito fácil | Desde set/2025 cobra por créditos; se acabarem no plano grátis, o site **sai do ar** até o mês seguinte. |
| 3 | Vercel | Hobby grátis; Pro US$ 20/mês | ✅ Roda | Muito fácil | O plano grátis é **só para uso não comercial**. Site de assessor é comercial: exigiria o Pro. |
| 4 | GitHub Pages | Grátis | ❌ Só estático | Fácil | Ótimo para testar, mas a IA ficaria no modo exemplo. Não é feito para uso comercial pesado. |
| 5 | Firebase Hosting | Grátis (cota diária de tráfego) | ⚠️ Só no plano pago por uso | Média | Funções exigem o plano Blaze (cartão cadastrado). Mais voltado a apps. |
| 6 | Azure Static Web Apps | Grátis; Standard ~US$ 9/mês | ✅ Roda (Azure Functions) | Média | Painel da Microsoft é mais complexo; seria preciso adaptar a função. |
| 7 | Render | Grátis para sites estáticos | ⚠️ Serviço separado (dorme no plano grátis) | Média | A função ficaria em outro serviço, que "acorda" devagar no plano grátis. |
| 8 | AWS Amplify | Pago por uso (centavos para pouco tráfego) | ✅ Roda (Lambda) | Difícil | Poderoso, mas configuração e cobrança complexas para um site deste porte. |
| 9 | Hostinger | Single ~R$ 6–9/mês; Premium ~R$ 11–13/mês (domínio grátis no 1º ano) | ❌ Só estático | Fácil (FTP automático já configurado) | Preço promocional exige contrato longo; renovação é mais cara. Plano Single não inclui domínio. |
| 10 | HostGator | ~R$ 10–20/mês (promocional) | ❌ Só estático | Fácil | Mesma lógica da Hostinger: paga por algo que o site não usa (PHP, e-mail, cPanel). |

## Recomendação

**Cloudflare Pages (grátis) + domínio na própria Cloudflare.**

- Custo do site: **R$ 0**. Custo do domínio `.com`: cerca de **US$ 10,46 por ano** (~R$ 60), preço de custo, renovação pelo mesmo valor.
- É a única opção grátis que roda o Planejador com IA e permite uso comercial sem pegadinha de "site pausado".
- A cada mudança no GitHub o site é publicado sozinho, e cada branch ganha um link de prévia: dá para testar no celular sem instalar nada.
- Custo da IA: pago por uso na Anthropic. Com o limite por pessoa (5 planos/hora) e o teto diário que já estão no código, mais um **limite de gasto mensal** no console da Anthropic, o valor fica sob controle.

**Domínio `.com.br`:** só pode ser registrado no [Registro.br](https://registro.br) (ou em revenda credenciada), cerca de **R$ 40 por ano**. Vale registrar `ricksonmessias.com.br` também, para proteger a marca, e redirecionar para o `.com`.

**Total estimado:** ~R$ 100 por ano (`.com` + `.com.br`) + o uso da IA.

## Passo a passo (cerca de 30 minutos)

1. **Conta:** crie em [dash.cloudflare.com](https://dash.cloudflare.com) (e-mail e senha; ative a verificação em duas etapas).
2. **Domínio:** **Domain Registration → Register Domains** → procure `ricksonmessias.com` → pague com cartão internacional.
3. **Site:** **Workers & Pages → Create → Pages → Connect to Git** → autorize o GitHub → repositório `primeiro` → configurações:
   - Production branch: `main` (enquanto o site não estiver na `main`, use `claude/wonderful-bell-2bt1o5`)
   - Framework preset: **Astro** · Root directory: `site/web` · Build command: `npm run build` · Output: `dist`
   - Variáveis: `NODE_VERSION` = `22` · `PUBLIC_FORM_ENDPOINT` = URL do App da Web do Apps Script (quando publicado)
4. **IA:** no projeto → **Settings → Variables and Secrets** → `ANTHROPIC_API_KEY` (tipo *Secret*). Opcional: **Storage → KV** → criar `LIMITES` e ligar em **Settings → Bindings**.
5. **Domínio no site:** **Custom domains → Set up a domain** → `ricksonmessias.com` (e `www`). Com o domínio na Cloudflare, o DNS e o HTTPS se configuram sozinhos.
6. **Segurança e alertas:** **Notifications** (falha de deploy), **Web Analytics** (sem cookies) e uma regra em **Security → WAF → Rate limiting** para `/api/*`.

Se preferir que eu publique daqui, basta criar um *API Token* na Cloudflare com permissão "Cloudflare Pages: Edit" e me passar; com ele faço o deploy pelo `wrangler`.

## Fontes

- [Limites do Cloudflare Pages (documentação oficial)](https://developers.cloudflare.com/pages/platform/limits)
- [Limites do plano grátis do Cloudflare Pages em 2026 (temps.sh)](https://temps.sh/blog/cloudflare-pages-free-tier-limits-2026)
- [Comparativo de planos grátis de hospedagem 2026 (agentdeals.dev)](https://agentdeals.dev/hosting-free-tier-comparison-2026)
- [Preço do .com na Cloudflare (domainoffer.net)](https://domainoffer.net/tld/com/cloudflare)
- [Quanto custa um domínio (HostGator)](https://hostgator.com.br/blog/quanto-custa-um-dominio/)
- [Quanto custa um domínio e como registrar (TecMundo)](https://www.tecmundo.com.br/internet/405860-descubra-quanto-custa-um-dominio-de-site-e-como-registrar-o-seu.htm)
- [Quanto custa hospedar um site em 2026 (Hostinger)](https://www.hostinger.com/br/tutoriais/?p=28843)
- [Análise da Hostinger 2026 (Guia Ferramentas Digitais)](https://guiaferramentasdigitais.com.br/guias/hostinger-review-2026/)
- [Limites do plano grátis da Netlify em 2026 (netli.fyi)](https://netli.fyi/blog/netlify-free-plan-limits-2026)
- [Preços da Vercel em 2026 (DEV Community)](https://dev.to/nayankyada/vercel-pricing-2026-what-you-actually-pay-for-a-real-nextjs-project-33md)
