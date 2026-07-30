import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import EditorApp from './EditorApp.tsx'
import PlansEditorApp from './PlansEditorApp.tsx'
import EventsEditorApp from './EventsEditorApp.tsx'

// Dev-only local editors (never reach the production build):
//   /?editor        → places editor (Google Maps)
//   /?editor=plans  → plans editor (map-free, search only)
//   /?editor=events → events editor (map-free, search only)
const params = new URLSearchParams(window.location.search)
const useEditor = import.meta.env.DEV && params.has('editor')
const editorKind = params.get('editor')

const root = !useEditor
  ? <App />
  : editorKind === 'plans' ? <PlansEditorApp />
  : editorKind === 'events' ? <EventsEditorApp />
  : <EditorApp />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {root}
  </StrictMode>,
)
