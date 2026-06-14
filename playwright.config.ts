import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    // Electron is launched via the fixture; no baseURL needed for web
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'electron',
      testMatch: /.*\.spec\.ts/,
    },
  ],
  // Ensure the app is built before E2E
  // (run `npm run build` separately or rely on dev mode via the fixture)
});
