import { getCollection, type CollectionEntry } from 'astro:content'
import type { Editoria } from './mercados'

export type Noticia = CollectionEntry<'noticias'>

const mostrarRascunhos = import.meta.env.DEV || import.meta.env.PUBLIC_MOSTRAR_RASCUNHOS === '1'

/** Notícias publicadas (opcionalmente de uma editoria), da mais recente para a mais antiga. */
export async function noticiasPublicadas(editoria?: Editoria): Promise<Noticia[]> {
  const todas = await getCollection('noticias', ({ data }) => (mostrarRascunhos || !data.rascunho) && (!editoria || data.editoria === editoria))
  return todas.sort((a, b) => b.data.data.getTime() - a.data.data.getTime())
}

export function minutosLeitura(texto: string | undefined): number {
  return Math.max(1, Math.round((texto ?? '').split(/\s+/).filter(Boolean).length / 200))
}
