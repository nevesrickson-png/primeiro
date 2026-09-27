//go:build !windows

package main

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

func prepararConsole() {}

func acharDocker() string {
	for _, p := range []string{"docker", "/usr/local/bin/docker", "/Applications/Docker.app/Contents/Resources/bin/docker"} {
		if c, err := exec.LookPath(p); err == nil {
			return c
		}
	}
	return ""
}

func instalarDocker() error {
	if runtime.GOOS == "darwin" {
		abrirNavegador("https://www.docker.com/products/docker-desktop/")
		return errors.New("instale o Docker Desktop pela página que abri e clique no Hermes de novo")
	}
	return errors.New("instale o Docker (curl -fsSL https://get.docker.com | sh) e rode de novo")
}

func ligarDocker() error {
	if runtime.GOOS == "darwin" {
		return exec.Command("open", "-a", "Docker").Start()
	}
	return exec.Command("systemctl", "start", "docker").Run()
}

func esconderJanela(*exec.Cmd) {}

func abrirNavegador(url string) {
	abridor := "xdg-open"
	if runtime.GOOS == "darwin" {
		abridor = "open"
	}
	_ = exec.Command(abridor, url).Start()
}

func copiarParaAreaDeTransferencia(texto string) bool {
	if runtime.GOOS != "darwin" {
		return false
	}
	cmd := exec.Command("pbcopy")
	cmd.Stdin = strings.NewReader(texto)
	return cmd.Run() == nil
}

func escreverAtalhoParar() error {
	script := "#!/bin/sh\ncd \"$(dirname \"$0\")\" && docker compose down\n"
	return os.WriteFile(filepath.Join(pasta, "parar-hermes.sh"), []byte(script), 0o755)
}
