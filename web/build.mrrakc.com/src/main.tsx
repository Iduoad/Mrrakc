import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import EditorApp from './EditorApp.tsx'

// Dev-only local editor: open http://localhost:5173/?editor
// The editor and its file-writing dev API never reach the production build.
const useEditor =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('editor')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {useEditor ? <EditorApp /> : <App />}
  </StrictMode>,
)
