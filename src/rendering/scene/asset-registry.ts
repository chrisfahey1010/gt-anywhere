import { Scene, AssetContainer, LoadAssetContainerAsync } from '@babylonjs/core';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic';
import { resolveAssetRegistryPath, resolvePublicAssetPath } from '../../app/config/runtime-paths';
import { createLogger } from '../../app/logging/logger';

const logger = createLogger();

export interface AssetRegistry {
  vehicles: Record<string, VehicleAssetEntry>;
  world: Record<string, AssetEntry>;
  props: Record<string, AssetEntry>;
}

export interface AssetEntry {
  modelPath: string;
  rootScale: number;
  transformOffset: [number, number, number];
  fallbackProxy?: any;
}

export interface VehicleAssetEntry extends AssetEntry {
  fallbackProxy: { type: string; dimensions: [number, number, number] };
}

let loadersRegistered = false;
let registryCache: AssetRegistry | null = null;
let inFlightRegistryFetch: Promise<AssetRegistry> | null = null;
const assetSourceCache = new Map<string, Promise<Uint8Array>>();
const sceneAssetContainerCaches = new WeakMap<Scene, Map<string, Promise<AssetContainer | null>>>();
const trackedSceneAssetContainerCaches = new Set<Map<string, Promise<AssetContainer | null>>>();

function resolveAssetLoaderMetadata(modelPath: string): { name: string; pluginExtension: string } {
  const normalizedPath = modelPath.replace(/^\/+/, "");
  const name = normalizedPath.split("/").pop() ?? normalizedPath;
  const extensionIndex = name.lastIndexOf(".");
  const pluginExtension = extensionIndex >= 0 ? name.slice(extensionIndex) : "";

  return {
    name,
    pluginExtension
  };
}

function loadAssetSource(assetId: string, modelPath: string): Promise<Uint8Array> {
  const cached = assetSourceCache.get(assetId);
  if (cached) {
    return cached;
  }

  const sourcePromise = fetch(resolvePublicAssetPath(modelPath))
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load asset source: ${response.status} ${response.statusText}`.trim());
      }

      return new Uint8Array(await response.arrayBuffer());
    })
    .catch((error) => {
      assetSourceCache.delete(assetId);
      throw error;
    });

  assetSourceCache.set(assetId, sourcePromise);
  return sourcePromise;
}

function getSceneAssetContainerCache(scene: Scene): Map<string, Promise<AssetContainer | null>> {
  const cached = sceneAssetContainerCaches.get(scene);
  if (cached) {
    return cached;
  }

  const sceneCache = new Map<string, Promise<AssetContainer | null>>();
  sceneAssetContainerCaches.set(scene, sceneCache);
  trackedSceneAssetContainerCaches.add(sceneCache);
  scene.onDisposeObservable.addOnce(() => {
    trackedSceneAssetContainerCaches.delete(sceneCache);
    sceneCache.clear();
  });

  return sceneCache;
}

export async function loadAssetRegistry(): Promise<AssetRegistry> {
  if (registryCache) {
    return registryCache;
  }
  if (inFlightRegistryFetch) {
    return inFlightRegistryFetch;
  }

  inFlightRegistryFetch = fetch(resolveAssetRegistryPath())
    .then(res => {
      if (!res.ok) {
        throw new Error(`Failed to load asset registry: ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      registryCache = data as AssetRegistry;
      inFlightRegistryFetch = null;
      return registryCache;
    })
    .catch(err => {
      inFlightRegistryFetch = null;
      throw err;
    });

  return inFlightRegistryFetch;
}

export function clearAssetRegistryCache() {
  registryCache = null;
  inFlightRegistryFetch = null;
  assetSourceCache.clear();
  trackedSceneAssetContainerCaches.forEach((sceneCache) => {
    sceneCache.forEach((promise) => {
      promise.then((container) => container?.dispose());
    });
    sceneCache.clear();
  });
  trackedSceneAssetContainerCaches.clear();
}

export async function loadAssetContainer(
  assetId: string,
  modelPath: string,
  scene: Scene
): Promise<AssetContainer | null> {
  if (!loadersRegistered) {
    registerBuiltInLoaders();
    loadersRegistered = true;
  }

  const sceneCache = getSceneAssetContainerCache(scene);

  if (sceneCache.has(assetId)) {
    return sceneCache.get(assetId)!;
  }

  const loadPromise = (async () => {
    try {
      const source = await loadAssetSource(assetId, modelPath);
      const { name, pluginExtension } = resolveAssetLoaderMetadata(modelPath);
      const container = await LoadAssetContainerAsync(source, scene, {
        name,
        pluginExtension
      });
      return container;
    } catch (error) {
      console.error("LOAD ASSET CONTAINER ERROR:", error);
      logger.warn('asset-fallback', { assetId, reason: error instanceof Error ? error.message : String(error) });
      return null;
    }
  })().then((container) => {
    if (container === null) {
      sceneCache.delete(assetId);
    }

    return container;
  });

  sceneCache.set(assetId, loadPromise);
  return loadPromise;
}
