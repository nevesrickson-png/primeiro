import { app, net } from 'electron'

/** Valida a URL do App da Web. Em desenvolvimento aceita http://localhost para testes. */
export function validarUrl(url: string): string {
  const u = url.trim()
  if (!u) throw new Error('Informe a URL do App da Web do Apps Script.')
  let parsed: URL
  try {
    parsed = new URL(u)
  } catch {
    throw new Error('URL inválida.')
  }
  const local = ['localhost', '127.0.0.1'].includes(parsed.hostname)
  if (parsed.protocol !== 'https:' && !(local && !app.isPackaged)) throw new Error('A URL precisa começar com https://')
  return u
}

/**
 * Chama a ponte do Apps Script. O Google responde ao POST com um redirecionamento (302)
 * para o resultado; o fetch segue automaticamente e faz GET no endereço final.
 */
export async function chamarPonte<T>(url: string, token: string, acao: string, dados: Record<string, unknown> = {}): Promise<T> {
  let resposta: Response
  try {
    resposta = await net.fetch(validarUrl(url), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token, acao, ...dados }),
      redirect: 'follow',
      signal: AbortSignal.timeout(180_000)
    })
  } catch (e) {
    const msg = (e as Error).message ?? ''
    if (/abort|timeout/i.test(msg)) throw new Error('A planilha demorou demais para responder. Tente novamente.')
    throw new Error('Sem conexão com o Google. Verifique a internet e a URL configurada.')
  }
  const texto = await resposta.text()
  if (!resposta.ok) throw new Error(`O Google respondeu com erro HTTP ${resposta.status}. Confira a URL e se a implantação está ativa.`)
  let json: { ok: boolean; erro?: string; dados?: T }
  try {
    json = JSON.parse(texto)
  } catch {
    if (/<html/i.test(texto)) {
      throw new Error('A URL respondeu com uma página em vez de dados. Confira se copiou a URL do App da Web (termina em /exec) e se o acesso está como "Qualquer pessoa".')
    }
    throw new Error('Resposta inesperada da planilha.')
  }
  if (!json.ok) throw new Error(json.erro || 'A planilha recusou a operação.')
  return (json.dados ?? (json as unknown)) as T
}
