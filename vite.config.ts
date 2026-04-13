import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

function tryReadGitValue(command: string): string {
  try {
    return execSync(command, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "unknown";
  }
}

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
  version: string;
};
const releaseCommit = tryReadGitValue("git rev-parse --short HEAD");
const releaseMetadata = {
  appName: "GT Anywhere",
  appVersion: packageJson.version,
  releaseCommit,
  releaseCommittedAt: tryReadGitValue("git log -1 --date=iso-strict --format=%cI"),
  releaseId: releaseCommit === "unknown" ? packageJson.version : `${packageJson.version}+${releaseCommit}`
};

export default defineConfig({
  define: {
    __GT_RELEASE_METADATA__: JSON.stringify(releaseMetadata)
  },
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
