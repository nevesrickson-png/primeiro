/**
 * Celebração quando a pessoa alcança um objetivo nas ferramentas: confete nas cores da marca
 * e um cartão de conquista. Sem confete para quem pediu "reduzir movimento".
 */
const CORES = ['#CBB27A', '#D8C28F', '#7A6438', '#F5F1E8', '#1D3350']
const jaCelebrado = new Set<string>()

function confete() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const c = document.createElement('canvas')
  c.className = 'confete'
  c.setAttribute('aria-hidden', 'true')
  document.body.appendChild(c)
  const ctx = c.getContext('2d')!
  const dpr = Math.min(devicePixelRatio || 1, 2)
  const W = (c.width = innerWidth * dpr), H = (c.height = innerHeight * dpr)
  const pecas = Array.from({ length: 160 }, (_, i) => {
    const lado = i % 2 ? 1 : -1
    return {
      x: lado > 0 ? W * 0.15 : W * 0.85, y: H * 0.85,
      vx: (Math.random() * 9 + 5) * lado * dpr * (i % 4 === 0 ? 0.5 : 1), vy: -(Math.random() * 16 + 14) * dpr,
      g: 0.42 * dpr, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      w: (Math.random() * 6 + 5) * dpr, h: (Math.random() * 8 + 6) * dpr, cor: CORES[i % CORES.length], forma: i % 3
    }
  })
  const inicio = performance.now()
  const passo = (t: number) => {
    const dt = Math.min(2, (t - inicio) / 1000)
    ctx.clearRect(0, 0, W, H)
    for (const p of pecas) {
      p.vy += p.g; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r)
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, dt - 1.6) / 1.2)
      ctx.fillStyle = p.cor
      if (p.forma === 0) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill() }
      else if (p.forma === 1) ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * 0.4)
      else { ctx.beginPath(); ctx.moveTo(0, -p.h / 2); ctx.lineTo(p.w / 2, p.h / 2); ctx.lineTo(-p.w / 2, p.h / 2); ctx.fill() }
      ctx.restore()
    }
    if (t - inicio < 3000) requestAnimationFrame(passo)
    else c.remove()
  }
  requestAnimationFrame(passo)
}

/** Mostra o cartão de conquista. `chave` evita repetir a mesma celebração na mesma visita. */
export function celebrar(chave: string, titulo: string, texto: string) {
  if (jaCelebrado.has(chave)) return
  jaCelebrado.add(chave)
  confete()
  document.querySelector('.conquista')?.remove()
  const el = document.createElement('div')
  el.className = 'conquista'
  el.setAttribute('role', 'status')
  el.innerHTML = `
    <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="58" r="40" fill="none" stroke="#CBB27A" stroke-width="2"/>
      <path d="M60 34 L68 36 L92 8 L84 52 L86 62 L76 80 L66 96 L60 102 L54 96 L44 80 L34 62 L36 52 L28 8 L52 36 Z" fill="none" stroke="#CBB27A" stroke-width="3" stroke-linejoin="round"/>
      <path d="M8 108 L112 108" stroke="#CBB27A" stroke-width="2.5"/></svg>
    <div><p class="conquista__chapeu">Objetivo alcançado</p><p class="conquista__titulo"></p><p class="conquista__texto"></p></div>
    <button type="button" aria-label="Fechar">×</button>`
  el.querySelector('.conquista__titulo')!.textContent = titulo
  el.querySelector('.conquista__texto')!.textContent = texto
  el.querySelector('button')!.addEventListener('click', () => el.remove())
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('on'))
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 600) }, 9000)
}

/** Libera a celebração de novo quando a condição deixa de valer (ex.: a pessoa mudou os números). */
export function rearmar(chave: string) {
  jaCelebrado.delete(chave)
}

const FRASES: [number, string][] = [
  [1, 'Chegou. Agora é proteger o que foi construído.'],
  [0.75, 'Reta final. A disciplina está trabalhando por você.'],
  [0.5, 'Metade do caminho. Daqui em diante os juros pesam mais.'],
  [0.25, 'Os primeiros degraus são os mais difíceis. Você já subiu.'],
  [0, 'Todo patrimônio começou exatamente aqui.']
]

/** Atualiza uma barra de progresso `[data-progresso="id"]` com a frase do momento. */
export function progresso(id: string, fracao: number) {
  const el = document.querySelector<HTMLElement>(`[data-progresso="${id}"]`)
  if (!el) return
  const f = Math.max(0, Math.min(1, Number.isFinite(fracao) ? fracao : 0))
  el.style.setProperty('--p', String(f))
  el.classList.toggle('completo', f >= 1)
  const pct = el.querySelector('[data-pct]')
  if (pct) pct.textContent = `${Math.round(f * 100)}%`
  const frase = el.querySelector('[data-frase]')
  if (frase) frase.textContent = FRASES.find(([lim]) => f >= lim)![1]
}
