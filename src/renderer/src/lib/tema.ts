export type Tema = 'claro' | 'escuro'

export function temaAtual(): Tema {
  try {
    const t = localStorage.getItem('tema')
    if (t === 'claro' || t === 'escuro') return t
  } catch {
    /* ignora */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function aplicarTema(t: Tema): void {
  document.documentElement.classList.toggle('dark', t === 'escuro')
  try {
    localStorage.setItem('tema', t)
  } catch {
    /* ignora */
  }
}
