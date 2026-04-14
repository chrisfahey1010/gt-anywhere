# Story 3.1: Drive Through Traffic

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can drive through traffic,
so that the city feels alive and the road becomes more interesting.

## Acceptance Criteria

1. Given the player reaches `world-ready` in a generated slice, when the world scene loads, then it instantiates a deterministic set of traffic vehicles derived from the current slice roads and chunk bounds, with spawn placement kept clear of the starter spawn, slice boundaries, and existing secondary parked or hijackable placements.
2. Given traffic vehicles are active, when simulation runs, then they follow road-aligned routes with lightweight rule-based behavior for forward progress, spacing, and simple obstruction handling so the city reads as alive without introducing pedestrians, combat, danger, or mission logic in this story.
3. Given the player cruises, collides, or blocks traffic, when traffic vehicles react, then they behave as physical in-world vehicles using the existing Babylon.js plus Havok runtime path, with readable recovery or blocking behavior instead of instantly deadlocking the session or disappearing.
4. Given the player uses existing flows such as restart from spawn, same-location replay, edit location, retry load, vehicle switching, exit and re-entry, hijack, and the navigation HUD, when this story is implemented, then those flows keep their current contracts and traffic state is cleaned up and recreated per run without mutating static slice identity or cached manifest ownership.
5. Given the current possession and hijack system resolves nearby vehicle targets by range and facing, when traffic vehicles are introduced, then only explicitly supported traffic vehicles may participate in that interaction path, and unsupported moving traffic must stay safely non-interactable rather than becoming a broken hijack shortcut.
6. Given the feature is implemented, when repo validation runs, then unit, integration, smoke, typecheck, and build checks confirm deterministic traffic planning, runtime update behavior, cleanup across restart or replay, and no regression in possession, navigation, or world loading contracts.

## Tasks / Subtasks

- [x] Task 1: Add deterministic traffic-ready planning to world data and generation seams (AC: 1, 2, 6)
  - [x] Extend the serializable world data contract with the minimum traffic route or spawn metadata needed for runtime traffic planning.
  - [x] Generate that metadata from existing `SliceManifest` roads, chunks, and bounds instead of inventing an unrelated traffic config path.
  - [x] Keep starter-spawn clearance, in-bounds placement, and deterministic ordering so repeated loads of the same slice stay stable.
- [x] Task 2: Introduce a minimal traffic domain under `src/traffic/` for planning and runtime behavior (AC: 1, 2, 3, 5)
  - [x] Create the smallest architecture-aligned traffic modules for spawn planning, route following, and simple rule-based driving behavior.
  - [x] Centralize traffic vehicle creation through one traffic-owned seam so future pooling is possible without rewriting scene bootstrap.
  - [x] Reuse the current shipped tuning-backed vehicle types instead of adding new vehicle assets or a second vehicle implementation path.
- [x] Task 3: Integrate traffic into world scene bootstrap, updates, and disposal (AC: 1, 2, 3, 4)
  - [x] Instantiate traffic vehicles from the generated traffic plan during `create-world-scene.ts` setup.
  - [x] Update traffic vehicles inside the existing world runtime loop with explicit NPC control input rather than player-controller input.
  - [x] Dispose all traffic meshes, physics bodies, listeners, and metadata cleanly on scene teardown.
- [x] Task 4: Preserve possession, hijack, restart, replay, and HUD boundaries (AC: 4, 5)
  - [x] Decide and enforce an explicit interaction policy for traffic vehicles so the current `E`-based hijack or re-entry flow does not become unreliable.
  - [x] Keep cached manifest identity, restart, replay, and world-ready readiness semantics unchanged while traffic is recreated as dynamic session state.
  - [x] Keep the navigation HUD readable and non-interactive, with no required traffic-specific UI for this story.
- [x] Task 5: Add automated coverage and run repository validation (AC: 6)
  - [x] Add unit coverage for traffic planning, route sampling, spacing, and any interaction-eligibility gating.
  - [x] Add integration or smoke coverage for traffic scene initialization, restart or replay cleanup, and no regression in possession or navigation behavior.
  - [x] Run `npm run check`, `npm test`, and `npm run build` before moving the story beyond implementation.

## Dev Notes

- Story 3.1 is the first Epic 3 story. The point is to make the road feel alive and interesting, not to jump ahead into pedestrians, destruction, combat, danger, or escape systems that belong to later Epic 3 stories. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`; `_bmad-output/planning-artifacts/gdd.md#Core Gameplay Loop`]
- Epic 3 sequencing matters: traffic becomes the moving-world baseline that later pedestrian, damage, combat, danger, and escape stories will build on, so the implementation should add clean seams rather than a one-off scripted demo. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`; `_bmad-output/planning-artifacts/game-architecture.md#AI Systems`]
- No dedicated UX artifact or `project-context.md` file was found during workflow discovery. Use the GDD, architecture, current source tree, and current tests as the governing guidance for this story. [Source: workflow discovery results]

### Non-Negotiables

- Do not expand this story into pedestrians, combat, danger or heat, destruction, pickups, mission logic, or wanted-level systems.
- Do not replace the current Babylon.js plus Havok vehicle path with a second traffic-only vehicle implementation.
- Do not create a second world-generation pipeline, second scene bootstrap path, or a parallel manifest format just for traffic.
- Do not mutate `sliceId`, `reuseKey`, cached manifest ownership, or same-location replay identity to represent traffic state.
- Do not let fast-moving traffic become trivially hijackable by accident under the current interaction rules.
- Keep `world.scene.ready` and the current readiness milestone `controllable-vehicle` intact; traffic is additive ambient simulation, not a new boot phase.

### Technical Requirements

- Traffic planning must start from `SliceManifest.roads`, `SliceManifest.chunks`, and slice bounds. The current manifest only exposes road centerlines, widths, and one starter `laneIndex`, so add the minimum serializable traffic route or spawn metadata needed for runtime traffic instead of inventing per-frame ad hoc route logic inside `create-world-scene.ts`. [Source: `src/world/chunks/slice-manifest.ts`; `src/world/generation/world-slice-generator.ts`]
- Keep all manifest additions serializable. Do not store Babylon objects, physics handles, functions, DOM references, or mutable runtime state in `SliceManifest`. [Source: `tests/unit/world-slice-generator.spec.ts`]
- Reuse road interpolation and spacing ideas from `createHijackableVehicleSpawns()` rather than reimplementing segment sampling, chunk resolution, or starter-clearance logic from scratch. If needed, extract a shared helper instead of duplicating geometry math. [Source: `src/rendering/scene/hijackable-vehicle-spawns.ts`]
- Keep traffic away from the starter spawn, boundary walls, and obvious collision traps. The player must still spawn into a drivable, readable opening instead of an instant pileup. [Source: `src/world/generation/world-slice-generator.ts`; `src/rendering/scene/create-world-scene.ts`; `tests/unit/world-slice-generator.spec.ts`]
- `create-world-scene.ts` already owns scene setup, static physics, per-frame runtime updates, telemetry, and teardown. Use it as the orchestration seam, but move traffic-specific planning and behavior into `src/traffic/` modules so the scene file does not become the traffic system itself. [Source: `src/rendering/scene/create-world-scene.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`]
- Reuse `createVehicleFactory()` and the current tuning JSON files for traffic vehicles. Do not build a traffic-only fake mesh path or a second physics backend. [Source: `src/vehicles/physics/vehicle-factory.ts`; `public/data/tuning/*.json`; `package.json`]
- `createVehicleFactory().update()` falls back to player-controller state when no explicit control state is supplied. Traffic vehicles must always be driven through explicit NPC control input or a narrow non-player seam; do not instantiate a separate player controller per traffic car. [Source: `src/vehicles/physics/vehicle-factory.ts`; `src/vehicles/controllers/player-vehicle-controller.ts`]
- Keep traffic density conservative. The architecture explicitly favors low-cost believability over deep planning, and the project still targets a stable 60 FPS desktop browser baseline. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Systems`; `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`; `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`]
- Keep the first traffic implementation scene-local. Do not introduce chunk-streamed respawn systems, background traffic managers, or autonomous world streaming work in this story; the current repository resets dynamic state by disposing and recreating the full world scene. [Source: `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/create-world-scene.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`]
- Traffic reset must behave as dynamic session state. Restart and replay should recreate traffic while preserving the same static slice and cached manifest identity. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`; `src/app/bootstrap/create-game-app.ts`; `src/app/state/session-state-machine.ts`]
- The current hijack resolver checks distance and facing, but not target speed. If traffic vehicles are made interactable, gate eligibility to explicit stopped or near-stopped traffic targets or extend interaction rules deliberately; do not let moving traffic accidentally become the easiest hijack path in the game. [Source: `src/sandbox/on-foot/player-possession-runtime.ts`; `src/sandbox/on-foot/vehicle-interaction-target.ts`]
- Give traffic runtimes stable deterministic IDs or names derived from manifest roads or traffic-plan entries so tests, logging, and future interaction rules can target them reliably. [Source: `src/rendering/scene/hijackable-vehicle-spawns.ts`; `src/rendering/scene/create-world-scene.ts`; `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`]
- Keep the navigation HUD unchanged for this story. No traffic-specific HUD is required beyond optional debug metadata if it directly supports testing or diagnostics. [Source: `src/ui/hud/world-navigation-hud.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]
- Preserve typed failure handling. If traffic initialization cannot finish, surface that through the existing world-load failure path rather than leaving a half-ready scene with ambiguous traffic state. [Source: `src/world/generation/world-load-failure.ts`; `src/app/bootstrap/create-game-app.ts`]

### Architecture Compliance

- Put new traffic logic under `src/traffic/` with the smallest useful subdivisions such as `spawning/`, `routing/`, `agents/`, or `rules/`. Keep `src/rendering/scene/create-world-scene.ts` as the assembler and owner of the scene lifecycle rather than the permanent home for traffic logic. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`]
- Respect the architecture boundary that domain folders own gameplay behavior while rendering consumes domain state. Do not bury traffic truth inside `src/rendering/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- If traffic lifecycle or debugging signals need events, use typed event names in the `domain.action` style such as `traffic.vehicle.spawned` or `traffic.route.blocked`. Do not coordinate traffic through DOM scraping or untyped globals. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `_bmad-output/planning-artifacts/game-architecture.md#Consistency Rules`; `src/app/events/game-events.ts`]
- Centralize traffic-vehicle creation through a factory-owned seam or registry so future pooling remains possible. Do not scatter direct runtime creation across unrelated scene callbacks. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Entity Patterns`; `_bmad-output/planning-artifacts/game-architecture.md#Consistency Rules`]
- Keep traffic route data and tuning behind explicit modules or repositories instead of reading arbitrary files inside gameplay systems. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Configuration`; `_bmad-output/planning-artifacts/game-architecture.md#Data Patterns`]
- Do not move traffic decisions into shell UI, HUD rendering, or `src/app/bootstrap/` beyond the minimal wires already required for world-scene loading and teardown. [Source: `_bmad-output/planning-artifacts/game-architecture.md#UI Architecture`; `src/app/bootstrap/create-game-app.ts`]
- Preserve current `scene.metadata`, canvas dataset telemetry, and readiness semantics. Additive traffic debug fields are fine if they help testing, but do not rename or repurpose existing readiness, possession, camera, or starter-vehicle keys. [Source: `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/world-scene-runtime.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/smoke/world-scene-possession.smoke.spec.ts`]

### Library / Framework Requirements

- Stay on the repo's pinned runtime stack: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and `vite` `8.0.5`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`]
- Latest checks during this workflow show `@babylonjs/core` `9.1.0` and `@babylonjs/havok` `1.3.12` still match the current latest stable npm releases, so no Babylon or Havok upgrade is needed for this story. [Source: npm registry checks during workflow]
- Latest checks during this workflow show `vite` `8.0.7` as current stable while the repo stays on `8.0.5`; Vite still requires Node `20.19+` or `22.12+`. Treat any Vite upgrade as out of scope for this story. [Source: npm registry checks during workflow; `https://vite.dev/guide/`]
- Babylon `9.1.0` release notes are focused on broader engine and WebGPU changes, not traffic-simulation-specific APIs, so this story should stay focused on runtime architecture and feature behavior instead of dependency churn. [Source: `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`]
- Do not add a traffic AI package, ECS framework, state-management library, or alternate physics dependency for this story. The current TypeScript plus Babylon.js stack is sufficient for the required rule-based traffic layer. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Decisions`]

### File Structure Requirements

- Likely touchpoints for this story are:
  - `src/world/chunks/slice-manifest.ts`
  - `src/world/generation/world-slice-generator.ts`
  - new files under `src/traffic/` for traffic planning and runtime behavior
  - `src/rendering/scene/hijackable-vehicle-spawns.ts` if road-slot sampling is extracted or shared
  - `src/rendering/scene/create-world-scene.ts`
  - `src/vehicles/physics/vehicle-factory.ts` and possibly `src/vehicles/physics/vehicle-manager.ts` if a narrow non-player control seam is needed
  - `src/sandbox/on-foot/player-possession-runtime.ts` or `src/sandbox/on-foot/vehicle-interaction-target.ts` only if traffic interaction policy requires an explicit rule change
  - relevant unit, integration, and smoke tests
- The repo currently has no `src/traffic/` directory. Create the smallest architecture-aligned shape rather than dropping traffic helpers into `src/rendering/scene/` or `src/app/`. [Source: repo structure; `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`]
- Keep world data or manifest contract changes in `src/world/`, traffic behavior in `src/traffic/`, vehicle physics reuse in `src/vehicles/`, and scene wiring in `src/rendering/scene/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`]
- Do not move gameplay logic into `public/` or `src/ui/`. Runtime-loaded JSON belongs in `public/data/`, but gameplay decisions and update rules belong in source modules under `src/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]

### Testing Requirements

- Follow the existing repository testing pattern:
  - unit tests in `tests/unit/*.spec.ts`
  - integration tests in `tests/integration/*.spec.ts`
  - smoke coverage in `tests/smoke/*.spec.ts`
- Add unit coverage for deterministic traffic planning from roads and chunks, including clearance around the starter spawn and stable ordering across repeated generation calls. [Source: `tests/unit/world-slice-generator.spec.ts`]
- Add unit or integration coverage for traffic runtime update behavior, including basic forward progress, spacing, simple blocking or obstruction handling, and any explicit interaction-eligibility rule for traffic vehicles.
- Add scene-focused integration or smoke coverage that traffic initializes and disposes cleanly across restart and replay while the readiness milestone remains `controllable-vehicle`. [Source: `tests/smoke/app-bootstrap.smoke.spec.ts`; `src/app/bootstrap/create-game-app.ts`]
- Preserve or extend coverage for vehicle switching, on-foot transfer, hijack, restart, and navigation HUD continuity so traffic does not regress current Epic 2 capabilities. [Source: `tests/unit/vehicle-manager.spec.ts`; `tests/smoke/world-scene-possession.smoke.spec.ts`; `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`; `tests/integration/world-navigation-hud.integration.spec.ts`]
- Add at least one assertion that any traffic-specific telemetry is additive and that existing readiness, possession, camera, and starter-vehicle dataset fields stay intact.
- Keep `tests/integration/world-slice-loading.integration.spec.ts` and `tests/unit/world-slice-generator.spec.ts` valid; manifest changes must remain loadable and deterministic.
- Finish implementation validation with `npm run check`, `npm test`, and `npm run build`.

### Latest Tech Information

- `@babylonjs/core` `9.1.0` and `@babylonjs/havok` `1.3.12` remain the latest stable npm versions checked during this workflow, matching the repo pins.
- Babylon `9.1.0` release notes emphasize broader rendering and engine updates such as WebGPU improvements and core package changes, not anything that requires a traffic-story dependency change.
- `vite` `8.0.7` is the current latest stable while the repo remains on `8.0.5`; Vite still documents Node `20.19+` or `22.12+` as the supported baseline.
- No extra dependency is needed for this story. The current stack already supports deterministic traffic planning, Babylon scene integration, and TypeScript test coverage.

### Project Structure Notes

- `create-world-scene.ts` is already the largest gameplay-assembly file in the repo. Traffic modules should keep future growth out of that file by leaving only orchestration, scene attachment, and teardown there. [Source: `src/rendering/scene/create-world-scene.ts`]
- The current manifest contract covers roads, chunks, spawn candidates, and scene metadata, but it does not yet expose a reusable traffic route graph or spawn plan. This story likely needs the first minimal traffic-planning seam. [Source: `src/world/chunks/slice-manifest.ts`]
- `createHijackableVehicleSpawns()` already solves road interpolation, chunk lookup, starter clearance, and spacing across road segments. That is the closest existing code seam for traffic placement logic. [Source: `src/rendering/scene/hijackable-vehicle-spawns.ts`]
- Restart and replay already recreate the world scene through `disposeWorldScene()` and cached world reloads. That is the intended traffic cleanup mechanism; do not add a second reset path. [Source: `src/app/bootstrap/create-game-app.ts`]
- The current possession and hijack logic assumes a curated list of interactable vehicles. Traffic should preserve that explicitness rather than silently exposing every ambient vehicle to the existing interaction path. [Source: `src/sandbox/on-foot/player-possession-runtime.ts`]

### Project Context Rules

- No `project-context.md` file was found in the workspace during workflow discovery.
- Use the architecture document, `package.json`, current source structure, and existing tests as the governing project rules for this story.
- The architecture selected Context7 as the preferred up-to-date documentation source for Babylon.js and Vite work if implementation needs additional external docs. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`
- `_bmad-output/planning-artifacts/gdd.md#Core Gameplay Loop`
- `_bmad-output/planning-artifacts/gdd.md#Game Mechanics`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/game-architecture.md#AI Systems`
- `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`
- `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`
- `_bmad-output/planning-artifacts/game-architecture.md#Event System`
- `_bmad-output/planning-artifacts/game-architecture.md#Entity Patterns`
- `_bmad-output/planning-artifacts/game-architecture.md#Consistency Rules`
- `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`
- `package.json`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/app/state/session-state-machine.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/hijackable-vehicle-spawns.ts`
- `src/sandbox/on-foot/player-possession-runtime.ts`
- `src/sandbox/on-foot/vehicle-interaction-target.ts`
- `src/ui/hud/world-navigation-hud.ts`
- `src/vehicles/controllers/player-vehicle-controller.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/vehicles/physics/vehicle-manager.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-load-failure.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/integration/world-navigation-hud.integration.spec.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`
- `tests/smoke/world-scene-possession.smoke.spec.ts`
- `tests/unit/vehicle-manager.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Implementation Plan

- Add serializable manifest traffic metadata generated from slice roads, chunks, and bounds with deterministic IDs, ordering, and starter-clearance rules.
- Reuse shared road-slot sampling rules so traffic planning and hijackable placement stay aligned and ambient traffic avoids existing secondary vehicle slots.
- Follow with scene-local traffic runtime modules, explicit NPC vehicle control, cleanup wiring, and regression coverage for restart, replay, possession, and HUD boundaries.

### Debug Log References

- `npm view @babylonjs/core version`
- `npm view @babylonjs/havok version`
- `npm view vite version`
- `npm test -- --run tests/unit/world-slice-generator.spec.ts`
- `npm test -- --run tests/unit/world-slice-generator.spec.ts tests/unit/hijackable-vehicle-spawns.spec.ts`
- `npm test`
- `npm test -- --run tests/unit/traffic-route.spec.ts tests/unit/traffic-driving.spec.ts`
- `npm test -- --run tests/unit/traffic-route.spec.ts tests/unit/traffic-driving.spec.ts tests/unit/world-slice-generator.spec.ts`
- `npm run check`
- `npm test -- --run tests/unit/traffic-system.spec.ts`
- `npm test -- --run tests/unit/vehicle-interaction-policy.spec.ts`
- `npm test -- --run tests/integration/world-slice-loading.integration.spec.ts tests/smoke/traffic-system.smoke.spec.ts`
- `npm test -- --reporter=dot`
- `npm run build`
- `git status --short`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added deterministic manifest traffic metadata plus shared road-slot sampling so traffic and hijackable placements stay serializable, stable, and spatially separated.
- Introduced the first `src/traffic/` planning, routing, driving, and vehicle-factory seams with focused unit coverage and successful typecheck validation.
- Integrated scene-local traffic lifecycle wiring into `create-world-scene.ts`, including spawn, update, teardown, and additive traffic telemetry that preserves existing readiness and HUD contracts.
- Enforced an explicit hijack interaction policy so only marked `hijackable` vehicles participate while ambient traffic remains safely non-interactable.
- Added unit, integration, and smoke coverage for traffic runtime behavior and restart-style recreation, then passed `npm run check`, full `npm test`, and `npm run build`.

### File List

- `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/hijackable-vehicle-spawns.ts`
- `src/sandbox/on-foot/vehicle-interaction-policy.ts`
- `src/traffic/agents/traffic-driving.ts`
- `src/traffic/planning/traffic-plan.ts`
- `src/traffic/routing/traffic-route.ts`
- `src/traffic/runtime/traffic-system.ts`
- `src/traffic/runtime/traffic-vehicle-factory.ts`
- `src/world/chunks/road-placement.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`
- `tests/smoke/traffic-system.smoke.spec.ts`
- `tests/unit/traffic-driving.spec.ts`
- `tests/unit/traffic-route.spec.ts`
- `tests/unit/traffic-system.spec.ts`
- `tests/unit/vehicle-interaction-policy.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`

## Change Log

- 2026-04-08: Added deterministic traffic manifest planning, scene-local traffic runtime integration, explicit hijack interaction gating, and traffic-focused unit, integration, and smoke coverage. Story status moved to `review` after `npm run check`, `npm test`, and `npm run build` passed.
