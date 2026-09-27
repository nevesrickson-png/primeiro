# Atalhos para o Hermes Agent em Docker (Windows, PowerShell).
# Uso: .\hermes.ps1 <comando>   (se bloquear: powershell -ExecutionPolicy Bypass -File .\hermes.ps1 <comando>)
param([string]$Comando = "ajuda")
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Preparar {
  New-Item -ItemType Directory -Force dados, backups | Out-Null
  if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Criei o arquivo .env. Edite-o (senha do painel e chave de API) e rode de novo."
    exit 1
  }
  if (Select-String -Path .env -Pattern '^HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=troque-esta-senha' -Quiet) {
    Write-Host "Troque HERMES_DASHBOARD_BASIC_AUTH_PASSWORD no arquivo .env antes de continuar."
    exit 1
  }
}

switch ($Comando) {
  "setup"     { Preparar; docker compose pull; docker compose run --rm hermes setup }
  "iniciar"   { Preparar; docker compose up -d; Write-Host "Painel: http://localhost:9119" }
  "parar"     { docker compose down }
  "reiniciar" { docker compose restart }
  "status"    { docker compose ps }
  "logs"      { docker compose logs -f --tail 200 }
  "chat"      { docker compose exec hermes hermes }
  "atualizar" { docker compose pull; docker compose up -d }
  "backup" {
    New-Item -ItemType Directory -Force backups | Out-Null
    $arquivo = "backups\hermes-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
    $rodando = docker compose ps -q hermes
    if ($rodando) { docker compose stop }
    tar czf $arquivo dados .env docker-compose.yml
    if ($rodando) { docker compose start }
    Write-Host "Backup criado: $arquivo"
  }
  default {
    Write-Host @"
Uso: .\hermes.ps1 <comando>
  setup      primeira configuração (assistente interativo)
  iniciar    sobe o agente em segundo plano (com painel web)
  parar      desliga o agente
  reiniciar  reinicia o agente
  status     mostra se está rodando
  logs       acompanha os logs (Ctrl+C para sair)
  chat       abre o chat no terminal
  atualizar  baixa a versão nova da imagem e reinicia
  backup     compacta dados + .env em backups\
"@
  }
}
