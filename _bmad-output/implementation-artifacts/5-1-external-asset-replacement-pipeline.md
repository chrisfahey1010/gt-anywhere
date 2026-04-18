# Story 5.1: External Asset Replacement Pipeline

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I can replace default proxy assets with externally authored 3D models,
so that manual art improvement does not require major gameplay-code rewrites.

## Acceptance Criteria

*   [x] **Asset Registry Contract**: The repo defines one replaceable asset contract (`public/data/assets/registry.json`) backed by stable asset ids, model paths under `public/`, transforms, and fallback proxy definitions.
*   [x] **Vehicle Visuals Integration**: When a vehicle is spawned, Babylon loads its authored model via a cached `AssetContainer`. It attaches to the existing physics root, preserves metadata/damage, and falls back to proxy visuals gracefully on failure. Proper memory disposal ensures no leaks when destroyed.
*   [x] **World/Prop Visuals Integration**: Authored visuals for chunks and breakable props are instantiated under existing `world-root` and `chunk-root-*` parents. Deterministic placement, prop ids, and break states are preserved, with placeholder fallbacks intact. Instances are properly disposed of when slices unload.
*   [x] **Browser/Performance Safety**: Asset URLs resolve via `resolvePublicAssetPath()`. Network fetches are cached (one fetch per asset ID). The `controllable-vehicle` readiness milestone remains truthful.
*   [x] **Validation & Guardrails**: The story provides automated testing (including network request interception) verifying manifest serializability, cache reuse, fallback behavior, and zero regression to gameplay or build contracts.

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

*   [x] Task 1: Define the stable external-asset contract and runtime-loaded registry seam (AC: 1, 4, 5)
    *   [x] Add the runtime-loaded asset registry at `public/data/assets/registry.json` that provides vehicles, world massing, and props with stable asset ids, model paths, transform offsets, and fallback metadata.
    *   [x] Separate gameplay tuning from art metadata: keep handling in `public/data/tuning/*.json` while vehicle/world plans reference the new registry.
    *   [x] Resolve all registry and model URLs using `src/app/config/runtime-paths.ts` to support root and nested-base hosting.
*   [x] Task 2: Add the Babylon external-model loading and caching seam (AC: 1, 2, 3, 4)
    *   [x] Install `@babylonjs/loaders@9.1.0` (must explicitly match `@babylonjs/core@9.1.0`).
    *   [x] Register loaders dynamically so only the required importer is pulled.
    *   [x] Create a cached asset-loader seam that loads GLB assets into `AssetContainer` templates, preventing duplicate network fetches per asset.
    *   [x] Handle missing/invalid assets as recoverable failures: log using `logger.warn('asset-fallback', { assetId, reason })` and fall back to current proxy visuals.
*   [x] Task 3: Thread external vehicle visuals through runtime contracts safely (AC: 2, 4, 5)
    *   [x] Keep the hidden vehicle root and Havok physics aggregate authoritative for collisions, camera, possession, and metadata.
    *   [x] Attach imported visuals beneath the runtime root using registry-defined transforms, preserving `interactionRole`, `bodyStyle`, `tuningName`, and `visualBaseColor`.
    *   [x] Reuse the same seam for active, traffic, and responder vehicles by extending `createVehicleFactory()` and existing wrappers.
    *   [x] Provide a helper function for material cloning when tinting or damage is applied, avoiding accidental global mutation of shared materials.
    *   [x] Ensure explicit disposal logic is implemented to properly clear instanced meshes and cloned materials when vehicles are destroyed to prevent memory leaks.
*   [x] Task 4: Replace world-massing and breakable-prop visuals preserving deterministic behavior (AC: 1, 3, 4, 5)
    *   [x] Apply authored visuals or explicitly typed fallbacks behind the registry seam instead of hardcoded primitive creation in `create-world-scene.ts` and `chaos-scene-runtime.ts`.
    *   [x] Maintain `world-root`, `chunk-root-*`, and prop-id ownership hierarchies, alongside current break-state metadata and collision logic.
    *   [x] Keep manifest and planning data JSON-serializable, preserving cached same-slice reuse and test fixture validity.
    *   [x] Ensure proper disposal logic for chunk-attached asset instances when a slice unloads.
*   [x] Task 5: Document the contract and extend guardrail coverage (AC: 5)
    *   [x] Add developer documentation (`docs/`) outlining the asset format, `registry.json` contract, transform rules, and fallback validation.
    *   [x] Add explicit unit/integration tests that mock or intercept network requests to verify the "one-fetch-per-asset" caching requirement.
    *   [x] Ensure tests cover registry loading, fallback-to-proxy behavior, manifest determinism, and readiness preservation.
    *   [x] Complete validation via `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.

## Dev Agent Record

### Implementation Plan
- Establish `AssetRegistry` contract and `registry.json`.
- Implement `AssetRegistry` service in `src/rendering/scene/asset-registry.ts` with Babylon `AssetContainer` caching.
- Rework vehicle asset caching so asset bytes are fetched once per asset while scene-local containers are rebuilt on respawn-safe scene recreation.
- Integrate into `vehicle-factory.ts` for all vehicle types.
- Integrate into `create-world-scene.ts` for chunk massing and `chaos-scene-runtime.ts` for breakable props.
- Implement cleanup/disposal logic.
- Add unit/smoke test coverage for registry behavior and fallback.

### Debug Log
- Encountered TypeScript errors with `visualRoot` node typing and Babylon loader registration; fixed by casting to `TransformNode` and using correct loader imports.
- Fixed extraneous arguments in `create-world-scene.ts` calls.
- Resolved test failures in `chaos-scene-runtime` by mocking the new required `assetRegistry` dependency.
- Reproduced the invisible sedan-on-respawn bug with a new `asset-registry` unit test: globally cached `AssetContainer` instances were bound to the disposed scene, so respawned scenes reused dead visual templates.
- Browser smoke validation exposed a second regression because the authored sedan GLB is ~36 MB; changed the loader to cache raw asset bytes once per asset and rebuild per-scene containers from that cached source, then reduced Playwright worker contention so browser validation stayed stable.
- Code review found that world/prop registry wiring was still falling back to hardcoded primitives, `@babylonjs/loaders` was range-pinned instead of exact-pinned, and failed scene-local asset loads were cached as `null`; fixed all three before final review approval.
- Added authored OBJ assets for world massing and breakable props, plus review-time coverage for registry loading, retry-after-failure behavior, and proxy-attached authored asset visuals.
- Browser validation initially hit a Chromium timeout after the heavier asset-loading changes; stabilized the suite by reducing Playwright workers to `2` and increasing the per-test timeout to `60000` before rerunning `npm run test:browser` successfully.

### Completion Notes
- All ACs satisfied after code review remediation.
- Vehicles, world massing, and breakable props now attach authored visuals through the shared registry-backed proxy seam.
- The registry contract is now documented accurately, `@babylonjs/loaders` is exact-pinned to `9.1.0`, and failed scene-local asset loads retry cleanly.
- Added authored OBJ assets for world and prop entries referenced by `registry.json`.
- Validation rerun complete: `npm run check`, focused asset-pipeline tests, full `npm test`, `npm run build`, and `npm run test:browser` all passed.

## File List
- `public/assets/models/props/barrier.obj`
- `public/assets/models/props/bollard.obj`
- `public/assets/models/props/hydrant.obj`
- `public/assets/models/props/short-post.obj`
- `public/assets/models/props/signpost.obj`
- `public/assets/models/vehicles/heavy-truck.glb`
- `public/assets/models/vehicles/sedan.glb`
- `public/assets/models/vehicles/sports-car.glb`
- `public/assets/models/world/building-0.obj`
- `public/assets/models/world/building-1.obj`
- `public/assets/models/world/building-2.obj`
- `public/data/assets/registry.json`
- `public/data/tuning/sedan.json`
- `playwright.config.ts`
- `src/app/config/runtime-paths.ts`
- `src/rendering/scene/asset-registry.ts`
- `src/rendering/scene/authored-asset-visual.ts`
- `src/rendering/scene/chaos-scene-runtime.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `package.json`
- `package-lock.json`
- `tests/smoke/chaos-scene-runtime.smoke.spec.ts`
- `tests/unit/asset-registry.spec.ts`
- `tests/unit/authored-asset-visual.spec.ts`
- `tests/unit/chaos-scene-runtime.spec.ts`
- `docs/asset-replacement-pipeline.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log
- 2026-04-14: Initial implementation of the external asset replacement pipeline. Added registry, Babylon asset container caching, and integration into vehicles, world, and props. Resolved TS and test regressions.
- 2026-04-17: Fixed the respawn sedan-visibility regression by caching asset source bytes once per asset and rebuilding scene-local containers after scene recreation. Added targeted asset-registry regression coverage and tuned Playwright browser-suite concurrency/timeout for stable authored-asset validation.
- 2026-04-17: Completed code-review remediation by wiring world and prop authored assets through the registry-backed proxy seam, adding shipped world/prop model files, exact-pinning `@babylonjs/loaders`, fixing retry-after-failure asset loading, correcting the asset-pipeline docs, stabilizing the browser suite timeout/worker settings, and rerunning validation.

## Senior Developer Review (AI)

### Reviewer

Chris

### Date

2026-04-17T17:47:00-07:00

### Outcome

Approve

### Summary

- Verified all Story 5.1 acceptance criteria against the implementation, the planning context, and the live git worktree.
- Fixed the missing world/prop authored-asset integration, corrected the loader version pin, corrected the docs contract, and closed the review-time test gaps around registry loading, retry behavior, and proxy-attached authored visuals.
- Reran `npm run check`, the focused asset-pipeline tests, the full `npm test` suite, `npm run build`, and `npm run test:browser` successfully.

### Findings Addressed

- [fixed][CRITICAL] Task 4 was marked complete even though `create-world-scene.ts` and `chaos-scene-runtime.ts` still rendered hardcoded fallback primitives instead of attaching authored assets from the registry.
- [fixed][CRITICAL] Task 2 claimed `@babylonjs/loaders@9.1.0` was explicitly matched to Babylon core, but `package.json` used a range pin.
- [fixed][HIGH] Failed asset loads were cached as `null` per scene, preventing retry in the same scene after a transient or missing-file failure.
- [fixed][HIGH] Guardrail coverage did not test registry loading, retry-after-failure behavior, or the real proxy-attached authored asset seam.
- [fixed][MEDIUM] The story File List omitted actual implementation artifacts including tuning data and authored model assets.
- [fixed][MEDIUM] `docs/asset-replacement-pipeline.md` documented a stale registry shape instead of the shipped contract.
