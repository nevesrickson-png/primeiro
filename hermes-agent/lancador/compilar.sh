#!/usr/bin/env bash
# Compila o lançador: dist/Hermes.exe (Windows) e binários para Linux/macOS.
# Requer Go 1.22+ e go-winres (go install github.com/tc-hib/go-winres@latest).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p embutido dist
cp ../docker-compose.yml embutido/
PATH="$PATH:$(go env GOPATH)/bin" go-winres make --arch amd64,arm64
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o dist/Hermes.exe .
CGO_ENABLED=0 GOOS=linux   GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o dist/hermes-linux .
CGO_ENABLED=0 GOOS=darwin  GOARCH=arm64 go build -trimpath -ldflags "-s -w" -o dist/hermes-mac .
ls -lh dist
