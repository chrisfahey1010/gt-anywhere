# Story 3.3: Damage Vehicles and Break Selected Props

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can damage vehicles and break selected props,
so that chaos has physical payoff.

## Acceptance Criteria

1. Given the player reaches `world-ready` in a generated slice, when the world scene loads, then it initializes a deterministic, serializable set of selected breakable props derived from the current slice roads, chunks, and bounds, with stable IDs, a conservative per-slice cap, and curated first-wave scope limited to lightweight roadside props such as signposts, bollards or barriers, and hydrant-style or short post props, all placed clear of the starter spawn, slice boundaries, traffic starts, pedestrian starts, hijackable vehicle placements, and the current readable driving opening.
2. Given the active vehicle, hijackable vehicles, or traffic vehicles collide with other vehicles or selected breakable props at meaningful impact speed, when runtime collision classification runs, then the impacted vehicle updates a lightweight damage state and eligible props transition once into a broken state with readable physical payoff such as a one-way mesh or material change plus collider disablement or removal, while per-contact dedupe or cooldown rules prevent repeated multi-frame double-counting, and without introducing explosions, fire, total vehicle destruction, combat, ammo, health, heat or wanted logic, police response, pickups, or mission scripting in this story.
3. Given damage or breakage occurs, when the scene and domain systems publish runtime state, then runtime or domain state remains the source of truth and they expose additive typed events, mesh metadata, `scene.metadata`, and canvas dataset telemetry as a bounded recent-event summary plus damaged-vehicle and broken-prop counts without changing `world.scene.ready`, the `controllable-vehicle` readiness milestone, current navigation HUD contracts, or the explicit vehicle interaction allowlist.
4. Given restart from spawn, same-location replay, vehicle switching, exit and re-entry, hijack, traffic, and pedestrian systems already exist, when this story is implemented, then breakable props and damage state reset cleanly as dynamic session state per recreated run while static slice identity and cached manifest ownership remain stable, exit and re-entry preserve the current vehicle's damage, hijack preserves the target vehicle's existing damage while leaving the abandoned vehicle's damage attached to it, and active vehicle type switching preserves normalized damage severity instead of silently repairing the vehicle.
5. Given current world-loading and runtime boundaries rely on serializable manifests, domain-local logic, and scene orchestration seams, when this story is implemented, then breakable prop planning stays manifest-first, vehicle damage logic stays out of UI and app bootstrap modules, breakable props do not become hijack or re-entry targets, and any traffic or pedestrian reactions to impacts are exposed only through narrow typed seams or metadata rather than broad cross-domain coupling.
6. Given the feature is implemented, when repository validation runs, then unit, integration, smoke, typecheck, and build checks confirm deterministic prop planning, vehicle damage transitions, prop break transitions, restart or replay cleanup, explicit damage persistence policy, additive telemetry, and no regression in traffic, pedestrians, possession, replay, navigation, or world loading contracts.

## Tasks / Subtasks

- [x] Task 1: Extend serializable world and tuning contracts for damage and breakable props (AC: 1, 2, 4, 6)
  - [x] Add the minimum optional manifest contract needed for selected breakable props, keeping all new fields serializable and backward-compatible with existing inline manifest fixtures.
  - [x] Extend vehicle tuning data and types with the minimum damage-relevant values needed for impact thresholds or durability instead of hardcoding those values inside scene bootstrap.
  - [x] Implement the explicit damage-state policy for active vehicle type switching, hijack transfer, exit and re-entry, restart, and replay instead of leaving those flows implicit.
- [x] Task 2: Add deterministic breakable-prop planning derived from current slice geometry (AC: 1, 5, 6)
  - [x] Reuse `src/world/chunks/road-placement.ts` or a nearby shared world-placement helper for deterministic roadside candidate sampling, spacing, bounds checks, and reserved-position avoidance.
  - [x] Generate stable prop IDs and a small first-wave allowlist of low-cost prop types from the manifest generation pipeline instead of inventing hardcoded scene-only placements.
  - [x] Keep selected prop placements clear of the starter spawn, boundary walls, traffic starts, pedestrian starts, and hijackable vehicle placements so early driving readability stays intact.
- [x] Task 3: Implement lightweight vehicle-damage and prop-break runtime behavior (AC: 2, 3, 5)
  - [x] Add a minimal vehicle damage seam under `src/vehicles/damage/` for impact classification, accumulated damage state, and future-facing event hooks.
  - [x] Add the smallest useful runtime for breakable props so curated props transition once into a broken or disabled state with readable lightweight feedback and no ambiguous repeat-break behavior.
  - [x] Use explicit typed events, metadata, or small state machines for crash or break outcomes, including per-contact dedupe or cooldown rules, instead of deep deformation, fracture middleware, or broad scene-file conditionals.
- [x] Task 4: Integrate damage and break systems into scene lifecycle, telemetry, and current interaction boundaries (AC: 2, 3, 4, 5)
  - [x] Wire damage and prop-break updates into `create-world-scene.ts` as orchestration only, using a dedicated scene adapter or narrow runtime seam where scene-specific collision inputs are required.
  - [x] Preserve `interactionRole` policy gates so selected props and non-hijackable damaged vehicles do not enter the hijack or re-entry targeting path.
  - [x] Keep all telemetry additive, preserve `readinessMilestone`, `activeCamera`, navigation, and possession fields, and reset dynamic damage or break state cleanly on scene teardown and recreation.
- [x] Task 5: Add regression coverage and run repository validation (AC: 6)
  - [x] Add unit coverage for deterministic prop planning, impact thresholding, vehicle damage accumulation, prop break transitions, and explicit switch or hijack damage policy.
  - [x] Add scene-focused unit, integration, or smoke coverage for additive telemetry, restart or replay cleanup, and stability of readiness, navigation, possession, traffic, and pedestrian contracts.
  - [x] Run `npm run check`, `npm test`, and `npm run build` before moving the story beyond implementation.

## Dev Notes

- Story 3.3 is the third Epic 3 story. Story 3.1 made the city feel alive with traffic, and Story 3.2 added pedestrians and readable consequence hooks. This story should add physical payoff to collisions and chaos without jumping ahead into combat, ammo, player health, heat or wanted systems, or fail-state loops that belong to later Epic 3 stories. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`; `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`]
- The GDD explicitly calls for vehicle-focused physics and selective destruction, while keeping the browser-first sandbox lightweight and curated rather than simulation-heavy. That means readable damage and a small set of breakable props are in scope; structural destruction, deep material simulation, and heavy destruction tech are not. [Source: `_bmad-output/planning-artifacts/gdd.md#Sandbox Specific Design`; `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`]
- No dedicated UX artifact or `project-context.md` file was found during workflow discovery. Use the GDD, architecture, current source tree, package pins, and existing tests as the governing guidance for this story. [Source: workflow discovery results]

### Non-Negotiables

- Do not expand this story into explosions, fire propagation, full wreck states, combat, ammo, player health, heat or wanted systems, police behavior, pickups, repair economy, mission logic, or fail-and-restart loops.
- Do not replace the current manifest-driven world generation path with hardcoded scene-only breakable props or ad hoc collision state stored only in meshes.
- Do not change the `world.scene.ready` contract or the readiness milestone `controllable-vehicle`.
- Do not let selected props, pedestrians, traffic vehicles, or damaged non-hijackable vehicles silently enter hijack, re-entry, or player-possession paths.
- Keep breakable prop state and vehicle damage as dynamic session state; do not mutate static slice identity, cached manifest ownership, `sliceId`, or `reuseKey` to represent live runtime breakage.
- Do not add a fracture library, alternate physics backend, ECS framework, or heavy destruction dependency just to support this story.

### Technical Requirements

- The architecture already reserves `src/vehicles/damage/` for vehicle degradation. Put the reusable vehicle damage state, thresholds, and classification seams there instead of burying them inside `src/rendering/scene/create-world-scene.ts` or `src/app/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`]
- `VehicleTuning` already carries `mass`, dimensions, and handling data, and the repo loads that data from `public/data/tuning/*.json`. If this story needs crash tolerance, durability, or impact multipliers, add them to the tuning contract and JSON profiles rather than scattering hardcoded thresholds across scene code. [Source: `src/vehicles/physics/vehicle-factory.ts`; `public/data/tuning/sedan.json`; `public/data/tuning/sports-car.json`; `public/data/tuning/heavy-truck.json`]
- `SliceManifest` currently supports optional `traffic` and `pedestrians` plans but has no prop plan. If selected breakable props must be deterministic and restart-safe, add a new optional serializable manifest section rather than making new manifest data required. Slices and fixtures with no prop plan must still load unchanged, and manifest ordering or cache identity must not be perturbed by the new optional data. [Source: `src/world/chunks/slice-manifest.ts`; `tests/unit/world-slice-generator.spec.ts`; `tests/unit/pedestrian-scene-runtime.spec.ts`; `tests/smoke/pedestrian-scene-runtime.smoke.spec.ts`]
- Add deterministic prop planning inside `DefaultWorldSliceGenerator.generate()` alongside traffic and pedestrians. That keeps the city definition stable across restart and replay, and it matches the manifest-first Epic 3 pattern already established. [Source: `src/world/generation/world-slice-generator.ts`; `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`]
- Reuse `collectRoadPlacementCandidates()` and `selectSpacedRoadPlacements()` for any road-adjacent prop placement before inventing new spatial helpers. Those utilities already solve deterministic road sampling, bounds padding, starter clearance, chunk resolution, sorting, and spacing. [Source: `src/world/chunks/road-placement.ts`; `src/traffic/planning/traffic-plan.ts`; `src/pedestrians/planning/pedestrian-plan.ts`]
- Keep the first-wave prop scope intentionally small: lightweight roadside props such as signposts, bollards or barriers, and hydrant-style or short post props are enough. Buildings, major world geometry, and broad destructibility are out of scope for this story. [Source: `_bmad-output/planning-artifacts/gdd.md#Sandbox Specific Design`; `src/rendering/scene/create-world-scene.ts`]
- Keep breakable-prop density conservative, with a single-digit to low-teens per-slice budget and deterministic spacing. Avoid broad O(n^2) impact scans or scene-wide mesh iteration each frame. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`; `_bmad-output/planning-artifacts/game-architecture.md#Technical Constraints`; `src/world/chunks/road-placement.ts`]
- Avoid driving prop placement from `chunk.roadIds` inside scene rendering. Current chunk-to-road association is coarse and scene assembly builds full road meshes for matching chunks, so seam-sensitive prop placement should come from explicit plan entries with stable `chunkId`, `roadId`, and `position`. [Source: `src/world/generation/world-slice-generator.ts`; `src/rendering/scene/create-world-scene.ts`]
- `create-world-scene.ts` already owns world assembly, update ordering, telemetry, and teardown. Keep it as the orchestration seam only. If damage or prop breakage needs scene-derived inputs, add a narrow scene adapter similar to `pedestrian-scene-runtime.ts` instead of turning the scene file into the damage system. [Source: `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/pedestrian-scene-runtime.ts`]
- `enableStaticPhysics()` batches the current ground, roads, walls, and chunk massing into mass-0 aggregates. Selected props that can disappear, stop colliding, or otherwise change state should be owned by a dedicated prop runtime with per-prop handles or lifecycle, not thrown into the one-shot static physics batch with no break-state control. [Source: `src/rendering/scene/create-world-scene.ts`]
- The only current collision-like gameplay seam is the pedestrian adapter, which classifies collisions from live world actors using explicit inputs and velocity thresholds. Reuse that pattern for damage or prop break classification: world actors in, typed impact results out, no hidden dependence on player controller state. [Source: `src/rendering/scene/pedestrian-scene-runtime.ts`; `tests/unit/pedestrian-scene-runtime.spec.ts`; `tests/unit/pedestrian-system.spec.ts`]
- Crash or break classification must dedupe repeated contacts across multiple frames. Require one-shot prop transitions and either a short cooldown or a contact-window key so one impact does not emit repeated damage or break events every frame. [Source: `src/rendering/scene/pedestrian-scene-runtime.ts`; `tests/unit/pedestrian-scene-runtime.spec.ts`]
- `vehicle-manager.ts` preserves transform and velocity when switching active vehicle types, but it currently knows nothing about damage. This story must define and test whether active vehicle type switching preserves equivalent damage state, while hijack transfers should preserve the hijacked vehicle's own runtime damage state instead of duplicating or silently clearing it. [Source: `src/vehicles/physics/vehicle-manager.ts`; `tests/unit/vehicle-manager.spec.ts`]
- Keep damage and break feedback lightweight and browser-safe. Use low-cost visual state changes, metadata, and simple mesh transitions that match the repo's current placeholder geometry approach instead of deep deformation or asset-heavy fracture effects. [Source: `src/vehicles/physics/vehicle-factory.ts`; `_bmad-output/planning-artifacts/gdd.md#Art and Audio Direction`; `_bmad-output/planning-artifacts/gdd.md#Asset Requirements`]
- Telemetry must stay bounded and additive. Treat runtime state as the source of truth, then project a small recent-event summary such as the last 4 event types plus counts into `scene.metadata` and `canvas.dataset` rather than building an unbounded event history there. [Source: `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/pedestrian-scene-runtime.ts`; `src/rendering/scene/world-scene-runtime.ts`]
- If this story adds future-facing hooks for later chaos or danger stories, expose the minimum seam needed through typed events or state transitions such as `vehicle.damaged`, `vehicle.crashed`, or `prop.broken`. Do not implement later heat, police, combat, or fail-state systems now. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`]
- Preserve typed failure handling. If damage or breakable-prop scene initialization cannot finish, route failure through the existing world-load failure path rather than leaving a half-ready scene with ambiguous runtime state. [Source: `src/world/generation/world-load-failure.ts`; `src/app/bootstrap/create-game-app.ts`]

### Damage and Break Policy

- Exit and re-enter the same physical vehicle: preserve that vehicle's existing damage state.
- Hijack transfer: preserve the target vehicle's existing damage state and leave the abandoned vehicle's damage attached to the abandoned runtime.
- Active vehicle type switching: preserve normalized damage severity and equivalent visual damage state so cycling vehicle types cannot silently repair the run.
- Restart, replay, or full world-scene recreation: reset all vehicle damage and breakable-prop runtime state while keeping the static slice manifest and location identity unchanged.
- Breakable props: one-way transition only for this story. Once a prop is broken in a run, it remains broken until the run resets.

### Architecture Compliance

- Keep new vehicle damage logic under `src/vehicles/damage/` and let scene modules consume that state through explicit seams. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- Keep deterministic prop planning and manifest contract changes under `src/world/`, and keep any runtime break-state behavior in a dedicated gameplay-owned seam rather than inside rendering-only modules. A small `src/sandbox/chaos/` runtime is acceptable if prop state needs a gameplay home beyond the scene adapter. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- If damage or break events need cross-domain communication, use typed `domain.action` names and typed payloads. Do not coordinate crash or break state through DOM scraping, untyped globals, or `scene.metadata` as the primary source of truth. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `src/app/events/game-events.ts`]
- Centralize spawned runtime actor creation through factory-owned seams or small registries so later pooling or richer assets remain possible. Do not scatter direct mesh creation for props or damage decals across unrelated scene callbacks. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Entity Patterns`; `_bmad-output/planning-artifacts/game-architecture.md#Consistency Rules`; `src/pedestrians/runtime/pedestrian-factory.ts`; `src/traffic/runtime/traffic-vehicle-factory.ts`]
- Keep config or tuning data behind explicit modules or repositories. Do not fetch or parse arbitrary files directly from gameplay systems. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Configuration`; `_bmad-output/planning-artifacts/game-architecture.md#Data Patterns`]
- Preserve current `scene.metadata`, canvas dataset telemetry, and readiness semantics. Damage and prop telemetry may be additive, but existing readiness, possession, camera, starter-vehicle, traffic, pedestrian, hijackable, and navigation fields must keep their current meaning. [Source: `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/world-scene-runtime.ts`; `src/rendering/scene/pedestrian-scene-runtime.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/unit/world-scene-runtime.spec.ts`]

### Library / Framework Requirements

- Stay on the repo's pinned runtime stack: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and `vite` `8.0.5`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`]
- Latest checks during this workflow show `@babylonjs/core` `9.1.0` and `@babylonjs/havok` `1.3.12` still match the current latest stable npm releases, so no Babylon or Havok upgrade is needed for this story. [Source: `npm view @babylonjs/core version`; `npm view @babylonjs/havok version`]
- Latest checks during this workflow show `vite` `8.0.8` as the current stable release while the repo remains on `8.0.5`. Vite still documents Node `20.19+` or `22.12+` as the supported baseline. Treat any Vite upgrade as out of scope for this story. [Source: `npm view vite version`; `https://vite.dev/guide/`]
- Babylon `9.1.0` release notes emphasize broader engine, WebGPU, and core fixes rather than anything that requires dependency churn for this damage-and-props story. Stay focused on runtime architecture, deterministic planning, and collision-state behavior. [Source: `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`]
- Do not add a destruction middleware package, alternate physics backend, crowd system, ECS library, or state-management dependency for this story. The current TypeScript plus Babylon.js plus Havok stack is sufficient for lightweight vehicle damage and selected prop breakage. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Decisions`]
- The architecture selected Context7 as the preferred up-to-date documentation source for Babylon.js and Vite work if implementation needs external docs while coding. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### File Structure Requirements

- Likely touchpoints for this story are:
  - `public/data/tuning/sedan.json`
  - `public/data/tuning/sports-car.json`
  - `public/data/tuning/heavy-truck.json`
  - `src/vehicles/physics/vehicle-factory.ts`
  - `src/vehicles/physics/vehicle-manager.ts`
  - new files under `src/vehicles/damage/` for damage state, thresholds, and future-facing event or snapshot helpers
  - `src/world/chunks/slice-manifest.ts`
  - `src/world/chunks/road-placement.ts` or a nearby shared placement helper
  - `src/world/generation/world-slice-generator.ts`
  - a new deterministic prop planning module under `src/world/` or a closely related gameplay-owned folder
  - `src/rendering/scene/create-world-scene.ts`
  - a new scene adapter such as `src/rendering/scene/vehicle-damage-scene-runtime.ts` or `src/rendering/scene/breakable-prop-scene-runtime.ts` if scene-local collision translation is needed
  - `src/rendering/scene/world-scene-runtime.ts` only if additive telemetry helpers need extension
  - `src/sandbox/on-foot/vehicle-interaction-policy.ts` only if new mesh metadata roles require explicit policy coverage
  - relevant unit, integration, and smoke tests
- Keep world-generation and manifest changes in `src/world/`, reusable vehicle damage logic in `src/vehicles/damage/`, scene-specific adapters in `src/rendering/scene/`, and any broader chaos-owned break-state runtime in a small `src/sandbox/chaos/` seam if needed. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- Do not move gameplay logic into `public/`, `src/ui/`, or `src/app/`. Runtime-loaded JSON belongs in `public/data/`, but damage rules, break-state transitions, and event logic belong in source modules. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]

### Testing Requirements

- Follow the existing repository testing pattern:
  - unit tests in `tests/unit/*.spec.ts`
  - integration tests in `tests/integration/*.spec.ts`
  - smoke coverage in `tests/smoke/*.spec.ts`
- Add unit coverage for deterministic breakable-prop planning from current roads and chunks, including serializability, stable IDs, starter clearance, slice-edge clearance, and separation from traffic, pedestrians, and hijackable placements. [Source: `tests/unit/world-slice-generator.spec.ts`]
- Add unit coverage for vehicle damage classification and accumulation, including threshold behavior, lightweight crash severity output, and the explicit policy for switching active vehicle types and hijack transfer. [Source: `tests/unit/vehicle-manager.spec.ts`; `tests/unit/vehicle-factory.spec.ts`; `tests/unit/pedestrian-system.spec.ts`]
- If a scene adapter is added, mirror the current pedestrian adapter test style: verify world-actor input translation, additive telemetry, and independence from player controller internals. [Source: `tests/unit/pedestrian-scene-runtime.spec.ts`]
- Add smoke coverage that damage and broken-prop state reset cleanly across scene recreation while readiness, navigation, possession, traffic, and pedestrian telemetry contracts remain intact. [Source: `tests/smoke/pedestrian-scene-runtime.smoke.spec.ts`; `tests/smoke/traffic-system.smoke.spec.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]
- Extend explicit interaction-policy tests if this story introduces any new mesh metadata roles so only allowlisted vehicles remain hijack targets. [Source: `tests/unit/vehicle-interaction-policy.spec.ts`]
- Keep `tests/integration/location-entry.integration.spec.ts`, `tests/integration/world-slice-loading.integration.spec.ts`, and current world-scene telemetry tests valid; manifest changes must remain cacheable, loadable, and restart-safe. [Source: `tests/integration/location-entry.integration.spec.ts`; `tests/integration/world-slice-loading.integration.spec.ts`; `tests/unit/world-scene-runtime.spec.ts`]
- Finish implementation validation with `npm run check`, `npm test`, and `npm run build`.

### Previous Story Intelligence

- Story 3.1 established the Epic 3 baseline pattern: deterministic manifest-first planning in `src/world/`, domain-local runtime behavior outside the scene bootstrap, additive telemetry, and restart-safe living-city state. Story 3.3 should extend that pattern rather than inventing a second world-assembly path. [Source: `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`; `src/world/generation/world-slice-generator.ts`; `src/traffic/planning/traffic-plan.ts`; `src/traffic/runtime/traffic-system.ts`]
- Story 3.2 added the current collision-like gameplay seam through `pedestrian-scene-runtime.ts`, where explicit world actors become typed collision and threat inputs. Reuse that scene-adapter model for damage or break detection instead of letting controller state or ad hoc scene scans become the gameplay truth. [Source: `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`; `src/rendering/scene/pedestrian-scene-runtime.ts`; `tests/unit/pedestrian-scene-runtime.spec.ts`]
- Story 3.2 reinforced explicit `interactionRole` gating so only allowlisted vehicles are hijackable. Preserve that explicit policy as selected props and damaged vehicles are introduced. [Source: `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`; `src/sandbox/on-foot/vehicle-interaction-policy.ts`; `tests/unit/vehicle-interaction-policy.spec.ts`]
- Story 3.2 also confirmed that additive scene and canvas telemetry plus scene recreation smoke coverage are the current repo pattern for new living-city systems. Follow that same additive reset-safe approach here. [Source: `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`; `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/pedestrian-scene-runtime.ts`; `tests/smoke/pedestrian-scene-runtime.smoke.spec.ts`]

### Git Intelligence Summary

- Recent commits show the repo's current implementation direction clearly:
  - `8ad6ff3`: added deterministic pedestrians and a reactive runtime with a manifest-first planner, a scene adapter, additive telemetry, and focused unit or smoke tests.
  - `abc25cd`: added deterministic traffic generation and behavior with shared road-placement utilities, manifest expansion, scene-local runtime modules, and regression coverage.
  - `17f5319`: added same-location replay variants built around cached manifest reuse and restart-safe scene disposal.
  - `81ebcbe`: updated sprint bookkeeping only and does not change runtime architecture.
- Reuse those seams instead of inventing a new damage-specific bootstrap path, prop-placement source, replay reset mechanism, or telemetry contract. [Source: `git log -5 --format='%H%x09%s'`; `git log -5 --stat --format='commit %H%nsubject %s'`]

### Latest Tech Information

- `@babylonjs/core` `9.1.0` and `@babylonjs/havok` `1.3.12` remain the latest stable npm versions checked during this workflow, matching the repo pins.
- Babylon `9.1.0` release notes emphasize broader engine and WebGPU work plus core fixes, not a damage-story dependency change.
- `vite` `8.0.8` is the current latest stable while the repo remains on `8.0.5`; Vite still documents Node `20.19+` or `22.12+` as the supported baseline.
- No extra dependency is needed for this story. The current stack already supports deterministic planning, Havok-backed runtime collision state, Babylon scene integration, and TypeScript test coverage.

### Project Structure Notes

- `create-world-scene.ts` is already the main gameplay-assembly file. Keep only orchestration, scene attachment, update calls, telemetry wiring, and teardown there; move actual damage or break-state logic behind dedicated seams. [Source: `src/rendering/scene/create-world-scene.ts`]
- `slice-manifest.ts` currently exposes roads, chunks, spawn candidates, traffic, and pedestrians but has no prop schema yet. This story likely needs the first minimal optional breakable-prop planning seam. [Source: `src/world/chunks/slice-manifest.ts`]
- `road-placement.ts` is now the canonical deterministic placement seam for Epic 3. It should be the first place to look for selected roadside props before adding any new world-placement utility. [Source: `src/world/chunks/road-placement.ts`; `src/traffic/planning/traffic-plan.ts`; `src/pedestrians/planning/pedestrian-plan.ts`]
- `vehicle-factory.ts` already creates mesh metadata and exposes the Havok aggregate, but it has no damage state, crash classification, or durability contract. That makes it the current vehicle seam to integrate with, not replace. [Source: `src/vehicles/physics/vehicle-factory.ts`]
- `vehicle-manager.ts` already preserves transform and velocity through active vehicle type switches. If damage should survive that flow, this file needs an explicit extension rather than an undocumented side effect. [Source: `src/vehicles/physics/vehicle-manager.ts`; `tests/unit/vehicle-manager.spec.ts`]
- `world-scene-runtime.ts` and `pedestrian-scene-runtime.ts` already define the repo's additive telemetry pattern. Extend those seams carefully instead of creating a second telemetry channel. [Source: `src/rendering/scene/world-scene-runtime.ts`; `src/rendering/scene/pedestrian-scene-runtime.ts`]
- Restart and replay already recreate the world scene through current bootstrap disposal and cached world reloads. That is the intended cleanup mechanism for damage and breakable props too; do not add a separate reset path. [Source: `src/app/bootstrap/create-game-app.ts`; `tests/integration/location-entry.integration.spec.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]

### Project Context Rules

- No `project-context.md` file was found in the workspace during workflow discovery.
- Use the architecture document, `package.json`, current source structure, and existing tests as the governing project rules for this story.
- The architecture selected Context7 as the preferred up-to-date documentation source for Babylon.js and Vite work if implementation needs additional external docs. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`
- `_bmad-output/planning-artifacts/gdd.md#Sandbox Specific Design`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/gdd.md#Asset Requirements`
- `_bmad-output/planning-artifacts/gdd.md#Art and Audio Direction`
- `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`
- `_bmad-output/planning-artifacts/game-architecture.md#Event System`
- `_bmad-output/planning-artifacts/game-architecture.md#Entity Patterns`
- `_bmad-output/planning-artifacts/game-architecture.md#Consistency Rules`
- `_bmad-output/planning-artifacts/game-architecture.md#Configuration`
- `_bmad-output/planning-artifacts/game-architecture.md#Data Patterns`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Decisions`
- `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`
- `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`
- `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`
- `package.json`
- `public/data/tuning/sedan.json`
- `public/data/tuning/sports-car.json`
- `public/data/tuning/heavy-truck.json`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/pedestrian-scene-runtime.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/sandbox/on-foot/vehicle-interaction-policy.ts`
- `src/traffic/planning/traffic-plan.ts`
- `src/traffic/runtime/traffic-system.ts`
- `src/traffic/runtime/traffic-vehicle-factory.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/vehicles/physics/vehicle-manager.ts`
- `src/world/chunks/road-placement.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-load-failure.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/pedestrian-scene-runtime.smoke.spec.ts`
- `tests/smoke/traffic-system.smoke.spec.ts`
- `tests/unit/pedestrian-scene-runtime.spec.ts`
- `tests/unit/pedestrian-system.spec.ts`
- `tests/unit/vehicle-factory.spec.ts`
- `tests/unit/vehicle-interaction-policy.spec.ts`
- `tests/unit/vehicle-manager.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`
- `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`
- `https://vite.dev/guide/`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Implementation Plan

- Add the smallest optional manifest and tuning extensions needed for selected breakable props and lightweight vehicle damage state.
- Reuse the Epic 3 manifest-first pattern by planning deterministic prop placements in `src/world/`, then route scene-specific impact inputs through a narrow adapter instead of bloating `create-world-scene.ts`.
- Preserve readiness, replay, possession, and interaction-policy contracts while adding additive telemetry and focused regression coverage for damage persistence and break-state cleanup.
- Keep the Task 1 damage policy normalized and runtime-local by preserving severity across vehicle type switches while leaving hijack, re-entry, restart, and replay behavior as explicit transfer or reset rules behind a dedicated `src/vehicles/damage/` seam.
- Keep Task 2 manifest-first by generating roadside breakable props from the same deterministic placement utilities used by traffic and pedestrians, with a conservative cap and reserved-space checks against spawn, traffic, pedestrians, and hijackable placements.
- Keep Task 3 scene-agnostic by classifying impacts from explicit collision inputs, emitting bounded typed `vehicle.damaged` and `prop.broken` events, and enforcing short contact cooldowns so later scene wiring stays orchestration-only.
- Keep Task 4 orchestration-only in `create-world-scene.ts` by routing prop spawning, collision translation, visual state updates, and additive telemetry through a dedicated chaos scene runtime instead of embedding damage logic directly in the scene bootstrap.

### Debug Log References

- `git log -5 --format='%H%x09%s'`
- `git log -5 --stat --format='commit %H%nsubject %s'`
- `npm view @babylonjs/core version`
- `npm view @babylonjs/havok version`
- `npm view vite version`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- No UX or `project-context.md` artifact was available during workflow discovery.
- Added the optional `breakableProps` manifest contract, vehicle damage tuning fields, and an explicit damage-policy seam that preserves normalized severity across vehicle switches while keeping transfer and reset rules explicit.
- Verified Task 1 with focused unit, integration, and smoke coverage plus passing `npm run check` and full `npm test` validation.
- Added deterministic manifest-first breakable prop planning with stable IDs, a lightweight first-wave allowlist, and reserved-position avoidance for spawn, traffic, pedestrians, and hijackable placements.
- Verified Task 2 with focused world-generation coverage plus passing `npm run check` and full `npm test` validation.
- Added a minimal vehicle damage system and breakable prop runtime with typed events, accumulated state, one-way break transitions, and short contact cooldown dedupe.
- Verified Task 3 with focused runtime coverage plus passing `npm run check` and full `npm test` validation.
- Added a dedicated chaos scene runtime that spawns breakable prop meshes, translates scene actors into damage/break inputs, applies lightweight visual state, preserves interaction policy gates, and publishes additive chaos telemetry.
- Verified Task 4 with scene-runtime and traffic-focused unit coverage plus passing `npm run check` and full `npm test` validation.
- Added final chaos smoke coverage for restart-safe reset behavior and additive telemetry stability, then passed `npm run check`, full `npm test`, and `npm run build` for final story validation.
- Definition of done passed and the story is now marked `review` for code review workflow handoff.

### File List

- `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`
- `public/data/tuning/heavy-truck.json`
- `public/data/tuning/sedan.json`
- `public/data/tuning/sports-car.json`
- `src/vehicles/damage/vehicle-damage-policy.ts`
- `src/vehicles/damage/vehicle-damage-system.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/vehicles/physics/vehicle-manager.ts`
- `src/sandbox/chaos/breakable-prop-system.ts`
- `src/rendering/scene/chaos-scene-runtime.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/traffic/runtime/traffic-vehicle-factory.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/world/planning/breakable-prop-plan.ts`
- `tests/integration/vehicle-hijack.integration.spec.ts`
- `tests/integration/vehicle-switching.integration.spec.ts`
- `tests/smoke/traffic-system.smoke.spec.ts`
- `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`
- `tests/smoke/chaos-scene-runtime.smoke.spec.ts`
- `tests/unit/traffic-system.spec.ts`
- `tests/unit/breakable-prop-system.spec.ts`
- `tests/unit/chaos-scene-runtime.spec.ts`
- `tests/unit/vehicle-damage-policy.spec.ts`
- `tests/unit/vehicle-damage-system.spec.ts`
- `tests/unit/vehicle-factory.spec.ts`
- `tests/unit/vehicle-interaction-policy.spec.ts`
- `tests/unit/vehicle-manager.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`

## Change Log

- 2026-04-08: Created the story context for Story 3.3 and set status to `ready-for-dev`.
- 2026-04-09: Added manifest-first breakable prop planning, vehicle damage and prop-break runtimes, a dedicated chaos scene adapter with additive telemetry, restart-safe reset coverage, and validation via `npm run check`, `npm test`, and `npm run build`. Story status moved to `review`.
