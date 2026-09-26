# CRM Assessor

CRM desktop pessoal, offline e criptografado para assessor de investimentos.
Especificação completa e decisões técnicas: [CLAUDE.md](CLAUDE.md).

## Status

- [x] **Fase 1** — estrutura, banco criptografado com migrations, tela de senha, CRUD de leads com ficha detalhada, busca e filtros
- [x] **Fase 2** — Funil Kanban + lista, histórico de etapas, interações
- [x] **Fase 3** — Painel de métricas
- [x] **Fase 4** — Tarefas, lembretes e tela Início
- [x] **Fase 5** — Sincronização com Google Planilhas + Google Forms (instalação: [apps-script/LEIA-ME.md](apps-script/LEIA-ME.md))
- [x] **Fase 6** — Pós-venda, backup, exportação e build do .exe portátil
- [x] **Fase 7** — E-mail em massa (campanhas pela sua caixa de e-mail)

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
| `npm run caixa-teste` | Caixa de e-mail de teste local (recebe as campanhas sem enviar nada para a internet) |
| `npm run simulador` | Simula a planilha Google localmente (para testar a sincronização em dev) |
| `npm run build` | Compila para `out/` |
| `npm run dist` | Gera o `.exe` portátil em `release/` |

## Atalhos

| Atalho | Onde | Ação |
| --- | --- | --- |
| `Ctrl+K` ou `/` | Leads | Foca a busca |
| `Ctrl+N` | Leads | Novo lead |
| `Ctrl+S` | Ficha | Salvar |
| `Ctrl+Enter` | Histórico da ficha | Registrar interação |
| `Esc` | Menus/diálogos | Fechar |

## Gerar e usar o .exe portátil (Windows)

```bash
npm install
npm run dist
```

O arquivo sai em `release/CRM-Assessor-<versão>-portatil.exe` (um único arquivo, sem instalação).

1. Crie uma pasta só para o CRM (ex.: `D:\CRM` ou num pendrive) e coloque o `.exe` dentro.
2. Abra o `.exe`. Na primeira vez, o Windows pode mostrar "O Windows protegeu o computador" (o app não é assinado digitalmente): clique em **Mais informações → Executar assim mesmo**.
3. Tudo fica **na mesma pasta do .exe**:
   - `crm.db` — o banco criptografado;
   - `backups/` — backups automáticos (um a cada fechamento, os 10 mais recentes);
   - `dados-do-app/` — preferências e cache do aplicativo.
4. Para trocar de computador, copie a **pasta inteira**.

> O `.exe` portátil se descompacta numa pasta temporária a cada abertura, por isso leva alguns segundos para abrir.
> **Guarde a senha**: sem ela não há como abrir o banco nem os backups.

## E-mail em massa

1. **Configurações → E-mail**: escolha o provedor, informe seu e-mail e uma **senha de app**
   (Gmail: ative a verificação em duas etapas e crie em <https://myaccount.google.com/apppasswords>).
   Clique em **Salvar e testar conexão**.
2. Menu **E-mails → Nova campanha** (ou, na tela Leads, filtre a lista e clique em **Enviar e-mail**).
3. Escolha o público, escreva assunto e mensagem (use os botões de variáveis, como *Primeiro nome*), anexe arquivos se quiser.
4. **Enviar teste** manda para você mesmo. Depois, **Enviar para N** inicia o envio — mantenha o app aberto.

Boas práticas já embutidas: só quem deu consentimento LGPD recebe (por padrão), descadastrados nunca recebem,
rodapé para sair da lista, intervalo entre e-mails e limite diário (Gmail comum aceita cerca de 500 por dia).
Quem responder "SAIR": cole o e-mail em **E-mails → Descadastros** ou marque "Não receber e-mails em massa" na ficha.

Para testar em desenvolvimento sem enviar e-mails de verdade: `npm run caixa-teste` e, em Configurações → E-mail,
use provedor *Outro*, servidor `127.0.0.1`, porta `2525`, segurança *Nenhuma (só teste local)* e senha `senha-de-app`.
As mensagens recebidas ficam em <http://127.0.0.1:2526/mensagens>.
