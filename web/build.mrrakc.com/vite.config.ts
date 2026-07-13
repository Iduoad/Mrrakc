import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { placesFsPlugin } from './vite-plugin-places-fs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    placesFsPlugin(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        const commitHash = process.env.CF_PAGES_COMMIT_SHA || 'dev'
        return html.replace(
          '</head>',
          `<meta name="version" content="${commitHash}">\n  </head>`
        )
      }
    }
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@vis.gl/react-google-maps') || id.includes('google-maps')) {
            return 'maps';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})
