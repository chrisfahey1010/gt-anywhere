// @vitest-environment node

import { describe, expect, it } from "vitest";
import config from "../../vite.config";
import packageJson from "../../package.json";

describe("vite config", () => {
  it("splits Babylon runtime packages into stable manual chunks", () => {
    const output = config.build?.rollupOptions?.output;
    const manualChunks = Array.isArray(output) ? output[0]?.manualChunks : output?.manualChunks;

    function* getModuleIds(): IterableIterator<string> {
      return;
    }

    const meta = {
      getModuleIds,
      getModuleInfo: () => null
    };

    expect(typeof manualChunks).toBe("function");

    if (typeof manualChunks !== "function") {
      return;
    }

    expect(manualChunks("/repo/node_modules/@babylonjs/core/Engines/engine.js", meta)).toBe("babylon-core");
    expect(manualChunks("/repo/node_modules/@babylonjs/havok/lib/index.js", meta)).toBe("babylon-havok");
    expect(manualChunks("/repo/src/app/bootstrap/create-game-app.ts", meta)).toBeUndefined();
  });

  it("injects deterministic release metadata derived from the package version and git state", () => {
    const releaseMetadata = config.define?.__GT_RELEASE_METADATA__;

    expect(typeof releaseMetadata).toBe("string");

    if (typeof releaseMetadata !== "string") {
      return;
    }

    const parsedReleaseMetadata = JSON.parse(releaseMetadata) as Record<string, string>;

    expect(parsedReleaseMetadata).toMatchObject({
      appName: "GT Anywhere",
      appVersion: packageJson.version,
      releaseId: expect.stringContaining(packageJson.version)
    });
    expect(parsedReleaseMetadata.releaseCommit).toMatch(/[0-9a-f]{7,}|unknown/);
  });
});
