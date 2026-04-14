# Story 1.5: Restart from Spawn in the Same Location

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to restart from spawn in the same location,
so that I can quickly retry the sandbox loop.

## Acceptance Criteria

1. Given the player has already reached `world-ready` in a chosen location, when the lightweight shell overlay is visible, then it offers a minimal non-blocking `Restart from spawn` control that keeps the Babylon world as the primary viewport.
2. Given the player activates `Restart from spawn`, when the restart begins, then the app reuses the current `sessionIdentity`, `handoff`, `SliceManifest`, and `spawnCandidate` for that same location without asking for location re-entry and without calling `resolver.resolve()` again.
3. Given the restart uses existing static slice data, when the new run becomes ready, then the `sliceId`, `reuseKey`, resolved place identity, existing handoff contract, world bounds, road layout, and spawn plan remain stable while runtime-only scene state is replaced cleanly and the player returns to a controllable starter vehicle at the original spawn.
4. Given restart is requested while the current world is active, when the reload begins, then the previous world scene is disposed safely, render-host and shell ownership stay intact, and stale async completions cannot resurrect the old world or attach duplicate scenes.
5. Given the restarted scene cannot become playable for a recoverable reason, when scene bootstrap or starter-vehicle setup fails, then the app preserves the same location and cached slice context, emits typed structured failure details, and still offers retry or edit without forcing location re-entry.
6. Given restart succeeds, when `world.scene.ready` fires again, then readiness timing and logs still measure the `controllable-vehicle` milestone for the restarted run and the flow remains driven by explicit typed contracts rather than ad hoc flags or hidden reset state.
7. Given deterministic tests and supported desktop browsers remain part of the product promise, when this story is validated, then automated coverage proves same-location restart reuses existing manifest and spawn data, preserves edit and retry behavior, and does not call either `resolver.resolve()` or `sliceGenerator.generate()` for the restart path.

## Tasks / Subtasks

- [x] Task 1: Add an explicit same-location restart path to the app orchestration and shell flow (AC: 1, 2, 4, 6)
  - [x] Add the smallest explicit restart intent needed in `src/app/state/session-state-machine.ts` and any typed event contracts so restart is modeled as a first-class flow rather than hidden boolean state.
  - [x] Extend `src/ui/shell/location-entry-screen.ts` with a minimal `Restart from spawn` control that is available in `world-ready` without replacing the current lightweight overlay pattern.
  - [x] Wire restart handling in `src/app/bootstrap/create-game-app.ts` so it preserves the current location context and continues to honor `activeLoadId` cancellation semantics.
- [x] Task 2: Reuse the existing static slice and spawn contracts instead of regenerating the world (AC: 2, 3, 6)
  - [x] Refactor the world-load orchestration so the app can reload a scene from an existing `SliceManifest` and `spawnCandidate` without calling `resolver.resolve()` or `sliceGenerator.generate()` again.
  - [x] Keep `sessionIdentity`, `handoff`, `sliceManifest`, and `spawnCandidate` stable across restart while recreating only runtime scene state; do not invent a second restart-only identity model unless a real contract gap appears.
  - [x] Prefer the current `SessionState` values as the restart source of truth; only use the generator-owned manifest-store lookup seam if the active session snapshot cannot supply the cached manifest cleanly.
  - [x] Keep the restarted run aligned to the original spawn contract so the player returns to the same starter-vehicle placement and heading inside the same geography.
- [x] Task 3: Preserve recoverable failure, retry, and edit behavior through restart (AC: 4, 5, 6)
  - [x] Keep manual `Restart from spawn` distinct from recoverable `Retry load`; do not silently reuse the error-only retry semantics if they make the state machine or UI contract ambiguous.
  - [x] Route restart failures through the existing typed `world.load.failed` model and keep `Retry load` and `Edit location` anchored to the current resolved place and cached slice context.
  - [x] Ensure restart teardown does not leak duplicate Babylon scenes, controllers, or stale completion handlers into the active session.
  - [x] Keep `world.scene.ready` timing and structured logs aligned to the `controllable-vehicle` milestone after restart just as they are for the first successful load.
- [x] Task 4: Add automated coverage for restart-from-spawn in the same location (AC: 7)
  - [x] Add unit coverage for the new restart state transition and any helper logic that distinguishes cached-manifest restart from fresh generation while preserving the existing location contracts.
  - [x] Add integration coverage proving restart is available from `world-ready`, reuses the existing manifest and spawn candidate, preserves location identity, and avoids both extra resolve calls and extra generator calls.
  - [x] Add observable teardown coverage so restart disposes the previous world scene, does not leave duplicate canvases or duplicate `world.scene.ready` emissions behind, and still protects against stale async completions.
  - [x] Add recoverable failure coverage so restart preserves the same location and cached slice context even when the replacement scene fails again.
  - [x] Update smoke and browser coverage so the app proves it can reach `world-ready`, restart from spawn in the same location, and return to a controllable vehicle again.
  - [x] Run `npm test`, `npm run check`, `npm run build`, and `npm run test:browser`.

## Dev Notes

- Story 1.5 closes Epic 1's basic retry loop. The player already has location selection, deterministic slice generation, direct starter-vehicle possession, and a readable chase camera. This story should add a fast same-location restart seam by reusing those existing outputs rather than inventing a new loading flow. [Source: `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Scope" and "Epic 1: Stories"; `_bmad-output/planning-artifacts/gdd.md`, "Core Gameplay Loop" and "Failure Recovery"]
- The GDD explicitly says failure should restart the player from the spawn point within the same chosen location instead of forcing a full location-selection flow again. Use that as the core product rule for this story. [Source: `_bmad-output/planning-artifacts/gdd.md`, "Failure Recovery"]
- Scope boundary: implement one same-location restart path only. Do not absorb save systems, alternate spawn selection, checkpoint networks, vehicle switching, on-foot recovery, or later living-session systems beyond what is needed to prove the restart loop. [Source: `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Stories" and "Epic 2: Stories"; `_bmad-output/implementation-artifacts/1-3-spawn-directly-into-a-car.md`, "Dev Notes"]
- No dedicated UX planning artifact exists. Keep the player-facing experience browser-native, low-friction, and non-blocking, with the Babylon world staying visible behind a lightweight shell overlay. [Source: workflow discovery results; `src/ui/shell/location-entry-screen.ts`; `_bmad-output/planning-artifacts/gdd.md`, "Browser-first access" and "Core Gameplay Loop"]

### Technical Requirements

- Start from the current app-level orchestration in `src/app/bootstrap/create-game-app.ts`. The existing success path is resolve location -> create handoff -> generate manifest -> load scene -> emit `world.scene.ready`. Story 1.5 should extend that orchestration with an explicit restart path rather than bypassing it. [Source: `src/app/bootstrap/create-game-app.ts`]
- The current `SessionState` already holds the exact static data a restart needs: `sessionIdentity`, `handoff`, `sliceManifest`, and `spawnCandidate`. Reuse or extend those typed contracts instead of creating parallel scene-only or UI-only restart state. [Source: `src/app/state/session-state-machine.ts`]
- Most important implementation rule: restart = reuse the cached `sessionIdentity`, `handoff`, `sliceManifest`, and `spawnCandidate`, then dispose and reload runtime scene state. Do not call `resolver.resolve()` or `sliceGenerator.generate()` again for the happy-path restart flow. [Source: `src/app/bootstrap/create-game-app.ts`; `src/app/state/session-state-machine.ts`; `_bmad-output/planning-artifacts/gdd.md`, "Failure Recovery"]
- If the restart path needs a cached manifest lookup beyond the active session snapshot, use the existing generator-owned manifest-store seam (`getStoredManifestByReuseKey()` / `SliceManifestStore.getByReuseKey()`) instead of inventing a second static-slice cache. [Source: `src/world/generation/world-slice-generator.ts`; `src/world/generation/slice-manifest-store.ts`]
- The current scene loader already accepts `{ renderHost, manifest, spawnCandidate }`. Prefer a coarse-grained scene teardown and reload from that seam over inventing new in-place vehicle, camera, or controller reset APIs unless a real limitation is discovered. [Source: `src/rendering/scene/create-world-scene.ts`; `src/app/bootstrap/create-game-app.ts`]
- Preserve the existing `activeLoadId` cancellation pattern. Restart must be safe against Edit or other abandoned async work so stale completions cannot reattach a world scene after the player has moved on. [Source: `src/app/bootstrap/create-game-app.ts`; `tests/integration/location-entry.integration.spec.ts`]
- Keep the resolved location contracts stable across restart. If the app needs a restart-specific typed event or phase, it should describe runtime teardown and reload only, not a new location-resolution or generation request. [Source: `src/app/state/session-state-machine.ts`; `_bmad-output/planning-artifacts/game-architecture.md`, "Stable City / Living Session"]
- Keep `world.scene.ready` tied to the `controllable-vehicle` milestone after restart, just as it is for the first successful load. Do not lower the success contract to a scene-only milestone. [Source: `src/app/bootstrap/create-game-app.ts`; `_bmad-output/implementation-artifacts/1-3-spawn-directly-into-a-car.md`, "Acceptance Criteria"]

### Architecture Compliance

- `src/app/` should orchestrate restart flow, state transitions, event emission, logging, and render-host lifecycle only. It must not absorb vehicle simulation, camera rules, or direct physics logic. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping" and "Architectural Boundaries"]
- Keep static slice data separate from dynamic run state. This story is the architecture's first explicit use of the "stable city / living session" rule: preserve the static slice and replace only runtime state for the new attempt. [Source: `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Stable City / Living Session" and "Consistency Rules"]
- `src/rendering/` should continue to consume manifest and vehicle state to build the world view. Do not move spawn or restart truth into Babylon node state alone. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Architectural Boundaries"]
- Cross-domain communication must remain explicit and typed. If restart needs a new top-level event or state transition, model it directly; do not hide it behind ad hoc booleans or implicit side effects. [Source: `_bmad-output/project-context.md`, "Engine-Specific Rules" and "Critical Don't-Miss Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Event System" and "State Patterns"]
- Keep the existing world-root plus chunk-subtree scene model. Restart should replace the active runtime scene cleanly without flattening the scene graph or introducing a monolithic alternate bootstrap path. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Scene Structure" and "Consistency Rules"]

### Library / Framework Requirements

- Stay on the repo's selected stack for this story: Babylon.js `9.1.0`, `@babylonjs/havok` `1.3.12`, Vite `8.0.5`, TypeScript, and desktop-browser execution. Do not introduce another engine, physics backend, bundler, or UI framework for restart work. [Source: `package.json`; `_bmad-output/project-context.md`, "Technology Stack & Versions"; `_bmad-output/planning-artifacts/game-architecture.md`, "Verified Technology Versions"]
- Keep any new app or test modules direct and explicit. Current Vite guidance still favors minimal plugin overhead and straightforward import structure over extra abstraction layers. [Source: `https://vite.dev/guide/performance`]
- Use Context7 for current Babylon.js or Vite docs lookup if deeper library specifics are needed during implementation. [Source: `_bmad-output/project-context.md`, "Technology Stack & Versions"; `_bmad-output/planning-artifacts/game-architecture.md`, "AI Tooling (MCP Servers)"]

### File Structure Requirements

- The most likely primary implementation seams are:
  - `src/app/bootstrap/create-game-app.ts`
  - `src/app/state/session-state-machine.ts`
  - `src/ui/shell/location-entry-screen.ts`
  - `src/app/events/game-events.ts` (only if a typed restart event is needed)
  - `src/rendering/scene/create-world-scene.ts` (only if the existing scene-load contract proves insufficient)
  - `src/vehicles/physics/create-starter-vehicle.ts` (only if the current runtime does not reset cleanly after scene reload)
  - `src/vehicles/controllers/player-vehicle-controller.ts` (only if restart reveals duplicated input binding or controller-lifecycle issues)
  - `src/vehicles/cameras/create-starter-vehicle-camera.ts` (only if camera runtime state leaks across restart attempts)
  [Source: current repository structure; `src/app/bootstrap/create-game-app.ts`; `src/app/state/session-state-machine.ts`; `src/ui/shell/location-entry-screen.ts`; `src/app/events/game-events.ts`; `src/rendering/scene/create-world-scene.ts`]
- Prefer not to expand `src/world/generation/world-slice-generator.ts` for restart unless a real manifest lookup gap appears. The minimal path is to reuse the current session's `sliceManifest` and `spawnCandidate` instead of regenerating the world. [Source: `src/app/state/session-state-machine.ts`; `src/world/generation/world-slice-generator.ts`]
- Prefer not to expand `WorldSceneHandle` or `StarterVehicleRuntime` with bespoke respawn methods unless the app-level scene reload path cannot satisfy the story cleanly. This story should favor the smallest correct change. [Source: `src/rendering/scene/create-world-scene.ts`; `src/vehicles/physics/create-starter-vehicle.ts`; current repository patterns]
- Extend the existing test seams first:
  - `tests/unit/session-state-machine.spec.ts`
  - `tests/integration/location-entry.integration.spec.ts`
  - `tests/integration/world-slice-loading.integration.spec.ts` if manifest reuse needs explicit coverage
  - `tests/smoke/app-bootstrap.smoke.spec.ts`
  - `tests/smoke/app-bootstrap.pw.spec.ts`
  [Source: current repository structure; existing test files]
- Follow naming standards exactly: `kebab-case` for modules, `PascalCase` for types and classes, `camelCase` for functions and variables, `UPPER_SNAKE_CASE` for constants, and `domain.action` for event names. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Naming Conventions"]

### Testing Requirements

- Add integration coverage proving a world-ready session can restart from spawn in the same location without re-entering the location and without calling either `resolver.resolve()` or `sliceGenerator.generate()` again. Track both call counts explicitly so the happy-path contract is tested, not assumed. [Source: `tests/integration/location-entry.integration.spec.ts`; `tests/integration/world-slice-loading.integration.spec.ts`; `_bmad-output/planning-artifacts/gdd.md`, "Failure Recovery"]
- Add observable teardown coverage proving restart disposes the previous `WorldSceneHandle`, leaves only one active world scene or canvas behind, and does not emit duplicate `world.scene.ready` events after repeated restart clicks. [Source: `src/app/bootstrap/create-game-app.ts`; `tests/integration/location-entry.integration.spec.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]
- Add unit coverage for the new restart transition so it preserves `sessionIdentity`, `handoff`, `sliceManifest`, and `spawnCandidate` while moving through an explicit restart-safe phase. [Source: `tests/unit/session-state-machine.spec.ts`; `_bmad-output/project-context.md`, "Testing Rules"]
- Add failure-path coverage proving restart keeps the same place name, cached manifest, and spawn contract available if scene reload or starter-vehicle setup fails again. [Source: `tests/integration/location-entry.integration.spec.ts`; `src/world/generation/world-load-failure.ts`]
- Add stale-async coverage so Edit or other abandonment during a delayed restart cannot emit ready or resurrect the old scene after the active session has changed. Reuse the existing cancellation test style. [Source: `tests/integration/location-entry.integration.spec.ts`; `src/app/bootstrap/create-game-app.ts`]
- If runtime vehicle, camera, or controller seams are touched, add assertions that restart does not leave duplicate input or camera side effects behind after the replacement scene becomes ready. [Source: `src/vehicles/controllers/player-vehicle-controller.ts`; `src/vehicles/cameras/create-starter-vehicle-camera.ts`; `_bmad-output/implementation-artifacts/1-4-drive-with-a-readable-third-person-camera.md`]
- Update smoke and browser coverage so the core path proves: submit location -> reach `world-ready` -> restart from spawn -> reach `world-ready` again with a controllable vehicle. Keep Chromium, Firefox, and WebKit coverage intact. [Source: `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`; `_bmad-output/project-context.md`, "Platform & Build Rules"]
- Run `npm test`, `npm run check`, `npm run build`, and `npm run test:browser` as the expected verification commands. [Source: `package.json`; current story validation patterns in `_bmad-output/implementation-artifacts/1-3-spawn-directly-into-a-car.md`]

### Previous Story Intelligence

- Story 1.2 deliberately separated static slice data from dynamic runtime state because later restart and replay stories would depend on stable geography and replaceable run state. Story 1.5 should cash in on that architecture instead of bypassing it. [Source: `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "Acceptance Criteria", "Technical Requirements", and "Completion Notes List"]
- Story 1.3 established direct starter-vehicle possession, typed recoverable spawn and possession failures, the `controllable-vehicle` readiness milestone, and preservation of location and slice context on failure. Story 1.5 should extend those exact seams for manual restart. [Source: `_bmad-output/implementation-artifacts/1-3-spawn-directly-into-a-car.md`, "Acceptance Criteria", "Technical Requirements", and "Completion Notes List"]
- Story 1.4 kept camera logic scene-based and runtime-only, including free-look, reverse-camera state, and source-aware input handling. Restart should therefore recreate or reset runtime scene state cleanly rather than storing camera or controller state inside the static manifest or other persistent contracts. [Source: `_bmad-output/implementation-artifacts/1-4-drive-with-a-readable-third-person-camera.md`, "Technical Requirements", "Architecture Compliance", and "Completion Notes List"]
- Existing cancellation coverage already protects against late resolve or late scene-load completions after Edit. Do not regress that safety while adding restart flow. [Source: `tests/integration/location-entry.integration.spec.ts`; `_bmad-output/implementation-artifacts/1-3-spawn-directly-into-a-car.md`, "Testing Requirements"]

### Git Intelligence Summary

- Recent commit titles are `Fix third-person camera readability`, `Add starter vehicle, camera, and driving controls`, `Add generated playable slice loading flow`, and `Add initial project scaffold for GitHub collaboration`. If the dev agent later commits Story 1.5, follow the same plain-English, imperative, capitalized style. [Source: local `git log --oneline -5`]
- Recent work continues to favor small typed contracts, explicit orchestration, and behavior-first tests instead of broad abstractions. Story 1.5 should fit that style rather than introducing a generic reset framework too early. [Source: local `git log -5 --name-only --format='%h %s'`; current `src/` and `tests/` structure]

### Latest Technical Information

- Latest stable package checks still align with the repo's chosen stack for this story: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and Vite latest `8.0.7` while the repo remains pinned to `8.0.5`. No upgrade work is required for restart behavior; stay on the pinned stack unless a concrete issue appears. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `https://registry.npmjs.org/@babylonjs/havok/latest`; `https://registry.npmjs.org/vite/latest`; `package.json`]
- Current Vite package metadata still requires Node `^20.19.0 || >=22.12.0`, which matches the repo's documented runtime requirement. Keep any new verification or browser test work aligned with that baseline. [Source: `https://registry.npmjs.org/vite/latest`; `_bmad-output/project-context.md`, "Technology Stack & Versions"]

### Project Structure Notes

- Most important implementation rule: restart = reuse cached manifest and spawn data, then dispose and reload runtime scene state. Do not add bespoke respawn APIs or a parallel reset domain unless the existing scene-load seam proves insufficient. [Source: `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/create-world-scene.ts`; `src/app/state/session-state-machine.ts`]
- The current restart-friendly seams already exist under `src/app/`, `src/ui/shell/`, `src/world/generation/`, `src/rendering/scene/`, `src/vehicles/`, and the matching `tests/` folders. Extend those seams instead of creating a parallel gameplay-reset domain this early in the project. [Source: current repository structure; `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping"]
- `src/world/generation/slice-manifest-store.ts` already caches manifests by `reuseKey`, which fits the same-location requirement, but the active session snapshot should stay the first-choice restart source while the player remains in the current run. [Source: `src/world/generation/slice-manifest-store.ts`; `src/world/generation/world-slice-generator.ts`; `src/app/state/session-state-machine.ts`]
- Keep the shell as the minimal player-facing overlay and keep the Babylon render host owning the world canvas. Restart must not let shell rerenders reclaim canvas lifecycle ownership. [Source: `src/app/bootstrap/create-game-app.ts`; `src/ui/shell/location-entry-screen.ts`; `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture"]

### Project Context Rules

- Use Babylon.js `9.1.0`, Havok `1.3.12`, Vite `8.0.5`, TypeScript, and desktop browsers with WebGL2 support as the enforced baseline stack. [Source: `_bmad-output/project-context.md`, "Technology Stack & Versions"]
- Treat Babylon's scene graph as a rendering/composition layer, not gameplay truth. Restart logic should operate through typed state and contracts, not through hidden mesh state alone. [Source: `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- Keep gameplay simulation aligned with the architecture's `60 Hz` fixed-step direction; do not drive core game state directly from render delta. [Source: `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- Prefer constructor injection inside a domain and typed events across domains instead of ad hoc global access. [Source: `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- Design for stable `60 FPS`, avoid per-frame allocations in hot loops, and do not drift toward preload-all world assumptions. [Source: `_bmad-output/project-context.md`, "Performance Rules"]
- Keep domain logic in the owning folders, let `src/app/` orchestrate, let `src/rendering/` display, and keep runtime-loaded assets or data under `public/` only. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"]
- Keep tests in the standard `tests/` folders and prefer deterministic seeds, stable fixtures, and helper-driven setup. [Source: `_bmad-output/project-context.md`, "Testing Rules"]
- Keep keyboard, mouse, and gamepad support first-class, and do not optimize first for native desktop, console, or mobile. [Source: `_bmad-output/project-context.md`, "Platform & Build Rules"]
- Do not bypass the world-slice generation pipeline for new slice creation, do not mix static slice state with dynamic session state, and do not introduce a second physics stack or direct storage calls from gameplay domains. For Story 1.5 specifically, that means reusing the existing slice and replacing only runtime state on restart. [Source: `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"]

### References

- `_bmad-output/planning-artifacts/epics.md`, "Epic 1: World Slice & Core Driving"
- `_bmad-output/planning-artifacts/gdd.md`, "Core Gameplay Loop"
- `_bmad-output/planning-artifacts/gdd.md`, "Failure Recovery"
- `_bmad-output/planning-artifacts/gdd.md`, "Technical Specifications"
- `_bmad-output/planning-artifacts/gdd.md`, "Success Metrics"
- `_bmad-output/planning-artifacts/game-architecture.md`, "State Management"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Stable City / Living Session"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Scene Structure"
- `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Architectural Boundaries"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Event System"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Consistency Rules"
- `_bmad-output/project-context.md`, "Technology Stack & Versions"
- `_bmad-output/project-context.md`, "Engine-Specific Rules"
- `_bmad-output/project-context.md`, "Performance Rules"
- `_bmad-output/project-context.md`, "Code Organization Rules"
- `_bmad-output/project-context.md`, "Testing Rules"
- `_bmad-output/project-context.md`, "Platform & Build Rules"
- `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"
- `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`
- `_bmad-output/implementation-artifacts/1-3-spawn-directly-into-a-car.md`
- `_bmad-output/implementation-artifacts/1-4-drive-with-a-readable-third-person-camera.md`
- `package.json`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/app/state/session-state-machine.ts`
- `src/app/config/session-config.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/location-resolver.ts`
- `src/world/generation/slice-manifest-store.ts`
- `src/world/generation/world-load-failure.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/rendering/scene/create-world-scene.ts`
- `tests/unit/session-state-machine.spec.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- local `git log --oneline -5`
- local `git log -5 --name-only --format='%h %s'`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/vite/latest`
- `https://vite.dev/guide/performance`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test -- --run tests/unit/session-state-machine.spec.ts tests/integration/location-entry.integration.spec.ts`
- `npm test -- --run tests/integration/location-entry.integration.spec.ts`
- `npm test -- --run tests/unit/session-state-machine.spec.ts tests/integration/location-entry.integration.spec.ts`
- `npm test -- --run tests/integration/location-entry.integration.spec.ts tests/smoke/app-bootstrap.smoke.spec.ts`
- `npm test`
- `npm run check`
- `npm run build`
- `npm run test:browser`

### Implementation Plan

- Add an explicit `world.restart.requested` session event and restart-safe phase transition that preserves the active location, handoff, manifest, and spawn candidate instead of re-entering location selection.
- Extend the lightweight shell overlay with a `Restart from spawn` action that appears only when the current world is ready and keeps the Babylon render host as the primary viewport.
- Wire restart handling through `create-game-app.ts` so it reuses the active session handoff, avoids a second resolver call, and keeps `activeLoadId` cancellation ownership with the app orchestrator.
- Refactor world loading so fresh submissions still generate from `handoff`, while same-location restart reloads from the current session snapshot's `sliceManifest` and `spawnCandidate` instead of calling `sliceGenerator.generate()` again.
- Keep the restart source of truth in `SessionState`, with the manifest-store reuse-key seam held in reserve only if the active session snapshot cannot supply the cached static slice cleanly.
- Route recoverable scene/bootstrap failures back through the existing typed `world.load.failed` state while making `Retry load` prefer the current cached manifest and spawn contract instead of silently regenerating a new slice.
- Reuse the same cached-load path for restart teardown and retry so stale completions still obey `activeLoadId` ownership and cannot resurrect abandoned world scenes after Edit.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added an explicit `world.restart.requested` session event plus a `world-restarting` phase so same-location restart is modeled as a first-class app flow rather than implicit retry state.
- Extended the lightweight shell overlay with a non-blocking `Restart from spawn` control that only appears in `world-ready` and keeps the Babylon render host as the primary viewport.
- Wired restart handling through `create-game-app.ts` to reuse the active handoff without calling `resolver.resolve()` again while preserving the current location context and `activeLoadId` ownership.
- Added unit and integration coverage for the restart transition and world-ready restart control, then verified the wider app with `npm test` and `npm run check`.
- Refactored the bootstrap flow to separate fresh generation from cached restart loading, so same-location restart now reloads the scene from the current session's `sliceManifest` and `spawnCandidate` instead of regenerating the world.
- Kept the current `SessionState` snapshot as the restart source of truth and added a minimal manifest-store fallback by `reuseKey` only for unexpected cached-data gaps.
- Added restart coverage that proves the second load reuses the original manifest and spawn contract while keeping both resolver and generator call counts stable across restart.
- Kept manual `Restart from spawn` separate from recoverable `Retry load` while teaching `Retry load` to reuse cached manifest and spawn data whenever a recoverable world-load failure already has valid slice context.
- Updated the session-state retry transition so cached scene/bootstrap retries move directly back into a loading phase instead of pretending a fresh generation pass is required.
- Preserved the existing typed `world.load.failed` and `world.scene.ready` contracts, so recoverable failures keep the same place and slice context while readiness timing and logs continue to report the `controllable-vehicle` milestone.
- Added restart-specific teardown, repeated-ready, stale-async, and restart-failure integration coverage plus smoke and Playwright proof that the app can reach `world-ready`, restart, and return to a controllable vehicle again.
- Relaxed the browser smoke camera-class assertion to the runtime telemetry contract (`/Camera$/`) so the cross-browser restart flow is validated against the current Babylon camera implementation instead of an outdated class name assumption.
- Verified the story with `npm test`, `npm run check`, `npm run build`, and `npm run test:browser`; all commands passed, and Playwright reported six passing smoke tests across Chromium, Firefox, and WebKit.
- Definition-of-done validation passed with all story tasks checked, story status set to `review`, and sprint tracking updated to `review` for `1-5-restart-from-spawn-in-the-same-location`.

### Change Log

- 2026-04-07: Implemented Task 1 explicit restart intent, world-ready restart control, and app-level restart orchestration without re-resolving the location.
- 2026-04-07: Implemented Task 2 cached-manifest restart loading so same-location restart reuses the original slice and spawn contract without regenerating the world.
- 2026-04-07: Implemented Task 3 cached retry behavior so recoverable world-load failures stay anchored to the existing place, manifest, and spawn contract instead of regenerating new slice data.
- 2026-04-07: Implemented Task 4 restart-specific unit, integration, smoke, and browser coverage and completed full story verification through build and cross-browser Playwright checks.

### File List

- `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/state/session-state-machine.ts`
- `src/ui/shell/location-entry-screen.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/unit/session-state-machine.spec.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
