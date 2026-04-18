import { MeshBuilder, NullEngine, Scene, StandardMaterial } from "@babylonjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadAssetContainerMock } = vi.hoisted(() => ({
  loadAssetContainerMock: vi.fn()
}));

vi.mock("../../src/rendering/scene/asset-registry", () => ({
  loadAssetContainer: loadAssetContainerMock
}));

describe("authored asset visual attachment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches authored visuals under the proxy mesh and hides the fallback proxy", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const proxyMesh = MeshBuilder.CreateBox("proxy", { height: 2, width: 2, depth: 2 }, scene);
    const proxyMaterial = new StandardMaterial("proxy-material", scene);
    const authoredMesh = MeshBuilder.CreateBox("authored", { height: 1, width: 1, depth: 1 }, scene);

    proxyMesh.material = proxyMaterial;
    loadAssetContainerMock.mockResolvedValue({
      instantiateModelsToScene: () => ({
        dispose: vi.fn(),
        rootNodes: [authoredMesh]
      })
    });

    const { attachAuthoredVisualToProxy } = await import("../../src/rendering/scene/authored-asset-visual");
    const attachment = await attachAuthoredVisualToProxy({
      assetId: "prop:signpost",
      entry: {
        fallbackProxy: { dimensions: [0.35, 2.6, 0.35], type: "box" },
        modelPath: "assets/models/props/signpost.obj",
        rootScale: 1,
        transformOffset: [0, 0, 0]
      },
      proxyMesh,
      scene,
      verticalOffset: -1
    });

    expect(attachment).not.toBeNull();
    expect(proxyMaterial.alpha).toBe(0);
    expect(attachment?.root.parent).toBe(proxyMesh);
    expect(attachment?.root.position.y).toBe(-1);

    attachment?.dispose();
    scene.dispose();
    engine.dispose();
  });

  it("leaves the proxy visible when the authored asset cannot be loaded", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const proxyMesh = MeshBuilder.CreateBox("proxy", { height: 2, width: 2, depth: 2 }, scene);
    const proxyMaterial = new StandardMaterial("proxy-material", scene);

    proxyMesh.material = proxyMaterial;
    loadAssetContainerMock.mockResolvedValue(null);

    const { attachAuthoredVisualToProxy } = await import("../../src/rendering/scene/authored-asset-visual");
    const attachment = await attachAuthoredVisualToProxy({
      assetId: "world:building-0",
      entry: {
        fallbackProxy: { dimensions: [20, 24, 18], type: "box" },
        modelPath: "assets/models/world/building-0.obj",
        rootScale: 1,
        transformOffset: [0, 0, 0]
      },
      proxyMesh,
      scene,
      verticalOffset: -1
    });

    expect(attachment).toBeNull();
    expect(proxyMaterial.alpha).toBe(1);

    scene.dispose();
    engine.dispose();
  });
});
