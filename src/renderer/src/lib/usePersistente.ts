import { useEffect, useState } from 'react'

/** useState que sobrevive à navegação (sessionStorage), ex.: filtros da lista. */
export function usePersistente<T>(chave: string, inicial: T): [T, (v: T | ((a: T) => T)) => void] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const s = sessionStorage.getItem(chave)
      return s ? { ...inicial, ...JSON.parse(s) } : inicial
    } catch {
      return inicial
    }
  })
  useEffect(() => {
    try {
      sessionStorage.setItem(chave, JSON.stringify(valor))
    } catch {
      /* ignora */
    }
  }, [chave, valor])
  return [valor, setValor]
}
