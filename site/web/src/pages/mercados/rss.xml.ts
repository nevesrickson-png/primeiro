// Feed RSS da seção Mercados (para leitores de notícias, agregadores e automações).
import type { APIRoute } from 'astro'
import { noticiasPublicadas } from '../../lib/noticias'
import { EDITORIAS } from '../../lib/mercados'

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!)

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://ricksonmessias.com')
  const itens = (await noticiasPublicadas()).slice(0, 50).map((n) => {
    const link = new URL(`/mercados/${n.id}`, base).href
    return `<item><title>${esc(n.data.titulo)}</title><link>${link}</link><guid>${link}</guid><pubDate>${n.data.data.toUTCString()}</pubDate><category>${esc(EDITORIAS[n.data.editoria].nome)}</category><description>${esc(n.data.linha_fina)}</description></item>`
  })
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Mercados · Rickson Messias</title><link>${new URL('/mercados', base).href}</link><description>Notícias de mercado, economia, empresas e fundos imobiliários.</description><language>pt-BR</language>${itens.join('')}</channel></rss>`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
