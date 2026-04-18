# External Asset Replacement Pipeline

This document describes the shipped asset-replacement seam used to swap default proxy visuals with authored models without rewriting gameplay systems.

## Asset Registry (`public/data/assets/registry.json`)

The runtime contract is split into `vehicles`, `world`, and `props`. Each entry is keyed by a stable asset id and defines:

- `modelPath`: a path under `public/` resolved at runtime
- `rootScale`: a uniform scale applied after instantiation
- `transformOffset`: a `[x, y, z]` tuple applied relative to the proxy anchor
- `fallbackProxy`: the proxy shape and dimensions that remain authoritative for collision/fallback behavior

```json
{
  "vehicles": {
    "sedan": {
      "modelPath": "assets/models/vehicles/sedan.glb",
      "rootScale": 1.0,
      "transformOffset": [0, 0, 0],
      "fallbackProxy": {
        "type": "box",
        "dimensions": [2.0, 1.5, 4.5]
      }
    }
  },
  "world": {
    "building-0": {
      "modelPath": "assets/models/world/building-0.obj",
      "rootScale": 1.0,
      "transformOffset": [0, 0, 0],
      "fallbackProxy": {
        "type": "box",
        "dimensions": [20, 24, 18]
      }
    }
  },
  "props": {
    "signpost": {
      "modelPath": "assets/models/props/signpost.obj",
      "rootScale": 1.0,
      "transformOffset": [0, 0, 0],
      "fallbackProxy": {
        "type": "box",
        "dimensions": [0.35, 2.6, 0.35]
      }
    }
  }
}
```

## Runtime Loading

`src/rendering/scene/asset-registry.ts` owns registry/model fetches.

- Registry JSON is fetched once and cached.
- Asset source bytes are fetched once per asset id and reused across scene recreations.
- Scene-local `AssetContainer` instances are rebuilt per scene so disposed scenes do not poison respawns.
- Failed loads log `asset-fallback` and clear the scene-local cache entry so a later retry can succeed.

## Proxy Attachment Seam

`src/rendering/scene/authored-asset-visual.ts` attaches authored visuals beneath an existing proxy mesh.

- The proxy mesh remains the authoritative collision and fallback seam.
- Successful authored loads are parented to the proxy anchor with the registry transform offset.
- Proxy materials are hidden only after the authored model instantiates successfully.
- If authored loading fails, the proxy remains visible with no gameplay breakage.

## Integration Points

### Vehicles

`src/vehicles/physics/vehicle-factory.ts` keeps the hidden physics root authoritative, then attaches authored vehicle visuals under that root.

### World Chunks

`src/rendering/scene/create-world-scene.ts` creates deterministic fallback massing boxes, then attaches authored `world` assets beneath each chunk-root building proxy.

### Breakable Props

`src/rendering/scene/chaos-scene-runtime.ts` creates deterministic breakable prop proxies, then attaches authored `props` assets beneath those same anchors so break-state transforms still apply.

## Disposal & Memory Management

- Vehicle authored meshes and cloned materials are disposed when the vehicle runtime is disposed.
- World and prop authored attachments are disposed with their owning proxy/scene lifecycle.
- Scene-local asset-container caches are cleared when a scene is disposed.

## Validation

The guardrail coverage for this seam now includes:

- registry loading cache behavior in `tests/unit/asset-registry.spec.ts`
- retry-after-failure behavior in `tests/unit/asset-registry.spec.ts`
- authored-visual proxy attachment and fallback visibility in `tests/unit/authored-asset-visual.spec.ts`
- manifest determinism in `tests/unit/world-slice-generator.spec.ts`
- readiness/telemetry preservation in `tests/smoke/chaos-scene-runtime.smoke.spec.ts`

## URLs & Hosting

All runtime-loaded asset/data paths resolve through `src/app/config/runtime-paths.ts` so root and nested-base hosting stay supported.
