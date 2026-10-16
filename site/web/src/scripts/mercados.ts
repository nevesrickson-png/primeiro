/**
 * Seção Mercados no navegador: busca /api/cotacoes, preenche a faixa, os indicadores, as tabelas e os
 * códigos citados nas notícias, e mostra horários relativos ("há 20 min"). Atualiza a cada 5 minutos.
 */
import { ATIVOS, TAXAS, formatarPreco, formatarVariacao, hora, dataExtensa, type RespostaCotacoes, type Cotacao } from '../lib/mercados'

const CHAVE = 'mercados:cotacoes'
const IDS_FIXOS = new Set<string>([...ATIVOS.map((a) => a.id), ...TAXAS.map((t) => t.id)])
const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches
const nfTaxa = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Códigos citados nas notícias desta página que não estão na faixa fixa.
const extras = [...new Set(Array.from(document.querySelectorAll<HTMLElement>('[data-chip]')).map((e) => e.dataset.chip!))]
  .filter((c) => !IDS_FIXOS.has(c)).slice(0, 8)
const url = `/api/cotacoes${extras.length ? `?extra=${extras.join(',')}` : ''}`

const sentido = (v: number) => (v > 0.005 ? 'sobe' : v < -0.005 ? 'cai' : 'estavel')
const seta = (v: number) => (v > 0.005 ? '▲' : v < -0.005 ? '▼' : '■')

function preencher(d: RespostaCotacoes) {
  const porId = new Map<string, Cotacao>(d.ativos.map((a) => [a.id, a]))
  const taxas = new Map(d.taxas.map((t) => [t.id, t]))

  // Faixa
  document.querySelectorAll<HTMLElement>('[data-faixa-lista] [data-item]').forEach((li) => {
    const id = li.dataset.item!
    const preco = li.querySelector('.faixa__preco')!, v = li.querySelector('.faixa__var')!
    if (li.hasAttribute('data-taxa')) {
      const t = taxas.get(id)
      li.hidden = !t
      if (t) { preco.textContent = `${nfTaxa.format(t.valor)}${t.unidade.startsWith('%') ? '%' : ''}`; v.textContent = id === 'IPCA' ? '12 meses' : 'ao ano'; v.className = 'faixa__var' }
      return
    }
    const a = porId.get(id)
    li.hidden = !a
    if (!a) return
    preco.textContent = formatarPreco(a)
    v.textContent = `${seta(a.variacao)} ${formatarVariacao(a.variacao)}`
    v.className = `faixa__var faixa__var--${sentido(a.variacao)}`
  })
  animarFaixa()

  // Indicadores e tabelas
  document.querySelectorAll<HTMLElement>('[data-cot-preco]').forEach((e) => { const a = porId.get(e.dataset.cotPreco!); e.textContent = a ? formatarPreco(a) : '—' })
  document.querySelectorAll<HTMLElement>('[data-cot-var]').forEach((e) => {
    const a = porId.get(e.dataset.cotVar!)
    e.textContent = a ? formatarVariacao(a.variacao) : ''
    e.className = a ? `var var--${sentido(a.variacao)}` : ''
  })
  document.querySelectorAll<HTMLElement>('[data-taxa-valor]').forEach((e) => {
    const t = taxas.get(e.dataset.taxaValor!)
    e.textContent = t ? `${nfTaxa.format(t.valor)}%` : '—'
  })

  // Códigos citados nas notícias
  document.querySelectorAll<HTMLElement>('[data-chip]').forEach((e) => {
    const a = porId.get(e.dataset.chip!)
    const t = taxas.get(e.dataset.chip!)
    e.dataset.valor = a ? `${formatarPreco(a)} ${formatarVariacao(a.variacao)}` : t ? `${nfTaxa.format(t.valor)}%` : ''
    e.classList.remove('sobe', 'cai', 'estavel')
    if (a) e.classList.add(sentido(a.variacao))
  })

  const info = document.querySelector('[data-faixa-info]')
  if (info) info.textContent = `Atualizado às ${hora(new Date(d.atualizado))} · dados com atraso`
  document.querySelectorAll('[data-fonte]').forEach((e) => (e.textContent = `Fontes: ${d.fonte}`))
}

function animarFaixa() {
  const lista = document.querySelector<HTMLElement>('[data-faixa-lista]')
  if (!lista || reduzir) return
  // Duplica os itens uma vez para a rolagem contínua (a cópia fica escondida dos leitores de tela).
  lista.querySelectorAll('[data-copia]').forEach((e) => e.remove())
  Array.from(lista.children).forEach((li) => {
    const c = li.cloneNode(true) as HTMLElement
    c.dataset.copia = ''
    c.setAttribute('aria-hidden', 'true')
    lista.appendChild(c)
  })
  const largura = lista.scrollWidth / 2
  lista.style.setProperty('--duracao', `${Math.max(30, largura / 45)}s`)
  lista.classList.add('rolando')
}

function erro() {
  const info = document.querySelector('[data-faixa-info]')
  if (info) info.textContent = 'Cotações indisponíveis no momento'
  document.querySelector('[data-faixa]')?.classList.add('faixa--erro')
}

async function carregar() {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!r.ok) throw new Error(String(r.status))
    const d = (await r.json()) as RespostaCotacoes
    try { sessionStorage.setItem(CHAVE + url, JSON.stringify(d)) } catch { /* navegação privada */ }
    preencher(d)
  } catch {
    if (!document.querySelector('.faixa__preco:not(:empty)')?.textContent?.match(/\d/)) erro()
  }
}

// Horários relativos nas notícias das últimas 24 horas.
function relativos() {
  const agora = Date.now()
  document.querySelectorAll<HTMLTimeElement>('time[data-relativo]').forEach((t) => {
    const min = Math.round((agora - Date.parse(t.dateTime)) / 60000)
    if (min < 0 || min >= 24 * 60) return
    t.textContent = min < 1 ? 'agora' : min < 60 ? `há ${min} min` : `há ${Math.floor(min / 60)} h`
    t.title = new Date(t.dateTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  })
}

document.querySelectorAll('[data-hoje]').forEach((e) => (e.textContent = dataExtensa(new Date())))
try {
  const guardado = sessionStorage.getItem(CHAVE + url)
  if (guardado) preencher(JSON.parse(guardado))
} catch { /* sem cache */ }
relativos()
carregar()
setInterval(() => { if (!document.hidden) { carregar(); relativos() } }, 5 * 60 * 1000)
