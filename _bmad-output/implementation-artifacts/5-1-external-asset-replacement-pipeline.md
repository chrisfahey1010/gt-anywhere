# Story 5.1: External Asset Replacement Pipeline

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I can replace default proxy assets with externally authored 3D models,
so that manual art improvement does not require major gameplay-code rewrites.

## Acceptance Criteria

*   **Asset Registry Contract**: The repo defines one replaceable asset contract (`public/data/assets/registry.json`) backed by stable asset ids, model paths under `public/`, transforms, and fallback proxy definitions.
*   **Vehicle Visuals Integration**: When a vehicle is spawned, Babylon loads its authored model via a cached `AssetContainer`. It attaches to the existing physics root, preserves metadata/damage, and falls back to proxy visuals gracefully on failure. Proper memory disposal ensures no leaks when destroyed.
*   **World/Prop Visuals Integration**: Authored visuals for chunks and breakable props are instantiated under existing `world-root` and `chunk-root-*` parents. Deterministic placement, prop ids, and break states are preserved, with placeholder fallbacks intact. Instances are properly disposed of when slices unload.
*   **Browser/Performance Safety**: Asset URLs resolve via `resolvePublicAssetPath()`. Network fetches are cached (one fetch per asset ID). The `controllable-vehicle` readiness milestone remains truthful.
*   **Validation & Guardrails**: The story provides automated testing (including network request interception) verifying manifest serializability, cache reuse, fallback behavior, and zero regression to gameplay or build contracts.

### Start Here

*   `src/vehicles/physics/vehicle-factory.ts`
*   `src/traffic/runtime/traffic-vehicle-factory.ts`
*   `src/rendering/scene/responder-scene-runtime.ts`
*   `src/rendering/scene/create-world-scene.ts`
*   `src/rendering/scene/chaos-scene-runtime.ts`
*   `src/world/chunks/slice-manifest.ts`
*   `src/world/chunks/scene-visual-palette.ts`
*   `src/world/generation/world-slice-generator.ts`
*   `src/app/config/runtime-paths.ts`
*   `public/data/tuning/*.json`
*   `tests/unit/vehicle-factory.spec.ts`
*   `tests/unit/world-slice-generator.spec.ts`
*   `tests/unit/create-world-scene.spec.ts`

## Tasks / Subtasks

*   [ ] Task 1: Define the stable external-asset contract and runtime-loaded registry seam (AC: 1, 4, 5)
    *   [ ] Add the runtime-loaded asset registry at `public/data/assets/registry.json` that provides vehicles, world massing, and props with stable asset ids, model paths, transform offsets, and fallback metadata.
    *   [ ] Separate gameplay tuning from art metadata: keep handling in `public/data/tuning/*.json` while vehicle/world plans reference the new registry.
    *   [ ] Resolve all registry and model URLs using `src/app/config/runtime-paths.ts` to support root and nested-base hosting.
*   [ ] Task 2: Add the Babylon external-model loading and caching seam (AC: 1, 2, 3, 4)
    *   [ ] Install `@babylonjs/loaders@9.1.0` (must explicitly match `@babylonjs/core@9.1.0`).
    *   [ ] Register loaders dynamically so only the required importer is pulled.
    *   [ ] Create a cached asset-loader seam that loads GLB assets into `AssetContainer` templates, preventing duplicate network fetches per asset.
    *   [ ] Handle missing/invalid assets as recoverable failures: log using `logger.warn('asset-fallback', { assetId, reason })` and fall back to current proxy visuals.
*   [ ] Task 3: Thread external vehicle visuals through runtime contracts safely (AC: 2, 4, 5)
    *   [ ] Keep the hidden vehicle root and Havok physics aggregate authoritative for collisions, camera, possession, and metadata.
    *   [ ] Attach imported visuals beneath the runtime root using registry-defined transforms, preserving `interactionRole`, `bodyStyle`, `tuningName`, and `visualBaseColor`.
    *   [ ] Reuse the same seam for active, traffic, and responder vehicles by extending `createVehicleFactory()` and existing wrappers.
    *   [ ] Provide a helper function for material cloning when tinting or damage is applied, avoiding accidental global mutation of shared materials.
    *   [ ] Ensure explicit disposal logic is implemented to properly clear instanced meshes and cloned materials when vehicles are destroyed to prevent memory leaks.
*   [ ] Task 4: Replace world-massing and breakable-prop visuals preserving deterministic behavior (AC: 1, 3, 4, 5)
    *   [ ] Apply authored visuals or explicitly typed fallbacks behind the registry seam instead of hardcoded primitive creation in `create-world-scene.ts` and `chaos-scene-runtime.ts`.
    *   [ ] Maintain `world-root`, `chunk-root-*`, and prop-id ownership hierarchies, alongside current break-state metadata and collision logic.
    *   [ ] Keep manifest and planning data JSON-serializable, preserving cached same-slice reuse and test fixture validity.
    *   [ ] Ensure proper disposal logic for chunk-attached asset instances when a slice unloads.
*   [ ] Task 5: Document the contract and extend guardrail coverage (AC: 5)
    *   [ ] Add developer documentation (`docs/`) outlining the asset format, `registry.json` contract, transform rules, and fallback validation.
    *   [ ] Add explicit unit/integration tests that mock or intercept network requests to verify the "one-fetch-per-asset" caching requirement.
    *   [ ] Ensure tests cover registry loading, fallback-to-proxy behavior, manifest determinism, and readiness preservation.
    *   [ ] Complete validation via `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.

## Dev Notes

*   Story 5.1 is the foundational implementation seam for Epic 5. It establishes a durable, replaceable art contract for later recognition/presentation upgrades (Stories 5.2/5.3) without rewriting gameplay logic.
*   A functional browser sandbox exists; this story ensures production-quality visual replacement capabilities.

### Epic 5 Cross-Story Context

*   Provides the replaceable art seam for recognition-first world generation (5.2) and urban presentation (5.3).
*   Must preserve stable vehicle, camera, and combat contracts for Stories 5.4 and 5.5.
*   Creates a reusable, testable contract suitable for v2 validation (5.6).

### Current Asset / Rendering State

*   **Vehicles:** `createVehicleFactory()` creates a hidden physics root, adds primitive proxy meshes, and stores runtime metadata. External visuals must extend this, not replace it.
*   **World Assembly:** `BabylonWorldSceneLoader.load()` builds roads/chunks under `world-root` and `chunk-root-*`.
*   **Traffic/Responders:** Reuse the vehicle factory. Modifying the factory automatically updates these systems.
*   **Chaos Props:** Deterministic prop ids govern cylinders/boxes. Authored props must integrate into this system, maintaining collision/break states.
*   **Slice Data:** Deterministic, JSON-serializable slice data rules `SliceManifest`. Asset IDs here must remain serializable (no Babylon objects).
*   **URLs:** `runtime-paths.ts` securely centralizes base-aware URLs.
*   **Missing Deps:** The repo has no `@babylonjs/loaders` or `registry.json` yet.

### Non-Negotiables

*   **DO NOT** make visual meshes the authoritative collision/physics object. The Havok aggregate is the gameplay authority.
*   **DO NOT** scatter raw model URLs. Use `public/data/assets/registry.json` and base-aware path helpers.
*   **DO NOT** block `data-ready-milestone="controllable-vehicle"` on asset success. Fall back gracefully.
*   **DO NOT** implement Epic 5.2/5.3 requirements here. Stay within scope.
*   **DO NOT** create a parallel vehicle runtime. Preserve metadata, camera targets, and telemetry.
*   **DO NOT** fetch remote third-party models at runtime. Use repo-owned, deterministic assets.

### Technical Requirements

*   **Registry Contract:** Implement `public/data/assets/registry.json`. Map stable asset IDs to `modelPath`, `rootScale`, `transformOffset`, and fallback proxies.
*   **Separation of Concerns:** Keep gameplay tuning (`public/data/tuning/`) separate from visual registry metadata.
*   **Caching & Container Reuse:** Load models into `AssetContainer` templates via dynamic registration. Instantiate copies. Re-fetching identical GLBs per spawn is a regression.
*   **Vehicle Root Stability:** Attach visuals beneath the runtime root or a small child transform to maintain accurate collision/camera targeting.
*   **Metadata Persistence:** Reapply `interactionRole`, `bodyStyle`, `tuningName`, and `visualBaseColor` to instances.
*   **Safe Material Cloning:** Use an explicit material cloning helper when applying tinting/darkening to prevent global mutation of shared materials.
*   **Disposal & Cleanup:** Provide explicit `dispose()` handling for instantiated meshes and cloned materials to prevent memory leaks when vehicles/chunks are destroyed.
*   **Deterministic Transforms:** Use registry offsets or stable visual-root transforms instead of ad hoc mesh mutation.
*   **World/Prop Integration:** Attach chunk/prop visuals within `world-root`/`chunk-root-*` to ensure proper scene cleanup.
*   **Serializable World Data:** Manifest references to asset ids must be pure JSON strings/objects.
*   **Error Handling:** Use `logger.warn('asset-fallback', { assetId, reason })` for recoverable asset load failures.
*   **Nested URL Safety:** Maintain root and nested-base safety via `resolvePublicAssetPath()`.

### Architecture Compliance

*   **Folder Boundaries:** Keep data/assets in `public/`. Keep loading/instantiation logic in `src/rendering/` or `src/vehicles/`.
*   **Layer Integrity:** `src/rendering/` handles composition; `src/world/` handles serializable data.
*   **Asset Strategy:** Implement chunk streaming with a replaceable registry, avoiding ad hoc asset paths.
*   **Session Split:** Keep the static-slice definition boundary separate from mutable session instances.
*   **Gameplay Timing:** Visually instantiating assets must not interfere with the `60 Hz` fixed-step physics loop.

### Library / Framework Requirements

*   Keep versions pinned: `@babylonjs/core@9.1.0`, `@babylonjs/havok@1.3.12`, `vite@8.0.5`, TypeScript `5.9.3`.
*   Explicitly add `@babylonjs/loaders@9.1.0` to match the core version.
*   Use `registerBuiltInLoaders()` from `@babylonjs/loaders/dynamic` for lazy loading.
*   Leverage `LoadAssetContainerAsync()` and `AssetContainer.instantiateModelsToScene()`.

### File Structure Requirements

*   **Primary touchpoints:**
    *   `src/vehicles/physics/vehicle-factory.ts`
    *   `src/traffic/runtime/traffic-vehicle-factory.ts`
    *   `src/rendering/scene/responder-scene-runtime.ts`
    *   `src/rendering/scene/create-world-scene.ts`
    *   `src/rendering/scene/chaos-scene-runtime.ts`
    *   `src/world/chunks/slice-manifest.ts`
    *   `src/world/generation/world-slice-generator.ts`
    *   `src/app/config/runtime-paths.ts`
*   **New runtime data:**
    *   `public/data/assets/registry.json`
    *   `public/assets/models/vehicles/`
    *   `public/assets/models/props/`
    *   `public/assets/models/world/`
*   Keep small helpers in `kebab-case` under `src/rendering/`.
*   Keep runtime contract documentation in `docs/`.

### Testing Requirements

*   Extend `tests/unit/vehicle-factory.spec.ts` to prove fallback, metadata, and per-instance behavior.
*   **Network Interception Test:** Mock `fetch` or Babylon's loader to verify requesting the same asset ID multiple times triggers exactly one network load.
*   Ensure bad assets fall back softly with nested-base URLs accurately resolved.
*   Extend `tests/unit/world-slice-generator.spec.ts` to ensure deterministic serialization of new manifest fields.
*   Assert authored building/prop visuals respect chunk ownership and cleanup logic (`tests/unit/create-world-scene.spec.ts`).
*   Validate `controllable-vehicle` readiness preservation regardless of asset load success.
*   Execute full validation (`npm run check`, `npm test`, `npm run build`, `npm run test:browser`).
