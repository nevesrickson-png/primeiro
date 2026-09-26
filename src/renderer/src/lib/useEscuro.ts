import { useEffect, useState } from 'react'

/** Acompanha a classe "dark" do <html> (o tema pode mudar sem recarregar a tela). */
export function useEscuro(): boolean {
  const [escuro, setEscuro] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const obs = new MutationObserver(() => setEscuro(document.documentElement.classList.contains('dark')))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return escuro
}
