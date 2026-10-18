import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: { alias: { '@shared': path.resolve(import.meta.dirname, '../shared') } },
  server: { port: 5170, fs: { allow: ['..'] } },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, 'index.html'),
        accessibility: path.resolve(import.meta.dirname, 'accessibility.html'),
        privacy: path.resolve(import.meta.dirname, 'privacy.html'),
      },
    },
  },
})
