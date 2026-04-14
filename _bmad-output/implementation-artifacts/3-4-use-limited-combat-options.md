# Story 3.4: Use Limited Combat Options

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can use limited combat options,
so that sandbox escalation has more range without replacing driving.

## Acceptance Criteria

1. Given the player reaches `world-ready` in a generated slice and is in on-foot possession, when they use the first-wave combat input grammar, then they can manually aim, switch between a compact fixed firearm roster consisting of a dependable sidearm and one stronger follow-up weapon, and fire with readable cadence and feedback on both keyboard/mouse and supported gamepad inputs, without adding lock-on, cover, drive-by shooting, police, wanted/heat, pickups, inventory menus, or mission scripting in this story.
2. Given combat shots are fired, when the combat runtime resolves targets, then eligible pedestrians, vehicles, and selected breakable props react through existing narrow domain seams so direct firearm hits produce explicit pedestrian `struck` outcomes, nearby gunfire or armed-player threat can produce readable pedestrian `panic` outcomes without a direct hit, vehicles reuse current damage-state behavior, and breakable props reuse current break-state behavior, while buildings, static slice geometry, traffic routing, and unrelated actors do not gain broad destructibility, chain reactions, fire, explosions, or vehicle-destruction logic in this story.
3. Given the player changes possession state or scene lifecycle state, when combat is attempted during vehicle possession, exit or re-entry, hijack transfer, vehicle switching, restart, replay, retry load, or full world-scene recreation, then combat input is explicitly gated to valid on-foot windows only, dynamic combat state resets cleanly per recreated run, and current cached manifest identity, `sliceId`, `reuseKey`, `world.scene.ready`, and readiness milestone `controllable-vehicle` remain unchanged.
4. Given combat state and outcomes are published at runtime, when scene and domain telemetry updates run, then combat-owned runtime state remains the source of truth and exposes additive typed events plus bounded `scene.metadata` and canvas dataset summaries for active weapon, recent combat events, and hit or target counts without changing existing possession, navigation HUD, traffic, pedestrian, chaos, or app-level load-event contracts.
5. Given the current architecture reserves `src/sandbox/combat/` and recent Epic 3 systems use narrow domain runtimes plus scene adapters, when this story is implemented, then combat rules live in a dedicated `src/sandbox/combat/` seam, scene-specific target translation lives under `src/rendering/scene/`, player input extensions stay narrow in controller and possession modules, and `src/app/bootstrap/`, `src/ui/shell/`, and unrelated rendering files remain orchestration-only rather than becoming the combat system.
6. Given the feature is implemented, when repository validation runs, then unit, integration, smoke, typecheck, and build checks confirm weapon input routing, on-foot-only combat gating, manual aim behavior, shot resolution against pedestrians, vehicles, and props, additive telemetry, restart or replay cleanup, and no regression in possession, hijack, traffic, pedestrians, chaos, navigation, or world loading contracts.

## Tasks / Subtasks

- [x] Task 1: Extend player input and possession seams for combat-ready on-foot control (AC: 1, 3, 6)
  - [x] Add the minimum explicit fire and weapon-cycle or select fields to `PlayerInputFrame` and keyboard or gamepad capture without disturbing the current `E` interaction flow or `Tab` vehicle-switch flow.
  - [x] Reuse `facingYaw` and `lookPitch` from the on-foot possession runtime as the manual-aim seam instead of adding lock-on, cover mode, or a second camera grammar.
  - [x] Explicitly suppress combat actions while the player is in vehicle possession or during exit, re-entry, hijack, and vehicle-switch transition windows.
- [x] Task 2: Add a minimal combat domain under `src/sandbox/combat/` for a compact firearm roster and typed runtime events (AC: 1, 4, 5, 6)
  - [x] Implement the smallest useful on-foot combat runtime with a fixed roster of a dependable sidearm plus one stronger rifle-class option, weapon selection state, fire cadence, and typed combat events.
  - [x] Keep combat state dynamic and runtime-local, with future-facing hooks for later danger or resource stories, but do not implement player health, wanted or heat, police, pickups, inventory screens, or explosive weapons here.
  - [x] Prefer low-cost direct hit resolution or a similarly lightweight targeting approach over projectile-heavy simulation, broad scene scans, or new middleware.
- [x] Task 3: Integrate combat consequences through existing pedestrian, chaos, and vehicle seams (AC: 2, 4, 5, 6)
  - [x] Extend the pedestrian runtime and scene adapter with the smallest explicit combat-hit input needed for readable struck or panic outcomes.
  - [x] Route vehicle hits through the current vehicle-damage seam and route selected prop hits through the current breakable-prop seam instead of inventing separate bullet-only state models.
  - [x] Keep targetability explicit through mesh metadata or narrow actor lists so pedestrians, traffic, hijackables, and props only participate where deliberately allowed.
- [x] Task 4: Wire combat into world-scene orchestration, telemetry, and reset behavior (AC: 3, 4, 5)
  - [x] Add a dedicated combat scene adapter beside the current pedestrian and chaos adapters, then instantiate, update, and dispose it from `create-world-scene.ts`.
  - [x] Publish bounded additive combat telemetry to `scene.metadata` and `canvas.dataset`, keeping existing readiness, camera, navigation, possession, traffic, pedestrian, and chaos fields intact.
  - [x] Reset combat state on restart, replay, retry load, and scene disposal through the existing recreate-the-world-scene path, not a parallel reset system.
- [x] Task 5: Add regression coverage and run repository validation (AC: 6)
  - [x] Add unit coverage for input capture, weapon state, fire cadence, on-foot-only gating, hit classification, and combat telemetry helpers.
  - [x] Add scene-focused unit, integration, or smoke coverage for combat initialization, restart or replay cleanup, additive telemetry, and continuity of possession, navigation, traffic, pedestrian, and chaos contracts.
  - [x] Run `npm run check`, `npm test`, and `npm run build` before moving the story beyond implementation.

## Dev Notes

- Story 3.4 is the fourth Epic 3 story. Stories 3.1 through 3.3 already established the living-city baseline with traffic, pedestrians, and physical chaos. This story should widen sandbox escalation with a compact combat layer that supports chaos without displacing driving or jumping ahead into danger, wanted, or fail-state systems that belong to Stories 3.5 and 3.6. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`; `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`; `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`; `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`]
- The GDD, game brief, and brainstorming all frame combat as a secondary chaos layer: it should be manual, compact, and readable, and it should widen the sandbox rather than replacing driving. First-wave combat should therefore stay on-foot, direct, and easy to learn rather than expanding into deep cover, large inventories, or authored shootout content. [Source: `_bmad-output/planning-artifacts/gdd.md#Game Mechanics`; `_bmad-output/planning-artifacts/game-brief.md#Primary Mechanics`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`]
- The GDD also frames ammunition as a light pressure system rather than a heavy survival economy. If this story exposes future-facing ammo hooks, keep them lightweight and subordinate to the combat-play goal; do not turn Story 3.4 into a full resource-management or pickup system. [Source: `_bmad-output/planning-artifacts/gdd.md#Economy and Resources`]
- No dedicated UX artifact or `project-context.md` file was found during workflow discovery. Use the GDD, architecture, current source tree, package pins, and current tests as the governing guidance for this story. [Source: workflow discovery results]

### Non-Negotiables

- Do not expand this story into player health or survivability loss, wanted or heat accumulation, police response, bust or wasted fail states, pickups, inventory menus, or mission scripting.
- Do not add drive-by shooting, lock-on, cover snapping, melee combos, explosive weapons, vehicle explosions, tire popping, or chain-reaction destruction.
- Do not replace or bypass the current pedestrian, chaos, or vehicle-damage seams with a second combat-only damage model.
- Do not let combat targets become hijack or re-entry targets by accident, and do not weaken the current `interactionRole` allowlist model.
- Do not change `world.scene.ready`, the readiness milestone `controllable-vehicle`, current navigation HUD contracts, or cached manifest identity fields such as `sliceId` and `reuseKey`.
- Do not use `scene.metadata`, canvas datasets, or DOM state as the primary combat source of truth.

### Technical Requirements

- `PlayerInputFrame` currently only contains `vehicleControls`, `onFootMovement`, `switchVehicleRequested`, and `interactionRequested`. Add the smallest explicit combat inputs needed for firing and weapon switching, with keyboard/mouse and gamepad parity, instead of smuggling combat through existing interaction flags. [Source: `src/vehicles/controllers/player-vehicle-controller.ts`; `_bmad-output/planning-artifacts/gdd.md#Controls and Input`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`]
- Use a clear first-wave control mapping that does not collide with the current driving or interaction grammar: left mouse button and gamepad right trigger for fire, `Digit1` and `Digit2` plus optional mouse-wheel cycling for the compact keyboard weapon roster, and d-pad left or right for gamepad weapon changes, while preserving `E` for interaction and `Tab` for vehicle switching. [Source: `src/vehicles/controllers/player-vehicle-controller.ts`; `_bmad-output/planning-artifacts/gdd.md#Controls and Input`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`]
- `player-possession-runtime.ts` already owns on-foot mode, `facingYaw`, and `lookPitch`. Reuse that manual-look seam for aiming, and gate combat to on-foot mode instead of teaching vehicles or app bootstrap about weapons. [Source: `src/sandbox/on-foot/player-possession-runtime.ts`; `src/sandbox/on-foot/create-on-foot-camera.ts`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`]
- `world-scene-runtime.ts` only suppresses interaction during vehicle-switch handoff today. Extend the same sanitization idea so combat cannot fire during invalid transition windows or while still in vehicle possession. [Source: `src/rendering/scene/world-scene-runtime.ts`; `src/rendering/scene/create-world-scene.ts`]
- `create-world-scene.ts` is already the orchestration seam for traffic, pedestrians, chaos, possession, cameras, telemetry, and teardown. Keep it as an assembler only and push combat rules into a dedicated domain runtime plus a scene adapter. [Source: `src/rendering/scene/create-world-scene.ts`; `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- `chaos-scene-runtime.ts` already converts runtime hits into vehicle damage and prop breakage with additive telemetry, and `vehicle-damage-system.ts` already exposes a typed damage seam. Reuse or extend those narrow seams for combat consequences instead of inventing a second vehicle or prop state path. [Source: `src/rendering/scene/chaos-scene-runtime.ts`; `src/vehicles/damage/vehicle-damage-system.ts`; `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`]
- `pedestrian-scene-runtime.ts` currently translates explicit threats and vehicle collisions into pedestrian-domain inputs, while `pedestrian-system.ts` already supports `panic` and `struck` outcomes. Extend that path with the smallest combat-hit input or sibling adapter needed for firearm strikes rather than broad cross-module coupling or mesh scanning inside the pedestrian domain. Make the first-wave rule explicit: direct combat hits produce `struck`, while nearby gunfire or an armed nearby player may produce `panic` only through an explicit threat input, not through hidden mesh-side effects. [Source: `src/rendering/scene/pedestrian-scene-runtime.ts`; `src/pedestrians/runtime/pedestrian-system.ts`; `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`]
- `vehicle-interaction-policy.ts` and `vehicle-interaction-target.ts` rely on explicit `interactionRole` metadata plus deterministic targeting order. Preserve that policy so combat targeting never changes hijack eligibility or stored-vehicle preference rules. [Source: `src/sandbox/on-foot/vehicle-interaction-policy.ts`; `src/sandbox/on-foot/vehicle-interaction-target.ts`; `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`; `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`]
- `create-game-app.ts` resets dynamic state by disposing and recreating the world scene from the cached manifest on restart and replay. Combat state should follow that same living-session reset path instead of inventing a second restart mechanism. [Source: `src/app/bootstrap/create-game-app.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`]
- If combat runtime initialization or disposal fails, bubble that failure through the existing `WorldSceneRuntimeError` and world-load failure path instead of leaving a half-ready scene with ambiguous combat state. [Source: `src/rendering/scene/create-world-scene.ts`; `src/world/generation/world-load-failure.ts`; `src/app/bootstrap/create-game-app.ts`]
- `SliceManifest` currently carries traffic, pedestrians, and breakable props but no combat plan schema. Keep first-wave combat runtime-driven unless a concrete plan artifact is truly required; do not add manifest data just to represent player-held weapons or transient combat state. [Source: `src/world/chunks/slice-manifest.ts`; `src/world/generation/world-slice-generator.ts`]
- The architecture explicitly reserves `src/sandbox/combat/` for this story, and no implementation exists there yet. Create the smallest architecture-aligned combat seam in that location instead of burying combat logic in `src/rendering/scene/`, `src/app/`, or `src/ui/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; `src/sandbox/combat/` repo search results]
- Keep the first-wave combat layer browser-safe and low-cost. Prefer hitscan or similarly lightweight direct targeting, bounded recent-event buffers, and narrow actor lists over projectile swarms, expensive per-frame all-mesh queries, or heavyweight middleware. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`; `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`; `src/rendering/scene/pedestrian-scene-runtime.ts`; `src/rendering/scene/chaos-scene-runtime.ts`]
- Keep combat feedback lightweight and readable: small muzzle or hit feedback plus low-cost gunfire cues are in scope, but do not introduce a new audio framework, heavy VFX pipeline, shell menu flow, or cinematic feedback system for this story. [Source: `_bmad-output/planning-artifacts/gdd.md#Art and Audio Direction`; `_bmad-output/planning-artifacts/gdd.md#Asset Requirements`; `package.json`]
- Keep any first-wave combat UI minimal. Preserve the current navigation HUD, and do not block this story on a weapon wheel, inventory screen, or shell-level combat menu. If active-weapon feedback is necessary, keep it additive and local to HUD or scene telemetry rather than spreading combat state into the app shell. [Source: `src/ui/hud/world-navigation-hud.ts`; `src/app/bootstrap/create-game-app.ts`; `_bmad-output/planning-artifacts/game-architecture.md#UI Architecture`]
- If later stories need ammo, health, or heat, expose only the smallest future-facing hooks now, such as typed combat events or active-weapon state. Do not implement those later systems in Story 3.4. [Source: `_bmad-output/planning-artifacts/gdd.md#Economy and Resources`; `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`]

### Architecture Compliance

- Put combat domain state and rules under `src/sandbox/combat/`, and keep any scene adapter or runtime translation under `src/rendering/scene/`, following the current pedestrian and chaos patterns. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `src/rendering/scene/pedestrian-scene-runtime.ts`; `src/rendering/scene/chaos-scene-runtime.ts`]
- Respect the architecture boundary that domain folders own gameplay behavior while rendering consumes domain state. Do not bury combat truth inside `src/rendering/`, HUD modules, or `src/app/bootstrap/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- If combat lifecycle or debugging signals need events, use typed `domain.action` names such as `combat.weapon.fired`, `combat.target.hit`, or `combat.weapon.changed`. Do not coordinate combat through untyped globals, DOM scraping, or app-shell events. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `src/app/events/game-events.ts`]
- Mirror the current additive telemetry pattern with explicit names such as `combatActiveWeapon`, `combatRecentEvents`, `combatHitCount`, and `combatTargetIds`, keeping the combat runtime itself as the source of truth while `scene.metadata` and `canvas.dataset` remain bounded summaries only. [Source: `src/rendering/scene/world-scene-runtime.ts`; `src/rendering/scene/pedestrian-scene-runtime.ts`; `src/rendering/scene/chaos-scene-runtime.ts`]
- Keep weapon tuning or combat configuration behind explicit modules or repositories if new data is introduced. Do not scatter hardcoded weapon constants across scene orchestration and unrelated runtime files. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Configuration`; `_bmad-output/planning-artifacts/game-architecture.md#Data Patterns`]
- Preserve current `scene.metadata` and canvas dataset semantics. Combat telemetry may be additive, but existing readiness, possession, camera, starter-vehicle, traffic, pedestrian, chaos, and navigation fields must keep their current meaning. [Source: `src/rendering/scene/world-scene-runtime.ts`; `src/rendering/scene/pedestrian-scene-runtime.ts`; `src/rendering/scene/chaos-scene-runtime.ts`; `tests/unit/world-scene-runtime.spec.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]
- Keep the app-level `GameEventBus` focused on location, generation, and scene-load lifecycle unless an app-facing combat requirement appears that truly cannot stay scene-local. [Source: `src/app/events/game-events.ts`; `src/app/bootstrap/create-game-app.ts`]

### Library / Framework Requirements

- Stay on the repo's pinned runtime stack: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and `vite` `8.0.5`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`]
- Latest checks during this workflow show `@babylonjs/havok` `1.3.12` still matches the current latest stable npm release, so no Havok upgrade is needed for this story. [Source: `npm view @babylonjs/havok version`]
- Latest checks during this workflow show `@babylonjs/core` `9.2.0` as the current npm release while the repo remains pinned to `9.1.0`. Babylon `9.1.0` release notes focus on broader core, WebGPU, and performance changes rather than combat-specific APIs, so do not widen this story into a Babylon upgrade. [Source: `npm view @babylonjs/core version`; `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`]
- Latest checks during this workflow show `vite` `8.0.8` as the current stable release while the repo remains on `8.0.5`. Vite docs still require Node `20.19+` or `22.12+` as the supported baseline. Treat any Vite upgrade as out of scope for this story. [Source: `npm view vite version`; `https://vite.dev/guide/`]
- Do not add ECS, projectile-physics, animation, weapon, state-management, or UI frameworks just to deliver the first combat layer. The current TypeScript plus Babylon.js plus Havok stack is sufficient for compact on-foot combat and runtime tests. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Decisions`]
- The architecture selected Context7 as the preferred up-to-date documentation source if implementation needs additional Babylon.js or Vite references while coding. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### File Structure Requirements

- Likely touchpoints for this story are:
  - `src/vehicles/controllers/player-vehicle-controller.ts`
  - `src/sandbox/on-foot/player-possession-runtime.ts`
  - `src/sandbox/on-foot/on-foot-runtime.ts` only if actor pose or facing helpers need a narrow extension
  - new files under `src/sandbox/combat/` for weapon state, fire logic, typed events, and target-resolution helpers
  - `src/rendering/scene/create-world-scene.ts`
  - a new scene adapter such as `src/rendering/scene/combat-scene-runtime.ts`
  - `src/rendering/scene/world-scene-runtime.ts` if combat input gating or additive telemetry helpers need extension
  - `src/rendering/scene/pedestrian-scene-runtime.ts`
  - `src/pedestrians/runtime/pedestrian-system.ts`
  - `src/rendering/scene/chaos-scene-runtime.ts`
  - `src/vehicles/damage/vehicle-damage-system.ts`
  - `src/sandbox/on-foot/vehicle-interaction-policy.ts` only if combat-specific metadata roles need explicit exclusion rules
  - `src/ui/hud/` only if a tiny additive active-weapon indicator is truly required
  - relevant unit, integration, and smoke tests
- Keep combat rules in `src/sandbox/combat/`, scene-specific targeting in `src/rendering/scene/`, pedestrian and vehicle consequence extensions in their owned domains, and any minimal HUD addition in `src/ui/hud/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- Do not move combat logic into `public/`, `src/ui/shell/`, or `src/app/bootstrap/`. Runtime-loaded data may live in `public/data/` only if a real combat config file becomes necessary, but gameplay decisions and state belong in source modules. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`; `package.json`]

### Testing Requirements

- Follow the existing repository testing pattern:
  - unit tests in `tests/unit/*.spec.ts`
  - integration tests in `tests/integration/*.integration.spec.ts`
  - smoke coverage in `tests/smoke/*.smoke.spec.ts`
- Add unit coverage for input capture and on-foot-only gating so new combat controls do not regress `E` interaction, `Tab` vehicle switching, or current gamepad behavior. [Source: `src/vehicles/controllers/player-vehicle-controller.ts`; `tests/unit/vehicle-manager.spec.ts`; `tests/unit/world-scene-runtime.spec.ts`]
- Add unit coverage for the combat runtime itself, including weapon switching, fire cadence, manual aim or target resolution, typed event emission, and bounded recent-event telemetry. [Source: `tests/unit/pedestrian-scene-runtime.spec.ts`; `tests/unit/chaos-scene-runtime.spec.ts`]
- Add explicit coverage for invalid-window suppression so combat cannot fire during exit, re-entry, hijack handoff, vehicle-switch frames, or vehicle possession mode. [Source: `src/rendering/scene/world-scene-runtime.ts`; `src/sandbox/on-foot/player-possession-runtime.ts`; `tests/unit/world-scene-runtime.spec.ts`; `tests/smoke/world-scene-possession.smoke.spec.ts`]
- Add unit coverage for pedestrian hit handling and vehicle or prop consequence routing so the combat layer reuses current pedestrian, damage, and chaos contracts instead of bypassing them. [Source: `tests/unit/pedestrian-scene-runtime.spec.ts`; `tests/unit/chaos-scene-runtime.spec.ts`; `tests/unit/vehicle-interaction-policy.spec.ts`]
- Add scene-focused integration or smoke coverage that combat initializes and disposes cleanly across restart and replay while readiness, active camera, navigation, possession, traffic, pedestrian, and chaos telemetry remain intact. [Source: `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/smoke/world-scene-possession.smoke.spec.ts`; `tests/smoke/pedestrian-scene-runtime.smoke.spec.ts`; `tests/smoke/chaos-scene-runtime.smoke.spec.ts`; `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`]
- Add at least one failure-path assertion that a combat runtime init error is surfaced through the existing world-load failure behavior rather than leaving a partially ready scene. [Source: `src/world/generation/world-load-failure.ts`; `src/app/bootstrap/create-game-app.ts`; `tests/integration/location-entry.integration.spec.ts`]
- Keep `tests/integration/location-entry.integration.spec.ts`, `tests/integration/world-slice-loading.integration.spec.ts`, `tests/integration/world-navigation-hud.integration.spec.ts`, `tests/integration/vehicle-hijack.integration.spec.ts`, and `tests/integration/vehicle-switching.integration.spec.ts` valid. Combat should not break the existing world-load, navigation, or possession contracts. [Source: listed test files]
- Finish implementation validation with `npm run check`, `npm test`, and `npm run build`.

### Previous Story Intelligence

- Story 3.3 added the current chaos scene runtime, vehicle damage system, breakable-prop system, additive chaos telemetry, and explicit damage continuity rules. Combat should plug into those seams instead of replacing them with a second bullet-only damage stack. [Source: `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`; `src/rendering/scene/chaos-scene-runtime.ts`; `src/vehicles/damage/vehicle-damage-system.ts`; `src/vehicles/damage/vehicle-damage-policy.ts`]
- Story 3.2 established the current scene-adapter model for translating explicit world actors into pedestrian-domain inputs and readable events. Reuse that model for weapon strikes rather than letting combat directly mutate pedestrian meshes. [Source: `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`; `src/rendering/scene/pedestrian-scene-runtime.ts`; `src/pedestrians/runtime/pedestrian-system.ts`]
- Story 3.2 also reinforced explicit `interactionRole` gating so only allowlisted vehicles are hijackable. Preserve that exact policy as combat target lists and metadata expand. [Source: `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`; `src/sandbox/on-foot/vehicle-interaction-policy.ts`; `tests/unit/vehicle-interaction-policy.spec.ts`]
- Story 3.1 established the Epic 3 baseline pattern of dynamic session state recreated on restart and replay while static slice identity stays stable. Combat should follow that same stable-city living-session model. [Source: `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`; `src/app/bootstrap/create-game-app.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`]

### Git Intelligence Summary

- Recent commits show the repo's current implementation direction clearly:
  - `135b51d`: added breakable props and vehicle damage systems with a dedicated chaos scene adapter, domain-local damage logic, additive telemetry, and focused tests.
  - `8ad6ff3`: added deterministic pedestrians and a reactive runtime with a narrow scene adapter and typed pedestrian events.
  - `abc25cd`: added deterministic traffic generation and behavior with shared placement utilities, explicit interaction gating, and regression coverage.
  - `81ebcbe`: updated sprint bookkeeping only and does not change runtime architecture.
- Reuse those seams instead of inventing a combat-specific bootstrap path, a second possession grammar, a parallel telemetry channel, or broad app-level event plumbing. [Source: `git log -5 --format='%H%x09%s'`; `git log -5 --stat --format='commit %H%nsubject %s'`]

### Latest Tech Information

- `@babylonjs/havok` `1.3.12` remains the latest stable npm release checked during this workflow, matching the repo pin.
- `@babylonjs/core` `9.2.0` is newer on npm than the repo's pinned `9.1.0`, but the current story does not need a Babylon upgrade to implement compact on-foot combat.
- Babylon `9.1.0` release notes emphasize broader engine, WebGPU, and performance work rather than any combat-specific runtime requirement.
- `vite` `8.0.8` is the current latest stable while the repo remains on `8.0.5`; Vite still documents Node `20.19+` or `22.12+` as the supported baseline.
- No extra dependency is needed for this story. The current stack already supports narrow runtime seams, typed tests, Babylon scene integration, and Havok-backed world interaction.

### Project Structure Notes

- `create-world-scene.ts` is already the main gameplay-assembly file in the repo. Combat modules should keep future growth out of that file by leaving only orchestration, runtime update calls, telemetry wiring, and teardown there. [Source: `src/rendering/scene/create-world-scene.ts`]
- `player-vehicle-controller.ts` currently has no combat inputs, so combat should begin there with the smallest possible extension rather than by polling DOM state or scene objects directly. [Source: `src/vehicles/controllers/player-vehicle-controller.ts`]
- `player-possession-runtime.ts` already tracks on-foot `facingYaw` and `lookPitch`, making it the cleanest current seam for manual aim direction and on-foot-only action gating. [Source: `src/sandbox/on-foot/player-possession-runtime.ts`]
- `world-scene-runtime.ts` currently owns possession-mode-aware telemetry and input sanitization. Extend it carefully instead of creating a second combat telemetry utility. [Source: `src/rendering/scene/world-scene-runtime.ts`]
- `chaos-scene-runtime.ts` already maintains bounded `chaosRecentEvents`, damaged-vehicle counts, and broken-prop counts. Combat telemetry should be additive beside that existing pattern, not a replacement for it. [Source: `src/rendering/scene/chaos-scene-runtime.ts`]
- `pedestrian-system.ts` already supports `panic` and `struck` states, which gives the story a clear first-wave reaction seam for firearm hits without needing a heavy AI rewrite. [Source: `src/pedestrians/runtime/pedestrian-system.ts`]
- `create-game-app.ts` and `GameEventBus` currently own only location, generation, and scene-load lifecycle events. That is a strong signal to keep first-wave combat scene-local unless a true app-facing requirement appears. [Source: `src/app/bootstrap/create-game-app.ts`; `src/app/events/game-events.ts`]
- `src/sandbox/combat/` is still empty, which matches the architecture's intention that this story should introduce the first combat-owned runtime seam there. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; `src/sandbox/combat/` repo search results]

### Project Context Rules

- No `project-context.md` file was found in the workspace during workflow discovery.
- Use the architecture document, `package.json`, current source structure, current story files, and existing tests as the governing project rules for this story.
- The architecture selected Context7 as the preferred up-to-date documentation source for Babylon.js and Vite work if implementation needs additional external docs. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`
- `_bmad-output/planning-artifacts/gdd.md#Game Mechanics`
- `_bmad-output/planning-artifacts/gdd.md#Controls and Input`
- `_bmad-output/planning-artifacts/gdd.md#Economy and Resources`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/game-brief.md#Primary Mechanics`
- `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`
- `_bmad-output/planning-artifacts/game-architecture.md#Event System`
- `_bmad-output/planning-artifacts/game-architecture.md#Configuration`
- `_bmad-output/planning-artifacts/game-architecture.md#Data Patterns`
- `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`
- `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`
- `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`
- `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`
- `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`
- `package.json`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/pedestrians/runtime/pedestrian-system.ts`
- `src/rendering/scene/chaos-scene-runtime.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/pedestrian-scene-runtime.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/sandbox/on-foot/player-possession-runtime.ts`
- `src/sandbox/on-foot/vehicle-interaction-policy.ts`
- `src/sandbox/on-foot/vehicle-interaction-target.ts`
- `src/ui/hud/world-navigation-hud.ts`
- `src/vehicles/controllers/player-vehicle-controller.ts`
- `src/vehicles/damage/vehicle-damage-policy.ts`
- `src/vehicles/damage/vehicle-damage-system.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/integration/vehicle-hijack.integration.spec.ts`
- `tests/integration/vehicle-switching.integration.spec.ts`
- `tests/integration/world-navigation-hud.integration.spec.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/chaos-scene-runtime.smoke.spec.ts`
- `tests/smoke/pedestrian-scene-runtime.smoke.spec.ts`
- `tests/smoke/traffic-system.smoke.spec.ts`
- `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`
- `tests/smoke/world-scene-possession.smoke.spec.ts`
- `tests/unit/chaos-scene-runtime.spec.ts`
- `tests/unit/pedestrian-scene-runtime.spec.ts`
- `tests/unit/vehicle-interaction-policy.spec.ts`
- `tests/unit/vehicle-manager.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`
- `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`
- `https://vite.dev/guide/`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Implementation Plan

- Task 1 completed: extend `PlayerInputFrame` with explicit combat controls, keep `E` and `Tab` behavior intact, and expose combat gating from possession and world-scene sanitization.
- Task 2 completed: add a compact combat runtime under `src/sandbox/combat/` with a two-weapon first-wave roster, typed events, cadence, and lightweight target resolution.
- Task 3 completed: route explicit combat hits and threats through the existing pedestrian, vehicle-damage, and breakable-prop seams using narrow id-based inputs.
- Close the story with unit, integration, and smoke coverage that proves no regression in possession, navigation, traffic, pedestrian, chaos, or world-load behavior.

### Debug Log References

- `git log -5 --format='%H%x09%s'`
- `git log -5 --stat --format='commit %H%nsubject %s'`
- `npm view @babylonjs/core version`
- `npm view @babylonjs/havok version`
- `npm view vite version`
- `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`
- `https://vite.dev/guide/`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- No UX artifact or `project-context.md` artifact was available during workflow discovery.
- Story 3.4 intentionally keeps combat compact, on-foot-only, and scene-local while deferring health, danger, and fail-state systems to later Epic 3 stories.
- Latest stack checks confirmed no story-specific dependency upgrade is required before implementation.
- Implemented Task 1 by adding explicit `combatControls` capture for mouse, keyboard, and gamepad input while preserving the existing interaction and vehicle-switch grammar.
- Added explicit combat suppression for vehicle possession and transition windows through world-scene input sanitization and `PlayerPossessionRuntimeUpdate.combatEnabled`.
- Verified Task 1 with focused unit and integration coverage plus full `npm run check` and `npm test` regression runs.
- Implemented Task 2 by adding a runtime-local combat seam with fixed sidearm and rifle tuning, typed weapon or target events, and bounded recent-event snapshots.
- Added lightweight direct target resolution plus near-miss threat events so later scene adapters can reuse the same narrow combat runtime without projectile simulation.
- Verified Task 2 with `tests/unit/combat-runtime.spec.ts`, `npm run check`, and the full `npm test` suite.
- Implemented Task 3 by extending pedestrian and chaos seams with explicit combat-hit and gunfire inputs while reusing the current vehicle-damage and breakable-prop systems.
- Kept combat target routing narrow by using explicit ids and existing mesh metadata roles instead of broad scene scanning or separate bullet-only state.
- Verified Task 3 with focused pedestrian and chaos seam coverage plus full `npm run check` and `npm test` regression runs.

- [AI-Review] Updated File List with missing tracked and untracked files discovered during code review.

### File List

- `tests/unit/combat-scene-runtime.spec.ts`
- `src/rendering/scene/combat-scene-runtime.ts`
- `_bmad-output/implementation-artifacts/3-4-use-limited-combat-options.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/rendering/scene/chaos-scene-runtime.ts`
- `src/rendering/scene/pedestrian-scene-runtime.ts`
- `src/sandbox/combat/combat-runtime.ts`
- `src/sandbox/on-foot/player-possession-runtime.ts`
- `src/vehicles/controllers/player-vehicle-controller.ts`
- `src/vehicles/damage/vehicle-damage-system.ts`
- `tests/integration/on-foot-handoff.integration.spec.ts`
- `tests/integration/player-possession-runtime.integration.spec.ts`
- `tests/unit/combat-runtime.spec.ts`
- `tests/unit/chaos-scene-runtime.spec.ts`
- `tests/unit/pedestrian-scene-runtime.spec.ts`
- `tests/unit/pedestrian-system.spec.ts`
- `tests/unit/player-possession-runtime.spec.ts`
- `tests/unit/player-vehicle-controller.spec.ts`
- `tests/unit/starter-vehicle-camera.spec.ts`
- `src/pedestrians/runtime/pedestrian-system.ts`
- `tests/unit/world-scene-runtime.spec.ts`

## Change Log

- 2026-04-09: Created the story context for Story 3.4 and set status to `ready-for-dev`.
- 2026-04-09: Completed Task 1 combat input and on-foot gating groundwork with regression coverage.
- 2026-04-09: Completed Task 2 combat domain runtime with fixed weapon cadence, typed events, and lightweight target resolution.
- 2026-04-09: Completed Task 3 consequence routing through pedestrian, vehicle-damage, and breakable-prop seams.
