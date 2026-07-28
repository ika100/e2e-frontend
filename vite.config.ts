import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      thresholds: {
        'src/api/': { lines: 90, functions: 90, branches: 90, statements: 90 },
      },
    },
  },
})
