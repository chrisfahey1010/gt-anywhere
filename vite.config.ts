import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@babylonjs/core/")) {
            return "babylon-core";
          }

          if (id.includes("/node_modules/@babylonjs/havok/")) {
            return "babylon-havok";
          }

          return undefined;
        }
      }
    }
  },
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
