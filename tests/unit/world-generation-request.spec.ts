import { createWorldGenerationRequest } from "../../src/world/generation/location-resolver";

describe("world generation request", () => {
  const identity = {
    query: "San Francisco, CA",
    normalizedQuery: "san francisco, ca",
    placeName: "San Francisco, CA",
    sessionKey: "san-francisco-ca-story-1-1",
    reuseKey: "san-francisco-ca"
  };

  it("threads typed settings through the launch handoff with generation and runtime splits", () => {
    const request = createWorldGenerationRequest(identity, () => "2026-04-07T00:00:00.000Z", {
      worldSize: "medium",
      graphicsPreset: "high",
      trafficDensity: "low",
      pedestrianDensity: "off"
    });

    expect(request.settings).toEqual({
      worldSize: "medium",
      graphicsPreset: "high",
      trafficDensity: "low",
      pedestrianDensity: "off"
    });
    expect(request.generationSettings).toEqual({
      worldSize: "medium",
      trafficDensity: "low",
      pedestrianDensity: "off"
    });
    expect(request.runtimeSettings).toEqual({
      graphicsPreset: "high"
    });
  });

  it("changes compatibility identity only when generation-affecting settings differ", () => {
    const baseline = createWorldGenerationRequest(identity, () => "2026-04-07T00:00:00.000Z", {
      worldSize: "medium",
      graphicsPreset: "low",
      trafficDensity: "medium",
      pedestrianDensity: "medium"
    });
    const graphicsOnly = createWorldGenerationRequest(identity, () => "2026-04-07T00:00:00.000Z", {
      worldSize: "medium",
      graphicsPreset: "high",
      trafficDensity: "medium",
      pedestrianDensity: "medium"
    });
    const densityChange = createWorldGenerationRequest(identity, () => "2026-04-07T00:00:00.000Z", {
      worldSize: "medium",
      graphicsPreset: "low",
      trafficDensity: "low",
      pedestrianDensity: "medium"
    });

    expect(graphicsOnly.compatibilityKey).toBe(baseline.compatibilityKey);
    expect(densityChange.compatibilityKey).not.toBe(baseline.compatibilityKey);
  });
});
