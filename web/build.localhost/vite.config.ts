import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dataFsPlugin } from './server/fs-api.ts'

// build.localhost is a local-only workbench: it talks to the repo's data/
// directory through the dev server and is never deployed. There is no build
// step on purpose — `bun run dev` is the whole story.
export default defineConfig({
  plugins: [react(), tailwindcss(), dataFsPlugin()],
  server: {
    port: 5180,
    strictPort: true,
  },
})
