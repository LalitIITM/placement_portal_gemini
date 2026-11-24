import { defineConfig, devices } from '@playwright/test';

const frontendUrl = process.env.LIVE_FRONTEND_URL || 'http://127.0.0.1:5174';
const isLocalTarget = frontendUrl.includes('127.0.0.1') || frontendUrl.includes('localhost');

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
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
            command: process.platform === 'win32' ? "..\\backend\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010" : "sh -c 'if [ -x .venv/bin/python ]; then exec .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8010; else exec python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8010; fi'",
            cwd: "../backend",
            url: 'http://127.0.0.1:8010/docs',
            reuseExistingServer: false,
            timeout: 60_000,
          },
          {
            command: 'npm run dev -- --host 127.0.0.1 --port 5174',
            url: 'http://127.0.0.1:5174',
            reuseExistingServer: false,
            timeout: 60_000,
            env: {
              VITE_API_BASE_URL: 'http://127.0.0.1:8010',
            },
          },
        ],
      }
    : {}),
});
