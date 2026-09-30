import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 개발 중 /api 요청은 Spring Boot 서버로 전달
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
