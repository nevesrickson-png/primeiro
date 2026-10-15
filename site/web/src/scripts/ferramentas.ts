/** Utilidades das ferramentas: leitura dos campos, estado na URL (para compartilhar a simulação) e gráfico SVG. */
import { numeroBR, reaisCurto, reais } from '../lib/financas'

export function ligarFerramenta(form: HTMLFormElement, calcular: () => void) {
  // Restaura a simulação a partir da URL (?aporte=1000&taxa=8 …).
  const params = new URLSearchParams(location.search)
  for (const el of Array.from(form.elements) as HTMLInputElement[]) {
    if (!el.name || !params.has(el.name)) continue
    if (el.type === 'checkbox') el.checked = params.get(el.name) === '1'
    else if (el.type === 'radio') el.checked = el.value === params.get(el.name)
    else el.value = params.get(el.name) ?? el.value
  }
  // Campos com controle deslizante espelhado.
  form.querySelectorAll<HTMLInputElement>('input[type=range][data-espelho]').forEach((r) => {
    const alvo = form.elements.namedItem(r.dataset.espelho!) as HTMLInputElement
    r.value = String(numeroBR(alvo.value))
    r.addEventListener('input', () => {
      alvo.value = Number(r.value).toLocaleString('pt-BR')
      atualizar()
    })
    alvo.addEventListener('input', () => (r.value = String(numeroBR(alvo.value))))
  })
  let espera: number | undefined
  const atualizar = () => {
    calcular()
    clearTimeout(espera)
    espera = window.setTimeout(() => {
      const p = new URLSearchParams()
      for (const el of Array.from(form.elements) as HTMLInputElement[]) {
        if (!el.name || el.type === 'range') continue
        if (el.type === 'checkbox') p.set(el.name, el.checked ? '1' : '0')
        else if (el.type === 'radio') { if (el.checked) p.set(el.name, el.value) }
        else p.set(el.name, el.value)
      }
      history.replaceState(null, '', `${location.pathname}?${p}`)
    }, 400)
  }
  form.addEventListener('input', atualizar)
  form.addEventListener('change', atualizar)
  form.addEventListener('submit', (e) => e.preventDefault())
  form.querySelector('[data-copiar-simulacao]')?.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement
    try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copiado' } catch { prompt('Copie o link:', location.href) }
    setTimeout(() => (b.textContent = 'Copiar link desta simulação'), 2000)
  })
  calcular()
}

// Limites de idades e prazos: valores absurdos (ex.: 999999999999 anos) travariam os laços de cálculo.
const LIMITES: Record<string, [number, number]> = {
  idade: [0, 110], aposentar: [0, 120], final: [0, 130], anos: [0, 100], meses: [0, 600], prazo: [0, 600], parcelas: [0, 240]
}
const ler = (form: HTMLFormElement, nome: string): number => numeroBR((form.elements.namedItem(nome) as HTMLInputElement)?.value ?? '0')
const limitar = (v: number, [min, max]: [number, number]) => Math.min(max, Math.max(min, v))
/** Valor numérico do campo; valores em reais não podem ser negativos nem astronômicos. */
export const num = (form: HTMLFormElement, nome: string): number => limitar(ler(form, nome), LIMITES[nome] ?? [0, 1e11])
/** Taxas que podem ser negativas (juro real abaixo da inflação). As demais vão de 0% a 1.000%. */
const PODE_NEGATIVA = new Set(['taxaAcum', 'taxaRet'])
/** Taxa em fração (10 → 0,1). */
export const taxa = (form: HTMLFormElement, nome: string): number => limitar(ler(form, nome), [PODE_NEGATIVA.has(nome) ? -99 : 0, 1000]) / 100
export function texto(id: string, valor: string) {
  const el = document.getElementById(id)
  if (el && el.textContent !== valor) {
    el.textContent = valor
    el.classList.remove('pisca')
    void el.offsetWidth
    el.classList.add('pisca')
  }
}

export interface Serie { nome: string; valores: number[]; cor: string; area?: boolean; tracejada?: boolean }

/** Gráfico de linhas/áreas em SVG com leitura ao passar o mouse. */
export function grafico(alvo: HTMLElement, series: Serie[], rotulosX: string[], formatar: (v: number) => string = reais) {
  const W = 760, H = 340, m = { t: 16, r: 16, b: 34, l: 72 }
  const n = rotulosX.length
  const max = Math.max(1, ...series.flatMap((s) => s.valores)) * 1.08
  const x = (i: number) => m.l + (i / Math.max(1, n - 1)) * (W - m.l - m.r)
  const y = (v: number) => H - m.b - (v / max) * (H - m.t - m.b)
  const passos = 4
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="graf" role="img" aria-label="Gráfico da simulação">`
  for (let k = 0; k <= passos; k++) {
    const v = (max / passos) * k
    svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" class="graf__grade"/><text x="${m.l - 10}" y="${y(v) + 4}" text-anchor="end" class="graf__eixo">${reaisCurto(v)}</text>`
  }
  const saltoX = Math.ceil(n / 8)
  rotulosX.forEach((r, i) => { if (i % saltoX === 0 || i === n - 1) svg += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" class="graf__eixo">${r}</text>` })
  for (const s of series) {
    const pts = s.valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
    if (s.area) svg += `<polygon points="${x(0)},${y(0)} ${pts} ${x(n - 1)},${y(0)}" fill="${s.cor}" opacity="0.12"/>`
    svg += `<polyline points="${pts}" fill="none" stroke="${s.cor}" stroke-width="${s.tracejada ? 1.6 : 2.4}" ${s.tracejada ? 'stroke-dasharray="5 5"' : ''} stroke-linejoin="round" pathLength="1" class="graf__linha"/>`
  }
  svg += `<line class="graf__cursor" y1="${m.t}" y2="${H - m.b}" x1="0" x2="0"/>`
  series.forEach((s, k) => (svg += `<circle class="graf__ponto" data-k="${k}" r="4.5" fill="${s.cor}"/>`))
  svg += `<rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent" class="graf__area"/></svg>`
  const legenda = series.map((s) => `<span><i style="background:${s.cor}"></i>${s.nome}</span>`).join('')
  alvo.innerHTML = `${svg}<div class="graf__dica" hidden></div><div class="graf__legenda">${legenda}</div>`
  if (!alvo.dataset.desenhado) { alvo.classList.add('graf--anima'); alvo.dataset.desenhado = '1' } else alvo.classList.remove('graf--anima')
  const el = alvo.querySelector('svg')!, dica = alvo.querySelector<HTMLElement>('.graf__dica')!
  const cursor = alvo.querySelector<SVGLineElement>('.graf__cursor')!
  const pontos = alvo.querySelectorAll<SVGCircleElement>('.graf__ponto')
  const mostrar = (cx: number) => {
    const r = el.getBoundingClientRect()
    const vx = ((cx - r.left) / r.width) * W
    const i = Math.max(0, Math.min(n - 1, Math.round(((vx - m.l) / (W - m.l - m.r)) * (n - 1))))
    cursor.setAttribute('x1', String(x(i))); cursor.setAttribute('x2', String(x(i))); cursor.style.opacity = '1'
    pontos.forEach((p, k) => { p.setAttribute('cx', String(x(i))); p.setAttribute('cy', String(y(series[k].valores[i]))); p.style.opacity = '1' })
    dica.hidden = false
    dica.innerHTML = `<b>${rotulosX[i]}</b>` + series.map((s) => `<span><i style="background:${s.cor}"></i>${s.nome}: ${formatar(s.valores[i])}</span>`).join('')
    const px = (x(i) / W) * r.width
    dica.style.left = `${Math.min(Math.max(px, 90), r.width - 90)}px`
  }
  const esconder = () => { dica.hidden = true; cursor.style.opacity = '0'; pontos.forEach((p) => (p.style.opacity = '0')) }
  el.addEventListener('pointermove', (e) => mostrar(e.clientX))
  el.addEventListener('pointerleave', esconder)
  esconder()
}
