package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

func prepararConsole() {
	k := syscall.NewLazyDLL("kernel32.dll")
	k.NewProc("SetConsoleOutputCP").Call(65001)
	k.NewProc("SetConsoleCP").Call(65001)
	titulo, _ := syscall.UTF16PtrFromString("Hermes Agent")
	k.NewProc("SetConsoleTitleW").Call(uintptr(unsafe.Pointer(titulo)))
}

func programFiles() string {
	if p := os.Getenv("ProgramFiles"); p != "" {
		return p
	}
	return `C:\Program Files`
}

func acharDocker() string {
	if p, err := exec.LookPath("docker"); err == nil {
		return p
	}
	p := filepath.Join(programFiles(), "Docker", "Docker", "resources", "bin", "docker.exe")
	if _, err := os.Stat(p); err == nil {
		return p
	}
	return ""
}

func instalarDocker() error {
	fmt.Println()
	fmt.Println("  O Hermes roda dentro do Docker Desktop, que não está instalado.")
	fmt.Println("  A instalação é feita uma única vez e pede permissão de administrador.")
	if !perguntarSimNao("  Instalar o Docker Desktop agora?") {
		return errors.New("sem o Docker Desktop o Hermes não consegue rodar")
	}
	if _, err := exec.LookPath("winget"); err != nil {
		abrirNavegador("https://www.docker.com/products/docker-desktop/")
		return errors.New("baixe e instale o Docker Desktop pela página que abri, " +
			"reinicie o computador e clique no Hermes de novo")
	}
	passo("Instalando o Docker Desktop (aceite a janela de permissão)...")
	cmd := exec.Command("winget", "install", "-e", "--id", "Docker.DockerDesktop",
		"--accept-package-agreements", "--accept-source-agreements")
	cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("a instalação do Docker falhou (%v). Instale pelo site docker.com e tente de novo", err)
	}
	return errors.New("Docker Desktop instalado! Reinicie o computador, abra o Docker Desktop " +
		"uma vez para aceitar os termos e depois clique no Hermes de novo")
}

func ligarDocker() error {
	app := filepath.Join(programFiles(), "Docker", "Docker", "Docker Desktop.exe")
	if _, err := os.Stat(app); err != nil {
		return err
	}
	return exec.Command(app).Start()
}

func esconderJanela(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
}

func abrirNavegador(url string) {
	_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}

func copiarParaAreaDeTransferencia(texto string) bool {
	cmd := exec.Command("clip")
	cmd.Stdin = strings.NewReader(texto)
	esconderJanela(cmd)
	return cmd.Run() == nil
}

func escreverAtalhoParar() error {
	script := "@echo off\r\n" +
		"cd /d \"%~dp0\"\r\n" +
		"echo Desligando o Hermes...\r\n" +
		"docker compose down\r\n" +
		"timeout /t 3 >nul\r\n"
	return os.WriteFile(filepath.Join(pasta, "Parar Hermes.cmd"), []byte(script), 0o644)
}
