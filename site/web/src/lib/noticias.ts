import { getCollection, type CollectionEntry } from 'astro:content'
import type { Editoria } from './mercados'

export type Noticia = CollectionEntry<'noticias'>

const mostrarRascunhos = import.meta.env.DEV || import.meta.env.PUBLIC_MOSTRAR_RASCUNHOS === '1'

// O agente de IA escreve a partir de textos de terceiros: HTML ativo no corpo (scripts, iframes, formulários,
// eventos) indica injeção e tira a notícia do ar em vez de publicá-la.
const HTML_PERIGOSO = /<\s*(script|iframe|object|embed|form|input|button|style|link|meta|base)\b|<[^>]+\son[a-z]+\s*=|(\]\(|href\s*=\s*["']?)\s*(javascript|data):/i
const avisadas = new Set<string>()
function segura(n: Noticia): boolean {
  if (!HTML_PERIGOSO.test(n.body ?? '')) return true
  if (!avisadas.has(n.id)) { avisadas.add(n.id); console.warn(`[mercados] notícia "${n.id}" ignorada: contém HTML não permitido.`) }
  return false
}

/** Notícias publicadas (opcionalmente de uma editoria), da mais recente para a mais antiga. */
export async function noticiasPublicadas(editoria?: Editoria): Promise<Noticia[]> {
  const todas = await getCollection('noticias', (n) => (mostrarRascunhos || !n.data.rascunho) && (!editoria || n.data.editoria === editoria) && segura(n))
  return todas.sort((a, b) => b.data.data.getTime() - a.data.data.getTime())
}

export function minutosLeitura(texto: string | undefined): number {
  return Math.max(1, Math.round((texto ?? '').split(/\s+/).filter(Boolean).length / 200))
}
