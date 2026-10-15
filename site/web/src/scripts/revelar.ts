// Textos e blocos aparecem suavemente ao entrar na tela (desligado com "reduzir movimento").
const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches

// Títulos principais entram palavra por palavra.
if (!reduzir) {
  document.querySelectorAll<HTMLElement>('h1.display, .ab__titulo').forEach((h) => {
    let i = 0
    const andar = (no: Node) => {
      for (const filho of Array.from(no.childNodes)) {
        if (filho.nodeType === Node.TEXT_NODE) {
          const partes = (filho.textContent ?? '').split(/(\s+)/)
          const frag = document.createDocumentFragment()
          for (const p of partes) {
            if (!p) continue
            if (/^\s+$/.test(p)) { frag.append(p); continue }
            const s = document.createElement('span')
            s.className = 'pal'
            s.style.setProperty('--i', String(i++))
            s.textContent = p
            frag.append(s)
          }
          filho.replaceWith(frag)
        } else if (filho.nodeType === Node.ELEMENT_NODE) andar(filho)
      }
    }
    andar(h)
    h.classList.add('palavras')
  })
}

const els = document.querySelectorAll<HTMLElement>('.rv')
if (!('IntersectionObserver' in window)) {
  els.forEach((e) => e.classList.add('on'))
} else {
  const io = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) {
          e.target.classList.add('on')
          io.unobserve(e.target)
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  )
  els.forEach((e) => {
    if (e.dataset.d) e.style.transitionDelay = `${e.dataset.d}ms`
    io.observe(e)
  })
}
