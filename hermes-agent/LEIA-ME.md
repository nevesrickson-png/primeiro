# Hermes Agent em Docker — pasta portátil

Este diretório roda o [Hermes Agent](https://github.com/NousResearch/hermes-agent) (Nous Research)
num container Docker, com **tudo guardado em `./dados`**. Para levar o agente com você
(pendrive, outro PC) ou mandar para uma VPS, basta copiar a pasta inteira.

## 1. No Windows: um clique (Hermes.exe)

1. Coloque o `Hermes.exe` numa pasta só dele (ex.: `D:\Hermes`) e dê dois cliques.
2. Se o Windows mostrar "O Windows protegeu o computador", clique em
   **Mais informações → Executar assim mesmo** (o programa não tem assinatura digital paga).
3. Se o Docker Desktop não estiver instalado, o Hermes pergunta e instala sozinho
   (pede permissão de administrador). Depois: **reinicie o PC**, abra o Docker Desktop
   uma vez para aceitar os termos e clique no Hermes de novo.
4. Na primeira abertura ele baixa o Hermes (~2 GB, alguns minutos), cria uma senha
   para o painel (mostrada na tela, copiada e salva em `ACESSO.txt`) e abre o navegador.
5. No painel, entre com `admin` + a senha, abra **Keys** e conecte um provedor de IA
   (o Nous Portal tem plano grátis; também dá para usar ChatGPT, Claude, OpenRouter...).
   Depois é só usar o **Chat**.

Das próximas vezes, o clique abre o chat em segundos. Para desligar: `Parar Hermes.cmd`.
Dica: clique com o botão direito no `Hermes.exe` → *Mostrar mais opções* →
*Enviar para → Área de trabalho* para ter o ícone na área de trabalho.

O Hermes.exe cria na pasta dele:

```
D:\Hermes\
├── Hermes.exe           # o lançador
├── docker-compose.yml   # definição do container
├── .env                 # configuração (senha do painel etc.)
├── ACESSO.txt           # usuário e senha do painel
├── Parar Hermes.cmd     # desliga o agente
└── dados\               # memórias, sessões, skills e chaves de API
```

### Alternativa: scripts (Linux, macOS, VPS ou Windows sem o .exe)

Nesta pasta há também `hermes.sh` (Linux/macOS/VPS) e `hermes.ps1` (Windows):

```bash
./hermes.sh setup      # 1ª vez: cria o .env (edite a senha do painel) e roda o assistente
./hermes.sh iniciar    # painel em http://localhost:9119
```

### Compilar o Hermes.exe

Requer Go 1.22+: `go install github.com/tc-hib/go-winres@latest && ./lancador/compilar.sh`
(gera `lancador/dist/Hermes.exe` e versões para Linux e macOS).

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
# pasta criada pelo Hermes.exe (sem hermes.sh)? use: docker compose up -d
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
