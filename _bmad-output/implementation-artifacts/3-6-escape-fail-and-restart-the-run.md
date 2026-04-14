# Story 3.6: Escape, Fail, and Restart the Run

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can escape, fail, and restart the run,
so that chaos has stakes without ending the sandbox permanently.

## Acceptance Criteria

1. Given the player has already accumulated non-calm danger through the existing heat runtime, when world-ready pursuit evaluation runs, then the game extends the current `src/sandbox/heat/` seam with explicit first-wave pursuit state, a time-advance API for pursuit and cooldown transitions, and a bounded responder roster that scales mainly through heat level, using the existing vehicle stack and traffic-driving helpers rather than a second vehicle or physics stack, while calm cruising, boot flow, replay bookkeeping, and non-scoreable heat inputs do not start or escalate pursuit in this story.
2. Given pursuit or escape pressure is active, when the scene syncs runtime telemetry and HUD state, then the player gets lightweight readable guidance for current heat stage, pursuit phase, escape phase, responder pressure, and imminent run outcome through additive `scene.metadata`, canvas dataset, world-ready HUD updates, and if needed a typed scene-to-app signal, without replacing the current navigation or combat HUD meaning, readiness milestone `controllable-vehicle`, or shell flow.
3. Given responders are active, when the player opens enough space and breaks direct pressure through the street network, then the run transitions through explicit loss-of-contact and cooldown phases driven by a bounded distance-and-time heuristic in the heat or responder runtime, allowing pursuit to reduce or clear and heat to return toward calm without deep police AI, citywide search logic, or heavyweight line-of-sight systems.
4. Given the player loses control of the run, when fail conditions are met, then the game resolves the attempt into a readable lightweight outcome such as `BUSTED` for sustained capture under active pursuit or `WRECKED` for an unrecoverable collapse of the player-controlled run that the player failed to convert into exit, re-entry, or hijack recovery, while preserving the current sandbox tone and not introducing a full player-health, hospital, jail, economy, mission-fail, or save-penalty system in this story.
5. Given a run resolves as busted or wrecked, when the short outcome window completes, then the app routes automatic recovery through the same app-owned cached same-slice restart contract and cancellation safety Story 1.5 already uses for overlay restart, recreating the run in the same slice and spawn without re-resolving or regenerating the location, while clearing runtime-only pursuit, heat, damage, combat, traffic, pedestrian, possession, and HUD state and preserving `sliceId`, `reuseKey`, place identity, static world structure, and restart or retry safety.
6. Given the player wants to abandon the current run voluntarily, when they press `Backspace` during `world-ready`, then the app triggers the same plain cached restart-from-spawn contract as the existing overlay control only when no modifier keys are held, the event is not a key repeat, and focus is not inside an editable field such as `input`, `textarea`, or `contenteditable`, and the handler calls `preventDefault()` without opening a new menu or changing replay selection semantics.
7. Given the feature is implemented, when repository validation runs, then unit, integration, smoke, typecheck, build, and browser checks confirm pursuit time advancement, responder scaling, escape cooldown, fail classification, automatic restart, manual `Backspace` restart, input-focus safety, late-load cancellation safety, typed `world.load.failed` handling for new bootstrap failures, and no regression in existing world-load, retry, replay, possession, hijack, traffic, pedestrian, combat, heat, or HUD behavior.

## Tasks / Subtasks

- [x] Task 1: Extend the existing heat domain into a first-wave pursuit and escape state model (AC: 1, 2, 3, 4, 7)
  - [x] Replace the current placeholder-only `pursuitPhase` and `escapePhase` shape in `src/sandbox/heat/heat-runtime.ts` with concrete first-wave phases, bounded snapshot fields, and a time-based `update` or `advance` seam for pursuit, cooldown, capture, and clearance behavior.
  - [x] Keep the heat runtime as the source of truth for danger and pursuit state; do not create a second app-level, HUD-level, or manifest-backed wanted store.
  - [x] Add explicit typed events or snapshot transitions for pursuit activation, loss of contact, cooldown, and fail-condition signals using `domain.action` naming.
- [x] Task 2: Add a minimal responder and escape loop using existing vehicle and traffic seams (AC: 1, 2, 3, 4, 7)
  - [x] Build the smallest useful responder runtime that can create and update a bounded pursuit roster without inventing a second vehicle factory, second physics backend, or deep police-AI framework.
  - [x] Reuse current vehicle tuning, mesh metadata, `traffic-vehicle-factory.ts`, and route or control helpers such as `traffic-driving.ts` and `traffic-route.ts` where practical instead of trying to force responders through the manifest-planned ambient traffic flow unchanged.
  - [x] Use a simple pressure model that scales mainly by responder count, contact persistence, and cooldown timing, not by broad behavior trees, ranged police combat, or mission scripting.
  - [x] Keep responder interaction roles explicit so they do not accidentally enter starter-vehicle, replay, hijack, or ordinary traffic flows unless deliberately allowed and fully tested.
- [x] Task 3: Add fail detection and automatic restart through the existing same-slice restart contract (AC: 4, 5, 7)
  - [x] Introduce a narrow reset or run-outcome seam under `src/sandbox/reset/` or another architecture-compliant sandbox location instead of burying fail logic inside `create-world-scene.ts` or `src/app/`.
  - [x] Reuse Story 1.5's cached restart path in `src/app/bootstrap/create-game-app.ts` for automatic fail recovery instead of inventing a second reload flow, and keep overlay restart, `Backspace` restart, and auto-fail restart on one shared helper path.
  - [x] Make fail classification explicit and testable, including the difference between recoverable pressure and terminal `BUSTED` or `WRECKED` outcomes, and make sure ambient traffic damage does not count as a terminal player failure by itself.
  - [x] Preserve player recovery options such as brief escape or vehicle-swap opportunities where intended; do not auto-fail the moment a car is merely damaged or the player first attracts attention.
- [x] Task 4: Surface pressure readably and add the manual instant-retry control (AC: 2, 6, 7)
  - [x] Extend `src/ui/hud/world-heat-hud.ts` or add the smallest adjacent HUD seam needed so the player can read pursuit, escape, and outcome state without replacing existing navigation or combat HUD behavior.
  - [x] Publish additive telemetry fields such as `heatPursuitPhase`, `heatEscapePhase`, `heatResponderCount`, and `runOutcome` while preserving all current metadata and dataset meanings.
  - [x] Add `Backspace` as a world-ready quick-restart input that routes into the same restart contract as the overlay button, ignores modifier and repeat input, ignores editable focus targets, calls `preventDefault()`, and does not bypass existing cancellation or cached-manifest semantics.
- [x] Task 5: Add guardrail coverage and run full verification (AC: 7)
  - [x] Add unit coverage for pursuit-state transitions, time-based escape cooldown behavior, responder-count scaling, fail classification, quick-restart input handling, and restart versus replay semantics.
  - [x] Add integration coverage proving automatic fail restart and manual `Backspace` restart both reuse the current cached slice context, preserve retry or edit behavior when replacement scene loading fails, and ignore late completions after edit or restart cancellation.
  - [x] Add smoke and browser coverage showing the player can escalate heat, enter pressure, restart cleanly, and return to a calm recreated run without breaking possession, hijack, HUD telemetry, or the baseline controllable-vehicle contract.
  - [x] Run `npm run check`, `npm test`, `npm run build`, and `npm run test:browser` before moving the story beyond implementation.

## Dev Notes

- Story 3.6 closes Epic 3's flee, failure, and recovery loop. Story 3.5 created a readable danger dial but explicitly deferred pursuit resolution, busted or wrecked outcomes, and restart stakes to this story. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`; `_bmad-output/implementation-artifacts/3-5-accumulate-danger-through-chaotic-play.md`]
- The GDD defines failure as soft failure rather than permanent defeat: a run can end when the player loses control, destroys or loses the current vehicle, gets busted, gets wasted, or otherwise reaches a terminal attempt state, and recovery should restart from spawn in the same chosen location. This story should implement that product rule without breaking browser-first flow. [Source: `_bmad-output/planning-artifacts/gdd.md#Core Gameplay`; `_bmad-output/planning-artifacts/gdd.md#Win/Loss Conditions`]
- Brainstorming set the intended product language clearly: wanted pressure should use a familiar staged GTA-style signal, escalation should mostly scale through more pursuing police cars, escape should come from breaking pressure through the road network, and failure should stay lighthearted through a quick arcade reset loop. [Source: `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Controls #6`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Heat #1`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Heat #6`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Failure #3`]
- The game brief frames flee, getting busted, getting wasted, and restarting as part of the same lightweight sandbox loop. This story should preserve that toy-like momentum rather than turning failure into a long punishment flow. [Source: `_bmad-output/planning-artifacts/game-brief.md#Primary Mechanics`]
- No dedicated UX artifact or `project-context.md` file was found during workflow discovery. Use the GDD, architecture, current source tree, package pins, current story files, and existing tests as the governing guidance for this story. [Source: workflow discovery results]

### Non-Negotiables

- Do not replace Story 3.5's heat runtime with a new app-level wanted system or persistent manifest state.
- Do not invent a second restart or reload flow. Automatic fail recovery and manual quick restart must route through the same cached same-slice restart contract Story 1.5 already established.
- Do not widen this story into full police shooter AI, arrest cutscenes, jail or hospital loops, economy penalties, pickups, inventory systems, or mission scripting.
- Do not add a broad player-health system just to support `WASTED`. First-wave failure should come from pursuit capture and vehicle-collapse recovery failure unless a truly minimal survivability seam is unavoidable.
- Do not make responder escalation depend on a huge new vehicle roster, new art assets, or a bespoke police-car content pipeline. Reuse the current vehicle stack first.
- Do not let responder vehicles accidentally become ordinary replay starters, vehicle-switch targets, or generic hijack candidates unless that behavior is deliberately specified and fully tested.
- Do not classify `WRECKED` from arbitrary ambient traffic damage or the first heavy hit alone. The failure model must be tied to the player-controlled run and preserve recovery windows.
- Do not fire `Backspace` restart while the player is typing into editable UI or through duplicate listeners that cause multiple restart requests for one key press.
- Do not break `world.scene.ready`, readiness milestone `controllable-vehicle`, existing `world.load.failed` handling, replay selection semantics, or current shell overlay ownership.

### Technical Requirements

- `src/sandbox/heat/heat-runtime.ts` already exposes future-facing `pursuitPhase` and `escapePhase` fields, but they are currently placeholders (`"none"` and `"inactive"`) and the runtime only exposes `record(...)` plus `getSnapshot()`. Story 3.6 must add a small time-advance seam for pursuit, cooldown, and clearance behavior instead of creating a parallel timing store elsewhere. [Source: `src/sandbox/heat/heat-runtime.ts`; `_bmad-output/implementation-artifacts/3-5-accumulate-danger-through-chaotic-play.md`]
- `create-world-scene.ts` already updates systems in a deliberate order: possession, traffic, combat, pedestrians, chaos, heat, then telemetry and HUD listeners. Pursuit, fail, and restart signals should slot into that orchestration cleanly rather than rescanning unrelated scene state or moving gameplay truth into `src/app/`. [Source: `src/rendering/scene/create-world-scene.ts`]
- `heat-scene-runtime.ts` currently translates explicit combat, pedestrian, and chaos outputs into heat incidents and already publishes additive `heatPursuitPhase` and `heatEscapePhase` telemetry placeholders. Extend that adapter pattern for pursuit and escape telemetry instead of bypassing it with DOM-only state or ad hoc globals. [Source: `src/rendering/scene/heat-scene-runtime.ts`; `tests/unit/heat-scene-runtime.spec.ts`]
- Story 1.5 already proved the exact restart contract this story needs: `create-game-app.ts` can restart from the same cached `sessionIdentity`, `handoff`, `sliceManifest`, and `spawnCandidate` without re-running location resolve or world generation, and `activeLoadId` already cancels stale async completions. Reuse that flow for automatic fail recovery and `Backspace` restart. [Source: `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`; `src/app/bootstrap/create-game-app.ts`; `src/app/state/session-state-machine.ts`; `tests/integration/location-entry.integration.spec.ts`]
- `create-game-app.ts` already owns restart, replay, retry, and shell keyboard handling. Keep one shared app-owned restart helper for overlay restart, `Backspace`, and auto-fail recovery, with scene code surfacing typed outcome or restart signals instead of making the app poll DOM state or canvas datasets. [Source: `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/create-world-scene.ts`]
- `create-world-scene.ts` currently exposes `subscribeNavigation`, `subscribeCombat`, and `subscribeHeat`, but there is no existing run-outcome subscription or restart-request seam. If auto-fail needs app involvement, add the smallest typed scene-to-app seam required rather than driving restart from HUD text or telemetry scraping. [Source: `src/rendering/scene/create-world-scene.ts`]
- `player-vehicle-controller.ts` currently has no quick-restart binding, and `Backspace` is not assigned. Reuse its existing one-shot key pattern only if the final ownership still routes through the shared app restart helper. [Source: `src/vehicles/controllers/player-vehicle-controller.ts`; `tests/unit/player-vehicle-controller.spec.ts`]
- `location-entry-screen.ts` focuses the location input whenever input is enabled. Manual `Backspace` restart must therefore ignore editable targets such as `input`, `textarea`, and `contenteditable`, and call `preventDefault()` so browser history or text deletion behavior is not hijacked while the player is typing. [Source: `src/ui/shell/location-entry-screen.ts`]
- `traffic/runtime/traffic-system.ts` is currently manifest-plan driven ambient traffic, while `traffic-vehicle-factory.ts`, `traffic-driving.ts`, and `traffic-route.ts` provide the most reusable low-level vehicle, control, and route seams. Prefer extending those helpers over trying to force responder spawning through the static traffic manifest flow unchanged. [Source: `src/traffic/runtime/traffic-system.ts`; `src/traffic/runtime/traffic-vehicle-factory.ts`; `src/traffic/agents/traffic-driving.ts`; `src/traffic/routing/traffic-route.ts`]
- `vehicle-interaction-policy.ts` currently allows hijack only for vehicles with `interactionRole === "hijackable"`. Keep responder metadata explicit so they do not accidentally become hijackable, active, or replay-starter vehicles through reused factory code. [Source: `src/sandbox/on-foot/vehicle-interaction-policy.ts`; `src/rendering/scene/create-world-scene.ts`]
- The current vehicle roster and tuning data only cover `sedan`, `sports-car`, and `heavy-truck`. If responders need a first-wave visual identity, derive it from existing tuning and metadata rather than blocking on a new police-car asset pipeline. [Source: `public/data/tuning/sedan.json`; `public/data/tuning/sports-car.json`; `public/data/tuning/heavy-truck.json`; `src/vehicles/physics/vehicle-factory.ts`]
- `vehicle-damage-policy.ts` and `vehicle-damage-system.ts` already expose normalized damage severity and typed `vehicle.damaged` events. Reuse those seams for `WRECKED` classification rather than inventing another collision or durability model. [Source: `src/vehicles/damage/vehicle-damage-policy.ts`; `src/vehicles/damage/vehicle-damage-system.ts`; `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`]
- `player-possession-runtime.ts` already defines the current vehicle or on-foot recovery loop, including exit, re-entry, and hijack transitions. Fail logic must respect that runtime instead of immediately treating every damaged vehicle as terminal. [Source: `src/sandbox/on-foot/player-possession-runtime.ts`; `_bmad-output/planning-artifacts/gdd.md#Game Mechanics`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Failure #4`]
- `SliceManifest` currently stores static slice, traffic, pedestrian, and breakable-prop plans only. Keep live pursuit, fail, and outcome state runtime-local; do not add wanted or run-outcome persistence to the manifest for this story. [Source: `src/world/chunks/slice-manifest.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`]
- `world-load-failure.ts` currently only defines `WORLD_GENERATION_FAILED`, `WORLD_SCENE_LOAD_FAILED`, `STARTER_VEHICLE_SPAWN_FAILED`, and `STARTER_VEHICLE_POSSESSION_FAILED` with a narrow stage list. If new bootstrap points need explicit typed failures, extend those enums deliberately rather than throwing untyped errors or overloading unrelated failure codes silently. [Source: `src/world/generation/world-load-failure.ts`; `tests/integration/world-heat-failure.integration.spec.ts`]
- Keep failure handling typed. If responder runtime, pursuit HUD, or auto-restart wiring fails during bootstrap or recreation, route it through the existing `world.load.failed` behavior rather than leaving a half-ready world. [Source: `src/world/generation/world-load-failure.ts`; `src/app/bootstrap/create-game-app.ts`; `tests/integration/world-heat-failure.integration.spec.ts`; `tests/integration/location-entry.integration.spec.ts`]

### Architecture Compliance

- Keep danger, pursuit, and escape source-of-truth logic in `src/sandbox/heat/`, and put explicit run-outcome or automatic-restart classification in `src/sandbox/reset/` or another sandbox-owned seam. Do not make `src/app/`, `src/ui/`, or `src/rendering/scene/create-world-scene.ts` own gameplay truth. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- Rendering should remain an adapter layer. Scene code may create and position responder visuals, publish telemetry, and forward typed subscriptions, but state machines, pressure rules, fail timers, and restart classification belong in sandbox-owned runtime seams. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`; `src/rendering/scene/heat-scene-runtime.ts`; `src/rendering/scene/create-world-scene.ts`]
- If pursuit or run-outcome signaling needs new events, keep them typed and explicit with `domain.action` names such as `heat.pursuit.started`, `heat.escape.cooldown.started`, or `run.outcome.changed`. Do not coordinate the feature through untyped DOM scraping, HUD text inspection, or hidden booleans. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `_bmad-output/planning-artifacts/game-architecture.md#State Patterns`]
- Preserve the stable-city living-session rule: same slice, fresh dynamic run. Automatic fail restart should recreate runtime-only state on the same static geography rather than mutate the active slice or regenerate roads. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`; `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`]
- Reuse the current factory-plus-runtime pattern for high-churn vehicles. Responder cars should be created through the existing vehicle stack or a narrow extension of it, not through one-off mesh logic inside the scene bootstrap. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Entity Patterns`; `src/traffic/runtime/traffic-vehicle-factory.ts`; `src/vehicles/physics/vehicle-factory.ts`]
- If you introduce new tuning thresholds, cooldowns, or outcome windows, keep them together in explicit modules or config-shaped constants. Do not scatter values across HUD classes, scene orchestration, tests, and unrelated runtime files. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Configuration`; `_bmad-output/planning-artifacts/game-architecture.md#Data Patterns`]

### Library / Framework Requirements

- Stay on the repo's pinned runtime stack for this story: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, `vite` `8.0.5`, `vitest` `3.2.4`, `@playwright/test` `1.59.1`, and TypeScript `5.9.3`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`]
- Latest checks during this workflow show `@babylonjs/core` `9.2.0` as the current npm release while the repo remains pinned to `9.1.0`. Babylon's current release notes emphasize broader engine, WebGPU, and build-layer work, not anything this story needs for first-wave pursuit and restart behavior, so do not widen this story into a Babylon upgrade. [Source: `npm view @babylonjs/core version`; `https://github.com/BabylonJS/Babylon.js/releases`]
- Latest checks during this workflow show `@babylonjs/havok` `1.3.12` still matching the repo pin and current stable npm release. No Havok upgrade is required for this story. [Source: `npm view @babylonjs/havok version`]
- Latest checks during this workflow show `vite` `8.0.8` as the current stable release while the repo remains on `8.0.5`. Vite's current guide still documents Node `20.19+` or `22.12+` as the baseline. Treat any Vite upgrade as out of scope for this story. [Source: `npm view vite version`; `https://vite.dev/guide/`]
- Latest checks during this workflow show `vitest` `4.1.4` and TypeScript `6.0.2` newer than the repo's pinned `3.2.4` and `5.9.3`, while `@playwright/test` `1.59.1` still matches the repo pin. Do not widen this story into test-runner or compiler upgrades. [Source: `npm view vitest version`; `npm view @playwright/test version`; `npm view typescript version`]
- Do not add ECS, police-AI, state-management, UI-framework, or networking dependencies to deliver first-wave pursuit, fail, and restart behavior. The current TypeScript plus Babylon.js plus Havok plus Vite stack is sufficient. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Decisions`]
- The architecture selected Context7 as the preferred up-to-date documentation source if implementation needs extra Babylon.js or Vite guidance while coding. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### File Structure Requirements

- The most likely primary touchpoints for this story are:
  - `src/sandbox/heat/heat-runtime.ts`
  - new files under `src/sandbox/heat/` for responder, pursuit, cooldown, or contact-tracking logic if the existing runtime file would become overloaded
  - new files under `src/sandbox/reset/` for run-outcome and auto-restart classification
  - `src/rendering/scene/heat-scene-runtime.ts`
  - `src/rendering/scene/create-world-scene.ts`
  - `src/app/bootstrap/create-game-app.ts`
  - `src/world/generation/world-load-failure.ts`
  - `src/ui/hud/world-heat-hud.ts`
  - `src/styles.css`
  - `src/vehicles/controllers/player-vehicle-controller.ts`
  - `src/traffic/runtime/traffic-vehicle-factory.ts`
  - `src/traffic/agents/traffic-driving.ts`
  - `src/traffic/routing/traffic-route.ts`
  - `src/sandbox/on-foot/player-possession-runtime.ts`
  - `src/sandbox/on-foot/vehicle-interaction-policy.ts`
  - `src/rendering/scene/chaos-scene-runtime.ts` and `src/rendering/scene/combat-scene-runtime.ts` only if spawned responders must participate in current damage or combat loops
  - relevant unit, integration, smoke, and browser tests
- Prefer not to expand `SliceManifest`, `LocationResolver`, or `WorldSliceGenerator` for this story. The static slice already exists; the main work is dynamic pursuit, fail-state, and cached restart behavior on top of it. [Source: `src/world/chunks/slice-manifest.ts`; `src/world/generation/location-resolver.ts`; `src/world/generation/world-slice-generator.ts`; `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`]
- Keep gameplay rules out of `public/`, `src/ui/shell/`, and `src/app/state/`. Runtime-loaded data belongs in `public/data/` only if a real authored responder config becomes necessary later, but first-wave logic should stay in source modules. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`; `src/app/state/session-state-machine.ts`]
- Follow existing naming conventions exactly: `kebab-case` files, `PascalCase` types and classes, `camelCase` functions and variables, `UPPER_SNAKE_CASE` constants, and `domain.action` event names. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Naming Conventions`]

### Testing Requirements

- Extend `tests/unit/heat-runtime.spec.ts` or add adjacent unit coverage for concrete pursuit and escape phase transitions, bounded responder scaling, heat decay or clearance rules, and time-based cooldown behavior so the developer cannot fake the wanted loop with HUD-only state. [Source: `tests/unit/heat-runtime.spec.ts`; `src/sandbox/heat/heat-runtime.ts`]
- Add unit coverage for whatever run-outcome seam classifies `BUSTED`, `WRECKED`, recovery windows, and manual `Backspace` restart requests so fail logic is explicit and deterministic. [Source: `_bmad-output/planning-artifacts/gdd.md#Win/Loss Conditions`; `src/vehicles/controllers/player-vehicle-controller.ts`; `src/vehicles/damage/vehicle-damage-policy.ts`]
- Add unit coverage that plain restart semantics still clear replay selection while replay restart semantics preserve it, so `Backspace` stays on the baseline restart path. [Source: `tests/unit/session-state-machine.spec.ts`; `src/app/state/session-state-machine.ts`]
- Add input-focused coverage that `Backspace` restart is ignored for modifier keys, repeat keydown, and editable targets, and that it calls `preventDefault()` when it does trigger. [Source: `src/ui/shell/location-entry-screen.ts`; `tests/unit/player-vehicle-controller.spec.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Add integration coverage proving automatic fail restart and manual `Backspace` restart both reuse the same cached `sessionIdentity`, `handoff`, `sliceManifest`, and `spawnCandidate` instead of re-resolving or regenerating the world. [Source: `tests/integration/location-entry.integration.spec.ts`; `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`]
- Add integration coverage proving a recreated run clears prior heat, pursuit, fail-state, and responder telemetry while preserving readiness, active camera, possession, navigation, traffic, pedestrian, combat, and replay contracts. [Source: `tests/integration/world-heat-hud.integration.spec.ts`; `tests/smoke/heat-scene-runtime.smoke.spec.ts`; `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`]
- Add coverage that responder or fail bootstrap errors still surface through the typed `world.load.failed` path rather than leaving a partially ready world or a stuck restart loop. [Source: `tests/integration/world-heat-failure.integration.spec.ts`; `src/world/generation/world-load-failure.ts`; `src/app/bootstrap/create-game-app.ts`]
- Add late-completion coverage proving auto-fail or manual restart cannot resurrect a stale scene after the player edits or another load supersedes it. [Source: `tests/integration/location-entry.integration.spec.ts`; `src/app/bootstrap/create-game-app.ts`]
- Keep `tests/integration/location-entry.integration.spec.ts`, `tests/integration/world-heat-hud.integration.spec.ts`, `tests/integration/world-navigation-hud.integration.spec.ts`, `tests/integration/vehicle-hijack.integration.spec.ts`, `tests/integration/vehicle-switching.integration.spec.ts`, `tests/smoke/world-scene-possession.smoke.spec.ts`, `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`, `tests/smoke/app-bootstrap.smoke.spec.ts`, and `tests/smoke/app-bootstrap.pw.spec.ts` valid. This story must not regress restart, replay, possession, hijack, or HUD contracts while adding stakes. [Source: listed test files]
- Finish implementation validation with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.

### Previous Story Intelligence

- Story 3.5 already created the runtime-local heat seam, bounded recent-event history, additive telemetry, and a world-ready heat HUD. Story 3.6 should extend those seams into actual pursuit and escape instead of replacing them. [Source: `_bmad-output/implementation-artifacts/3-5-accumulate-danger-through-chaotic-play.md`; `src/sandbox/heat/heat-runtime.ts`; `src/rendering/scene/heat-scene-runtime.ts`; `src/ui/hud/world-heat-hud.ts`]
- Story 1.5 already solved cached same-slice restart, typed restart and retry handling, and `activeLoadId` cancellation safety. Automatic fail recovery and `Backspace` retry should cash in on that work instead of bypassing it. [Source: `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`; `src/app/bootstrap/create-game-app.ts`; `tests/integration/location-entry.integration.spec.ts`]
- Story 3.4 added typed combat events, a narrow scene adapter, and world-ready HUD subscriptions. If responders or fail state need player-facing signals, follow that same explicit subscription pattern. [Source: `_bmad-output/implementation-artifacts/3-4-use-limited-combat-options.md`; `src/sandbox/combat/combat-runtime.ts`; `src/rendering/scene/combat-scene-runtime.ts`; `src/ui/hud/world-combat-hud.ts`]
- Story 3.3 added the current vehicle damage and chaos seams, including normalized damage severity and typed `vehicle.damaged` events. Reuse those for wreck logic instead of creating a parallel damage classifier. [Source: `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`; `src/vehicles/damage/vehicle-damage-system.ts`; `src/rendering/scene/chaos-scene-runtime.ts`]
- Story 3.2 and the current possession runtime already preserve the sandbox rhythm of panic, on-foot vulnerability, and quick vehicle recovery. Fail logic should work with those systems rather than flattening them. [Source: `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`; `src/pedestrians/runtime/pedestrian-system.ts`; `src/sandbox/on-foot/player-possession-runtime.ts`]

### Git Intelligence Summary

- Recent commits show the repo's current implementation direction clearly:
  - `bd021ee`: added heat escalation runtime and HUD through a dedicated sandbox domain, a narrow scene adapter, additive telemetry, app subscription wiring, and focused tests.
  - `37ac44c`: added limited on-foot combat through typed events, scene-local translation, lightweight HUD wiring, and behavior-first coverage.
  - `135b51d`: added breakable props and vehicle damage systems through domain-local logic, a dedicated chaos scene adapter, and recreation-safe tests.
- Reuse those seams instead of inventing a second bootstrap path, a parallel restart system, or a giant police-AI subsystem for Story 3.6. [Source: `git log -5 --format='%H%x09%s'`; `git log -5 --stat --format='commit %H%nsubject %s'`]

### Latest Tech Information

- `@babylonjs/core` `9.2.0` is newer on npm than the repo's pinned `9.1.0`, but the latest visible release notes emphasize broader engine, WebGPU, and packaging work rather than anything this story specifically needs for first-wave pursuit, fail, or restart behavior.
- `@babylonjs/havok` `1.3.12` remains the latest stable npm release checked during this workflow and matches the repo pin.
- `vite` `8.0.8` is the current latest stable while the repo remains on `8.0.5`; current Vite docs still list Node `20.19+` or `22.12+` as the baseline.
- `vitest` `4.1.4` and TypeScript `6.0.2` are newer than the repo pins, while `@playwright/test` `1.59.1` still matches the current repo version.
- No extra dependency is needed for this story. The current stack already supports narrow runtime seams, typed tests, Babylon scene integration, cached restart orchestration, and additive browser telemetry.

### Project Structure Notes

- `src/sandbox/reset/` does not exist in the current repo even though the architecture reserves sandbox reset loops there. Story 3.6 is a strong candidate to introduce that seam for run outcomes and fail-triggered restart without polluting `src/app/` or `src/rendering/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; current repository structure]
- `create-world-scene.ts` is already the main gameplay-assembly file in the repo. Keep new pursuit and fail modules out of that file by leaving only orchestration, update ordering, subscriptions, telemetry wiring, and teardown there. [Source: `src/rendering/scene/create-world-scene.ts`]
- `create-game-app.ts` already owns restart, replay, retry, typed failure handling, and the `H` shell shortcut. Scene code should surface explicit subscriptions or outcome signals, but app bootstrap should continue to own cached restart orchestration and shell visibility. [Source: `src/app/bootstrap/create-game-app.ts`; `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`]
- The traffic and vehicle stack already produce moving cars with consistent metadata, tuning, and damage state. If responders need a distinct identity, prefer metadata, color, and bounded behavior changes over a parallel vehicle architecture. [Source: `src/traffic/runtime/traffic-system.ts`; `src/traffic/runtime/traffic-vehicle-factory.ts`; `src/vehicles/physics/vehicle-factory.ts`]
- `player-vehicle-controller.ts` is a reasonable seam for raising a quick-restart request because restart input does not exist there yet, but the restart flow itself should still remain app-owned so overlay restart, `Backspace`, and auto-fail all stay on one path. [Source: `src/vehicles/controllers/player-vehicle-controller.ts`; `src/app/bootstrap/create-game-app.ts`]
- `location-entry-screen.ts` keeps the shell overlay present in `world-ready` and focuses the location input whenever editing is active, so `Backspace` guardrails must account for focused UI rather than assuming canvas-only input. [Source: `src/ui/shell/location-entry-screen.ts`]

### Project Context Rules

- No `project-context.md` file was found in the workspace during workflow discovery.
- Use the architecture document, `package.json`, current source structure, current story files, and existing tests as the governing project rules for this story.
- The architecture selected Context7 as the preferred up-to-date documentation source for Babylon.js and Vite work if implementation needs additional external docs. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 3: Living City & Chaos Escalation`
- `_bmad-output/planning-artifacts/gdd.md#Core Gameplay`
- `_bmad-output/planning-artifacts/gdd.md#Win/Loss Conditions`
- `_bmad-output/planning-artifacts/gdd.md#Game Mechanics`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/game-brief.md#Primary Mechanics`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Failure #3`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Controls #6`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Heat #1`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Heat #6`
- `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`
- `_bmad-output/planning-artifacts/game-architecture.md#Event System`
- `_bmad-output/planning-artifacts/game-architecture.md#Configuration`
- `_bmad-output/planning-artifacts/game-architecture.md#Entity Patterns`
- `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`
- `_bmad-output/implementation-artifacts/3-2-encounter-pedestrians.md`
- `_bmad-output/implementation-artifacts/3-3-damage-vehicles-and-break-selected-props.md`
- `_bmad-output/implementation-artifacts/3-4-use-limited-combat-options.md`
- `_bmad-output/implementation-artifacts/3-5-accumulate-danger-through-chaotic-play.md`
- `package.json`
- `public/data/tuning/heavy-truck.json`
- `public/data/tuning/sedan.json`
- `public/data/tuning/sports-car.json`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/state/session-state-machine.ts`
- `src/pedestrians/runtime/pedestrian-system.ts`
- `src/rendering/scene/chaos-scene-runtime.ts`
- `src/rendering/scene/combat-scene-runtime.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/heat-scene-runtime.ts`
- `src/sandbox/heat/heat-runtime.ts`
- `src/sandbox/on-foot/player-possession-runtime.ts`
- `src/sandbox/on-foot/vehicle-interaction-policy.ts`
- `src/traffic/agents/traffic-driving.ts`
- `src/traffic/routing/traffic-route.ts`
- `src/traffic/runtime/traffic-system.ts`
- `src/traffic/runtime/traffic-vehicle-factory.ts`
- `src/ui/hud/world-combat-hud.ts`
- `src/ui/hud/world-heat-hud.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/vehicles/controllers/player-vehicle-controller.ts`
- `src/vehicles/damage/vehicle-damage-policy.ts`
- `src/vehicles/damage/vehicle-damage-system.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-load-failure.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/integration/world-heat-failure.integration.spec.ts`
- `tests/integration/world-heat-hud.integration.spec.ts`
- `tests/integration/world-navigation-hud.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/heat-scene-runtime.smoke.spec.ts`
- `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`
- `tests/smoke/world-scene-possession.smoke.spec.ts`
- `tests/unit/heat-runtime.spec.ts`
- `tests/unit/heat-scene-runtime.spec.ts`
- `tests/unit/player-vehicle-controller.spec.ts`
- `tests/unit/session-state-machine.spec.ts`
- `tests/unit/world-heat-hud.spec.ts`
- `git log -5 --format='%H%x09%s'`
- `git log -5 --stat --format='commit %H%nsubject %s'`
- `npm view @babylonjs/core version`
- `npm view @babylonjs/havok version`
- `npm view vite version`
- `npm view vitest version`
- `npm view @playwright/test version`
- `npm view typescript version`
- `https://github.com/BabylonJS/Babylon.js/releases`
- `https://vite.dev/guide/`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `git log -5 --format='%H%x09%s'`
- `git log -5 --stat --format='commit %H%nsubject %s'`
- `npm view @babylonjs/core version`
- `npm view @babylonjs/havok version`
- `npm view vite version`
- `npm view vitest version`
- `npm view @playwright/test version`
- `npm view typescript version`
- `npx vitest run tests/unit/heat-runtime.spec.ts tests/unit/heat-scene-runtime.spec.ts tests/unit/player-vehicle-controller.spec.ts tests/unit/session-state-machine.spec.ts tests/unit/world-heat-hud.spec.ts`
- `npx vitest run tests/integration/location-entry.integration.spec.ts tests/integration/world-heat-hud.integration.spec.ts tests/integration/world-heat-failure.integration.spec.ts`
- `npx vitest run tests/smoke/heat-scene-runtime.smoke.spec.ts tests/smoke/vehicle-hijack-restart.smoke.spec.ts tests/smoke/app-bootstrap.smoke.spec.ts`
- `npx playwright test tests/smoke/app-bootstrap.pw.spec.ts`
- `npx vitest run tests/unit/heat-runtime.spec.ts tests/unit/heat-scene-runtime.spec.ts`
- `npx vitest run tests/unit/heat-runtime.spec.ts tests/unit/heat-scene-runtime.spec.ts tests/unit/world-heat-hud.spec.ts tests/integration/world-heat-hud.integration.spec.ts`
- `npx vitest run tests/unit/responder-scene-runtime.spec.ts`
- `npx vitest run tests/unit/responder-scene-runtime.spec.ts tests/smoke/heat-scene-runtime.smoke.spec.ts tests/smoke/app-bootstrap.smoke.spec.ts`
- `npx vitest run tests/unit/run-outcome-runtime.spec.ts tests/integration/run-outcome-restart.integration.spec.ts`
- `npx vitest run tests/unit/run-outcome-runtime.spec.ts tests/integration/run-outcome-restart.integration.spec.ts tests/integration/location-entry.integration.spec.ts tests/smoke/app-bootstrap.smoke.spec.ts`
- `npx vitest run tests/unit/world-heat-hud.spec.ts tests/integration/quick-restart.integration.spec.ts`
- `npx vitest run tests/integration/world-heat-hud.integration.spec.ts`
- `npx vitest run tests/unit/quick-restart-shortcut.spec.ts tests/unit/heat-runtime.spec.ts tests/integration/run-outcome-restart.integration.spec.ts tests/smoke/heat-scene-runtime.smoke.spec.ts`
- `npx vitest run tests/unit/heat-runtime.spec.ts tests/unit/responder-scene-runtime.spec.ts tests/unit/run-outcome-runtime.spec.ts tests/unit/quick-restart-shortcut.spec.ts`
- `npm run check`
- `npx vitest run tests/unit/heat-scene-runtime.spec.ts tests/integration/quick-restart.integration.spec.ts tests/integration/run-outcome-restart.integration.spec.ts tests/smoke/heat-scene-runtime.smoke.spec.ts`
- `npm test`
- `npm run build`
- `npm run test:browser`
- `https://github.com/BabylonJS/Babylon.js/releases`
- `https://vite.dev/guide/`

### Implementation Plan

- Extend the existing heat runtime with a dedicated `advance(...)` seam plus centralized pursuit timing constants so dispatch, contact loss, cooldown, clearance, and fail signaling stay in one sandbox-owned source of truth.
- Reuse `createTrafficVehicle`, `traffic-driving`, and `traffic-route` inside a narrow responder scene runtime, while keeping contact classification and spacing rules in sandbox-owned heat policy helpers.
- Add a sandbox-owned run-outcome runtime that distinguishes `BUSTED` from recoverable or unrecoverable wreck states, then feed its typed restart request into one shared cached restart helper in `create-game-app.ts`.
- Publish additive heat and run-outcome telemetry into `scene.metadata`, `canvas.dataset`, and the world-ready heat HUD, then bind `Backspace` to the same cached restart helper with modifier, repeat, and editable-focus guardrails.
- Close the story with unit, integration, smoke, and browser coverage proving pursuit, escape, fail, and restart behavior without regressing restart, replay, possession, hijack, traffic, pedestrian, combat, or heat flows.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Workflow discovery loaded `epics.md`, `gdd.md`, and `game-architecture.md`; no UX artifact and no `project-context.md` artifact were available.
- Story 3.6 should cash in on Story 3.5's future-facing `pursuitPhase` and `escapePhase` fields plus Story 1.5's cached same-slice restart seam instead of inventing parallel wanted or reset flows.
- The current repo has no police, pursuit, busted, or wrecked runtime yet, and `src/sandbox/reset/` does not exist, so this story introduces the first explicit chase and run-outcome gameplay seams.
- Current vehicle content is limited to sedan, sports car, and heavy truck tuning profiles, so first-wave responder identity should reuse that stack instead of waiting on new police-specific assets.
- Validation against the current codebase added missing guardrails for time-based heat advancement, shared restart ownership, typed outcome signaling, focus-safe `Backspace` handling, and late-load cancellation safety.
- Latest stack checks confirmed no story-specific dependency upgrade is required before implementation.
- Task 1 completed: `src/sandbox/heat/heat-runtime.ts` now owns concrete pursuit and escape phases, typed `heat.pursuit.*` and `heat.fail.signaled` events, bounded responder and fail snapshot fields, and a time-based `advance(...)` seam wired through `src/rendering/scene/heat-scene-runtime.ts`.
- Task 1 validation passed with `npx vitest run tests/unit/heat-runtime.spec.ts tests/unit/heat-scene-runtime.spec.ts tests/unit/world-heat-hud.spec.ts tests/integration/world-heat-hud.integration.spec.ts`, `npm run check`, and the full `npm test` suite.
- Task 2 completed: `src/rendering/scene/responder-scene-runtime.ts` now spawns a bounded responder roster through the existing traffic vehicle factory, keeps responder metadata explicit, follows the player with the current traffic route and control helpers, and feeds contact state back into `updateSceneHeat(...)`.
- Task 2 validation passed with `npx vitest run tests/unit/responder-scene-runtime.spec.ts tests/smoke/heat-scene-runtime.smoke.spec.ts tests/smoke/app-bootstrap.smoke.spec.ts`, `npm run check`, and the full `npm test` suite.
- Task 3 completed: `src/sandbox/reset/run-outcome-runtime.ts` now classifies `BUSTED` and recovery-window-based `WRECKED` outcomes, `create-world-scene.ts` surfaces typed `run.outcome.*` scene events, and `create-game-app.ts` routes automatic recovery through the same cached restart helper the overlay already uses.
- Task 3 validation passed with `npx vitest run tests/unit/run-outcome-runtime.spec.ts tests/integration/run-outcome-restart.integration.spec.ts tests/integration/location-entry.integration.spec.ts tests/smoke/app-bootstrap.smoke.spec.ts`, `npm run check`, and the full `npm test` suite.
- Task 4 completed: `src/ui/hud/world-heat-hud.ts` now renders pursuit, escape, responder-count, and run-outcome copy without replacing the existing navigation or combat HUDs, while `create-game-app.ts` adds a focus-safe `Backspace` quick restart that reuses the cached restart helper.
- Task 4 validation passed with `npx vitest run tests/unit/world-heat-hud.spec.ts tests/integration/quick-restart.integration.spec.ts tests/integration/world-heat-hud.integration.spec.ts`, `npm run check`, and the full `npm test` suite.
- Task 5 completed: added unit guardrails for responder scaling and shortcut gating, integration guardrails for auto-restart failure and cancellation, smoke telemetry reset assertions, and browser checks covering `Backspace` restart plus editable-input safety.
- Final validation passed with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.
- Code review fixes corrected responder spawning so first-wave pursuit now materializes from heat level during dispatch instead of stalling at zero responders in the integrated world loop.
- Code review fixes corrected capture timing so `BUSTED` starts counting from first sustained direct pressure, not from the earlier dispatch timestamp.
- Code review fixes let pursuit capture override an active wreck recovery window, and tightened quick-restart editable-focus safety for nested `contenteditable` targets.
- Review validation passed with `npm run check`, `npx vitest run tests/unit/heat-runtime.spec.ts tests/unit/responder-scene-runtime.spec.ts tests/unit/run-outcome-runtime.spec.ts tests/unit/quick-restart-shortcut.spec.ts`, and `npx vitest run tests/unit/heat-scene-runtime.spec.ts tests/integration/quick-restart.integration.spec.ts tests/integration/run-outcome-restart.integration.spec.ts tests/smoke/heat-scene-runtime.smoke.spec.ts`.

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/rendering/scene/heat-scene-runtime.ts`
- `src/rendering/scene/responder-scene-runtime.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/bootstrap/quick-restart-shortcut.ts`
- `src/styles.css`
- `src/sandbox/heat/heat-responder-policy.ts`
- `src/sandbox/heat/heat-pursuit-config.ts`
- `src/sandbox/heat/heat-runtime.ts`
- `src/sandbox/reset/run-outcome-runtime.ts`
- `src/ui/hud/world-heat-hud.ts`
- `src/traffic/runtime/traffic-vehicle-factory.ts`
- `tests/integration/quick-restart.integration.spec.ts`
- `tests/integration/run-outcome-restart.integration.spec.ts`
- `tests/integration/world-heat-hud.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/heat-scene-runtime.smoke.spec.ts`
- `tests/unit/heat-runtime.spec.ts`
- `tests/unit/heat-scene-runtime.spec.ts`
- `tests/unit/quick-restart-shortcut.spec.ts`
- `tests/unit/responder-scene-runtime.spec.ts`
- `tests/unit/run-outcome-runtime.spec.ts`
- `tests/unit/world-heat-hud.spec.ts`

### Change Log

- 2026-04-09: Created the story context for Story 3.6 and set status to `ready-for-dev`.
- 2026-04-10: Revalidated the story against current code, tests, git history, and package versions; tightened pursuit, restart, input-safety, and failure guardrails; and synced sprint tracking to `ready-for-dev`.
- 2026-04-10: Implemented first-wave pursuit state, bounded responder pressure, typed `BUSTED` and `WRECKED` outcomes, shared automatic and manual restart wiring, additive HUD and telemetry updates, and final guardrail coverage including browser restart checks.
- 2026-04-10: Completed code review remediation by fixing responder spawn integration, direct-contact capture timing, `BUSTED` precedence over wreck recovery, nested editable quick-restart safety, the missing responder regression coverage, and the ignored-story File List discrepancy; then marked the story `done` and resynced sprint tracking.

## Senior Developer Review (AI)

### Reviewer

Chris

### Date

2026-04-10T18:30:00-07:00

### Outcome

Approve

### Summary

- Verified the Story 3.6 acceptance criteria against the implementation files and review-time git state.
- Fixed the integrated responder bootstrap so pursuit now produces an actual bounded roster, corrected direct-contact capture timing and `BUSTED` precedence, and tightened nested editable shortcut safety.
- Added focused regression coverage for responder scaling from heat level, sustained-contact capture timing, recovery-window capture override, and nested `contenteditable` shortcut blocking, corrected the ignored-story File List claim, and reran typecheck plus targeted unit, integration, and smoke suites successfully.

### Findings Addressed

- [fixed][CRITICAL] The integrated world loop could stall pursuit at zero responders because the responder runtime trusted a stale pre-advance responder count instead of the heat-level roster target.
- [fixed][HIGH] Capture timing incorrectly started from pursuit dispatch instead of the first sustained direct-contact frame, allowing premature `BUSTED` outcomes.
- [fixed][HIGH] `BUSTED` could not override an active wreck recovery window, causing capture outcomes to resolve to `WRECKED` in the wrong order.
- [fixed][HIGH] The File List no longer claims the ignored story artifact as a git-visible changed file.
- [fixed][MEDIUM] Quick restart could still fire while typing inside nested markup within a `contenteditable` region because only the direct event target was checked.
- [fixed][MEDIUM] Review coverage missed the responder bootstrap regression path; responder tests now cover heat-level-driven spawning before the first live responder count is reported.
