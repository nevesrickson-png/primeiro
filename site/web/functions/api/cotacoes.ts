/**
 * Cotações da seção Mercados — Cloudflare Pages Function (GET /api/cotacoes).
 *
 * Fontes gratuitas, sem chave: Banco Central (Selic, CDI, IPCA) e Yahoo Finance (bolsa, FIIs, câmbio,
 * exterior). Se BRAPI_TOKEN estiver configurado, os ativos da B3 vêm da brapi.dev (fonte brasileira).
 * A resposta fica 5 minutos em cache na borda: com qualquer volume de visitas, são poucas chamadas às fontes.
 *
 * ?extra=PETR4,HGLG11 acrescenta até 8 códigos (usado nas notícias que citam ativos).
 */
import { ATIVOS, TAXAS, CODIGO_VALIDO, simboloYahoo, tipoPorCodigo, type Cotacao, type Taxa, type RespostaCotacoes } from '../../src/lib/mercados.ts'

interface Env { BRAPI_TOKEN?: string }
interface Contexto { request: Request; env: Env; waitUntil?: (p: Promise<unknown>) => void }

const CACHE_SEGUNDOS = 300
const TEMPO_LIMITE = 8000
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ricksonmessias.com)' }

async function json(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(TEMPO_LIMITE) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

async function yahoo(codigo: string, rotulo: string, simbolo: string, tipo: Cotacao['tipo']): Promise<Cotacao | null> {
  try {
    const d = await json(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbolo)}?range=1d&interval=1d`, { headers: UA })
    const m = d?.chart?.result?.[0]?.meta
    const preco = Number(m?.regularMarketPrice), anterior = Number(m?.chartPreviousClose ?? m?.previousClose)
    if (!Number.isFinite(preco) || preco <= 0) return null
    const variacao = Number.isFinite(anterior) && anterior > 0 ? ((preco - anterior) / anterior) * 100 : 0
    return { id: codigo, rotulo, tipo, preco, variacao, moeda: String(m?.currency || 'BRL') }
  } catch {
    return null
  }
}

async function brapi(codigos: string[], token: string): Promise<Map<string, Cotacao>> {
  const mapa = new Map<string, Cotacao>()
  if (!codigos.length) return mapa
  try {
    const d = await json(`https://brapi.dev/api/quote/${codigos.join(',')}`, { headers: { Authorization: `Bearer ${token}` } })
    for (const r of d?.results ?? []) {
      const preco = Number(r?.regularMarketPrice)
      if (!Number.isFinite(preco) || preco <= 0) continue
      mapa.set(r.symbol, { id: r.symbol, rotulo: r.symbol, tipo: tipoPorCodigo(r.symbol), preco, variacao: Number(r.regularMarketChangePercent) || 0, moeda: 'BRL' })
    }
  } catch { /* cai para o Yahoo */ }
  return mapa
}

async function bcb(serie: number, tentativa = 1): Promise<{ valor: number; data: string } | null> {
  try {
    const d = await json(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/1?formato=json`)
    const ultimo = d?.[d.length - 1]
    const valor = Number(String(ultimo?.valor).replace(',', '.'))
    return Number.isFinite(valor) ? { valor, data: String(ultimo.data) } : null
  } catch {
    return tentativa < 2 ? bcb(serie, tentativa + 1) : null
  }
}

export async function montarCotacoes(env: Env, extras: string[]): Promise<RespostaCotacoes> {
  const lista = [
    ...ATIVOS.map((a) => ({ id: a.id, rotulo: a.rotulo, yahoo: a.yahoo, tipo: a.tipo })),
    ...extras.filter((e) => !ATIVOS.some((a) => a.id === e)).map((e) => ({ id: e, rotulo: e, yahoo: simboloYahoo(e), tipo: tipoPorCodigo(e) }))
  ]
  const daB3 = (s: string) => s.endsWith('.SA') && s !== 'IFIX.SA'
  const viaBrapi = env.BRAPI_TOKEN ? await brapi(lista.filter((a) => daB3(a.yahoo)).map((a) => a.id), env.BRAPI_TOKEN) : new Map<string, Cotacao>()

  const [ativos, taxas] = await Promise.all([
    Promise.all(lista.map(async (a) => {
      const b = viaBrapi.get(a.id)
      return b ? { ...b, rotulo: a.rotulo } : yahoo(a.id, a.rotulo, a.yahoo, a.tipo)
    })),
    Promise.all(TAXAS.map(async (t) => {
      const r = await bcb(t.serie)
      const taxa: Taxa | null = r ? { id: t.id, rotulo: t.rotulo, valor: r.valor, data: r.data, unidade: t.unidade } : null
      return taxa
    }))
  ])
  return {
    atualizado: new Date().toISOString(),
    ativos: ativos.filter((a): a is Cotacao => a !== null),
    taxas: taxas.filter((t): t is Taxa => t !== null),
    fonte: `${viaBrapi.size ? 'brapi.dev, ' : ''}Yahoo Finance e Banco Central. Dados com atraso.`
  }
}

export async function onRequestGet({ request, env, waitUntil }: Contexto): Promise<Response> {
  const url = new URL(request.url)
  const extras = [...new Set((url.searchParams.get('extra') || '').toUpperCase().split(',').map((s) => s.trim()).filter((s) => CODIGO_VALIDO.test(s)))].sort().slice(0, 8)
  // Chave de cache normalizada: a mesma para qualquer visitante com os mesmos códigos.
  const chave = new Request(`${url.origin}/api/cotacoes${extras.length ? `?extra=${extras.join(',')}` : ''}`)
  const cache = typeof caches !== 'undefined' ? (caches as unknown as { default: Cache }).default : null

  const gerar = async (anterior?: RespostaCotacoes) => {
    const dados = await montarCotacoes(env, extras)
    // Fonte instável (o Banco Central às vezes demora): mantém o último valor bom do que faltar.
    if (anterior) {
      for (const a of anterior.ativos) if (!dados.ativos.some((x) => x.id === a.id)) dados.ativos.push(a)
      for (const t of anterior.taxas) if (!dados.taxas.some((x) => x.id === t.id)) dados.taxas.push(t)
    }
    const ok = dados.ativos.length > 0 || dados.taxas.length > 0
    const r = new Response(JSON.stringify(dados), {
      status: ok ? 200 : 503,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // O navegador guarda 1 minuto; a cópia da borda vale 1 hora, renovada a cada 5 minutos (abaixo).
        'Cache-Control': 'public, max-age=60, s-maxage=3600',
        'X-Content-Type-Options': 'nosniff'
      }
    })
    if (cache && ok) await cache.put(chave, r.clone())
    return r
  }

  const guardada = cache ? await cache.match(chave) : undefined
  if (guardada) {
    // Cópia velha: responde na hora e atualiza em segundo plano (ninguém espera pelas fontes).
    const anterior = (await guardada.clone().json()) as RespostaCotacoes
    const idade = (Date.now() - Date.parse(anterior.atualizado)) / 1000
    if (idade > CACHE_SEGUNDOS && waitUntil) waitUntil(gerar(anterior))
    return guardada
  }
  return gerar()
}
