import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
export default defineConfig(({ mode }) => ({
  base: loadEnv(mode, process.cwd(), 'VITE_').VITE_GITHUB_PAGES === 'true' ? '/MLN.FE-122/' : '/',
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom', setupFiles: ['./src/tests/setup.ts'], include: ['src/**/*.test.{ts,tsx}'], restoreMocks: true },
  build: { rollupOptions: { output: { manualChunks: { charts: ['recharts'], react: ['react', 'react-dom', 'react-router-dom'] } } } },
}));
