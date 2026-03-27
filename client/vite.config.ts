import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
