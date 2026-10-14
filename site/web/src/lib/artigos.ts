import { getCollection, type CollectionEntry } from 'astro:content'

export type Artigo = CollectionEntry<'artigos'>

const mostrarRascunhos = import.meta.env.DEV || import.meta.env.PUBLIC_MOSTRAR_RASCUNHOS === '1'

/** Artigos publicados, do mais recente para o mais antigo. */
export async function artigosPublicados(): Promise<Artigo[]> {
  const todos = await getCollection('artigos', ({ data }) => mostrarRascunhos || !data.rascunho)
  return todos.sort((a, b) => b.data.data.getTime() - a.data.data.getTime())
}

export function tempoLeitura(texto: string | undefined): number {
  const palavras = (texto ?? '').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(palavras / 200))
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export function dataCurta(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
export function dataISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}
