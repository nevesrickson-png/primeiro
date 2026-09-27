#!/usr/bin/env bash
# Atalhos para o Hermes Agent em Docker (Linux, macOS e VPS).
set -euo pipefail
cd "$(dirname "$0")"

export HERMES_UID="$(id -u)" HERMES_GID="$(id -g)"
dc() { docker compose "$@"; }

preparar() {
  mkdir -p dados backups
  chmod 700 dados
  if [ ! -f .env ]; then
    cp .env.example .env
    chmod 600 .env
    echo "Criei o arquivo .env. Edite-o (senha do painel e chave de API) e rode de novo."
    exit 1
  fi
  if grep -q '^HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=troque-esta-senha' .env; then
    echo "Troque HERMES_DASHBOARD_BASIC_AUTH_PASSWORD no arquivo .env antes de continuar."
    exit 1
  fi
}

case "${1:-ajuda}" in
  setup)     preparar; dc pull; dc run --rm hermes setup ;;
  iniciar)   preparar; dc up -d; echo "Painel: http://localhost:${DASHBOARD_PORT:-9119}" ;;
  parar)     dc down ;;
  reiniciar) dc restart ;;
  status)    dc ps ;;
  logs)      dc logs -f --tail 200 ;;
  chat)      dc exec hermes hermes ;;
  atualizar) dc pull; dc up -d ;;
  backup)
    mkdir -p backups
    arquivo="backups/hermes-$(date +%Y%m%d-%H%M%S).tar.gz"
    rodando="$(dc ps -q hermes || true)"
    [ -n "$rodando" ] && dc stop
    (umask 077; tar czf "$arquivo" dados .env docker-compose.yml)
    [ -n "$rodando" ] && dc start
    echo "Backup criado: $arquivo"
    ;;
  *)
    cat <<'AJUDA'
Uso: ./hermes.sh <comando>
  setup      primeira configuração (assistente interativo)
  iniciar    sobe o agente em segundo plano (com painel web)
  parar      desliga o agente
  reiniciar  reinicia o agente
  status     mostra se está rodando
  logs       acompanha os logs (Ctrl+C para sair)
  chat       abre o chat no terminal
  atualizar  baixa a versão nova da imagem e reinicia
  backup     compacta dados + .env em backups/
AJUDA
    ;;
esac
