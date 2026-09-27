// Hermes.exe — abre o Hermes Agent com um clique.
//
// Na pasta onde estiver, o lançador cria docker-compose.yml, .env (com senha
// aleatória do painel) e dados/, garante que o Docker está instalado e ligado,
// sobe o container e abre o painel do Hermes no navegador.
package main

import (
	"bufio"
	"context"
	"crypto/rand"
	"embed"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

//go:embed embutido/docker-compose.yml
var embutido embed.FS

const usuarioPainel = "admin"

var (
	pasta  string // pasta do executável: tudo fica aqui (portátil)
	docker string // caminho do docker
)

func main() {
	prepararConsole()
	fmt.Println("☤ Hermes Agent")
	fmt.Println(strings.Repeat("─", 50))

	if err := executar(); err != nil {
		fmt.Println()
		fmt.Println("✗ " + err.Error())
		esperarEnter()
		os.Exit(1)
	}
}

func executar() error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	exe, _ = filepath.EvalSymlinks(exe)
	pasta = filepath.Dir(exe)

	primeiraVez, err := prepararPasta()
	if err != nil {
		return fmt.Errorf("não consegui preparar a pasta %s: %w", pasta, err)
	}

	if err := garantirDocker(); err != nil {
		return err
	}

	porta := lerEnv("DASHBOARD_PORT", "9119")
	endereco := "http://localhost:" + porta

	passo("Iniciando o Hermes (na primeira vez baixa ~2 GB, pode levar vários minutos)...")
	if err := compose("up", "-d"); err != nil {
		return errors.New("o Docker não conseguiu iniciar o Hermes (veja as mensagens acima)")
	}

	passo("Aguardando o painel responder...")
	if !esperarHTTP(endereco+"/login", 3*time.Minute) {
		return errors.New("o painel não respondeu. Veja os logs com: docker logs hermes")
	}

	senha := lerEnv("HERMES_DASHBOARD_BASIC_AUTH_PASSWORD", "")
	if primeiraVez {
		copiada := copiarParaAreaDeTransferencia(senha)
		fmt.Println()
		fmt.Println("  Primeiro acesso — anote (também salvo em ACESSO.txt):")
		fmt.Println("    usuário: " + usuarioPainel)
		if copiada {
			fmt.Println("    senha:   " + senha + "   (já copiada, é só colar)")
		} else {
			fmt.Println("    senha:   " + senha)
		}
		fmt.Println()
		fmt.Println("  No painel, abra \"Keys\" e conecte um provedor de IA")
		fmt.Println("  (o Nous Portal tem plano grátis). Depois use \"Chat\".")
		abrirNavegador(endereco + "/env")
		esperarEnter()
		return nil
	}

	abrirNavegador(endereco + "/chat")
	passo("Pronto! O Hermes abriu no navegador.")
	time.Sleep(3 * time.Second)
	return nil
}

// prepararPasta cria os arquivos que faltam. Retorna true na primeira execução.
func prepararPasta() (bool, error) {
	if err := os.MkdirAll(filepath.Join(pasta, "dados"), 0o700); err != nil {
		return false, err
	}

	arqCompose := filepath.Join(pasta, "docker-compose.yml")
	if _, err := os.Stat(arqCompose); errors.Is(err, os.ErrNotExist) {
		conteudo, _ := embutido.ReadFile("embutido/docker-compose.yml")
		if err := os.WriteFile(arqCompose, conteudo, 0o644); err != nil {
			return false, err
		}
	}

	arqEnv := filepath.Join(pasta, ".env")
	if _, err := os.Stat(arqEnv); err == nil {
		return false, nil
	}

	senha := senhaAleatoria(20)
	env := strings.Join([]string{
		"# Gerado pelo Hermes.exe. Veja LEIA-ME.md para as opções.",
		"HERMES_TAG=latest",
		"HERMES_DASHBOARD_BASIC_AUTH_USERNAME=" + usuarioPainel,
		"HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=" + senha,
		"HERMES_DASHBOARD_BASIC_AUTH_SECRET=" + hexAleatorio(32),
		"BIND_ADDR=127.0.0.1",
		"DASHBOARD_PORT=9119",
		"API_PORT=8642",
		"LIMITE_MEMORIA=4G",
		"",
	}, "\n")
	if err := os.WriteFile(arqEnv, []byte(env), 0o600); err != nil {
		return false, err
	}

	acesso := fmt.Sprintf("Painel do Hermes: http://localhost:9119\r\nusuário: %s\r\nsenha:   %s\r\n\r\n"+
		"Para desligar o Hermes, execute \"Parar Hermes\".\r\n", usuarioPainel, senha)
	_ = os.WriteFile(filepath.Join(pasta, "ACESSO.txt"), []byte(acesso), 0o600)
	_ = escreverAtalhoParar()
	return true, nil
}

// garantirDocker verifica se o Docker está instalado e ligado; se não, instala/liga.
func garantirDocker() error {
	passo("Verificando o Docker...")
	docker = acharDocker()
	if docker == "" {
		if err := instalarDocker(); err != nil {
			return err
		}
		docker = acharDocker()
		if docker == "" {
			return errors.New("o Docker foi instalado, mas precisa reiniciar o computador. " +
				"Reinicie e clique no Hermes de novo")
		}
	}

	if dockerLigado() {
		return nil
	}
	passo("Ligando o Docker Desktop (pode levar 1–2 minutos)...")
	if err := ligarDocker(); err != nil {
		return fmt.Errorf("não consegui abrir o Docker Desktop: %w", err)
	}
	limite := time.Now().Add(4 * time.Minute)
	for time.Now().Before(limite) {
		if dockerLigado() {
			return nil
		}
		time.Sleep(3 * time.Second)
	}
	return errors.New("o Docker não ficou pronto. Abra o Docker Desktop, aceite os termos " +
		"(só na primeira vez) e clique no Hermes de novo")
}

func dockerLigado() bool {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, docker, "info")
	esconderJanela(cmd)
	return cmd.Run() == nil
}

func compose(args ...string) error {
	base := []string{"compose", "--project-directory", pasta, "-f", filepath.Join(pasta, "docker-compose.yml")}
	cmd := exec.Command(docker, append(base, args...)...)
	cmd.Dir = pasta
	cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
	return cmd.Run()
}

func esperarHTTP(url string, max time.Duration) bool {
	cliente := &http.Client{
		Timeout:       5 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}
	limite := time.Now().Add(max)
	for time.Now().Before(limite) {
		if r, err := cliente.Get(url); err == nil {
			r.Body.Close()
			if r.StatusCode < 500 {
				return true
			}
		}
		time.Sleep(2 * time.Second)
	}
	return false
}

// lerEnv lê uma variável do .env da pasta.
func lerEnv(chave, padrao string) string {
	f, err := os.Open(filepath.Join(pasta, ".env"))
	if err != nil {
		return padrao
	}
	defer f.Close()
	s := bufio.NewScanner(f)
	for s.Scan() {
		linha := strings.TrimSpace(s.Text())
		if v, ok := strings.CutPrefix(linha, chave+"="); ok && v != "" {
			return strings.Trim(v, `"'`)
		}
	}
	return padrao
}

func senhaAleatoria(n int) string {
	const letras = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, n)
	for i := range b {
		k, _ := rand.Int(rand.Reader, big.NewInt(int64(len(letras))))
		b[i] = letras[k.Int64()]
	}
	return string(b)
}

func hexAleatorio(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func passo(msg string) { fmt.Println("• " + msg) }

func perguntarSimNao(pergunta string) bool {
	fmt.Print(pergunta + " [S/n] ")
	r, _ := bufio.NewReader(os.Stdin).ReadString('\n')
	r = strings.ToLower(strings.TrimSpace(r))
	return r == "" || r == "s" || r == "sim" || r == "y"
}

func esperarEnter() {
	fmt.Print("\nPressione Enter para fechar...")
	_, _ = bufio.NewReader(os.Stdin).ReadString('\n')
}
