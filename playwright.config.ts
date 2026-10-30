import { defineConfig, devices } from '@playwright/test';
const pages = process.env.VITE_GITHUB_PAGES === 'true';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1,
  testMatch: pages ? '**/pages.spec.ts' : ['**/study.spec.ts', '**/verification.spec.ts'],
  globalSetup: './e2e/global-setup.ts',
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || (pages ? 'http://127.0.0.1:5173/MLN.FE-122/' : 'http://127.0.0.1:5173'), trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['Pixel 7'] } }],
});
