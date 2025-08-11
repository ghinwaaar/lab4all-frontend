import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const AWS_DEV = 'https://4wqwppx8z6.execute-api.us-east-1.amazonaws.com'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,        // ← run on http://localhost:3000
    strictPort: true,  // ← fail if taken instead of auto-switching
    proxy: {
      '/api': {
        target: AWS_DEV,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, '/dev'),
      },
    },
  },
  preview: {
    port: 3000,        // optional: vite preview also on 3000
    strictPort: true,
  },
})
