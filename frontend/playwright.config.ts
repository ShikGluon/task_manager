import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      // Start the .NET API from its project directory so the SQLite path resolves correctly
      command: 'sh -c "cd ../api/TaskManager.Api && dotnet run --launch-profile http"',
      url: 'http://localhost:5208/swagger/index.html',
      timeout: 90_000,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      timeout: 15_000,
      reuseExistingServer: true,
    },
  ],
})
