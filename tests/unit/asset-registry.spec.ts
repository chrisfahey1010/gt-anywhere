import { beforeEach, describe, expect, it, vi } from "vitest";
import { NullEngine, Scene } from "@babylonjs/core";

const { loadAssetContainerAsyncMock, registerBuiltInLoadersMock } = vi.hoisted(() => ({
  loadAssetContainerAsyncMock: vi.fn(),
  registerBuiltInLoadersMock: vi.fn()
}));
const fetchMock = vi.fn();

globalThis.fetch = fetchMock as typeof fetch;

vi.mock("@babylonjs/core", async () => {
  const actual = await vi.importActual<typeof import("@babylonjs/core")>("@babylonjs/core");

  return {
    ...actual,
    LoadAssetContainerAsync: loadAssetContainerAsyncMock
  };
});

vi.mock("@babylonjs/loaders/dynamic", () => ({
  registerBuiltInLoaders: registerBuiltInLoadersMock
}));

describe("asset registry", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { clearAssetRegistryCache } = await import("../../src/rendering/scene/asset-registry");
    clearAssetRegistryCache();
  });

  it("loads and caches the registry contract", async () => {
    const { loadAssetRegistry } = await import("../../src/rendering/scene/asset-registry");
    const registry = {
      props: {},
      vehicles: {},
      world: {}
    };

    fetchMock.mockResolvedValue({
      json: async () => registry,
      ok: true
    });

    await expect(loadAssetRegistry()).resolves.toEqual(registry);
    await expect(loadAssetRegistry()).resolves.toEqual(registry);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses the same container load for repeated requests in one scene", async () => {
    const { loadAssetContainer } = await import("../../src/rendering/scene/asset-registry");
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const container = { name: "scene-a-container", dispose: vi.fn() } as any;
    const responseBuffer = new ArrayBuffer(16);

    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => responseBuffer
    });
    loadAssetContainerAsyncMock.mockResolvedValue(container);

    await expect(loadAssetContainer("sedan", "assets/vehicles/sedan.glb", scene)).resolves.toBe(container);
    await expect(loadAssetContainer("sedan", "assets/vehicles/sedan.glb", scene)).resolves.toBe(container);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(loadAssetContainerAsyncMock).toHaveBeenCalledTimes(1);

    scene.dispose();
    engine.dispose();
  });

  it("loads a fresh container when the same asset is requested from a new scene", async () => {
    const { loadAssetContainer } = await import("../../src/rendering/scene/asset-registry");
    const engineA = new NullEngine();
    const sceneA = new Scene(engineA);
    const engineB = new NullEngine();
    const sceneB = new Scene(engineB);
    const firstContainer = { name: "scene-a-container", dispose: vi.fn() } as any;
    const secondContainer = { name: "scene-b-container", dispose: vi.fn() } as any;
    const responseBuffer = new ArrayBuffer(16);

    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => responseBuffer
    });
    loadAssetContainerAsyncMock.mockResolvedValueOnce(firstContainer).mockResolvedValueOnce(secondContainer);

    await expect(loadAssetContainer("sedan", "assets/vehicles/sedan.glb", sceneA)).resolves.toBe(firstContainer);
    await expect(loadAssetContainer("sedan", "assets/vehicles/sedan.glb", sceneB)).resolves.toBe(secondContainer);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(loadAssetContainerAsyncMock).toHaveBeenCalledTimes(2);

    sceneA.dispose();
    engineA.dispose();
    sceneB.dispose();
    engineB.dispose();
  });

  it("returns null on asset load failure and retries on the next request", async () => {
    const { loadAssetContainer } = await import("../../src/rendering/scene/asset-registry");
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const container = { name: "scene-a-container", dispose: vi.fn() } as any;
    const responseBuffer = new ArrayBuffer(16);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found"
    });

    await expect(loadAssetContainer("sedan", "assets/vehicles/sedan.glb", scene)).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => responseBuffer
    });
    loadAssetContainerAsyncMock.mockResolvedValueOnce(container);

    await expect(loadAssetContainer("sedan", "assets/vehicles/sedan.glb", scene)).resolves.toBe(container);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loadAssetContainerAsyncMock).toHaveBeenCalledTimes(1);

    scene.dispose();
    engine.dispose();
  });
});
