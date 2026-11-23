import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig(({ mode }) => ({ base: loadEnv(mode, process.cwd(), '').VITE_BASE_PATH || '/Bad-Reading-Club/', plugins: [react(), tailwindcss()] }))
