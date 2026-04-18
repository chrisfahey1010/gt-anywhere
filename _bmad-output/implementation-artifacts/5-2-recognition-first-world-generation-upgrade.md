# Story 5.2: Recognition-First World Generation Upgrade

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can load a world slice that preserves more real-world building and district structure,
so that the chosen place is recognizable beyond street labels.

## Acceptance Criteria

1. Given a supported preset location includes real road, district, and building or block data, when world generation runs, then the resulting static `SliceManifest` preserves recognizable road layout plus explicit `districts[]` and `worldEntries[]` data with stable ids, one explicit owner `chunkId` per world entry, and scene-consumable metadata instead of only roads plus a single district label.
2. Given source data is incomplete or unavailable for a requested place, when the generator falls back, then it still produces deterministic serializable roads, at least one derived district entry, and manifest-owned world entries for every non-spawn chunk with road coverage, while preserving human-readable road labels and preferring recognizable structure over filler density.
3. Given downstream systems already consume manifest roads for spawns, navigation, traffic, pedestrians, props, and same-slice restart, when the richer recognition-first manifest lands, then those systems continue to function through the existing manifest-first seams without scene-only world assembly, duplicate road sampling logic, or regressions to world-ready loading.
4. Given Story 5.1 already shipped the registry-backed proxy seam for authored world assets, when building and district world data is rendered, then `create-world-scene.ts` consumes manifest-driven world entries under existing `world-root` and `chunk-root-*` ownership and may map them to stable world asset ids without baking authored-model assumptions into gameplay or collision logic.
5. Given compatible slices are cached by `compatibilityKey` and `generationVersion`, when Story 5.2 changes slice semantics, then stale pre-5.2 manifests are not silently reused, recognition-first manifests remain JSON-serializable and deterministic for the same request, and generation-affecting compatibility behavior stays explicit and test-covered.
6. Given repository validation runs, when unit, integration, smoke, typecheck, build, and browser suites execute, then they prove recognition-first manifest content, district or navigation continuity, manifest-driven scene loading, cache-version safety, the truthful `controllable-vehicle` readiness milestone, and no regression in the existing desktop-browser load-to-drivable-world loop.

### Start Here

- `src/world/generation/world-slice-generator.ts`
- `src/world/chunks/slice-manifest.ts`
- `public/data/world-gen/location-presets.json`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/asset-registry.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/rendering/scene/world-navigation.ts`
- `src/world/chunks/road-placement.ts`
- `docs/asset-replacement-pipeline.md`
- `public/data/assets/registry.json`
- `tests/unit/world-generation-request.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`
- `tests/unit/world-navigation.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/unit/asset-registry.spec.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`

## Tasks / Subtasks

- [x] Task 1: Expand the static preset and manifest contracts for recognition-first slice data (AC: 1, 2, 5, 6)
  - [x] Extend `GeoDataPreset`, `SliceManifest`, and related fixtures with explicit `districts[]` and `worldEntries[]` contracts, stable ids, and one owner `chunkId` per world entry.
  - [x] Update `public/data/world-gen/location-presets.json` so supported locations carry richer road, district, and world data through deterministic local fixtures rather than live data calls.
  - [x] Bump `generationVersion` and adjust cache or fixture expectations deliberately so pre-5.2 manifests are not silently reused.
- [x] Task 2: Upgrade the world-slice pipeline to emit recognition-first world structure (AC: 1, 2, 3, 5)
  - [x] Keep road truth first, then building and district truth: normalize or clamp source data, preserve human-readable road names, and emit deterministic fallback districts plus world entries when source data is sparse.
  - [x] Replace road-only assumptions where needed so chunks and downstream consumers can reference explicit world or district entries rather than scene-invented placeholders.
  - [x] Keep the manifest static and serializable; do not mix runtime session state into slice identity.
- [x] Task 3: Replace hardcoded scene massing with manifest-driven world assembly (AC: 1, 3, 4, 6)
  - [x] Remove the fixed three-buildings-per-non-spawn-chunk assumption in `create-world-scene.ts` and build world massing from manifest data instead.
  - [x] Reuse Story 5.1's registry-backed proxy or authored-asset seam, `world-root`, and `chunk-root-*` ownership so authored visuals remain optional and fallback-safe.
  - [x] Keep spawn clarity, starter-road access, and the truthful `controllable-vehicle` readiness contract intact.
- [x] Task 4: Preserve downstream contracts that already depend on manifest roads and chunks (AC: 3, 5, 6)
  - [x] Keep `world-navigation`, navigation HUD snapshots, traffic planning, pedestrian planning, breakable-prop planning, and hijackable vehicle spawn logic working against the richer manifest.
  - [x] Reuse `road-placement.ts` or adjacent shared helpers before inventing new road-placement math.
  - [x] If chunk or road association changes, add deliberate segment-crossing coverage instead of relying on point-only membership.
- [x] Task 5: Add guardrail coverage and repository validation (AC: 5, 6)
  - [x] Extend unit coverage for manifest shape, deterministic fallback generation, cache-version behavior, road or chunk ownership, and richer district or world identity data.
  - [x] Extend scene, integration, and browser coverage for world-ready loading, navigation district or street continuity, manifest-driven world massing, and same-slice reuse.
  - [x] Run `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.

## Dev Notes

- Story 5.2 is the recognition-first data and model upgrade inside Epic 5. It exists to fix the v1 failure where slices are recognizable mainly from street labels instead of the world itself. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5: Core Fantasy Recovery & V2 Quality Pass`; `_bmad-output/planning-artifacts/gdd.md#Gameplay Metrics`; `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-12T20:50:42-07:00.md#5.-Implementation-Handoff`]
- The corrective change proposal makes recognizability a quality gate, not a polish nice-to-have. Story 5.2 should therefore improve the actual generated slice definition, not just HUD copy or decorative scene dressing. [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-12T20:50:42-07:00.md#GDD`; `_bmad-output/planning-artifacts/gdd.md#Gameplay Metrics`]
- No dedicated UX artifact was discovered during workflow input loading. Use the sprint change proposal, GDD, architecture, project context, prior stories, current source tree, and current tests as the controlling guidance for this story. [Source: workflow discovery results; `_bmad-output/planning-artifacts/gdd.md`; `_bmad-output/planning-artifacts/game-architecture.md`; `_bmad-output/project-context.md`]

### Epic 5 Cross-Story Context

- Story 5.1 already established the replaceable asset registry or proxy seam. Story 5.2 should feed that seam with better world data, not replace it. [Source: `_bmad-output/implementation-artifacts/5-1-external-asset-replacement-pipeline.md`; `docs/asset-replacement-pipeline.md`]
- Story 5.3 is the road and urban presentation pass. Story 5.2 should supply richer world-generation and manifest truth that Story 5.3 can render more intentionally, rather than pushing all recognition fixes into scene-only materials or effects. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5: Core Fantasy Recovery & V2 Quality Pass`; `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-12T20:50:42-07:00.md#5.-Implementation-Handoff`]
- Story 5.4 covers driving feel, chase camera, and mouse control. That work is out of scope here. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5: Core Fantasy Recovery & V2 Quality Pass`]
- Story 5.5 covers combat, crosshair, and possession-state reliability. That work is out of scope here. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5: Core Fantasy Recovery & V2 Quality Pass`]
- Story 5.6 will validate recognizability gates and playtest outcomes. Story 5.2 must therefore leave measurable, testable data and scene behavior that later QA can verify. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5: Core Fantasy Recovery & V2 Quality Pass`; `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-12T20:50:42-07:00.md#Success-Criteria`]

### Previous Story Intelligence

- Story 5.1 added `public/data/assets/registry.json`, `src/rendering/scene/asset-registry.ts`, and `attachAuthoredVisualToProxy()` as the only supported authored-asset replacement seam. Keep proxies authoritative for collision or fallback and attach authored world visuals beneath them. [Source: `_bmad-output/implementation-artifacts/5-1-external-asset-replacement-pipeline.md#Acceptance-Criteria`; `docs/asset-replacement-pipeline.md#Proxy-Attachment-Seam`; `public/data/assets/registry.json`]
- Story 5.1 fixed a regression where cached `AssetContainer` instances were tied to a disposed scene. The shipped pattern is to cache asset source bytes once per asset id and rebuild scene-local containers per scene. Do not invent a second world-model loading path here. [Source: `_bmad-output/implementation-artifacts/5-1-external-asset-replacement-pipeline.md#Debug-Log`; `docs/asset-replacement-pipeline.md#Runtime-Loading`]
- Story 5.1 explicitly preserved manifest determinism, same-slice reuse, root or nested-base asset resolution, and chunk ownership. If Story 5.2 expands world asset ids or world metadata, update the same registry, docs, and tests instead of introducing file-path literals inside gameplay code. [Source: `_bmad-output/implementation-artifacts/5-1-external-asset-replacement-pipeline.md#Acceptance-Criteria`; `docs/asset-replacement-pipeline.md#URLs-&-Hosting`; `public/data/assets/registry.json`]
- The 5.1 review findings were about missing world or prop registry wiring, stale docs, and missing tests. Expect the same scrutiny here: if the manifest shape or world asset contract changes, update the code, docs, and coverage together. [Source: `_bmad-output/implementation-artifacts/5-1-external-asset-replacement-pipeline.md#Senior-Developer-Review-(AI)`]

### Current World Generation State

- `GeoDataPreset` currently contains only `displayName`, `districtName`, `bounds`, and `roads`. There is no building footprint, block massing, landmark, or multi-district structure in source data today. [Source: `src/world/generation/world-slice-generator.ts`; `public/data/world-gen/location-presets.json`]
- Fallback generation currently synthesizes only three roads, and the pipeline stages mostly clamp points to bounds plus filter out roads with fewer than two points. Recognition-first generation does not exist yet. [Source: `src/world/generation/world-slice-generator.ts`]
- `SliceManifest` currently serializes roads, chunks, spawn candidates, optional traffic, pedestrians, and breakable props, plus `sceneMetadata`, but no explicit world-building or district identity structures. [Source: `src/world/chunks/slice-manifest.ts`]
- `createWorldGenerationCompatibilityKey()` changes only for `worldSize`, `trafficDensity`, and `pedestrianDensity`, while manifest reuse depends on `generationVersion`. Any Story 5.2 schema or semantic shift must be versioned deliberately. [Source: `src/world/generation/location-resolver.ts`; `tests/unit/world-generation-request.spec.ts`; `src/world/generation/world-slice-generator.ts`]
- `runChunkAssembler()` still makes a fixed `2 x 2` chunk grid, and `roadTouchesChunk()` only checks whether a road point falls inside a chunk. Long segments can cross chunk space without a vertex inside. [Source: `src/world/generation/world-slice-generator.ts`]
- `create-world-scene.ts` still renders roads as box segments and fakes world massing with exactly three buildings per non-spawn chunk using `building-0`, `building-1`, and `building-2`; those boxes are not driven by manifest world data. [Source: `src/rendering/scene/create-world-scene.ts`; `public/data/assets/registry.json`]
- `world-scene-runtime.ts` and the navigation HUD still treat district identity as a single `districtName` string plus current road label. Any richer district model must preserve or deliberately evolve that contract for existing consumers. [Source: `src/rendering/scene/world-scene-runtime.ts`; `src/ui/hud/world-navigation-hud.ts`]
- Traffic, pedestrian, breakable-prop, and hijackable-vehicle planning all derive from road geometry and spacing assumptions. If roads or chunk ownership change, those systems are likely regression hotspots. [Source: `src/world/chunks/road-placement.ts`; `src/world/generation/world-slice-generator.ts`; `tests/unit/world-slice-generator.spec.ts`]

### Minimum Recognition-First Contract

- Story 5.2 should define and ship a concrete minimum manifest contract instead of vague “world identity” metadata. The minimum target is:

```ts
interface SliceDistrict {
  id: string;
  displayName: string;
  bounds: SliceBounds;
  anchorRoadIds: string[];
}

interface SliceWorldEntry {
  id: string;
  chunkId: string;
  districtId: string;
  kind: "building-massing" | "landmark";
  assetId?: string;
  position: SliceVector3;
  dimensions: { width: number; height: number; depth: number };
  yawDegrees?: number;
  relatedChunkIds?: string[];
}
```

- Ownership rule: every `SliceWorldEntry` must have exactly one owner `chunkId`. If an entry visually spans chunk boundaries, keep one owner and use optional `relatedChunkIds` for read-only context instead of making scene code infer ownership on the fly. [Source: `src/world/generation/world-slice-generator.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Scene-Structure`]
- Fallback minimum: even when no richer source data exists, the generated manifest must still include at least one derived district record, keep `sceneMetadata.displayName` plus `sceneMetadata.districtName` populated, and emit manifest-owned world entries for every non-spawn chunk with road coverage so recognition does not collapse back to road-only plus fake scene boxes. [Source: `src/world/generation/world-slice-generator.ts`; `src/rendering/scene/create-world-scene.ts`; `_bmad-output/planning-artifacts/gdd.md#Level-Design-Principles`]
- Compatibility surface rule: keep `sceneMetadata.displayName`, `sceneMetadata.districtName`, and the current navigation snapshot fields as derived compatibility outputs unless this story deliberately updates all existing consumers and tests. Raw manifest growth must not silently break HUD or telemetry contracts. [Source: `src/world/chunks/slice-manifest.ts`; `src/rendering/scene/world-scene-runtime.ts`; `_bmad-output/implementation-artifacts/2-4-use-simple-navigation-cues-like-street-names-or-a-minimap.md#Technical-Requirements`]

### Non-Negotiables

- Do not widen this story into live geocoding or public-data ingestion. Keep the current deterministic preset-based source model for supported places unless a separate story changes the data-acquisition contract. [Source: `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md#Technical-Requirements`; `src/world/generation/world-slice-generator.ts`]
- Do not treat Story 5.2 as a pure scene-polish task. Recognition must come from generated slice structure, not just HUD text, fog, colors, or decorative props. [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-12T20:50:42-07:00.md#GDD`; `_bmad-output/planning-artifacts/gdd.md#Gameplay-Metrics`]
- Do not widen into Story 5.3 road presentation, Story 5.4 handling or camera work, Story 5.5 possession or combat reliability, or new mission or content systems. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5: Core Fantasy Recovery & V2 Quality Pass`; `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-12T20:50:42-07:00.md#5.-Implementation-Handoff`]
- Do not replace the manifest-first world path with scene-only building placement or chunk decoration. Static slice identity must live in `src/world/`, not only in Babylon meshes. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Real-place-World-Slice-Generation`; `_bmad-output/project-context.md#Critical-Don't-Miss-Rules`; `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md#Non-Negotiables`]
- Do not break `world.scene.ready`, the truthful `controllable-vehicle` readiness milestone, spawn safety, same-location restart, or current street-label resolution. [Source: `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md#Technical-Requirements`; `_bmad-output/implementation-artifacts/2-4-use-simple-navigation-cues-like-street-names-or-a-minimap.md#Acceptance-Criteria`; `tests/integration/world-slice-loading.integration.spec.ts`]
- Do not trade away road truth, building or district truth, scale, or district rhythm for filler density or decorative noise. If fidelity and density conflict, recognizability wins. [Source: `_bmad-output/planning-artifacts/gdd.md#Level-Design-Principles`; `_bmad-output/project-context.md#Critical-Don't-Miss-Rules`]
- Do not bypass Story 5.1's stable asset ids, transforms, fallback proxies, or authored-asset loading rules. [Source: `docs/asset-replacement-pipeline.md`; `_bmad-output/project-context.md#Code-Organization-Rules`]
- Do not mix static slice state with dynamic session state or attach live runtime-only flags to manifest building or district data. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Stable-City-/-Living-Session`; `_bmad-output/project-context.md#Critical-Don't-Miss-Rules`]
- Do not add a GIS or mapping framework, second physics backend, ECS, or alternate rendering or UI stack for this story. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Decision-Summary`; `_bmad-output/project-context.md#Platform-&-Build-Rules`]

### Technical Requirements

- Expand `GeoDataPreset` and `SliceManifest` with explicit `districts[]` and `worldEntries[]` structures, stable ids, positions or dimensions, and one owner `chunkId` per world entry. If an entry spans chunks, keep one owner and expose any additional chunk references explicitly instead of letting scene code guess. [Source: `src/world/generation/world-slice-generator.ts`; `src/world/chunks/slice-manifest.ts`; `tests/unit/world-slice-generator.spec.ts`]
- Update `public/data/world-gen/location-presets.json` to encode richer location truth for supported presets. This is the current authoritative local data source for real-place slice generation. [Source: `public/data/world-gen/location-presets.json`; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md#Technical-Requirements`]
- Keep road ids and human-readable road display names stable. `resolveCurrentRoad()` depends on road `width`, `displayName`, `kind`, and polyline points, and current HUD logic expects a district or location anchor plus street label. [Source: `src/rendering/scene/world-navigation.ts`; `src/rendering/scene/world-scene-runtime.ts`; `_bmad-output/implementation-artifacts/2-4-use-simple-navigation-cues-like-street-names-or-a-minimap.md#Technical-Requirements`]
- Replace hardcoded per-chunk fake building placement in `create-world-scene.ts` with manifest-driven world entries. Use `world-root` and `chunk-root-*` parents, keep proxy meshes authoritative, and optionally map manifest entries to Story 5.1 asset ids through the registry. [Source: `src/rendering/scene/create-world-scene.ts`; `docs/asset-replacement-pipeline.md#World-Chunks`; `public/data/assets/registry.json`]
- Preserve road-placement consumers. Reuse `collectRoadPlacementCandidates()` and `selectSpacedRoadPlacements()` or adjacent shared math instead of duplicating heading, spacing, or chunk-resolution logic in multiple planners. [Source: `src/world/chunks/road-placement.ts`; `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md#Technical-Requirements`]
- If chunk or road ownership changes, update the current point-only chunk association deliberately. Recognition-first road layouts can cross chunk boundaries even when no vertex lands inside a chunk, so segment-aware tests are required if the implementation changes chunk logic. [Source: `src/world/generation/world-slice-generator.ts`]
- Keep manifest data JSON-serializable, deterministic, and cache-safe. Same request in should yield the same recognition-first manifest out, with `generationVersion` bumped so old cached manifests cannot masquerade as Story 5.2 output. [Source: `src/world/generation/world-slice-generator.ts`; `tests/unit/world-generation-request.spec.ts`; `docs/asset-replacement-pipeline.md#Validation`]
- Keep the static slice or session split intact. Buildings, districts, landmarks, or block-massing truth belong in the manifest; runtime damage, possession, heat, or other live state does not. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Stable-City-/-Living-Session`; `_bmad-output/project-context.md#Critical-Don't-Miss-Rules`]
- If recognition telemetry or richer scene metadata is needed, expose it additively through existing typed snapshot or metadata surfaces instead of renaming dataset keys or forcing HUDs or tests to scrape new ad hoc globals. Preserve `sceneMetadata.displayName`, `sceneMetadata.districtName`, and current navigation snapshot fields as the compatibility layer unless the story deliberately updates all consumers. [Source: `src/rendering/scene/world-scene-runtime.ts`; `_bmad-output/implementation-artifacts/2-4-use-simple-navigation-cues-like-street-names-or-a-minimap.md#Architecture-Compliance`; `_bmad-output/implementation-artifacts/4-4-experience-coherent-visual-and-audio-polish.md#Technical-Requirements`]
- Keep `createWorldGenerationCompatibilityKey()` semantics explicit. If Story 5.2 introduces new generation-affecting settings or data-version inputs, encode them deliberately and update `world-generation-request.spec.ts`; otherwise keep graphics-only settings out of generation identity. [Source: `src/world/generation/location-resolver.ts`; `tests/unit/world-generation-request.spec.ts`]

### Architecture Compliance

- `src/world/generation/` owns slice planning and manifest creation; `src/rendering/scene/` consumes that output. Babylon's scene graph is composition, not gameplay truth. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System-Location-Mapping`; `_bmad-output/planning-artifacts/game-architecture.md#Real-place-World-Slice-Generation`; `_bmad-output/project-context.md#Engine-Specific-Rules`]
- Preserve the architecture's world-root plus chunk-subtree model. World, district, and building data should attach under explicit chunk ownership, not flatten into one monolithic scene object. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Scene-Structure`; `_bmad-output/project-context.md#Engine-Specific-Rules`]
- Maintain the static world versus dynamic session boundary so restart or replay can keep the same recognizable slice while replacing only runtime populations and consequences. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Stable-City-/-Living-Session`; `_bmad-output/project-context.md#Critical-Don't-Miss-Rules`]
- Prefer constructor injection within a domain and typed events or contracts across domains. Do not introduce global mutable registries to pass world identity around. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Communication-Patterns`; `_bmad-output/planning-artifacts/game-architecture.md#Consistency-Rules`; `_bmad-output/project-context.md#Engine-Specific-Rules`]
- Keep hot-path performance disciplines intact. World generation output may get richer, but scene or runtime consumers still target browser-safe budgets, low per-frame allocation churn, and explicit chunk-residency thinking. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Technical-Requirements`; `_bmad-output/planning-artifacts/game-architecture.md#Asset-Management`; `_bmad-output/project-context.md#Performance-Rules`]
- Use repositories, managers, or explicit data files for runtime data. Do not fetch or parse arbitrary world data directly from gameplay domains. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Data-Patterns`; `_bmad-output/project-context.md#Critical-Don't-Miss-Rules`]
- Keep HTML or CSS shell ownership, the Vite toolchain, and desktop-browser-first posture unchanged for this story. [Source: `_bmad-output/planning-artifacts/game-architecture.md#UI-Architecture`; `_bmad-output/planning-artifacts/game-architecture.md#Toolchain`; `_bmad-output/project-context.md#Platform-&-Build-Rules`]

### Library / Framework Requirements

- Stay on the pinned runtime stack for this story: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, `@babylonjs/loaders` `9.1.0`, `vite` `8.0.5`, `typescript` `5.9.3`, `vitest` `3.2.4`, and `@playwright/test` `1.59.1`. [Source: `package.json`]
- Latest package checks for this workflow show `@babylonjs/core` `9.3.1`, `@babylonjs/loaders` `9.3.1`, `@babylonjs/havok` `1.3.12`, `vite` `8.0.8`, `vitest` `4.1.4`, and `@playwright/test` `1.59.1`. Do not widen Story 5.2 into dependency upgrades. [Source: `npm view @babylonjs/core version`; `npm view @babylonjs/loaders version`; `npm view @babylonjs/havok version`; `npm view vite version`; `npm view vitest version`; `npm view @playwright/test version`; `package.json`]
- Keep using Babylon, Havok, Vite, TypeScript, and the shipped asset-registry seam. No new GIS library, map-rendering package, ECS, UI framework, or alternate physics stack is required. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Decision-Summary`; `_bmad-output/project-context.md#Technology-Stack-&-Versions`]
- Context7 is the project's selected documentation lookup tool if the implementing dev agent needs current Babylon or Vite API details while coding. [Source: `_bmad-output/project-context.md#Technology-Stack-&-Versions`; `_bmad-output/planning-artifacts/game-architecture.md#AI-Tooling-(MCP-Servers)`]
- If authored-world asset attachment changes, continue exact pin matching inside the existing Babylon package family rather than introducing version skew. [Source: `package.json`; `_bmad-output/implementation-artifacts/5-1-external-asset-replacement-pipeline.md#Senior-Developer-Review-(AI)`]

### File Structure Requirements

- Likely primary touchpoints for this story are:
  - `public/data/world-gen/location-presets.json`
  - `public/data/assets/registry.json` only if world asset ids or classes expand
  - `src/world/chunks/slice-manifest.ts`
  - `src/world/chunks/road-placement.ts`
  - `src/world/generation/location-resolver.ts`
  - `src/world/generation/world-slice-generator.ts`
  - `src/rendering/scene/create-world-scene.ts`
  - `src/rendering/scene/asset-registry.ts`
  - `src/rendering/scene/world-scene-runtime.ts`
  - `src/rendering/scene/world-navigation.ts`
  - `docs/asset-replacement-pipeline.md` if the registry or world contract changes
  - `tests/unit/world-generation-request.spec.ts`
  - `tests/unit/world-slice-generator.spec.ts`
  - `tests/unit/world-navigation.spec.ts`
  - `tests/unit/world-scene-runtime.spec.ts`
  - `tests/unit/create-world-scene.spec.ts`
  - `tests/unit/asset-registry.spec.ts`
  - `tests/integration/world-slice-loading.integration.spec.ts`
  - `tests/smoke/app-bootstrap.smoke.spec.ts`
  - `tests/smoke/app-bootstrap.pw.spec.ts`
- Keep any new helper small and adjacent to the owning layer. If the generator needs extra recognition-first helpers, prefer `src/world/` modules next to the current generator rather than burying them inside scene code or scattering one tiny file per stage without need. [Source: `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md#File-Structure-Requirements`; `_bmad-output/planning-artifacts/game-architecture.md#System-Location-Mapping`]
- Keep runtime-loaded recognition data under `public/data/world-gen/` and authored asset metadata under `public/data/assets/`; keep application logic in source modules. [Source: `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md#File-Structure-Requirements`; `_bmad-output/project-context.md#Code-Organization-Rules`]
- If the manifest shape changes, update hand-built test fixtures deliberately. Many tests construct `SliceManifest` or `GeoDataPreset` objects directly. [Source: `tests/unit/world-slice-generator.spec.ts`; `tests/integration/world-slice-loading.integration.spec.ts`; `_bmad-output/implementation-artifacts/2-4-use-simple-navigation-cues-like-street-names-or-a-minimap.md#File-Structure-Requirements`]

### Testing Requirements

- Extend `tests/unit/world-slice-generator.spec.ts` for richer manifest shape, district or world identity data, deterministic fallback generation, `generationVersion` or cache invalidation behavior, and preserved road display names. [Source: `tests/unit/world-slice-generator.spec.ts`]
- Extend `tests/unit/world-generation-request.spec.ts` if any generation-affecting compatibility inputs change. Keep the current rule that graphics-only settings do not alter generation identity unless a deliberate product decision says otherwise. [Source: `tests/unit/world-generation-request.spec.ts`]
- Add or extend direct unit coverage for chunk or road ownership and any new placement math. This is currently a gap and becomes more important if segment-aware chunk association is introduced. [Source: `src/world/generation/world-slice-generator.ts`; `src/world/chunks/road-placement.ts`]
- Extend `tests/unit/world-navigation.spec.ts` and `tests/unit/world-scene-runtime.spec.ts` if richer district identity or road segmentation changes navigation or HUD inputs. Preserve current nearest-road tie-breaking and district or location anchor behavior unless deliberately revised. [Source: `src/rendering/scene/world-navigation.ts`; `src/rendering/scene/world-scene-runtime.ts`; `_bmad-output/implementation-artifacts/2-4-use-simple-navigation-cues-like-street-names-or-a-minimap.md#Testing-Requirements`]
- Extend `tests/unit/create-world-scene.spec.ts` and or scene-focused tests so world massing is proven to come from manifest-driven data instead of the old fixed three-box fallback. [Source: `src/rendering/scene/create-world-scene.ts`; `tests/unit/create-world-scene.spec.ts`; `docs/asset-replacement-pipeline.md#Validation`]
- Extend `tests/unit/asset-registry.spec.ts` if world asset ids or classes change so registry loading, retry behavior, and world-asset lookup remain stable after the manifest contract grows. [Source: `tests/unit/asset-registry.spec.ts`; `docs/asset-replacement-pipeline.md#Validation`; `_bmad-output/implementation-artifacts/5-1-external-asset-replacement-pipeline.md#Senior-Developer-Review-(AI)`]
- Extend `tests/integration/world-slice-loading.integration.spec.ts` and browser or smoke coverage so the app still reaches `world-ready` and the truthful `controllable-vehicle` milestone with recognition-first manifests loaded. [Source: `tests/integration/world-slice-loading.integration.spec.ts`; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md#Testing-Requirements`]
- Use `tests/smoke/app-bootstrap.smoke.spec.ts` and `tests/smoke/app-bootstrap.pw.spec.ts` as the explicit smoke or browser guardrails for the load-to-world loop and readiness milestone, not just the command list. [Source: `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Keep deterministic seeds and local fixtures. Avoid live network calls for world-generation coverage. [Source: `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md#Testing-Requirements`; `_bmad-output/project-context.md#Testing-Rules`]
- Finish with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`. [Source: `package.json`; `_bmad-output/implementation-artifacts/5-1-external-asset-replacement-pipeline.md#Completion-Notes`]

### Git Intelligence Summary

- The relevant recent commit is `Complete Story 5.1 asset replacement pipeline`. It concentrated changes in `create-world-scene.ts`, asset-registry files, registry data, docs, and targeted or broad tests. Follow that same integration-first pattern instead of bolting recognition logic onto isolated leaf code. [Source: recent git history]
- Recent Epic 5 work used the existing Babylon stack, exact dependency pins, doc updates, and regression tests to close review findings. Expect Story 5.2 to need the same trio: contract updates, scene integration, and explicit coverage. [Source: recent git history; `_bmad-output/implementation-artifacts/5-1-external-asset-replacement-pipeline.md#Senior-Developer-Review-(AI)`]
- The repo's story and commit style remains plain-English, capitalized, and imperative. Keep any later commit message in that style. [Source: recent git history]

### Latest Tech Information

- `@babylonjs/core` latest is `9.3.1` while the repo stays on `9.1.0`. No upgrade is required for this story; keep focus on manifest and data-model correctness. [Source: `npm view @babylonjs/core version`; `package.json`]
- `@babylonjs/loaders` latest is `9.3.1` while the repo stays on exact `9.1.0`. Because Story 5.1 just stabilized the authored-asset seam, do not widen Story 5.2 into Babylon version churn. [Source: `npm view @babylonjs/loaders version`; `package.json`; `_bmad-output/implementation-artifacts/5-1-external-asset-replacement-pipeline.md#Senior-Developer-Review-(AI)`]
- `@babylonjs/havok` `1.3.12` still matches latest, so the current physics dependency is already current enough for this story. [Source: `npm view @babylonjs/havok version`; `package.json`]
- `vite` latest is `8.0.8` while the repo stays on `8.0.5`, and `vitest` latest is `4.1.4` while the repo stays on `3.2.4`. Keep Story 5.2 focused on runtime or product goals rather than toolchain upgrades. [Source: `npm view vite version`; `npm view vitest version`; `package.json`]
- `@playwright/test` `1.59.1` still matches latest, so the existing cross-browser guardrail harness is already current enough for this story. [Source: `npm view @playwright/test version`; `package.json`]

### Project Structure Notes

- `world-slice-generator.ts` still contains the full slice pipeline in one file. Keep new logic nearby and extract only the smallest helpers needed; the architecture wants explicit stages, not needless file proliferation. [Source: `src/world/generation/world-slice-generator.ts`; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md#File-Structure-Requirements`]
- `create-world-scene.ts` is already a large assembly or orchestration file. If manifest-driven world massing makes it harder to reason about, extract a focused helper adjacent to the scene layer rather than pushing more generation logic into the file. [Source: `src/rendering/scene/create-world-scene.ts`]
- `sceneMetadata` and navigation snapshot code currently assume one location name plus one district-name string. If a richer district model is added, keep a clear derived surface for current HUD or test consumers instead of forcing every caller to understand new raw structures. [Source: `src/world/chunks/slice-manifest.ts`; `src/rendering/scene/world-scene-runtime.ts`; `_bmad-output/implementation-artifacts/2-4-use-simple-navigation-cues-like-street-names-or-a-minimap.md#Technical-Requirements`]
- The repo now has a shipped asset-replacement document. If Story 5.2 changes world asset ids or the world-entry contract, update the doc and registry in the same story so later stories do not learn from stale documentation. [Source: `docs/asset-replacement-pipeline.md`; `_bmad-output/implementation-artifacts/5-1-external-asset-replacement-pipeline.md#Senior-Developer-Review-(AI)`]

### Project Context Rules

- Keep Babylon's scene graph as a rendering or composition layer, not the sole source of gameplay truth. [Source: `_bmad-output/project-context.md#Engine-Specific-Rules`]
- Keep loaded world content under a world root with chunk subtrees; do not build one monolithic scene. [Source: `_bmad-output/project-context.md#Engine-Specific-Rules`]
- Use Havok as the physics backend and keep gameplay simulation aligned with the `60 Hz` fixed-step plus interpolation rule. [Source: `_bmad-output/project-context.md#Engine-Specific-Rules`; `_bmad-output/planning-artifacts/game-architecture.md#Physics-and-Simulation`]
- Prefer constructor injection inside a domain and typed events or contracts across domains instead of ad hoc global access. [Source: `_bmad-output/project-context.md#Engine-Specific-Rules`]
- Design for stable desktop-browser `60 FPS`; treat world streaming, vehicle simulation, traffic, and pedestrians as hot-path systems, avoid per-frame allocations, and respect explicit residency or memory budgets. [Source: `_bmad-output/project-context.md#Performance-Rules`]
- Keep domain logic in its owning folder. `src/app/` orchestrates, `src/rendering/` displays state, `src/services/` handles optional remote systems, `src/persistence/` handles storage, and runtime-loaded assets or data live under `public/`. [Source: `_bmad-output/project-context.md#Code-Organization-Rules`]
- Replaceable art assets must bind through stable ids, transforms, and fallback proxies so externally authored models can replace defaults without gameplay rewrites. [Source: `_bmad-output/project-context.md#Code-Organization-Rules`; `docs/asset-replacement-pipeline.md`]
- Tests belong under the standard `tests/` folders and should use deterministic seeds plus stable fixtures or helpers. [Source: `_bmad-output/project-context.md#Testing-Rules`]
- The primary target is desktop web browsers with WebGL2 support via Vite; do not optimize this story for native desktop, console, or mobile first. [Source: `_bmad-output/project-context.md#Platform-&-Build-Rules`]
- Do not bypass the world-slice generation pipeline, do not mix static slice state with dynamic session state, do not fetch or parse runtime data directly from gameplay systems, and do not call storage or remote APIs directly from gameplay domains. [Source: `_bmad-output/project-context.md#Critical-Don't-Miss-Rules`]
- Do not trade away road truth, scale, terrain, district rhythm, or building or district recognizability for arbitrary embellishment or filler density. [Source: `_bmad-output/project-context.md#Critical-Don't-Miss-Rules`; `_bmad-output/planning-artifacts/gdd.md#Level-Design-Principles`]
- Use Context7 if current Babylon or Vite docs are needed during implementation; it is the project's selected documentation MCP. [Source: `_bmad-output/project-context.md#Technology-Stack-&-Versions`; `_bmad-output/planning-artifacts/game-architecture.md#AI-Tooling-(MCP-Servers)`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 5: Core Fantasy Recovery & V2 Quality Pass`
- `_bmad-output/planning-artifacts/gdd.md#Level Design Principles`
- `_bmad-output/planning-artifacts/gdd.md#Art and Audio Direction`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/gdd.md#Gameplay Metrics`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-12T20:50:42-07:00.md`
- `_bmad-output/planning-artifacts/game-architecture.md#Decision Summary`
- `_bmad-output/planning-artifacts/game-architecture.md#Asset Management`
- `_bmad-output/planning-artifacts/game-architecture.md#Physics and Simulation`
- `_bmad-output/planning-artifacts/game-architecture.md#Scene Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Real-place World Slice Generation`
- `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`
- `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`
- `_bmad-output/implementation-artifacts/2-4-use-simple-navigation-cues-like-street-names-or-a-minimap.md`
- `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`
- `_bmad-output/implementation-artifacts/5-1-external-asset-replacement-pipeline.md`
- `docs/asset-replacement-pipeline.md`
- `package.json`
- `public/data/world-gen/location-presets.json`
- `public/data/assets/registry.json`
- `src/world/generation/location-resolver.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/chunks/road-placement.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/asset-registry.ts`
- `src/rendering/scene/world-navigation.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `tests/unit/world-generation-request.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`
- `tests/unit/world-navigation.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/unit/asset-registry.spec.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Implementation Plan

- Expand the slice and preset contracts with explicit `districts[]` and manifest-owned `worldEntries[]`, including stable metadata and one owner `chunkId` per world entry.
- Normalize preset-driven district and world-entry data inside `world-slice-generator.ts`, derive deterministic fallback districts and world entries when source data is sparse, and preserve the legacy `sceneMetadata` compatibility surface.
- Deliberately bump the default `generationVersion` to `story-5-2` and keep cache reuse gated on that version so pre-5.2 manifests are regenerated.

### Debug Log References

- Created via BMAD `gds-create-story` workflow on `2026-04-17T23:42:38-07:00`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Completed Task 1 by adding explicit recognition-first `districts[]` and `worldEntries[]` contracts across presets, manifests, generator logic, and related fixtures.
- Added deterministic fallback district and world-entry generation with stable chunk ownership, while preserving `sceneMetadata.displayName` and `sceneMetadata.districtName` for existing consumers.
- Updated supported local preset fixtures, bumped the default generation version to `story-5-2`, and validated the contract expansion with `npm run check` and a full `npm test` pass.
- Completed Task 2 by supplementing sparse preset world data with deterministic derived entries for uncovered non-spawn road chunks, keeping the richer manifest serializable and cache-safe.
- Completed Task 3 by replacing the fixed three-building scene fallback with manifest-driven chunk massing plans that preserve stable world asset ids, chunk ownership, and the existing readiness path.
- Completed Task 4 by deriving navigation district labels from explicit manifest districts while preserving existing road-based downstream planning and compatibility surfaces.
- Completed Task 5 by adding ownership and world-ready guardrail coverage, then validating the story with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.

### File List

- `_bmad-output/implementation-artifacts/5-2-recognition-first-world-generation-upgrade.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `public/data/world-gen/location-presets.json`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/integration/player-settings.integration.spec.ts`
- `tests/integration/polish-telemetry.integration.spec.ts`
- `tests/integration/quick-restart.integration.spec.ts`
- `tests/integration/run-outcome-restart.integration.spec.ts`
- `tests/integration/starter-vehicle-camera.integration.spec.ts`
- `tests/integration/world-heat-failure.integration.spec.ts`
- `tests/integration/world-heat-hud.integration.spec.ts`
- `tests/integration/world-navigation-hud.integration.spec.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/traffic-system.smoke.spec.ts`
- `tests/unit/hijackable-vehicle-spawns.spec.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/unit/responder-scene-runtime.spec.ts`
- `tests/unit/session-state-machine.spec.ts`
- `tests/unit/traffic-system.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`

## Change Log

- 2026-04-18: Completed Task 1 by expanding the recognition-first manifest contract, updating deterministic preset fixtures, and invalidating stale pre-5.2 cached manifests.
- 2026-04-18: Completed Task 2 by normalizing recognition-first world generation, preserving road labels, and supplementing sparse source data with deterministic manifest-owned entries.
- 2026-04-18: Completed Task 3 by making scene chunk massing consume manifest world entries and the existing registry-backed authored-asset seam.
- 2026-04-18: Completed Task 4 by preserving downstream manifest-road consumers and deriving navigation district continuity from explicit manifest districts.
- 2026-04-18: Completed Task 5 by extending recognition-first guardrail coverage and passing check, test, build, and browser validation.
