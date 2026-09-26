# CRM Assessor

CRM desktop pessoal, offline e criptografado para assessor de investimentos.
Especificação completa e decisões técnicas: [CLAUDE.md](CLAUDE.md).

## Status

- [x] **Fase 1** — estrutura, banco criptografado com migrations, tela de senha, CRUD de leads com ficha detalhada, busca e filtros
- [x] **Fase 2** — Funil Kanban + lista, histórico de etapas, interações
- [x] **Fase 3** — Painel de métricas
- [x] **Fase 4** — Tarefas, lembretes e tela Início
- [ ] Fase 5 — Sincronização com Google Planilhas + Google Forms
- [ ] Fase 6 — Pós-venda, backup, exportação e build do .exe portátil

## Como rodar (desenvolvimento)

Pré-requisito: [Node.js 22 LTS](https://nodejs.org/) ou mais recente.

```bash
npm install
npm run dev
```

1. Na primeira abertura, crie a senha do banco (mínimo 6 caracteres). O arquivo `data/crm.db` é criado criptografado na raiz do projeto.
2. Na lista vazia, clique em **Gerar 50 leads fictícios** (ou em Configurações → Desenvolvimento). Pode clicar mais de uma vez para ter mais volume.
3. Para recomeçar do zero, feche o app e apague a pasta `data/`.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run typecheck` | Verifica os tipos TypeScript |
| `npm run build` | Compila para `out/` |
| `npm run dist` | Gera o `.exe` portátil em `release/` (será finalizado na Fase 6) |

## Atalhos

| Atalho | Onde | Ação |
| --- | --- | --- |
| `Ctrl+K` ou `/` | Leads | Foca a busca |
| `Ctrl+N` | Leads | Novo lead |
| `Ctrl+S` | Ficha | Salvar |
| `Ctrl+Enter` | Histórico da ficha | Registrar interação |
| `Esc` | Menus/diálogos | Fechar |
