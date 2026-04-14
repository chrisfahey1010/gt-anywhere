# Story 3.5: Accumulate Danger Through Chaotic Play

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can accumulate danger through chaotic play,
so that reckless behavior creates pressure.

## Acceptance Criteria

1. Given the player reaches `world-ready` in a generated slice, when they cause clear high-signal chaos through direct pedestrian strikes, public gunfire, breakable-prop destruction, or damaging vehicle impacts produced by the current combat, pedestrian, and chaos seams, then a dedicated danger runtime accumulates danger from explicit incidents such as `combat.weapon.fired`, `pedestrian.struck`, `prop.broken`, and `vehicle.damaged`, while ordinary cruising, low-speed scrapes, calm on-foot movement, camera changes, world boot, `combat.weapon.changed`, passive `pedestrian.panicked`, and telemetry-only state changes do not raise danger in this story.
2. Given multiple downstream systems can react to the same chaotic act, when danger is scored, then the runtime normalizes overlapping combat, pedestrian, and chaos signals into bounded increments with explicit weights, cooldowns, or incident windows so one crash or one burst of gunfire cannot unintentionally count every frame or jump straight to maximum danger from duplicated telemetry alone.
3. Given danger increases over a run, when stage thresholds are crossed, then the heat system exposes a clear staged snapshot and typed heat events from a dedicated `src/sandbox/heat/` seam, using a fixed first-wave shape of one calm state plus four visible heat stages and a bounded 4-entry recent-event history, with future-facing fields for later chase and escape logic, while keeping danger state runtime-local instead of storing it in `SliceManifest`, `GameEventBus`, DOM state, or app-shell state.
4. Given danger is active during play, when the scene syncs telemetry and HUD state, then the player gets a lightweight readable indicator of current danger stage and recent escalation through additive `scene.metadata`, canvas dataset, and if needed a world-ready-only HUD subscription or overlay, without changing the current navigation HUD meaning, shell flows, or readiness milestone `controllable-vehicle`.
5. Given the player restarts, replays, retries a load, or the world scene is recreated, when the lifecycle resets, then all danger state, recent heat events, and UI summaries clear with the recreated run while static manifest identity, `sliceId`, `reuseKey`, `world.scene.ready`, possession, traffic, pedestrian, combat, chaos, and navigation contracts stay unchanged.
6. Given the feature is implemented, when repository validation runs, then unit, integration, smoke, typecheck, and build checks confirm danger-source weighting, stage progression, dedupe or cooldown behavior, additive telemetry and HUD output, clean reset across recreation, and no regression in existing world-load, possession, hijack, traffic, pedestrian, chaos, combat, or navigation behavior.

## Tasks / Subtasks

- [x] Task 1: Add a dedicated heat runtime under `src/sandbox/heat/` for staged danger accumulation (AC: 1, 2, 3, 5, 6)
  - [x] Define the smallest useful heat incident model, staged thresholds, typed heat events, bounded recent-event snapshots, and future-facing snapshot fields for later chase or escape behavior.
  - [x] Make explicit which incident types raise danger and which are intentionally ignored so ordinary cruising and passive on-foot presence do not create false pressure.
  - [x] Add weighting and cooldown or incident-window rules so one crash, one shot burst, or one contact loop cannot inflate danger every frame.
- [x] Task 2: Translate existing scene outputs into heat inputs without inventing a second source of truth (AC: 1, 2, 3, 6)
  - [x] Consume explicit `CombatEvent[]`, `PedestrianEvent[]`, and `ChaosSceneEvent[]` outputs after their current update order instead of rescanning meshes or reading controller state directly.
  - [x] Make the first-wave valid heat inputs explicit: `combat.weapon.fired` for public gunfire, `pedestrian.struck`, `prop.broken`, and `vehicle.damaged`, with `combat.target.hit` treated only as a translation aid where it would not be double-counted by a downstream domain event.
  - [x] Explicitly exclude `combat.weapon.changed`, passive `pedestrian.panicked` caused by player or vehicle proximity, and telemetry-only changes from heat scoring.
  - [x] Normalize chained downstream consequences so a single prop strike, vehicle crash, or combat exchange is scored deliberately rather than by accidental duplication across subsystems.
  - [x] Reuse current typed vehicle-damage severity and source metadata where they already exist instead of building a parallel collision classifier.
- [x] Task 3: Surface danger readably through additive telemetry and a minimal world-ready HUD seam (AC: 3, 4, 6)
  - [x] Publish additive `scene.metadata` and `canvas.dataset` summaries such as current heat level, recent heat events, and any bounded score or hold-state fields while preserving all existing readiness, camera, possession, traffic, pedestrian, chaos, combat, and navigation telemetry keys.
  - [x] If a player-facing indicator is added, keep it lightweight and event-driven like the current combat HUD instead of adding shell menus, map overlays, or app-level gameplay state.
  - [x] Keep the heat runtime as the source of truth and project only bounded summaries into metadata, datasets, and HUD listeners.
- [x] Task 4: Integrate lifecycle and reset behavior through existing world-scene recreation (AC: 3, 5, 6)
  - [x] Wire heat update ordering into `create-world-scene.ts` without turning that file into the heat system itself.
  - [x] Reset heat state on restart, replay, retry load, and scene disposal through the current dispose-and-recreate world path instead of inventing a second reset mechanism.
  - [x] Preserve `world.scene.ready`, `controllable-vehicle`, `sliceId`, `reuseKey`, possession transitions, hijack policy, and current app session phases unchanged.
- [x] Task 5: Add guardrail coverage and run repository validation (AC: 6)
  - [x] Add unit coverage for incident weighting, threshold transitions, recent-event bounds, cooldown or dedupe behavior, and snapshot output.
  - [x] Add scene-focused unit, integration, or smoke coverage for additive telemetry, HUD subscription behavior if present, and reset-safe recreation with no regression in existing contracts.
  - [x] Run `npm run check`, `npm test`, and `npm run build` before moving the story beyond implementation.

## Dev Notes

- Story 3.5 is the fifth Epic 3 story. Stories 3.1 through 3.4 already established living traffic, pedestrian consequences, physical chaos, and compact combat. This story should turn those systems into readable danger pressure without jumping ahead into full pursuit resolution, busted or wasted fail states, or sandbox restart outcomes that belong to Story 3.6. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`; `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`; `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`; `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`; `_bmad-output/implementation-artifacts/3-4-use-limited-combat-options.md`]
- The GDD and game brief frame challenge as player-driven pressure that rises when the player drives recklessly, causes chaos, or escalates into violence. The danger system therefore needs to reward carefree cruising with low friction while making obvious antisocial acts feel consequential and legible. [Source: `_bmad-output/planning-artifacts/gdd.md#Progression and Balance`; `_bmad-output/planning-artifacts/gdd.md#Game Mechanics`; `_bmad-output/planning-artifacts/game-brief.md#Primary Mechanics`]
- The brainstorming artifacts give the clearest product direction for this story: most driving should stay consequence-light, obvious high-signal actions should trigger heat, a familiar star-style language is acceptable, and later police or escape systems should scale mostly through one clear pressure dial. Story 3.5 should create that dial and its guardrails so Story 3.6 can build escape and fail logic on top of it. [Source: `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Ideas Generated`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Themes and Patterns`]
- No dedicated UX artifact or `project-context.md` file was found during workflow discovery. Use the GDD, architecture, current source tree, package pins, and existing tests as the governing guidance for this story. [Source: workflow discovery results]

### Non-Negotiables

- Do not expand this story into full police pursuit AI, line-of-sight escape, wanted shedding, busted or wasted fail states, player death handling, or sandbox restart flows. Those belong to Story 3.6.
- Do not make ordinary cruising, low-speed fender contact, passive on-foot presence, or generic pedestrian proximity raise danger. Heat should come from deliberate high-signal chaos, not routine movement.
- Do not store live heat state in `SliceManifest`, `scene.metadata`, canvas datasets, DOM state, or `GameEventBus` as the primary source of truth.
- Do not change `world.scene.ready`, the readiness milestone `controllable-vehicle`, current app session phases, cached manifest identity fields such as `sliceId` and `reuseKey`, or the current navigation HUD contract.
- Do not let heat integration weaken explicit interaction-role gating or accidentally make pedestrians, props, traffic vehicles, or heat actors enter hijack or re-entry flows.
- Do not let one collision loop, one repeated contact pair, or one multi-system chain reaction count danger every frame without deliberate normalization.
- Do not add ECS, police AI, state-management, UI-framework, or middleware dependencies to deliver the first heat layer.

### Technical Requirements

- The architecture explicitly reserves `src/sandbox/heat/` for this story's domain. Create the smallest useful heat seam there instead of burying danger logic in `src/rendering/scene/create-world-scene.ts`, `src/app/`, or `src/ui/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`]
- `create-world-scene.ts` already updates systems in a deliberate order: combat, then pedestrians, then chaos, then telemetry. Heat should consume those explicit outputs after they are produced rather than rescanning the world for the same facts. [Source: `src/rendering/scene/create-world-scene.ts`; `_bmad-output/implementation-artifacts/3-4-use-limited-combat-options.md`]
- `combat-scene-runtime.ts` already emits typed `CombatEvent`s and explicit pedestrian or chaos hit translations. Reuse those events and translated hits as heat inputs instead of reading aim state, target lists, or controller internals directly. [Source: `src/rendering/scene/combat-scene-runtime.ts`; `src/sandbox/combat/combat-runtime.ts`; `_bmad-output/implementation-artifacts/3-4-use-limited-combat-options.md`]
- `pedestrian-system.ts` emits `pedestrian.panicked` for vehicle, player, and gunfire threats, plus `pedestrian.struck` for actual impacts. Heat logic must distinguish those causes carefully so simply standing near pedestrians does not count like violent chaos. Prefer direct gunfire and struck outcomes over broad panic events unless the threat source is explicitly a high-signal chaos act. [Source: `src/pedestrians/runtime/pedestrian-system.ts`; `src/rendering/scene/pedestrian-scene-runtime.ts`; `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`]
- `vehicle-damage-system.ts` already classifies impact severity and dedupes repeated contacts with a cooldown window. Reuse that signal or its typed `vehicle.damaged` events instead of inventing a second per-frame crash classifier for heat. [Source: `src/vehicles/damage/vehicle-damage-system.ts`; `src/vehicles/damage/vehicle-damage-policy.ts`; `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`]
- Make the first-wave heat mapping explicit and testable: valid scoring inputs are `combat.weapon.fired`, `pedestrian.struck`, `prop.broken`, and `vehicle.damaged`, while `combat.weapon.changed`, passive `pedestrian.panicked` from nearby player or vehicle presence, and telemetry-only transitions are excluded. Treat `combat.target.hit` as a translation signal only when it would not be counted again through a downstream domain event. [Source: `src/sandbox/combat/combat-runtime.ts`; `src/pedestrians/runtime/pedestrian-system.ts`; `src/vehicles/damage/vehicle-damage-system.ts`]
- `SliceManifest` currently supports optional traffic, pedestrian, and breakable-prop plans only. Keep first-wave heat runtime-local; do not add manifest schema just to store transient wanted or danger state. [Source: `src/world/chunks/slice-manifest.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`]
- `create-game-app.ts` already uses world-scene subscriptions for navigation and combat HUD state. If the player needs a visible danger meter, add a parallel world-ready-only subscription or lightweight HUD seam instead of pushing heat into app session state. [Source: `src/app/bootstrap/create-game-app.ts`; `src/ui/hud/world-combat-hud.ts`]
- `GameEventBus` is currently limited to location, generation, and scene-load lifecycle. Keep heat scene-local unless a future story introduces an explicit app-facing requirement that truly cannot stay in the scene layer. [Source: `src/app/events/game-events.ts`; `src/app/bootstrap/create-game-app.ts`]
- Choose heat stages and snapshot fields that can later map cleanly to quantity-driven pursuit escalation, but do not implement police spawning or line-of-sight escape in this story. Future systems should be able to read the heat dial without reworking the incident model. [Source: `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Ideas Generated`; `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`]
- Keep the first-wave heat shape concrete: one calm state, four visible heat stages, and a recent-event buffer capped at 4 entries. That keeps HUD, telemetry, and tests aligned with the existing bounded-summary pattern. [Source: `src/rendering/scene/chaos-scene-runtime.ts`; `src/rendering/scene/combat-scene-runtime.ts`]
- Keep the first heat implementation browser-safe and low-cost. Use typed incidents, bounded recent-event buffers, and explicit thresholds instead of full scene polling, historical timelines, or heavyweight chase simulation. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`; `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`]
- Preserve typed failure handling. If heat runtime or heat HUD initialization fails, route failure through the existing world-load failure behavior instead of leaving a half-ready scene with ambiguous pressure state. [Source: `src/world/generation/world-load-failure.ts`; `src/app/bootstrap/create-game-app.ts`; `tests/integration/location-entry.integration.spec.ts`]

### Architecture Compliance

- Put heat domain state and rules under `src/sandbox/heat/`, and keep scene-specific translation or telemetry glue under `src/rendering/scene/`, following the current combat, pedestrian, and chaos patterns. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `src/rendering/scene/combat-scene-runtime.ts`; `src/rendering/scene/chaos-scene-runtime.ts`; `src/rendering/scene/pedestrian-scene-runtime.ts`]
- Respect the architecture boundary that domain folders own gameplay behavior while rendering consumes domain state. Do not bury heat truth inside HUD classes, shell UI, or `src/app/bootstrap/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- If heat lifecycle or escalation signals need events, use typed `domain.action` names such as `heat.incident.recorded`, `heat.level.changed`, or `heat.cooled-down`. Do not coordinate heat through DOM scraping, untyped globals, or ad hoc app events. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `src/app/events/game-events.ts`]
- Mirror the current additive telemetry pattern with explicit names such as `heatLevel`, `heatRecentEvents`, `heatScore`, and `heatStageChanged`, while keeping the heat runtime itself as the source of truth and `scene.metadata` plus canvas datasets as bounded summaries only. [Source: `src/rendering/scene/world-scene-runtime.ts`; `src/rendering/scene/chaos-scene-runtime.ts`; `src/rendering/scene/combat-scene-runtime.ts`]
- Keep any heat tuning or scoring tables behind explicit modules or repositories if new configuration is introduced. Do not scatter incident weights or thresholds across scene orchestration, HUD files, or unrelated systems. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Configuration`; `_bmad-output/planning-artifacts/game-architecture.md#Data Patterns`]
- Preserve current readiness, possession, camera, starter-vehicle, traffic, pedestrian, chaos, combat, and navigation semantics. Heat telemetry may be additive, but existing fields must keep their current meaning. [Source: `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/world-scene-runtime.ts`; `tests/unit/world-scene-runtime.spec.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]

### Library / Framework Requirements

- Stay on the repo's pinned runtime stack: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and `vite` `8.0.5`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`]
- Latest checks during this workflow show `@babylonjs/havok` `1.3.12` still matches the current latest stable npm release, so no Havok upgrade is needed for this story. [Source: `npm view @babylonjs/havok version`]
- Latest checks during this workflow show `@babylonjs/core` `9.2.0` as the current npm release while the repo remains pinned to `9.1.0`. Babylon `9.1.0` release notes focus on broader core, WebGPU, and performance work rather than heat-specific APIs, so do not widen this story into a Babylon upgrade. [Source: `npm view @babylonjs/core version`; `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`]
- Latest checks during this workflow show `vite` `8.0.8` as the current stable release while the repo remains on `8.0.5`. Vite still documents Node `20.19+` or `22.12+` as the supported baseline. Treat any Vite upgrade as out of scope for this story. [Source: `npm view vite version`; `https://vite.dev/guide/`]
- Do not add chase AI, police behavior, analytics, state-management, or HUD libraries just to deliver the first heat layer. The current TypeScript plus Babylon.js plus Havok stack is sufficient for a narrow runtime, scene telemetry, and lightweight HUD indicator. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Decisions`]
- The architecture selected Context7 as the preferred up-to-date documentation source if implementation needs additional Babylon.js or Vite references while coding. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### File Structure Requirements

- Likely touchpoints for this story are:
  - new files under `src/sandbox/heat/` for heat incidents, staged runtime state, snapshot types, and typed events
  - a new scene adapter such as `src/rendering/scene/heat-scene-runtime.ts`
  - `src/rendering/scene/create-world-scene.ts`
  - `src/rendering/scene/world-scene-runtime.ts` only if additive telemetry helpers need a narrow extension
  - `src/app/bootstrap/create-game-app.ts` if a world-ready heat HUD subscription is added
  - `src/ui/hud/` only if a minimal heat indicator is truly needed
  - `src/rendering/scene/combat-scene-runtime.ts`
  - `src/rendering/scene/pedestrian-scene-runtime.ts`
  - `src/rendering/scene/chaos-scene-runtime.ts`
  - `src/pedestrians/runtime/pedestrian-system.ts`
  - `src/vehicles/damage/vehicle-damage-system.ts`
  - relevant unit, integration, and smoke tests
- Keep heat rules in `src/sandbox/heat/`, scene-specific translation in `src/rendering/scene/`, and any minimal player-facing indicator in `src/ui/hud/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- Do not move heat gameplay logic into `public/`, `src/ui/shell/`, or `src/app/state/`. Runtime-loaded data belongs in `public/data/` only if a real authored heat config is required later, but danger state and scoring belong in source modules. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`; `src/app/state/session-state-machine.ts`]
- Keep `SliceManifest` unchanged unless a later story proves authored heat data is necessary. This story should prefer derived runtime state over new persistent schema. [Source: `src/world/chunks/slice-manifest.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`]

### Testing Requirements

- Follow the existing repository testing pattern:
  - unit tests in `tests/unit/*.spec.ts`
  - integration tests in `tests/integration/*.integration.spec.ts`
  - smoke coverage in `tests/smoke/*.smoke.spec.ts`
- Add unit coverage for the heat runtime itself, including incident weighting, threshold transitions, duplicate-event suppression, bounded recent-event buffers, and snapshot or typed-event output. [Source: `tests/unit/combat-scene-runtime.spec.ts`; `tests/unit/chaos-scene-runtime.spec.ts`]
- Add unit coverage that heat input translation uses explicit combat, pedestrian, and chaos outputs rather than controller internals or mesh scans. [Source: `tests/unit/combat-scene-runtime.spec.ts`; `tests/unit/pedestrian-scene-runtime.spec.ts`; `tests/unit/chaos-scene-runtime.spec.ts`]
- Add explicit coverage that passive on-foot presence, ordinary camera or possession changes, and low-signal driving activity do not escalate heat. [Source: `tests/unit/world-scene-runtime.spec.ts`; `tests/unit/player-possession-runtime.spec.ts`; `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`]
- Add scene-focused integration or smoke coverage that heat initializes and disposes cleanly across restart and replay while readiness, active camera, navigation, possession, traffic, pedestrian, chaos, and combat telemetry remain intact. [Source: `tests/smoke/chaos-scene-runtime.smoke.spec.ts`; `tests/smoke/world-scene-possession.smoke.spec.ts`; `tests/integration/location-entry.integration.spec.ts`]
- If a HUD seam is added, verify it remains world-ready-only and additive beside the existing navigation and combat HUD behavior. [Source: `src/app/bootstrap/create-game-app.ts`; `src/ui/hud/world-combat-hud.ts`; `tests/integration/world-navigation-hud.integration.spec.ts`]
- Add at least one explicit failure-path assertion that heat runtime or heat HUD initialization errors surface through the existing world-load failure path instead of leaving a partially ready scene. [Source: `tests/integration/location-entry.integration.spec.ts`; `src/world/generation/world-load-failure.ts`; `src/app/bootstrap/create-game-app.ts`]
- Keep `tests/integration/location-entry.integration.spec.ts`, `tests/integration/world-slice-loading.integration.spec.ts`, `tests/integration/world-navigation-hud.integration.spec.ts`, `tests/integration/vehicle-hijack.integration.spec.ts`, and `tests/integration/vehicle-switching.integration.spec.ts` valid. Heat should not break the existing world-load, restart, possession, or HUD contracts. [Source: listed test files]
- Finish implementation validation with `npm run check`, `npm test`, and `npm run build`.

### Previous Story Intelligence

- Story 3.4 added the compact combat runtime, typed `CombatEvent`s, scene-local combat telemetry, and a lightweight HUD subscription. Heat should consume those typed events and bounded snapshots instead of reading raw aim or target-selection state. [Source: `_bmad-output/implementation-artifacts/3-4-use-limited-combat-options.md`; `src/sandbox/combat/combat-runtime.ts`; `src/rendering/scene/combat-scene-runtime.ts`]
- Story 3.3 added the current chaos scene runtime, breakable-prop system, vehicle damage system, severity policy, additive chaos telemetry, and reset-safe smoke coverage. Heat should build on those seams instead of inventing a second crash or destruction pipeline. [Source: `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`; `src/rendering/scene/chaos-scene-runtime.ts`; `src/vehicles/damage/vehicle-damage-system.ts`; `tests/smoke/chaos-scene-runtime.smoke.spec.ts`]
- Story 3.2 established the explicit scene-adapter model for pedestrian-domain inputs and readable `pedestrian.panicked` or `pedestrian.struck` events. Heat must preserve that explicitness and avoid treating generic player-nearby panic as equivalent to violent chaos. [Source: `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`; `src/rendering/scene/pedestrian-scene-runtime.ts`; `src/pedestrians/runtime/pedestrian-system.ts`]
- Story 3.1 established the Epic 3 baseline pattern of stable manifest identity plus dynamic session state recreated on restart and replay. Heat should follow that same stable-city living-session model. [Source: `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`; `src/app/bootstrap/create-game-app.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`]

### Git Intelligence Summary

- Recent commits show the repo's current implementation direction clearly:
  - `37ac44c`: added limited on-foot combat through a dedicated sandbox domain, a narrow scene adapter, additive telemetry, HUD subscription wiring, and focused tests.
  - `135b51d`: added breakable props and vehicle damage systems with domain-local logic, a dedicated chaos scene adapter, additive telemetry, and recreation-safe tests.
  - `8ad6ff3`: added deterministic pedestrians and a reactive runtime with explicit scene inputs and typed events.
  - `2e72ced`: updated sprint bookkeeping only and does not change runtime architecture.
- Reuse those seams instead of inventing a heat-specific bootstrap path, second reset mechanism, parallel telemetry channel, or app-level gameplay state machine. [Source: `git log -5 --format='%H%x09%s'`; `git log -5 --stat --format='commit %H%nsubject %s'`]

### Latest Tech Information

- `@babylonjs/havok` `1.3.12` remains the latest stable npm release checked during this workflow, matching the repo pin.
- `@babylonjs/core` `9.2.0` is newer on npm than the repo's pinned `9.1.0`, but the current story does not need a Babylon upgrade to implement a compact heat runtime, telemetry, and HUD indicator.
- Babylon `9.1.0` release notes emphasize broader engine, WebGPU, and performance work rather than any danger or heat-specific runtime requirement.
- `vite` `8.0.8` is the current latest stable while the repo remains on `8.0.5`; Vite still documents Node `20.19+` or `22.12+` as the supported baseline.
- No extra dependency is needed for this story. The current stack already supports narrow runtime seams, typed tests, Babylon scene integration, and additive browser telemetry.

### Project Structure Notes

- `create-world-scene.ts` is already the main gameplay-assembly file in the repo. Heat modules should keep future growth out of that file by leaving only orchestration, update calls, telemetry wiring, HUD listener updates, and teardown there. [Source: `src/rendering/scene/create-world-scene.ts`]
- `src/sandbox/combat/`, `src/sandbox/chaos/`, and `src/pedestrians/runtime/` already show the repo's preferred pattern for small, domain-owned runtime seams. `src/sandbox/heat/` should mirror that style rather than becoming a rendering-side implementation. [Source: `src/sandbox/combat/combat-runtime.ts`; `src/sandbox/chaos/breakable-prop-system.ts`; `src/pedestrians/runtime/pedestrian-system.ts`]
- `create-game-app.ts` currently treats gameplay UI as world-ready-only subscriptions beside the navigation HUD. A heat indicator should follow that same subscription pattern if it is needed. [Source: `src/app/bootstrap/create-game-app.ts`; `src/ui/hud/world-combat-hud.ts`]
- `scene.metadata` and canvas datasets already carry bounded subsystem summaries for traffic, pedestrians, chaos, and combat. Heat telemetry should be additive beside that existing pattern, not a replacement for it. [Source: `src/rendering/scene/world-scene-runtime.ts`; `src/rendering/scene/chaos-scene-runtime.ts`; `src/rendering/scene/combat-scene-runtime.ts`; `src/rendering/scene/pedestrian-scene-runtime.ts`]
- `src/sandbox/heat/` does not exist in the current repo yet, which matches the architecture's intention that this story should introduce the first heat-owned runtime seam there. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`]

### Project Context Rules

- No `project-context.md` file was found in the workspace during workflow discovery.
- Use the architecture document, `package.json`, current source structure, current story files, and existing tests as the governing project rules for this story.
- The architecture selected Context7 as the preferred up-to-date documentation source for Babylon.js and Vite work if implementation needs additional external docs. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`
- `_bmad-output/planning-artifacts/gdd.md#Progression and Balance`
- `_bmad-output/planning-artifacts/gdd.md#Game Mechanics`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/game-brief.md#Primary Mechanics`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Ideas Generated`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Themes and Patterns`
- `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`
- `_bmad-output/planning-artifacts/game-architecture.md#Event System`
- `_bmad-output/planning-artifacts/game-architecture.md#Configuration`
- `_bmad-output/planning-artifacts/game-architecture.md#Data Patterns`
- `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`
- `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`
- `_bmad-output/implementation-artifacts/3-1-drive-through-traffic.md`
- `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`
- `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`
- `_bmad-output/implementation-artifacts/3-4-use-limited-combat-options.md`
- `package.json`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/app/state/session-state-machine.ts`
- `src/pedestrians/runtime/pedestrian-system.ts`
- `src/rendering/scene/chaos-scene-runtime.ts`
- `src/rendering/scene/combat-scene-runtime.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/pedestrian-scene-runtime.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/sandbox/combat/combat-runtime.ts`
- `src/ui/hud/world-combat-hud.ts`
- `src/vehicles/damage/vehicle-damage-policy.ts`
- `src/vehicles/damage/vehicle-damage-system.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-load-failure.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/integration/vehicle-hijack.integration.spec.ts`
- `tests/integration/vehicle-switching.integration.spec.ts`
- `tests/integration/world-navigation-hud.integration.spec.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/chaos-scene-runtime.smoke.spec.ts`
- `tests/smoke/world-scene-possession.smoke.spec.ts`
- `tests/unit/chaos-scene-runtime.spec.ts`
- `tests/unit/combat-scene-runtime.spec.ts`
- `tests/unit/player-possession-runtime.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`
- `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`
- `https://vite.dev/guide/`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Implementation Plan

- Add a runtime-local heat system under `src/sandbox/heat/` with typed incidents, staged thresholds, bounded recent-event history, and explicit normalization rules for overlapping chaos signals.
- Consume explicit combat, pedestrian, and chaos outputs in a narrow scene adapter and update heat after those systems each frame so `create-world-scene.ts` stays orchestration-only.
- Publish additive heat telemetry and, if needed, a lightweight world-ready HUD subscription without changing app session state, manifest structure, or current readiness contracts.
- Close the story with unit, integration, and smoke coverage that proves clean reset, additive telemetry, and no regression in possession, hijack, navigation, traffic, pedestrians, chaos, combat, or world loading.

### Debug Log References

- `git log -5 --format='%H%x09%s'`
- `git log -5 --stat --format='commit %H%nsubject %s'`
- `npm view @babylonjs/core version`
- `npm view @babylonjs/havok version`
- `npm view vite version`
- `npm test -- tests/unit/heat-runtime.spec.ts`
- `npm test -- tests/unit/heat-scene-runtime.spec.ts`
- `npm test -- tests/unit/world-heat-hud.spec.ts`
- `npm test -- tests/integration/world-heat-hud.integration.spec.ts`
- `npm test -- tests/integration/world-heat-failure.integration.spec.ts`
- `npm test -- tests/smoke/heat-scene-runtime.smoke.spec.ts`
- `npm run check`
- `npm test`
- `npm run build`
- `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`
- `https://vite.dev/guide/`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- No UX artifact or `project-context.md` artifact was available during workflow discovery.
- Story 3.5 intentionally creates the first danger or heat seam and readable pressure layer while deferring full pursuit resolution, fail states, and restart outcomes to Story 3.6.
- Latest stack checks confirmed no story-specific dependency upgrade is required before implementation.
- Added `src/sandbox/heat/heat-runtime.ts` with explicit scoreable versus ignored incident types, five-stage runtime snapshots, typed heat events, a bounded 4-entry recent-event buffer, and per-incident normalization windows for gunfire bursts and repeat damage loops.
- Added `tests/unit/heat-runtime.spec.ts` to cover staged accumulation, ignored incidents, duplicate suppression, and recent-event bounds; `npm run check` and `npm test` passed after the Task 1 implementation.
- Added `src/rendering/scene/heat-scene-runtime.ts` as a narrow adapter that only consumes explicit combat, pedestrian, and chaos outputs, forwards the allowed first-wave inputs into the heat runtime, and keeps `combat.target.hit`, `combat.weapon.changed`, and passive `pedestrian.panicked` out of scoring.
- Added `tests/unit/heat-scene-runtime.spec.ts` to prove the adapter uses typed scene events, preserves existing vehicle-damage severity metadata, and normalizes reciprocal crash telemetry through the heat runtime; `npm run check` and `npm test` passed after the Task 2 implementation.
- Added additive heat telemetry projection in `src/rendering/scene/heat-scene-runtime.ts`, wired the scene subscription through `src/rendering/scene/create-world-scene.ts` and `src/app/bootstrap/create-game-app.ts`, and kept heat state runtime-local while exposing bounded `scene.metadata`, `canvas.dataset`, and world-ready HUD summaries.
- Added `src/ui/hud/world-heat-hud.ts` plus supporting `src/styles.css` styling for a lightweight stage-and-recent-event indicator, and covered it with unit plus integration tests in `tests/unit/world-heat-hud.spec.ts` and `tests/integration/world-heat-hud.integration.spec.ts`; `npm run check` and `npm test` passed after the Task 3 implementation.
- Confirmed heat now resets through the existing dispose-and-recreate world path by recreating the scene runtime and re-subscribing the HUD on restart without changing readiness, possession, navigation, or session identity contracts.
- Added `tests/smoke/heat-scene-runtime.smoke.spec.ts` and extended `tests/integration/world-heat-hud.integration.spec.ts` so restart-style recreation clears prior escalation while keeping baseline telemetry coherent; `npm run check` and `npm test` passed after the Task 4 implementation.
- Added `tests/integration/world-heat-failure.integration.spec.ts` to assert a heat HUD initialization failure falls through the existing `world.load.failed` path instead of leaving a partially ready scene.
- Final repository validation passed with `npm run check`, `npm test`, and `npm run build` after the heat implementation and guardrail coverage were complete.
- Code review fixed the world-scene loader so failed bootstrap attempts dispose partially created Babylon, Havok, and canvas resources instead of leaking them across retries.
- Code review corrected heat runtime initialization failures to report through the world-loading failure path and added explicit smoke coverage proving camera-only and possession-only telemetry changes keep heat calm.
- Code review reconciled the story File List with git-visible changes by removing the ignored story artifact, keeping sprint tracking, and adding the missing tracked smoke plus failure-contract files.

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/app/bootstrap/create-game-app.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/heat-scene-runtime.ts`
- `src/sandbox/heat/heat-runtime.ts`
- `src/styles.css`
- `src/ui/hud/world-heat-hud.ts`
- `src/world/generation/world-load-failure.ts`
- `tests/integration/world-heat-hud.integration.spec.ts`
- `tests/integration/world-heat-failure.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/heat-scene-runtime.smoke.spec.ts`
- `tests/unit/heat-scene-runtime.spec.ts`
- `tests/unit/heat-runtime.spec.ts`
- `tests/unit/world-heat-hud.spec.ts`

## Change Log

- 2026-04-09: Created the story context for Story 3.5 and set status to `ready-for-dev`.
- 2026-04-09: Implemented the first heat layer with a dedicated runtime, scene translation, additive telemetry, a world-ready HUD, reset-safe recreation, failure-path coverage, and passing check/test/build validation.
- 2026-04-09: Senior developer review fixed loader cleanup and heat failure classification, added low-signal telemetry guardrail coverage, reconciled the File List with git-visible changes, and closed the story as done.

## Senior Developer Review (AI)

### Reviewer

Chris

### Date

2026-04-09T22:36:44-07:00

### Outcome

Approve

### Summary

- Verified all 6 acceptance criteria against the changed source and test files.
- Fixed the failed-load cleanup path so partial Babylon, Havok, and canvas resources are disposed when world bootstrap aborts before the scene handle is returned.
- Corrected heat runtime initialization failures to surface as `WORLD_SCENE_LOAD_FAILED` during `world-loading`, expanded low-signal telemetry coverage, and reran `npm run check`, `npm test`, and `npm run build` successfully.

### Findings Addressed

- [fixed][HIGH] Failed `BabylonWorldSceneLoader.load()` attempts could leak partially initialized engine, scene, physics, and canvas resources because bootstrap errors occurred before a disposable scene handle was returned.
- [fixed][HIGH] The File List no longer falsely claims the ignored story artifact as a git-visible changed file.
- [fixed][MEDIUM] The File List now includes the tracked `tests/smoke/app-bootstrap.smoke.spec.ts` change that was missing during review.
- [fixed][MEDIUM] Heat runtime initialization failures now report through the world-loading failure path instead of being mislabeled as vehicle-possession failures.
- [fixed][MEDIUM] Smoke and integration coverage now explicitly proves camera-only and possession-only telemetry transitions do not raise heat.
