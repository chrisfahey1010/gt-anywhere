// @vitest-environment node

import { describe, expect, it } from "vitest";
import config from "../../vite.config";

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
});
