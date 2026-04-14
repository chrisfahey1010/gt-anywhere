# Story 3.2: Encounter Pedestrians

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can encounter pedestrians,
so that the world feels inhabited and my actions have clearer consequences.

## Acceptance Criteria

1. Given the player reaches `world-ready` in a generated slice, when the world scene loads, then it instantiates a deterministic pedestrian population derived from the current slice roads, chunks, and bounds, with conservative roadside or sidewalk-style placement kept clear of the starter spawn, slice boundaries, existing hijackable vehicle placements, and current traffic vehicle starts. 
2. Given pedestrians are active, when simulation runs, then they use lightweight rule-based behavior or simple explicit states for standing, walking, waiting, and panic or avoidance reactions so the city reads as inhabited without introducing deep crowd simulation, mission scripting, combat systems, heat or wanted logic, or authored narrative behavior in this story.
3. Given the player drives near pedestrians, exits the vehicle, or collides with them, when pedestrians detect nearby danger or direct impact, then they react in a readable way and expose the minimal state or event seams later chaos stories can build on, without implementing player health, police response, combat escalation, pickups, or fail-state systems in this story.
4. Given traffic, restart from spawn, same-location replay, edit location, retry load, vehicle switching, exit and re-entry, hijack, and the navigation HUD already exist, when this story is implemented, then those flows keep their current contracts and pedestrian state is cleaned up and recreated per run without mutating static slice identity, cached manifest ownership, or current readiness milestones.
5. Given current interaction and telemetry paths rely on explicit metadata and fixed contracts, when pedestrians are introduced, then they do not become vehicle interaction targets, do not change `world.scene.ready` or `controllable-vehicle`, and only add pedestrian metadata, events, or telemetry in additive ways that preserve current canvas dataset and `scene.metadata` fields.
6. Given the feature is implemented, when repo validation runs, then unit, integration, smoke, typecheck, and build checks confirm deterministic pedestrian planning, runtime update behavior, readable reactive behavior, restart or replay cleanup, and no regression in traffic, possession, navigation, or world loading contracts.

## Tasks / Subtasks

- [x] Task 1: Add deterministic pedestrian-ready planning to world data and generation seams (AC: 1, 6)
  - [x] Extend the serializable world data contract with the minimum pedestrian plan metadata needed for runtime spawning and reactions.
  - [x] Generate pedestrian plan data from existing `SliceManifest` roads, chunks, and bounds instead of inventing an unrelated authored placement path.
  - [x] Keep deterministic IDs, conservative density, and clearance from the starter spawn, slice edges, traffic starts, and hijackable vehicle placements.
- [x] Task 2: Introduce a minimal pedestrian domain under `src/pedestrians/` for planning, runtime behavior, and reactions (AC: 1, 2, 3, 5)
  - [x] Create the smallest architecture-aligned pedestrian modules for spawning, simple state transitions, and reactive updates.
  - [x] Centralize pedestrian creation through one pedestrian-owned seam so future pooling or richer behaviors remain possible without rewriting scene bootstrap.
  - [x] Use simple placeholder meshes or the lightest available asset path if no production pedestrian asset pipeline already exists; do not block the story on heavy animation or content tooling.
- [x] Task 3: Integrate pedestrians into world scene bootstrap, updates, and disposal (AC: 1, 2, 3, 4, 5)
  - [x] Instantiate pedestrians from the generated pedestrian plan during `create-world-scene.ts` setup.
  - [x] Update pedestrians inside the existing world runtime loop using explicit pedestrian state or control data rather than player controller state.
  - [x] Dispose all pedestrian meshes, listeners, registries, and related metadata cleanly on scene teardown and failure paths.
- [x] Task 4: Preserve traffic, possession, replay, and HUD boundaries while making consequences legible (AC: 3, 4, 5)
  - [x] Decide and enforce an explicit pedestrian interaction policy so pedestrians never enter the hijack or re-entry targeting path.
  - [x] Keep `world.scene.ready`, the `controllable-vehicle` readiness milestone, same-location replay identity, and current navigation HUD contracts unchanged while pedestrians reset as dynamic session state.
  - [x] If pedestrian reactions affect traffic or future chaos systems, expose that through narrow typed seams or metadata rather than coupling new pedestrian logic directly into unrelated UI or bootstrap modules.
- [x] Task 5: Add automated coverage and run repository validation (AC: 6)
  - [x] Add unit coverage for deterministic pedestrian planning, spacing, clearance, and state-transition or reaction rules.
  - [x] Add integration or smoke coverage for pedestrian scene initialization, restart or replay cleanup, additive telemetry, and no regression in traffic, possession, or navigation behavior.
  - [x] Run `npm run check`, `npm test`, and `npm run build` before moving the story beyond implementation.

## Dev Notes

- Story 3.2 is the second Epic 3 story. Traffic is already the moving-world baseline from Story 3.1, and this story should make the world feel inhabited without jumping ahead into vehicle destruction, combat, heat, or fail-and-restart systems that belong to later Epic 3 stories. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`; `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`]
- The GDD and brainstorming notes both frame pedestrians as simple, low-cost ambient city life whose presence makes the world feel occupied and whose collisions create clearer consequences. That points to lightweight pedestrian presence plus readable reactions, not deep AI, authored encounters, or mission content. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`; `_bmad-output/planning-artifacts/gdd.md#Art and Audio Direction`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`]
- No dedicated UX artifact or `project-context.md` file was found during workflow discovery. Use the GDD, architecture, current source tree, and current tests as the governing guidance for this story. [Source: workflow discovery results]

### Non-Negotiables

- Do not expand this story into vehicle destruction, breakable props, combat, ammo, health, heat or wanted systems, pickups, mission logic, or full fail-state loops.
- Do not add a deep crowd-simulation, navmesh, ECS, or third-party pedestrian AI dependency just to populate the city.
- Do not replace or bypass the current manifest-driven world loading path with scene-only hardcoded pedestrian spawns.
- Do not change the `world.scene.ready` contract or the readiness milestone `controllable-vehicle`.
- Do not let pedestrians become hijack targets, stored-vehicle re-entry targets, or player-controlled actors.
- Keep same-location restart and replay grounded in the same static slice while pedestrian populations reset as dynamic session state.

### Technical Requirements

- The repository currently has no `src/pedestrians/` implementation, but the architecture explicitly reserves that domain for pedestrian states, spawning, and reactive behavior. Add the smallest useful pedestrian seam there instead of burying pedestrian logic inside `src/rendering/scene/` or `src/app/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; repo search results]
- Keep all manifest additions serializable. Do not store Babylon meshes, physics handles, functions, DOM references, controller instances, or mutable runtime state in `SliceManifest`. [Source: `src/world/chunks/slice-manifest.ts`; `tests/unit/world-slice-generator.spec.ts`]
- Build pedestrian placement from existing road, chunk, and bounds data. The current manifest exposes road centerlines, widths, chunks, and deterministic traffic planning inputs, so reuse or extend those geometric seams instead of inventing a separate authored sidewalk dataset. [Source: `src/world/chunks/slice-manifest.ts`; `src/world/chunks/road-placement.ts`; `src/world/generation/world-slice-generator.ts`; `src/traffic/planning/traffic-plan.ts`]
- Because the current world data does not include dedicated sidewalk meshes or navmesh data, the first pedestrian implementation should use conservative roadside offsets or simple footpath approximations derived from road headings and widths. Do not block the story on a full pedestrian navigation system. [Source: `src/world/chunks/slice-manifest.ts`; `src/world/chunks/road-placement.ts`; repo structure]
- Keep pedestrian starts clear of the starter spawn, boundary walls, traffic starts, and hijackable vehicle placements. The player should still spawn into a readable, drivable opening, and existing traffic and hijackable placements should remain stable. [Source: `src/world/generation/world-slice-generator.ts`; `src/traffic/planning/traffic-plan.ts`; `src/rendering/scene/hijackable-vehicle-spawns.ts`; `tests/unit/world-slice-generator.spec.ts`]
- `create-world-scene.ts` already owns scene setup, dynamic runtime updates, telemetry, and teardown. Use it as the orchestration seam, but move pedestrian-specific planning and runtime behavior into `src/pedestrians/` modules so the scene file does not become the pedestrian system itself. [Source: `src/rendering/scene/create-world-scene.ts`; `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`]
- Keep pedestrian simulation lightweight. The architecture calls for simple state machines plus data-oriented hot-path subsystems, and the repo already treats traffic and on-foot movement as low-cost runtime systems. Favor a tiny state set such as idle, walk, wait, and panic or struck over deep planning logic. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Systems`; `_bmad-output/planning-artifacts/game-architecture.md#State Management`; `src/traffic/runtime/traffic-system.ts`; `src/sandbox/on-foot/on-foot-runtime.ts`]
- Pedestrian runtime updates must not read player controller state directly. Follow the traffic pattern where NPC systems run from their own explicit update inputs or state. [Source: `src/traffic/runtime/traffic-system.ts`; `tests/unit/traffic-system.spec.ts`; `tests/smoke/traffic-system.smoke.spec.ts`]
- Give pedestrians stable deterministic IDs or names derived from manifest plan entries so tests, telemetry, and later chaos systems can target them reliably. [Source: `src/traffic/planning/traffic-plan.ts`; `src/traffic/runtime/traffic-vehicle-factory.ts`; `src/rendering/scene/create-world-scene.ts`]
- If collisions or near-miss reactions need future-facing hooks, expose the minimum seam needed for later stories such as a typed event, explicit state transition, or metadata flag. Do not implement the later heat, police, or fail-state systems in this story. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`]
- Preserve typed failure handling. If pedestrian initialization cannot finish, surface that through the existing world-load failure path rather than leaving a half-ready scene with ambiguous pedestrian state. [Source: `src/world/generation/world-load-failure.ts`; `src/app/bootstrap/create-game-app.ts`]
- Keep the first pedestrian implementation visually lightweight. The current repo uses simple procedural meshes for vehicles and on-foot actors, and the GDD only requires simple pedestrian assets with limited animation scope. Placeholder or low-cost pedestrian actors are acceptable if they preserve performance and readability. [Source: `src/vehicles/physics/vehicle-factory.ts`; `src/sandbox/on-foot/on-foot-runtime.ts`; `_bmad-output/planning-artifacts/gdd.md#Asset Requirements`; `_bmad-output/planning-artifacts/gdd.md#Art and Audio Direction`]
- Keep the navigation HUD unchanged for this story. No dedicated pedestrian HUD, UI prompt, or menu flow is required beyond optional additive debug metadata that directly supports testing or diagnostics. [Source: `src/ui/hud/world-navigation-hud.ts`; `tests/integration/world-navigation-hud.integration.spec.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]

### Architecture Compliance

- Put new pedestrian logic under `src/pedestrians/` with the smallest useful subdivisions such as `agents/`, `spawning/`, `states/`, or `runtime/`. Keep `src/rendering/scene/create-world-scene.ts` as the assembler and scene-lifecycle owner rather than the long-term home for pedestrian logic. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`]
- Respect the architecture boundary that domain folders own gameplay behavior while rendering consumes domain state. Do not bury pedestrian truth inside `src/rendering/` or UI layers. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- If pedestrian lifecycle or reaction signals need events, use typed `domain.action` event names such as `pedestrian.spawned`, `pedestrian.panicked`, or `pedestrian.struck`. Do not coordinate pedestrians through DOM scraping, untyped globals, or ad hoc scene metadata as the primary source of truth. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `src/app/events/game-events.ts`]
- Centralize pedestrian creation through a factory-owned seam or runtime registry so future pooling remains possible. Do not scatter direct mesh creation across unrelated scene callbacks. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Entity Patterns`; `_bmad-output/planning-artifacts/game-architecture.md#Consistency Rules`]
- Keep pedestrian tuning or placement rules behind explicit modules or repositories instead of reading arbitrary files inside gameplay systems. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Configuration`; `_bmad-output/planning-artifacts/game-architecture.md#Data Patterns`]
- Preserve current `scene.metadata`, canvas dataset telemetry, and readiness semantics. Additive pedestrian fields are fine if they help testing, but do not rename or repurpose existing readiness, possession, camera, starter-vehicle, traffic, or hijackable-vehicle keys. [Source: `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/world-scene-runtime.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/unit/world-scene-runtime.spec.ts`]

### Library / Framework Requirements

- Stay on the repo's pinned runtime stack: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and `vite` `8.0.5`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`]
- Latest checks during this workflow show `@babylonjs/core` `9.1.0` and `@babylonjs/havok` `1.3.12` still match the current latest stable npm releases, so no Babylon or Havok upgrade is needed for this story. [Source: `npm view @babylonjs/core version`; `npm view @babylonjs/havok version`]
- Latest checks during this workflow show `vite` `8.0.8` as current stable while the repo stays on `8.0.5`; Vite still documents Node `20.19+` or `22.12+` as the supported baseline. Treat any Vite upgrade as out of scope for this story. [Source: `npm view vite version`; `https://vite.dev/guide/`]
- Babylon `9.1.0` release notes are focused on broader engine and WebGPU changes plus core fixes, not anything that requires dependency churn for this pedestrian story. Stay focused on runtime architecture and feature behavior. [Source: `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`]
- Do not add a crowd AI package, navmesh dependency, ECS framework, alternate physics backend, or state-management library for this story. The current TypeScript plus Babylon.js plus Havok stack is sufficient for simple ambient pedestrians and readable reactions. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Decisions`]
- The architecture selected Context7 as the preferred up-to-date documentation source for Babylon.js and Vite work if implementation needs external docs while coding. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### File Structure Requirements

- Likely touchpoints for this story are:
  - `src/world/chunks/slice-manifest.ts`
  - `src/world/generation/world-slice-generator.ts`
  - `src/world/chunks/road-placement.ts` or a nearby shared placement helper if roadside pedestrian offsets need reusable geometry logic
  - new files under `src/pedestrians/` for planning, runtime behavior, and state transitions
  - `src/rendering/scene/create-world-scene.ts`
  - `src/rendering/scene/world-scene-runtime.ts` only if additive pedestrian telemetry is needed
  - `src/traffic/runtime/traffic-system.ts` only if traffic must recognize pedestrian obstacles through a narrow seam
  - `src/sandbox/on-foot/player-possession-runtime.ts` or `src/sandbox/on-foot/vehicle-interaction-policy.ts` only if pedestrian exclusion or consequence rules require an explicit guard
  - relevant unit, integration, and smoke tests
- The repo currently has no `src/pedestrians/` directory. Create the smallest architecture-aligned shape rather than dropping pedestrian helpers into `src/rendering/scene/`, `src/app/`, or `src/ui/`. [Source: repo structure; `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`]
- Keep world data or manifest contract changes in `src/world/`, pedestrian behavior in `src/pedestrians/`, traffic coexistence in `src/traffic/` only if required, and scene wiring in `src/rendering/scene/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`]
- Do not move gameplay logic into `public/` or `src/ui/`. Runtime-loaded JSON belongs in `public/data/`, but gameplay decisions and update rules belong in source modules under `src/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]

### Testing Requirements

- Follow the existing repository testing pattern:
  - unit tests in `tests/unit/*.spec.ts`
  - integration tests in `tests/integration/*.spec.ts`
  - smoke coverage in `tests/smoke/*.spec.ts`
- Add unit coverage for deterministic pedestrian planning from roads and chunks, including stable ordering, starter clearance, and separation from traffic and hijackable placements. [Source: `tests/unit/world-slice-generator.spec.ts`; `tests/unit/traffic-system.spec.ts`]
- Add unit or integration coverage for pedestrian runtime behavior, including simple state transitions, panic or avoidance reactions, impact handling policy, and any narrow seam where traffic recognizes pedestrians as obstacles.
- Add scene-focused integration or smoke coverage that pedestrians initialize and dispose cleanly across restart and replay while the readiness milestone remains `controllable-vehicle`. [Source: `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/integration/location-entry.integration.spec.ts`; `tests/smoke/traffic-system.smoke.spec.ts`]
- Preserve or extend coverage for vehicle switching, on-foot transfer, hijack, restart, replay, and navigation HUD continuity so pedestrian additions do not regress current Epic 2 and Story 3.1 capabilities. [Source: `tests/unit/player-possession-runtime.spec.ts`; `tests/smoke/world-scene-possession.smoke.spec.ts`; `tests/integration/world-navigation-hud.integration.spec.ts`; `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`]
- Add at least one assertion that any pedestrian-specific telemetry is additive and that existing readiness, possession, camera, starter-vehicle, traffic, and hijackable dataset fields stay intact. [Source: `tests/unit/world-scene-runtime.spec.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]
- Keep `tests/integration/location-entry.integration.spec.ts` and `tests/unit/world-slice-generator.spec.ts` valid; manifest changes must remain cacheable, loadable, and deterministic across restart and replay.
- Finish implementation validation with `npm run check`, `npm test`, and `npm run build`.

### Previous Story Intelligence

- Story 3.1 already introduced deterministic manifest-driven traffic planning and a scene-local `src/traffic/` runtime. Pedestrians should integrate with that baseline instead of creating a second living-city bootstrap path. [Source: `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`; `src/traffic/planning/traffic-plan.ts`; `src/traffic/runtime/traffic-system.ts`]
- Story 3.1 explicitly kept traffic non-hijackable through metadata and policy gates. Preserve that explicit interaction model as pedestrians arrive; ambient actors must not silently enter the vehicle-interaction path. [Source: `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`; `src/sandbox/on-foot/vehicle-interaction-policy.ts`; `src/rendering/scene/create-world-scene.ts`]
- Story 3.1 treated traffic as dynamic session state recreated on restart and replay while preserving static slice identity. Pedestrians should follow the same stable-city living-session pattern. [Source: `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`; `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`; `src/app/bootstrap/create-game-app.ts`]
- Story 3.1 added additive traffic telemetry to `scene.metadata` and the canvas dataset without changing readiness semantics. Pedestrian telemetry should follow that additive pattern. [Source: `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`; `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/world-scene-runtime.ts`]

### Git Intelligence Summary

- Recent commits show the repo's current implementation direction clearly:
  - `abc25cd`: added deterministic traffic generation and behavior with manifest-driven planning, scene-local runtime modules, and focused tests.
  - `17f5319`: added same-location replay variants built around cached manifest reuse and restart-safe scene disposal.
  - `6830bcd`: added the street-aware navigation HUD and typed world-navigation snapshot helpers.
  - `64b284f`: added vehicle hijack flow with explicit interaction targeting and on-foot possession continuity.
- Reuse those seams instead of inventing new pedestrian-specific boot, replay, interaction, or HUD systems. [Source: `git log -5 --format='%H%x09%s'`; `git log -5 --stat --format='commit %H%nsubject %s'`]

### Latest Tech Information

- `@babylonjs/core` `9.1.0` and `@babylonjs/havok` `1.3.12` remain the latest stable npm versions checked during this workflow, matching the repo pins.
- Babylon `9.1.0` release notes emphasize broader engine and WebGPU changes plus core fixes, not any pedestrian-story dependency requirement.
- `vite` `8.0.8` is the current latest stable while the repo remains on `8.0.5`; Vite still documents Node `20.19+` or `22.12+` as the supported baseline.
- No extra dependency is needed for this story. The current stack already supports deterministic pedestrian planning, Babylon scene integration, and TypeScript test coverage.

### Project Structure Notes

- `create-world-scene.ts` is already the main gameplay-assembly file in the repo. Pedestrian modules should keep future growth out of that file by leaving only orchestration, scene attachment, update calls, telemetry wiring, and teardown there. [Source: `src/rendering/scene/create-world-scene.ts`]
- The current manifest contract covers roads, chunks, spawn candidates, scene metadata, and traffic, but it does not yet expose a reusable pedestrian plan. This story likely needs the first minimal pedestrian-planning seam. [Source: `src/world/chunks/slice-manifest.ts`]
- `road-placement.ts` already solves deterministic road sampling, chunk lookup, starter clearance, and spacing. It is the closest existing seam for deriving conservative pedestrian starts from road geometry. [Source: `src/world/chunks/road-placement.ts`; `src/traffic/planning/traffic-plan.ts`; `src/rendering/scene/hijackable-vehicle-spawns.ts`]
- The current on-foot runtime is a lightweight box actor with bounds clamping and no heavy animation stack. That makes it a good reference for the first pedestrian runtime's cost profile and placeholder-geometry approach. [Source: `src/sandbox/on-foot/on-foot-runtime.ts`]
- Restart and replay already recreate the world scene through `disposeWorldScene()` and cached world reloads. That is the intended pedestrian cleanup mechanism; do not add a second restart path. [Source: `src/app/bootstrap/create-game-app.ts`; `tests/integration/location-entry.integration.spec.ts`]
- The navigation HUD only renders the player's current actor and road snapshot. Pedestrians should not require HUD changes for this story. [Source: `src/rendering/scene/world-scene-runtime.ts`; `src/ui/hud/world-navigation-hud.ts`]

### Project Context Rules

- No `project-context.md` file was found in the workspace during workflow discovery.
- Use the architecture document, `package.json`, current source structure, and existing tests as the governing project rules for this story.
- The architecture selected Context7 as the preferred up-to-date documentation source for Babylon.js and Vite work if implementation needs additional external docs. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`
- `_bmad-output/planning-artifacts/gdd.md#Art and Audio Direction`
- `_bmad-output/planning-artifacts/gdd.md#Asset Requirements`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/game-architecture.md#AI Systems`
- `_bmad-output/planning-artifacts/game-architecture.md#State Management`
- `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`
- `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`
- `_bmad-output/planning-artifacts/game-architecture.md#Event System`
- `_bmad-output/planning-artifacts/game-architecture.md#Entity Patterns`
- `_bmad-output/planning-artifacts/game-architecture.md#Consistency Rules`
- `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`
- `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`
- `package.json`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/hijackable-vehicle-spawns.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/sandbox/on-foot/on-foot-runtime.ts`
- `src/sandbox/on-foot/player-possession-runtime.ts`
- `src/sandbox/on-foot/vehicle-interaction-policy.ts`
- `src/traffic/agents/traffic-driving.ts`
- `src/traffic/planning/traffic-plan.ts`
- `src/traffic/runtime/traffic-system.ts`
- `src/traffic/runtime/traffic-vehicle-factory.ts`
- `src/ui/hud/world-navigation-hud.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/world/chunks/road-placement.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-load-failure.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/integration/vehicle-hijack.integration.spec.ts`
- `tests/integration/world-navigation-hud.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/traffic-system.smoke.spec.ts`
- `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`
- `tests/smoke/world-scene-possession.smoke.spec.ts`
- `tests/unit/player-possession-runtime.spec.ts`
- `tests/unit/traffic-system.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Implementation Plan

- Add a serializable pedestrian plan generated from current roads, chunks, bounds, and existing living-city spacing rules, with deterministic IDs and conservative clearance from starter, traffic, and hijackable placements.
- Build a minimal `src/pedestrians/` runtime with lightweight pedestrian states and readable reactions, then integrate it into `create-world-scene.ts` as scene-local dynamic session state.
- Preserve readiness, replay, possession, and HUD contracts while adding additive telemetry and focused regression coverage for traffic coexistence and cleanup.
- Task 1 implementation reuses the existing road placement seam, offsets selected candidates into roadside positions, and reserves starter, traffic, and hijackable footprints before serializing pedestrian plan entries.
- Task 2 implementation keeps pedestrian creation behind one factory-backed system seam, with explicit threat/collision inputs and lightweight calm/panic/struck state handling.
- Task 3 integration routes scene bootstrap, per-frame threat/collision inputs, and disposal through a scene-side adapter so `create-world-scene.ts` stays an orchestrator instead of becoming the pedestrian system itself.
- Task 4 keeps pedestrians outside existing vehicle interaction targeting, then exposes pedestrian counts, states, and recent event types through additive scene/canvas metadata without changing readiness or HUD contracts.
- Task 5 closes the guardrail matrix with pedestrian-focused unit and smoke coverage, then validates the final implementation with `npm run check`, full `npm test`, and `npm run build`.

### Debug Log References

- `git log -5 --format='%H%x09%s'`
- `git log -5 --stat --format='commit %H%nsubject %s'`
- `npm view @babylonjs/core version`
- `npm view @babylonjs/havok version`
- `npm view vite version`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added deterministic pedestrian manifest planning with stable IDs, serializable runtime metadata, and conservative roadside placement.
- Verified Task 1 with focused unit coverage plus passing `npm run check` and full `npm test` validation.
- Added a minimal pedestrian runtime and factory under `src/pedestrians/runtime/` with placeholder meshes, simple state cycling, and explicit threat/collision reactions.
- Verified Task 2 with focused runtime unit coverage plus passing `npm run check` and full `npm test` validation.
- Added scene-side pedestrian runtime orchestration so generated populations spawn with the world, react to active scene actors, and clean up on teardown/failure paths.
- Verified Task 3 with focused scene-adapter unit coverage plus passing `npm run check` and full `npm test` validation.
- Added additive pedestrian telemetry and explicit pedestrian interaction-policy coverage while preserving existing readiness, replay, possession, and navigation HUD behavior.
- Verified Task 4 with focused telemetry/policy unit coverage plus passing `npm run check` and full `npm test` validation.
- Added smoke coverage for pedestrian scene recreation and additive telemetry reset behavior, then passed `npm run check`, full `npm test`, and `npm run build` for final story validation.
- Definition of done passed and the story is now marked `review` for code review workflow handoff.

### File List

- `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`
- `src/pedestrians/runtime/pedestrian-factory.ts`
- `src/pedestrians/runtime/pedestrian-system.ts`
- `src/pedestrians/planning/pedestrian-plan.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/pedestrian-scene-runtime.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/smoke/pedestrian-scene-runtime.smoke.spec.ts`
- `tests/unit/pedestrian-scene-runtime.spec.ts`
- `tests/unit/pedestrian-system.spec.ts`
- `tests/unit/vehicle-interaction-policy.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`

## Change Log

- 2026-04-08: Added deterministic pedestrian manifest planning, a lightweight pedestrian runtime and scene adapter, additive pedestrian telemetry, restart-safe cleanup, and pedestrian-focused unit and smoke coverage. Story status moved to `review` after `npm run check`, `npm test`, and `npm run build` passed.
