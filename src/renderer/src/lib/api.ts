import type { Resultado } from '@shared/types'

/** Desembrulha o resultado do IPC: devolve os dados ou lança Error com a mensagem em português. */
export async function chamar<T>(p: Promise<Resultado<T>>): Promise<T> {
  const r = await p
  if (!r.ok) throw new Error(r.erro)
  return r.data
}

export const api = window.api
