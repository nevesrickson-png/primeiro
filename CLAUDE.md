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
- **Dados fictícios**: `src/main/db/seed.ts`, disponível apenas quando `!app.isPackaged` (botão em Configurações e na lista vazia).
