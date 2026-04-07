import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "tests/unit/**/*.spec.ts",
      "tests/integration/**/*.spec.ts",
      "tests/smoke/**/*.spec.ts"
    ],
    exclude: ["tests/**/*.pw.spec.ts"]
  }
});
