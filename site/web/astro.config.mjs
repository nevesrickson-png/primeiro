// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://ricksonmessias.com',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [sitemap({ filter: (p) => !p.includes('/obrigado') })],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' }
})
