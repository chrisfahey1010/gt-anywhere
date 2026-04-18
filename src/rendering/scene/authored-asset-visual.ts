import {
  StandardMaterial,
  TransformNode,
  type AbstractMesh,
  type Material,
  type Scene
} from "@babylonjs/core";
import { loadAssetContainer, type AssetEntry } from "./asset-registry";

export interface AuthoredVisualAttachment {
  dispose(): void;
  root: TransformNode;
}

export interface AttachAuthoredVisualOptions {
  assetId: string;
  entry?: AssetEntry;
  proxyMesh: AbstractMesh;
  scene: Scene;
  verticalOffset?: number;
}

function hideProxyMaterial(material: Material | null | undefined): void {
  if (material instanceof StandardMaterial) {
    material.alpha = 0;
  }
}

function showProxyMaterial(material: Material | null | undefined): void {
  if (material instanceof StandardMaterial) {
    material.alpha = 1;
  }
}

export async function attachAuthoredVisualToProxy(
  options: AttachAuthoredVisualOptions
): Promise<AuthoredVisualAttachment | null> {
  const { assetId, entry, proxyMesh, scene, verticalOffset = 0 } = options;

  if (!entry) {
    return null;
  }

  const container = await loadAssetContainer(assetId, entry.modelPath, scene);

  if (!container) {
    return null;
  }

  const instantiated = container.instantiateModelsToScene((name) => `${proxyMesh.name}-${name}`);
  const authoredRoot = new TransformNode(`${proxyMesh.name}-authored-root`, scene);

  authoredRoot.parent = proxyMesh;
  authoredRoot.position.copyFromFloats(
    entry.transformOffset[0],
    verticalOffset + entry.transformOffset[1],
    entry.transformOffset[2]
  );
  authoredRoot.scaling.scaleInPlace(entry.rootScale);

  instantiated.rootNodes.forEach((node) => {
    node.parent = authoredRoot;
  });

  hideProxyMaterial(proxyMesh.material);

  return {
    dispose: () => {
      showProxyMaterial(proxyMesh.material);
      instantiated.dispose();
      authoredRoot.dispose();
    },
    root: authoredRoot
  };
}
