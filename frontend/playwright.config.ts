import { defineConfig, devices } from '@playwright/test';

const frontendUrl = process.env.LIVE_FRONTEND_URL || 'http://127.0.0.1:5173';
const isLocalTarget = frontendUrl.includes('127.0.0.1') || frontendUrl.includes('localhost');

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(isLocalTarget
    ? {
        webServer: [
          {
            command:
              'cd ../backend && (.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 2>/dev/null || python -m uvicorn app.main:app --host 127.0.0.1 --port 8000)',
            url: 'http://127.0.0.1:8000/docs',
            reuseExistingServer: true,
            timeout: 60_000,
          },
          {
            command: 'npm run dev -- --host 127.0.0.1 --port 5173',
            url: 'http://127.0.0.1:5173',
            reuseExistingServer: true,
            timeout: 60_000,
            env: {
              VITE_API_BASE_URL: 'http://127.0.0.1:8000',
            },
          },
        ],
      }
    : {}),
});
