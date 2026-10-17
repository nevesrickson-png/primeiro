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

// Notícias da seção Mercados (publicadas pelo agente de IA ou pelo painel). Formato em AGENTE-MERCADOS.md.
const noticias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/noticias' }),
  schema: z.object({
    titulo: z.string().min(10).max(140),
    linha_fina: z.string().min(20).max(300),
    editoria: z.enum(['mercados', 'economia', 'empresas', 'fiis', 'internacional']),
    data: z.coerce.date(),
    atualizado: z.coerce.date().optional().nullable(),
    autor: z.string().default('Redação'),
    // Conteúdo produzido com inteligência artificial ganha um aviso visível na notícia.
    ia: z.boolean().default(true),
    // Aceita minúsculas (petr4 → PETR4).
    tickers: z.array(z.string().trim().toUpperCase().regex(/^[A-Z0-9^=.\-]{1,12}$/)).max(8).default([]),
    // Só links http(s): o validador padrão aceitaria javascript: e data:.
    fontes: z.array(z.object({ nome: z.string().min(2), url: z.string().url().regex(/^https?:\/\//i) })).default([]),
    // Imagens ficam no próprio site (a política de segurança bloqueia imagens de outros domínios).
    imagem: z.string().regex(/^\/imagens\//, 'Use uma imagem em /imagens/…').optional().nullable(),
    imagem_alt: z.string().optional().nullable(),
    imagem_credito: z.string().optional().nullable(),
    destaque: z.boolean().default(false),
    urgente: z.boolean().default(false),
    rascunho: z.boolean().default(false)
  })
})

export const collections = { artigos, noticias }
