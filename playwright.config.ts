import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry"
  },
  webServer: {
    command: "pnpm --filter @reinado/votacion dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  projects: [
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } }
  ]
});
