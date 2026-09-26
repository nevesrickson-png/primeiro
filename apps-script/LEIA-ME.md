# Sincronização com Google Planilhas — instalação passo a passo

O CRM conversa com uma planilha do Google por meio de um pequeno programa (Google Apps Script)
que fica **dentro da própria planilha**. Você faz isto uma única vez (uns 10 minutos).

> **Privacidade:** faixa de patrimônio, faixa de renda, suitability, notas de sucessão e aplicações
> **nunca** saem do seu computador — ficam só no banco criptografado do CRM.

---

## 1. Criar a planilha

1. Acesse <https://sheets.google.com> com a sua conta Google e crie uma **planilha em branco**.
2. Dê um nome, por exemplo **CRM Assessor**.

## 2. Colar o código

1. Na planilha, abra o menu **Extensões → Apps Script**. Uma nova aba abre com o editor.
2. Apague todo o conteúdo do arquivo `Código.gs` que aparece.
3. Abra o arquivo **`apps-script/Code.gs`** deste projeto, copie **tudo** e cole no editor.
4. Clique no ícone de **disquete (Salvar projeto)**. Se pedir um nome para o projeto, use "CRM Assessor".

## 3. Rodar a instalação e pegar o token

1. No topo do editor, na lista de funções (ao lado de "Depurar"), escolha **`instalar`** e clique em **Executar**.
2. Na primeira vez o Google pede autorização:
   - clique em **Revisar permissões** e escolha sua conta;
   - se aparecer "O Google não verificou este app", clique em **Avançado → Acessar CRM Assessor (não seguro)** —
     o código é seu e roda só na sua conta;
   - clique em **Permitir**.
3. Volte à aba da **planilha**: aparece uma caixa com o **token secreto**. (Se não aparecer, veja em
   **Execuções** / **Registro de execução** no editor.) Copie o token — você vai colá-lo no CRM.

   A aba **Leads** é criada automaticamente.

## 4. Publicar como App da Web

1. No editor, clique em **Implantar → Nova implantação**.
2. Na engrenagem ao lado de "Selecione o tipo", escolha **App da Web**.
3. Preencha:
   - **Descrição:** CRM Assessor
   - **Executar como:** **Eu** (sua conta)
   - **Quem pode acessar:** **Qualquer pessoa**
     (é necessário para o app acessar sem login; a proteção é o token secreto — não compartilhe o token)
4. Clique em **Implantar** e copie a **URL do app da Web** (termina em **`/exec`**).

## 5. Configurar o CRM

1. No CRM, vá em **Configurações → Sincronização com Google Planilhas**.
2. Cole a **URL** (`…/exec`) e o **token**.
3. Clique em **Testar conexão** — deve aparecer "Conectado à planilha …".
4. Clique em **Salvar** e depois em **Sincronizar** (no menu lateral). Os leads aparecem na aba **Leads**.

## 6. (Opcional) Formulário de captura com aceite LGPD

1. No editor do Apps Script, escolha a função **`criarFormulario`** e clique em **Executar**
   (autorize de novo se for pedido — agora ele pede acesso ao Google Forms).
2. A planilha mostra o **link do formulário** para divulgar (Instagram, WhatsApp, site…) e o link para editá-lo.
3. As respostas caem na aba **Entradas**. A cada **Sincronizar**, o CRM:
   - cria um lead para cada resposta nova, com origem **Google Forms** e o aceite LGPD registrado;
   - se a pessoa já existir (mesmo e-mail ou telefone), não duplica: registra o novo contato no histórico dela;
   - marca a linha na coluna **"Importado pelo CRM"**.

Você pode editar o formulário à vontade (textos, novas perguntas). O CRM reconhece as perguntas pelo título:
nome, WhatsApp/telefone/celular, e-mail, cidade, estado/UF, profissão, empresa, "como nos conheceu",
mensagem e aceite/LGPD. **Mantenha a pergunta de aceite LGPD** — leads sem aceite são importados com aviso.

> Já tem um formulário? Em **Respostas → Vincular ao Planilhas**, escolha esta planilha e depois
> renomeie a aba de respostas criada para **Entradas**.

---

## Como a sincronização funciona

- É **manual**: só acontece quando você clica em **Sincronizar**.
- **Editar na planilha:** pode editar as células normalmente. Ao editar, a coluna `updated_at` é
  atualizada sozinha. Etapa, origem, estado civil etc. aceitam o texto do rótulo (ex.: "Reunião agendada");
  objetivos, produtos e tags são separados por vírgula; datas em dd/mm/aaaa.
- **Novo lead pela planilha:** preencha uma linha nova (pelo menos o Nome). O id é criado sozinho.
- **Editado dos dois lados** desde a última sincronização: vence a edição **mais recente** e o conflito
  fica em **Configurações → conflitos para revisar**, onde você pode ficar com o outro valor.
- **Excluir:** exclua sempre **no CRM** — a linha some da planilha na próxima sincronização.
  Linhas apagadas direto na planilha voltam na próxima sincronização.
- Não mexa nas colunas `id`, `created_at`, `updated_at` e `deleted_at`. Colunas extras que você criar são preservadas.
- Evite editar a planilha **durante** uma sincronização.

## Problemas comuns

| Mensagem no CRM | O que fazer |
| --- | --- |
| Token inválido | Copie de novo o token (função `mostrarToken` no editor) e cole em Configurações. |
| A URL respondeu com uma página em vez de dados | Use a URL que termina em `/exec` e confira "Quem pode acessar: Qualquer pessoa". |
| Erro HTTP 404 / implantação | Em **Implantar → Gerenciar implantações**, confira se a implantação está ativa. |
| Mudei o código e nada mudou | Depois de alterar o código: **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão → Implantar**. A URL continua a mesma. |
| Quero trocar o token | Rode `gerarNovoToken` no editor e cole o novo token no CRM. |

## Testar sem conta Google (desenvolvedores)

`node scripts/simulador-planilha.cjs` roda este mesmo `Code.gs` localmente com uma planilha em memória.
Em modo de desenvolvimento, use a URL `http://127.0.0.1:8765/exec` e o token exibido no terminal.
