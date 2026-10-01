import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Valida que VITE_API_URL apunte al backend correcto según el comando:
//   npm run dev     -> solo http://localhost o http://127.0.0.1
//   npm run build   -> solo https:// y nunca localhost
//   npm run preview -> sin validación (sirve un build ya generado)
function validarApiUrl(command, mode, isPreview) {
  if (isPreview) return

  const envDir = fileURLToPath(new URL('.', import.meta.url))
  const url = loadEnv(mode, envDir, 'VITE_').VITE_API_URL

  if (!url) {
    throw new Error(
      `[veltrax] Falta VITE_API_URL para el modo "${mode}". ` +
      'Revisa .env.development o .env.production (ver .env.example).'
    )
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`[veltrax] VITE_API_URL no es una URL válida: "${url}"`)
  }

  const esLocal = ['localhost', '127.0.0.1'].includes(parsed.hostname)

  if (command === 'serve' && !(parsed.protocol === 'http:' && esLocal)) {
    throw new Error(
      `[veltrax] En desarrollo VITE_API_URL debe ser http://localhost o http://127.0.0.1, ` +
      `pero es "${url}". Revisa .env.development.`
    )
  }

  if (command === 'build' && (parsed.protocol !== 'https:' || esLocal)) {
    throw new Error(
      `[veltrax] En build VITE_API_URL debe usar https:// y no puede ser localhost, ` +
      `pero es "${url}". Revisa .env.production o la variable del servidor de despliegue.`
    )
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode, isPreview }) => {
  validarApiUrl(command, mode, isPreview)

  return {
    plugins: [react()],
  }
})
