# Story 5.3: Road and Urban Presentation Upgrade

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to drive on roads and through districts that look intentionally authored,
so that navigation and place identity improve.

## Acceptance Criteria

1. Given the recognition-first manifest from Story 5.2, when the world scene is created, then roads are rendered with improved visual fidelity (e.g., clear lanes, intersections, sidewalks, surface textures) instead of plain box segments, preserving the manifest's road layout and dimensions.
2. Given the generated world massing entries, when districts and buildings are rendered, then urban presentation is enhanced (e.g., varied building facade proxies, street props, or lighting) without breaking the established chunk ownership, stable asset ids, and proxy fallback seam from Stories 5.1 and 5.2.
3. Given rendering improvements are applied, when the game runs, then a stable 60 FPS target is maintained on desktop browsers, respecting chunk streaming, residency budgets, and avoiding per-frame allocations in hot loops.
4. Given the existing navigation, traffic, pedestrian, and spawn logic depend on manifest roads and chunks, when the visual presentation changes, then those downstream systems continue to function correctly without scene-only workarounds or duplicated road logic.
5. Given repository validation runs, when unit, integration, smoke, typecheck, build, and browser suites execute, then they prove the upgraded presentation, rendering logic, and that no regression occurs in the core load-to-drivable-world loop or gameplay readiness milestone.

## Tasks / Subtasks

- [x] Task 1: Upgrade road mesh generation and surface materials (AC: 1, 3, 4)
  - [x] Implement enhanced road geometries (e.g., lanes, curbs, intersections) based on `SliceManifest` road data.
  - [x] Apply recognizable textures or shaders to road surfaces while keeping rendering performance within budgets.
  - [x] Ensure road visual enhancements remain decoupled from downstream logical consumers (e.g., traffic, navigation).
- [x] Task 2: Enhance urban and district presentation (AC: 2, 3)
  - [x] Improve building proxies and landmark visual identity using the manifest's `worldEntries`.
  - [x] Add lightweight, chunk-owned urban props or lighting cues (e.g., streetlights, varied facades) through the registry-backed proxy seam.
- [x] Task 3: Optimize and integrate the upgraded presentation layer (AC: 3, 4)
  - [x] Verify that rendering enhancements (e.g., textures, materials, extra geometry) correctly stream in and out with chunk residency.
  - [x] Validate 60 FPS performance budgets through profiling or maintaining low draw call/allocation churn.
- [x] Task 4: Add guardrail coverage and repository validation (AC: 5)
  - [x] Add/update unit and scene tests for upgraded road mesh creation, material assignment, and building proxy visual logic.
  - [x] Run `npm run check`, `npm test`, `npm run build`, and `npm run test:browser` to ensure no regressions in world-loading and readiness pipelines.

## Dev Notes

- Story 5.3 is the road and urban presentation pass inside Epic 5. Story 5.2 provided the recognition-first world generation data, and this story will consume that data to produce a visually intentional world, moving away from primitive geometric placeholders.
- Avoid trading away scale, recognizable road topology, or performance for arbitrary filler. Visual presentation must enhance the generated identity, not obscure it.
- Keep the rendering logic distinct from gameplay truth. Babylon.js scene graph remains a composition/rendering layer.
- `public/data/assets/registry.json` and the proxy seam established in 5.1 remain authoritative for asset replacement. Use it for any new prop or building variations.

### Project Structure Notes

- Touchpoints will likely be under `src/rendering/scene/` (e.g., `create-world-scene.ts`, `road-rendering.ts` if created, materials, LODs) and `public/assets/` for textures or shaders.
- Ensure any new textures or shaders follow the project's browser-first constraint (e.g., keeping memory sizes down and respecting WebGL2 baselines).
- Runtime-loaded asset logic must still map through `AssetRegistry`.

### Project Context Rules

- Engine-Specific: Treat Babylon's scene graph as a rendering/composition layer. Do not mix runtime physics/gameplay assumptions into the visual layer.
- Performance: Design for stable `60 FPS` target. Use chunk streaming with predictive prefetch, avoid per-frame allocations.
- Platform & Build: WebGL2 compatibility is the baseline. 
- Critical Don't-Miss: Do not trade away road truth, scale, terrain, or district rhythm for arbitrary visual embellishment; recognition-first fidelity is part of the product.

### Previous Story Intelligence

- Story 5.2 shifted the generation pipeline to emit explicit `worldEntries` and `districts`. Utilize these instead of inventing random scatter.
- Story 5.1 established `attachAuthoredVisualToProxy`. Continue to use this pattern for new aesthetic props/buildings. Keep proxies authoritative for collision or fallback.

### Git Intelligence Summary

- Recent commits (`Complete Story 5.2...`, `Complete Story 5.1...`) emphasize preserving integration tests and strict typing.
- Ensure that the new rendering code doesn't break the `world.scene.ready` or `controllable-vehicle` milestones tested in the smoke suites.

### Latest Tech Information

- `Babylon.js` remains at `9.1.0`. `Vite` remains at `8.0.5`. Do not introduce dependency upgrades. Keep using the current engine features for any shaders, materials, or meshes.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5: Core Fantasy Recovery & V2 Quality Pass`]
- [Source: `_bmad-output/planning-artifacts/gdd.md#Art and Audio Direction`]
- [Source: `_bmad-output/project-context.md#Critical-Don't-Miss-Rules`]
- [Source: `docs/asset-replacement-pipeline.md`]
- [Source: `src/rendering/scene/create-world-scene.ts`]

## Dev Agent Record

### Agent Model Used

gemini-2.5-pro

### Debug Log References

- Web intelligence confirmed exact versions to use from package.json (`Babylon.js 9.1.0`, `Vite 8.0.5`).
- Git intelligence evaluated last 5 commits for continuity.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Upgraded road presentation by adding procedural dynamic texture for dashed lines, adding curbs on the side, and creating proper intersection meshes.
- Enhanced building presentation by adding procedural facade texture to the generic chunk massing material and correctly mapping `faceUV`.
- Spaced out roadside `prop:signpost` presentation proxies along roads through the registry-backed proxy seam as lightweight chunk-owned urban cues.
- Added chunk-root residency with forward look-ahead prefetch so upgraded road and urban presentation streams with chunk ownership instead of staying permanently resident.
- Reduced render-loop churn by throttling scene telemetry refreshes and limiting expensive mesh-count sampling to periodic updates instead of every frame.
- Added direct unit coverage for chunk residency selection, road surface/curb/intersection mesh generation, and authored building proxy attachment.
- Verified `npm run check`, `npm test`, `npm run build`, and `npm run test:browser` pass successfully.

### File List

- `_bmad-output/implementation-artifacts/5-3-road-and-urban-presentation-upgrade.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/rendering/scene/asset-registry.ts`
- `src/rendering/scene/create-world-scene.ts`
- `tests/unit/create-world-scene.spec.ts`
