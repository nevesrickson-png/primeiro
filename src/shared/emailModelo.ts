import { VARIAVEIS_EMAIL } from './constants'

export interface DadosDestinatario {
  nome: string | null
  empresa: string | null
  cidade: string | null
  profissao: string | null
}

function valores(d: DadosDestinatario): Record<string, string> {
  const nome = (d.nome ?? '').trim()
  return {
    nome,
    primeiro_nome: nome.split(/\s+/)[0] ?? '',
    empresa: d.empresa ?? '',
    cidade: d.cidade ?? '',
    profissao: d.profissao ?? ''
  }
}

/** Troca {{variavel}} pelos dados do lead (sem acentuar maiúsculas/minúsculas: {{ Primeiro_Nome }} também vale). */
export function preencher(texto: string, d: DadosDestinatario): string {
  const v = valores(d)
  return texto.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (orig, chave: string) => {
    const k = chave.toLowerCase()
    return k in v ? v[k] : orig
  })
}

/** Variáveis desconhecidas usadas no texto (para avisar antes de enviar). */
export function variaveisDesconhecidas(texto: string): string[] {
  const validas = new Set(VARIAVEIS_EMAIL.map((x) => x.chave as string))
  const r = new Set<string>()
  for (const m of texto.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/gi)) if (!validas.has(m[1].toLowerCase())) r.add(m[1])
  return [...r]
}

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Texto simples → HTML seguro: escapa tudo, depois aplica **negrito**, _itálico_,
 * links (http/https e e-mails) e parágrafos/quebras de linha.
 */
export function textoParaHtml(texto: string): string {
  const linhas = escapar(texto)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_(.+?)_(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#2551eb">$1</a>')
    .replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.-]+\w)/g, '$1<a href="mailto:$2" style="color:#2551eb">$2</a>')
  return linhas
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export interface MensagemMontada {
  assunto: string
  texto: string
  html: string
}

/** Monta assunto, versão texto e versão HTML (com rodapé de descadastro) para um destinatário. */
export function montarMensagem(assunto: string, corpo: string, rodape: string, d: DadosDestinatario): MensagemMontada {
  const a = preencher(assunto, d).replace(/[\r\n]+/g, ' ').trim()
  const c = preencher(corpo, d).trim()
  const r = rodape.trim()
  const texto = r ? `${c}\n\n--\n${r}` : c
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff">
<div style="max-width:600px;margin:0 auto;padding:24px;font-family:Segoe UI,Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2937">
${textoParaHtml(c)}
${r ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 12px"><p style="margin:0;font-size:12px;color:#6b7280">${escapar(r)}</p>` : ''}
</div></body></html>`
  return { assunto: a, texto, html }
}
