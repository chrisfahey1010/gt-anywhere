import { describe, expect, it } from "vitest";
import { resolvePublicAssetPath } from "../../src/app/config/runtime-paths";

describe("runtime paths", () => {
  it("resolves public asset paths from the domain root by default", () => {
    expect(resolvePublicAssetPath("data/world-gen/location-presets.json", "/")).toBe(
      "/data/world-gen/location-presets.json"
    );
    expect(resolvePublicAssetPath("/data/tuning/sedan.json", "/")).toBe("/data/tuning/sedan.json");
  });

  it("resolves public asset paths under nested public base paths", () => {
    expect(resolvePublicAssetPath("data/world-gen/location-presets.json", "/public-build/")).toBe(
      "/public-build/data/world-gen/location-presets.json"
    );
    expect(resolvePublicAssetPath("/data/tuning/sedan.json", "/preview/staging")).toBe(
      "/preview/staging/data/tuning/sedan.json"
    );
  });
});
