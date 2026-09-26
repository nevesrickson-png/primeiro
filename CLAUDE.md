# CRM Assessor — Especificação (referência permanente)

> Este arquivo é a especificação oficial do projeto. Consulte-o antes de qualquer mudança.
> Construir em fases e PARAR ao final de cada fase para o usuário testar.

## Objetivo
CRM offline, portátil e rápido para gerenciar mais de 5.000 leads e clientes, com cadastro rico, funil, lembretes, painel e sincronização manual bidirecional com Google Planilhas. Usuário único hoje, possivelmente um assistente no futuro (deixe a estrutura preparada para múltiplos usuários, sem implementar login multiusuário agora).

## Stack
- Electron + React + TypeScript + Vite
- Tailwind CSS; visual moderno e clean (referência: Notion/Linear), modo claro e escuro, interface 100% em português do Brasil
- SQLite via better-sqlite3-multiple-ciphers, com o banco CRIPTOGRAFADO por senha pedida ao abrir o app
- Build: electron-builder, target "portable" para Windows (um único .exe)
- Portabilidade: o arquivo do banco (crm.db) e a pasta de backups ficam NA MESMA PASTA do .exe (use PORTABLE_EXECUTABLE_DIR), nunca em AppData
- Datas no formato dd/mm/aaaa, moeda em R$, telefones BR com máscara

## Modelo de dados
Todas as tabelas: id (UUID), created_at, updated_at, deleted_at (soft delete).

leads:
- nome, telefone, whatsapp, email, cidade, estado, profissao, empresa, cargo, data_nascimento, estado_civil, conjuge, filhos (texto), instagram, linkedin, outras_redes
- faixa_patrimonio (até 100 mil / 100–300 mil / 300 mil–1 mi / 1–3 mi / 3–10 mi / acima de 10 mi)
- faixa_renda (faixas mensais equivalentes)
- suitability (conservador / moderado / arrojado / não avaliado), data_suitability
- objetivos (multi: aposentadoria, reserva, imóvel, educação dos filhos, sucessão, renda passiva, outro)
- horizonte (curto / médio / longo)
- sucessao_notas (texto)
- produtos_interesse (multi: renda fixa, fundos, FIIs, ações, previdência, offshore, seguros, câmbio, COE)
- hobbies_rapport (texto livre)
- origem (Instagram, YouTube, LinkedIn, Indicação, Eventos, Site, Google Forms, Outro) + origem_detalhe
- indicado_por (FK opcional para outro lead)
- etapa (novo, primeiro contato, reunião agendada, diagnóstico, proposta, conta aberta, cliente ativo, perdido) + motivo_perda
- valor_potencial (R$ estimado)
- consentimento_lgpd (bool), data_consentimento, base_legal
- observacoes

Tabelas auxiliares:
- tags + lead_tags (tags livres, com cor)
- interacoes (lead_id, tipo: ligação/WhatsApp/e-mail/reunião/evento/outro, data, resumo, próximo passo)
- tarefas (lead_id opcional, título, data_vencimento, concluída, tipo: follow-up/revisão/outro)
- aplicacoes (lead_id, produto, valor, data_vencimento): gera lembrete de vencimento
- revisoes_carteira (lead_id, data, notas, próxima_revisão)
- nps (lead_id, data, nota 0–10, comentário)
- historico_etapas (lead_id, etapa_de, etapa_para, data): base das métricas de conversão
- sync_log e sync_conflitos

Crie índices e uma tabela FTS5 para busca rápida por nome, e-mail, telefone, empresa e observações.

## Telas
1. Início: agenda do dia (tarefas, follow-ups, aniversários, vencimentos em 30 dias, leads parados há mais de X dias, com X configurável)
2. Leads: lista virtualizada com busca instantânea, filtros (etapa, origem, patrimônio, suitability, tag, produto) e ordenação
3. Funil: Kanban com drag-and-drop entre etapas (cada mudança grava em historico_etapas) e alternância para a visão de lista
4. Ficha do lead: abas Dados, Perfil financeiro, Preferências, Histórico (timeline de interações), Tarefas, Pós-venda (revisões, indicações recebidas, NPS)
5. Painel: leads por origem, conversão por etapa, patrimônio potencial no funil por etapa, leads parados, novos leads por mês, tarefas atrasadas (gráficos com Recharts)
6. Configurações: senha, dias para "lead parado", sincronização, backup/restauração, exportar CSV

## Sincronização com Google Planilhas (manual, botão "Sincronizar")
- Ponte via Google Apps Script publicado como Web App, autenticado por token secreto guardado nas Configurações. Gere o código do Apps Script em /apps-script/Code.gs com instruções de instalação passo a passo em português.
- Aba "Leads": espelho bidirecional; cada linha tem id e updated_at. Em edição dos dois lados, vence o updated_at mais recente e o conflito é registrado em sync_conflitos para revisão.
- NÃO enviar para a planilha: faixa_patrimonio, faixa_renda, suitability, sucessao_notas, aplicacoes. Esses dados ficam só no banco local criptografado.
- Aba "Entradas": recebe respostas de um Google Forms de captura (inclua um campo de aceite LGPD). A sincronização importa linhas novas como leads com origem "Google Forms" e marca a linha como importada.
- Backup: backup local automático do crm.db (criptografado) ao fechar o app, mantendo os 10 mais recentes.

## Fases (pare ao final de cada uma)
1. Estrutura do projeto, banco criptografado com migrations, tela de senha, CRUD completo de leads com a ficha detalhada, busca e filtros
2. Funil Kanban + lista, histórico de etapas, interações
3. Painel de métricas
4. Tarefas, lembretes e tela Início
5. Sincronização com Google Planilhas + Google Forms
6. Pós-venda (revisões, indicações, NPS), backup, exportação e build do .exe portátil

Ao final de cada fase, gere 50 leads fictícios realistas para teste (apenas em modo de desenvolvimento) e explique como rodar.

---

## Decisões técnicas (manter consistentes)

- **Estrutura**: `electron-vite`. `src/main` (processo principal, banco, IPC), `src/preload` (ponte `window.api` tipada via contextBridge), `src/shared` (tipos e listas de opções usados pelos dois lados), `src/renderer` (React).
- **Segurança do renderer**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. O renderer nunca acessa o banco diretamente; tudo passa por `ipcMain.handle` com canais `dominio:acao`.
- **Criptografia**: `PRAGMA cipher='sqlcipher'` + `PRAGMA key` (aspas simples escapadas). Troca de senha via `PRAGMA rekey`. Senha errada é detectada ao ler `sqlite_master` ("file is not a database").
- **Módulo nativo**: better-sqlite3-multiple-ciphers v13 usa N-API e já traz prebuilds (inclusive win32-x64), então **não** é recompilado para o Electron (`npmRebuild: false` no electron-builder).
- **Local dos dados**: `PORTABLE_EXECUTABLE_DIR` (exe portátil) → pasta do executável (empacotado não portátil) → `./data` na raiz do projeto (desenvolvimento). Backups em `<pasta>/backups`.
- **Migrations**: lista ordenada em `src/main/db/migrations.ts`, controlada por `PRAGMA user_version`; cada migration roda numa transação. Nunca editar uma migration já publicada — sempre criar uma nova.
- **Convenções de dados**: ids `crypto.randomUUID()`; timestamps ISO 8601 UTC (`toISOString()`); datas de calendário como `AAAA-MM-DD` (exibidas dd/mm/aaaa); telefones só com dígitos (máscara na exibição); campos multi (objetivos, produtos_interesse) como JSON array em TEXT; booleanos 0/1; moeda como REAL em reais.
- **Soft delete**: `deleted_at` preenchido; todas as consultas filtram `deleted_at IS NULL`.
- **Mudança de etapa**: sempre via repositório de leads, que grava em `historico_etapas` (inclusive na criação, com `etapa_de = NULL`).
- **Busca**: tabela FTS5 `leads_fts` (própria, não external-content, com `lead_id UNINDEXED`), mantida por triggers; tokenizer `unicode61 remove_diacritics 2`; busca por prefixo em todos os termos. Buscas só com dígitos também procuram trecho do telefone (LIKE).
- **Multiusuário (preparado, não implementado)**: tabela `usuarios` com um usuário padrão; `leads.responsavel_id` e `created_by` apontam para ele.
- **Configurações**: tabela chave/valor `configuracoes`. Tema (claro/escuro) fica no `localStorage` porque é necessário antes do desbloqueio.
- **Funil**: Kanban com drag-and-drop nativo do HTML5 (sem biblioteca), colunas virtualizadas; mover card chama `leads:moverEtapa` (atualização otimista na tela). Mover para "perdido" pede o motivo. "Dias na etapa" vem do último registro de `historico_etapas` com `etapa_para = etapa atual`.
- **Interações**: repositório `src/main/db/interacoes.ts`; `data` é timestamp ISO UTC (data + hora locais na interface). Criar interação NÃO altera `leads.updated_at` (para não gerar falsas edições na sincronização); a lista expõe `ultima_interacao` calculada.
- **Painel**: `src/main/db/painel.ts` (uma chamada `painel:obter(periodo)`). Definições: *conversão por etapa* = leads cadastrados no período cuja etapa mais avançada já alcançada (histórico + etapa atual, ignorando "perdido") é ≥ a etapa; *convertido* = alcançou "conta aberta"; *em negociação* = novo…proposta; *potencial por etapa* e KPIs de estoque = fotografia atual (ignoram o período); *novos por mês* = últimos 12 meses no fuso local.
- **Lead parado** (`leadsParados` em leads.ts, reutilizar na tela Início): etapa fora de perdido/cliente ativo e última atividade (max de updated_at, última interação, última mudança de etapa) mais antiga que `dias_lead_parado`.
- **Gráficos**: Recharts, série única em azul validado (claro `#2a78d6`, escuro `#3987e5`), barras horizontais para categorias, rótulos diretos, tooltip próprio e botão "ver tabela" em cada gráfico.
- **Tarefas e lembretes**: `tarefas.ts` (filtros pendentes/atrasadas/hoje/próximas/sem_data/concluídas, datas no fuso local via `datas.ts`), `agenda.ts` (tela Início: tarefas, aniversários 7 dias, vencimentos de aplicações e próximas revisões em 30 dias, leads parados) e `resumoLembretes` (contador no menu + notificação nativa uma vez por desbloqueio; clique leva ao Início via canal `navegar`). "Próximo passo" de uma interação com data em "Lembrar em" vira tarefa de follow-up. Mudanças em tarefas avisam outras telas por `lib/eventos.ts`.
- **Aplicações**: cadastradas na aba Perfil financeiro (dados sensíveis, nunca sincronizados).
- **Sincronização** (`src/main/sync/`): `cliente.ts` (net.fetch; POST → 302 → GET como o Google faz; só https, exceto localhost em dev), `mapeamento.ts` (colunas e formatos legíveis — rótulos, dd/mm/aaaa, máscara, R$; lista `CAMPOS_PROIBIDOS` nunca vai à planilha), `sincronizar.ts` (1º importa a aba Entradas via `forms.ts`, depois o espelho da aba Leads) e `index.ts` (config, histórico, conflitos). A tabela `sync_leads` guarda, por lead, os updated_at local/planilha da última sincronização: quem mudou desde a base vence; se os dois mudaram, vence o updated_at mais recente e cada campo divergente vai para `sync_conflitos`. Conteúdo igual nunca gera conflito (comparação canônica). Exclusão no app remove a linha da planilha; linha apagada na planilha é reenviada. Bases só são gravadas depois que a planilha confirma. Token em `configuracoes.sync_token`, nunca enviado ao renderer.
- **Apps Script** (`apps-script/Code.gs` + `LEIA-ME.md`): ações ping/lerLeads/gravarLeads/lerEntradas/marcarImportadas; gatilho `onEdit` carimba `updated_at`/`id`; `criarFormulario()` cria o Forms com aceite LGPD. Testar com `node scripts/simulador-planilha.cjs` (roda o próprio Code.gs em Node).
- **Pós-venda** (`db/posvenda.ts`, aba Pós-venda da ficha): revisões de carteira (próxima revisão alimenta os vencimentos da tela Início), indicações recebidas (leads com `indicado_por` = lead; "Cadastrar indicação" abre `/leads/novo?indicado_por=…`) e NPS (0–10; NPS da carteira = última nota de cada cliente em 12 meses, % promotores − % detratores).
- **Backup** (`src/main/backup.ts`): cópia do crm.db criptografado (após `wal_checkpoint`) em `backups/crm-AAAAMMDD-HHMMSS.db` ao fechar o app (`fecharComBackup`, uma vez, só se o banco foi aberto) e sob demanda; mantém os 10 mais recentes (por data do arquivo); nunca sobrescreve (sufixo -2…). Restaurar guarda `crm-antes-restauracao-*.db`, substitui o banco e bloqueia o app (senha = a da data do backup). A interface só restaura por nome de arquivo da pasta de backups ou por arquivo escolhido no diálogo do sistema.
- **Exportação CSV** (`src/main/exportar.ts`): separador `;` + BOM UTF-8 (Excel pt-BR), mesmos formatos legíveis da planilha, respeita busca/filtros da tela Leads; dados sensíveis só com opção explícita; células iniciadas por `= + - @` são neutralizadas.
- **Build portátil**: `npm run dist` → `release/CRM-Assessor-<versão>-portatil.exe`. `electron-builder.yml` exclui fontes C e binários de outros sistemas. Empacotado, `userData` do Electron também fica ao lado do .exe (`dados-do-app/`), nada em AppData. Ícone gerado por `scripts/gerar-icone.cjs` (resources/icon.png).
- **Dados fictícios**: `src/main/db/seed.ts`, disponível apenas quando `!app.isPackaged` (botão em Configurações e na lista vazia).
