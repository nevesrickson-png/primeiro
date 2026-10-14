import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const artigos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/artigos' }),
  schema: z.object({
    titulo: z.string(),
    resumo: z.string(),
    categoria: z.enum(['protecao', 'patrimonio', 'grandes-mentes', 'bastidores']),
    data: z.coerce.date(),
    atualizado: z.coerce.date().optional().nullable(),
    em_resumo: z.string().optional().nullable(),
    capa: z.string().optional().nullable(),
    capa_alt: z.string().optional().nullable(),
    // Só artigos de Proteção: sinais de alerta do caso (o bloco "Antes de investir" é fixo).
    sinais: z.array(z.string()).optional().nullable(),
    destaque: z.boolean().default(false),
    rascunho: z.boolean().default(false)
  })
})

export const collections = { artigos }
