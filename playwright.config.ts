import { defineConfig, devices } from "@playwright/test";

function normalizePublicBasePath(value: string | undefined): string {
  if (!value || value === "/") {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;

  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

const publicBasePath = normalizePublicBasePath(process.env.GT_PUBLIC_BASE);
const baseURL = new URL(publicBasePath, "http://127.0.0.1:4173").toString();

export default defineConfig({
  testDir: "./tests/smoke",
  testMatch: /.*\.pw\.spec\.ts$/,
  fullyParallel: true,
  timeout: 60000,
  workers: 2,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: {
    command: "node ./scripts/preview-dist.mjs",
    port: 4173,
    reuseExistingServer: false,
    timeout: 120000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    }
  ]
});
