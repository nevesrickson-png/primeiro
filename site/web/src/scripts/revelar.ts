// Textos e blocos aparecem suavemente ao entrar na tela (desligado com "reduzir movimento").
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
