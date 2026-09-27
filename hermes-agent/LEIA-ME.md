# Hermes Agent em Docker — pasta portátil

Este diretório roda o [Hermes Agent](https://github.com/NousResearch/hermes-agent) (Nous Research)
num container Docker, com **tudo guardado em `./dados`**. Para levar o agente com você
(pendrive, outro PC) ou mandar para uma VPS, basta copiar a pasta inteira.

```
hermes-agent/
├── docker-compose.yml   # definição do container
├── .env.example         # modelo de configuração (copie para .env)
├── hermes.sh            # atalhos para Linux / macOS / VPS
├── hermes.ps1           # atalhos para Windows (PowerShell)
├── dados/               # criado no 1º uso: memórias, sessões, skills, chaves (NÃO vai para o Git)
└── backups/             # criado pelo comando "backup"
```

## 1. No seu PC (Windows)

1. Instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/) e abra-o.
2. Copie esta pasta para onde quiser (ex.: `D:\hermes-agent`).
3. No PowerShell, dentro da pasta:
   ```powershell
   .\hermes.ps1 setup      # 1ª vez: cria o .env e para
   notepad .env            # troque a senha do painel e coloque sua chave de API
   .\hermes.ps1 setup      # agora abre o assistente (escolha modelo, chaves, Telegram etc.)
   .\hermes.ps1 iniciar
   ```
   Se o Windows bloquear o script: `powershell -ExecutionPolicy Bypass -File .\hermes.ps1 iniciar`
4. Abra o painel em **http://localhost:9119** (usuário/senha do `.env`).
   Para conversar pelo terminal: `.\hermes.ps1 chat`.

No Linux/macOS é igual, trocando por `./hermes.sh`.

## 2. Levar com você

1. `.\hermes.ps1 parar` (ou `./hermes.sh parar`) — **nunca copie com o agente rodando**.
2. Copie a pasta inteira (ou use `backup`, que gera um `.tar.gz` em `backups/`).
3. No outro computador: instale o Docker e rode `iniciar`.

> ⚠️ Não deixe **duas cópias rodando ao mesmo tempo** com os mesmos dados (ex.: PC e VPS
> conectados ao mesmo bot do Telegram). Escolha onde o agente "mora".
>
> ⚠️ A pasta `dados/` e o `.env` contêm suas chaves de API. Pendrive? Use um criptografado
> (BitLocker To Go) e guarde os backups em local seguro.

## 3. Na VPS (Ubuntu/Debian)

VPS recomendada: 2 vCPU, 2–4 GB de RAM, 20 GB de disco.

```bash
# instalar o Docker (script oficial)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# firewall: só SSH aberto
sudo ufw allow OpenSSH && sudo ufw enable
```

Envie a pasta do seu PC para a VPS (com o agente parado):

```bash
scp -r hermes-agent usuario@IP-DA-VPS:~/
# ou envie um backup: scp backups/hermes-*.tar.gz usuario@IP-DA-VPS:~/
#   e na VPS: mkdir hermes-agent && tar xzf hermes-*.tar.gz -C hermes-agent
#   (copie também hermes.sh e .env.example)
```

Na VPS:

```bash
cd ~/hermes-agent
sudo chown -R $USER: dados     # ajusta o dono dos arquivos vindos do Windows
chmod +x hermes.sh
./hermes.sh iniciar
```

O container reinicia sozinho se a VPS reiniciar (`restart: unless-stopped`).

**Acessar o painel da VPS** sem abrir porta na internet — túnel SSH a partir do seu PC:

```bash
ssh -L 9119:localhost:9119 usuario@IP-DA-VPS
```

e abra http://localhost:9119 no seu navegador. Deixe `BIND_ADDR=127.0.0.1` no `.env`:
painéis expostos sem proteção já foram alvo de ataques reais contra o Hermes.
Se um dia quiser um endereço público, use um proxy reverso com HTTPS (Caddy, Cloudflare
Tunnel ou Tailscale) em vez de abrir a porta direto.

## Comandos

| Comando     | O que faz |
|-------------|-----------|
| `setup`     | assistente de configuração (modelo, chaves, mensageiros) |
| `iniciar`   | sobe o agente em segundo plano, com painel web |
| `parar`     | desliga |
| `reiniciar` | reinicia |
| `status`    | mostra se está rodando |
| `logs`      | acompanha os logs |
| `chat`      | chat no terminal |
| `atualizar` | baixa a imagem nova e reinicia (a config é migrada automaticamente) |
| `backup`    | gera `backups/hermes-AAAAMMDD-HHMMSS.tar.gz` com `dados/` + `.env` |

## Dicas

- **Versão fixa**: troque `HERMES_TAG=latest` por uma versão (ex.: `v2026.9.21`) para
  a atualização acontecer só quando você quiser.
- **API compatível com OpenAI** (porta 8642): desligada por padrão; ative no `.env`
  (`API_SERVER_ENABLED=true` + `API_SERVER_KEY`).
- **Pouca memória na VPS**: ajuste `LIMITE_MEMORIA` no `.env` (mínimo 1G; ferramentas de
  navegador pedem 2G).
- **Erro de banco no Windows** ("database is locked"/WAL): veja a seção *SQLite WAL* da
  [documentação oficial de Docker](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/docker.md).
