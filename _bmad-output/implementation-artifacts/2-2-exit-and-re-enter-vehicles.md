# Story 2.2: Exit and Re-enter Vehicles

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can exit and re-enter vehicles,
so that on-foot moments support the sandbox loop.

## Acceptance Criteria

1. Given the player is controlling the active vehicle in a loaded sandbox session, when they press `E` while the vehicle is stopped or below a safe exit threshold, then control transfers to a lightweight on-foot avatar placed beside the vehicle at a valid in-bounds position on the current slice.
2. Given the player is on foot after exiting, when they move and look around, then on-foot control and camera are responsive and readable, vehicle driving input no longer affects the car, and the exited vehicle remains present as a re-enterable world object.
3. Given the player is on foot near their exited vehicle, when they press `E` within re-entry range of the exact stored vehicle runtime they just left, then control, camera, and possession transfer back into that same vehicle without reloading the world or breaking session continuity.
4. Given the player requests exit or re-entry from an invalid state, when no driver-side, passenger-side, or rear fallback exit position passes grounding and clearance checks or no valid stored re-entry target exists, then the request is denied or safely recovered without spawning inside geometry, outside slice bounds, or into unsupported vehicles.
5. Given this story only covers exiting and re-entering the player-owned vehicle, when on-foot interaction runs, then it only checks the exact vehicle runtime stored at exit time; no generic nearest-vehicle scan, hijack path, or NPC vehicle-steal flow is introduced here.
6. Given the player restarts from spawn after exiting or re-entering, when the same-location restart completes, then the session returns to the current starter-vehicle-ready baseline in the same slice and clears any parked exited vehicle, on-foot actor, re-entry handle, and camera-mode state from the previous run.
7. Given the feature is implemented, when repo validation runs, then unit, integration, smoke, typecheck, and build checks confirm possession transfer, shared input ownership, deterministic safe placement, camera swap, and restart compatibility.

## Tasks / Subtasks

- [x] Task 1: Add a world-runtime possession flow for vehicle vs on-foot control (AC: 1, 2, 3, 4, 5)
  - [x] Keep gameplay possession state inside the world runtime, not `src/app/state/session-state-machine.ts`.
  - [x] Add an explicit enter/exit request path for `E`, while preserving `Tab` for vehicle switching and keeping unsupported interactions as no-ops.
  - [x] Add a world-level per-frame input snapshot or equivalent ownership rule so consumptive look and interaction requests are read exactly once per frame and then shared safely across the active controller and camera.
  - [x] Keep `world.scene.ready` readiness semantics anchored to the existing controllable-vehicle baseline.
- [x] Task 2: Implement a minimal on-foot runtime and safe exit placement (AC: 1, 2, 4)
  - [x] Add a lightweight on-foot actor with functional movement only; no combat, jump, deep character systems, or hijack behavior.
  - [x] Compute a deterministic safe exit position beside the active vehicle using a driver-side -> passenger-side -> rear fallback order, then ground and clearance validation against current slice geometry.
  - [x] Gate exit to a stopped or low-speed vehicle so this story does not expand into moving-vehicle stunt exits.
- [x] Task 3: Implement re-entry and camera handoff for the exited vehicle only (AC: 2, 3, 4, 5)
  - [x] Keep the exited vehicle persistent in the scene, store its exact runtime identity at exit time, and only allow re-entry against that stored handle in Story 2.2.
  - [x] Switch between vehicle and on-foot camera ownership at the world runtime layer rather than overloading the existing chase camera.
  - [x] Restore driving possession without despawning or reloading the world.
- [x] Task 4: Preserve session reset and runtime contracts (AC: 4, 6)
  - [x] Ensure same-location restart still returns to the starter vehicle in the current slice.
  - [x] Clear any exited-vehicle parking state, on-foot runtime, stored re-entry identity, and camera-mode state before the restarted scene reports ready.
  - [x] Extend typed world/runtime error handling only if new setup-time failures are introduced.
  - [x] Keep scene metadata and canvas test hooks aligned with existing smoke and integration expectations.
- [x] Task 5: Add automated coverage and validation (AC: 7)
  - [x] Add unit tests for possession state, shared input ownership, exit placement fallback order, invalid interaction gating, and controller mode changes.
  - [x] Add Babylon `NullEngine` integration coverage for exit -> on-foot -> re-enter camera and control transfer.
  - [x] Add at least one smoke-level assertion that the scene still reports `readinessMilestone: "controllable-vehicle"`, restart remains valid, and any new possession indicator stays coherent across exit and re-entry.
  - [x] Re-run `npm run check`, `npm test`, and `npm run build` before marking the story ready for review.

## Dev Notes

- Epic 2 expands the driving slice into a richer exploration sandbox. Story 2.2 is the first on-foot bridge story, so it should keep the player vehicle at the center of the experience rather than turning this into a standalone character-movement feature.
- No dedicated UX artifact or `project-context.md` was found. Use the GDD, architecture, and established repo patterns as the controlling guidance for this story.

### Technical Requirements

- Use `E` as the keyboard enter/exit interaction key for this story. Keep `Tab` reserved for vehicle switching from Story 2.1.
- Keep the implementation scoped to exiting and re-entering the same player-owned vehicle. Store the exact runtime identity the player exited and only allow re-entry against that stored handle. Do not add generic nearest-vehicle interaction, hijacking, entering arbitrary parked cars, NPC drivers, or takeover logic in this story.
- Keep on-foot movement intentionally lightweight and vehicle-centric. The player should be able to reposition, face the car, and get back in; they do not need a deep moveset.
- Current vehicle runtimes call `controller.getState()` every frame and directly set linear and angular velocity. If the vehicle controller is merely unbound, the vehicle will effectively receive zero input every frame. Exit flow must decide this behavior deliberately instead of relying on accidental force-stopping.
- Current input APIs are consumptive in important places: mouse-look is zeroed after read and one-shot interaction requests are consumed. If this story introduces an on-foot controller and on-foot camera, add a shared per-frame input snapshot or another explicit ownership rule so consumptive input is not double-read or lost during possession swaps.
- Prefer an explicit parked or safe-idle state when the player exits the vehicle. Do not attempt high-speed stunt exits, ragdolls, or moving-car chase behavior here.
- Make exit placement deterministic and testable. Preferred fallback order: driver-side offset, then passenger-side offset, then rear offset, then fail closed if grounding or clearance checks still fail.
- If gamepad enter/exit parity is added during implementation, route it through the same interaction request path as keyboard input instead of creating a separate gameplay path.

### Architecture Compliance

- Keep top-level loading and shell phases in `src/app/state/session-state-machine.ts` unchanged. On-foot vs in-vehicle mode is world-runtime state, not app-session state. [Source: `src/app/state/session-state-machine.ts`; `_bmad-output/planning-artifacts/game-architecture.md#State Management`]
- Keep dynamic player entities under the runtime world root. Do not attach player-owned on-foot entities to static chunk geometry or encode them into `SliceManifest`. [Source: `src/rendering/scene/create-world-scene.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Scene Structure`]
- Do not move enter/exit orchestration into `src/vehicles/physics/vehicle-factory.ts` or `src/vehicles/physics/vehicle-manager.ts`. Those files should stay focused on vehicle creation, switching, and vehicle runtime ownership.
- If you add gameplay events, keep them narrow and typed with `domain.action` naming such as `player.exited_vehicle` or `player.entered_vehicle`. Do not introduce ad hoc cross-domain state mutation. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`]
- Do not overload `SpawnCandidate` into a mutable gameplay-state container. If new immutable metadata is truly required, add explicit fields rather than repurposing `starterVehicle`. [Source: `src/world/chunks/slice-manifest.ts`]
- Keep controller-driven ownership explicit. Do not attach Babylon default camera controls directly to the canvas as a shortcut around the repo's possession and input patterns.
- If input capture is shared across vehicle and on-foot modes, centralize raw DOM/gamepad reads or otherwise guarantee that only one owner consumes each one-shot or per-frame delta path.

### Library / Framework Requirements

- Stay on the repo's pinned stack: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and `vite` `8.0.5`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`]
- Latest stable package check for this workflow: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and `vite` `8.0.7`. Babylon and Havok already match the latest verified stable versions; do not upgrade Vite inside this story unless there is an isolated tooling reason and separate validation plan.
- Babylon camera guidance still treats `UniversalCamera` as the default FPS-like camera and `FollowCamera` as the target-following camera family. A built-in camera is acceptable for on-foot mode only if input remains project-owned and testable; do not bypass controller/state ownership with `camera.attachControl(...)`. [Source: Babylon camera introduction documentation]
- Reuse the existing Havok/Babylon physics stack. Do not introduce a new physics backend, character controller library, or scene-management framework for this story.

### File Structure Requirements

- Keep world-scene orchestration in `src/rendering/scene/create-world-scene.ts`, but extract new possession or on-foot helpers once logic stops being simple coordination.
- Preferred minimal addition: introduce a sandbox-owned seam such as `src/sandbox/on-foot/` for on-foot runtime, controller, and camera helpers. This aligns better with the architecture than pushing walking logic deeper into `vehicles/` or `app/`.
- Update `src/vehicles/controllers/player-vehicle-controller.ts` only for enter/exit request plumbing or shared low-level input integration. Do not teach it how to walk.
- Likely touchpoints for this story are:
  - `src/rendering/scene/create-world-scene.ts`
  - `src/vehicles/controllers/player-vehicle-controller.ts`
  - `src/world/generation/world-load-failure.ts` only if new setup-time failures are introduced
  - `src/app/bootstrap/create-game-app.ts` and smoke tests only for restart/readiness compatibility
- Do not create a brand-new top-level `src/characters/` domain for this one story. The architecture already points toward sandbox-owned gameplay seams, and this repo has not yet materialized a broader character stack.

### Testing Requirements

- Follow the existing repo pattern:
  - unit tests in `tests/unit/*.spec.ts`
  - Babylon `NullEngine` integration tests in `tests/integration/*.spec.ts`
  - app/bootstrap contract coverage in `tests/smoke/*.spec.ts`
- Add unit coverage for possession-state transitions, safe exit placement, interaction gating, and any new input request API.
- Add integration coverage that proves exit -> on-foot -> re-enter swaps the active controller and camera correctly without breaking the existing active vehicle runtime.
- Preserve the current startup success contract: `world.scene.ready` still reports `readinessMilestone: "controllable-vehicle"`, and restart-from-spawn still returns to that baseline. [Source: `src/app/events/game-events.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]
- Add a smoke-level assertion for restart after an exit/re-entry path so stale on-foot state cannot survive into the restarted scene.
- Finish implementation validation with `npm run check`, `npm test`, and `npm run build`.

### Previous Story Intelligence

- Story 2.1 established `VehicleManager` as the owner of the active vehicle runtime and introduced the `vehicle.switched` handoff pattern. Build on that event-driven handoff instead of inventing a second vehicle-ownership model. [Source: `_bmad-output/implementation-artifacts/2-1-switch-between-vehicle-types.md`]
- Story 2.1 also introduced controller `bindVehicle` and `unbindVehicle` behavior plus camera retargeting on vehicle switches. Re-entry should reuse this explicit possession pattern instead of implicit mesh lookups.
- A Story 2.1 review fix corrected the Havok switch handoff by calling `setTargetTransform(...)` before restoring velocities. If this story needs any physics-body handoff or parking-state transfer, preserve that ordering discipline.
- Story 1.5 added same-location restart by reusing the cached `SliceManifest`. Story 2.2 must not break that fast restart loop or force a full location-selection flow after on-foot play. [Source: git commit `545fd25`; `src/app/bootstrap/create-game-app.ts`]

### Git Intelligence Summary

- Recent implementation patterns favor narrow feature commits with strong unit and integration coverage, then story and sprint metadata synchronization.
- Commit `3da8815` (`Add switchable vehicle types with seamless handoff`) touched the exact files most relevant here: `create-world-scene.ts`, `create-starter-vehicle-camera.ts`, `player-vehicle-controller.ts`, `vehicle-factory.ts`, `vehicle-manager.ts`, and related tests. Follow those seams before creating new ones.
- Commit `99907c4` (`Fix third-person camera readability`) shows the repo preference for controller-driven camera behavior with explicit tests for camera readability and mixed mouse/gamepad input. Preserve that style when adding on-foot camera control.
- Commit `803ca5e` (`Add starter vehicle, camera, and driving controls`) introduced the current starter-vehicle, readiness milestone, and world-load failure contracts. Do not casually break those load-time assumptions.
- Commit `545fd25` (`Add explicit same-location restart from spawn`) shows restart behavior is a first-class feature with smoke and integration coverage; this story must keep restart compatible with both in-vehicle and on-foot states.

### Latest Tech Information

- Babylon.js and Havok package versions already match the latest stable versions currently reported by npm for this workflow, so this story should focus on implementation rather than dependency churn.
- Vite has a newer stable patch (`8.0.7`) than the repo pin (`8.0.5`), but architecture verification and the existing repo both target `8.0.5`. Treat any Vite upgrade as out of scope for this story.
- Babylon's camera documentation still centers on `UniversalCamera` for first-person/FPS-like control and `FollowCamera` for target-following. For this repo, the important constraint is not which Babylon camera type you choose, but that possession and input remain explicit, swappable, and testable at the world runtime layer.

### Project Structure Notes

- The architecture document defines a fuller long-term structure than the current repo has materialized. Today the repo only has `src/app`, `src/rendering`, `src/ui`, `src/vehicles`, and `src/world`.
- Story 2.2 should add the smallest architecture-aligned seam needed for on-foot support instead of backfilling the entire future folder structure.
- The safest path is a minimal sandbox-owned runtime seam for on-foot logic plus scene-level coordination, while leaving app-shell state, vehicle switching, and world-generation contracts intact.

### Project Context Rules

- No `project-context.md` file was found in the workspace during workflow discovery.
- Use the architecture document, `package.json`, current source structure, and the previous-story file as the governing project rules for this story.

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 2: Exploration & Vehicle Interaction Sandbox`
- `_bmad-output/planning-artifacts/gdd.md#Core Gameplay Loop`
- `_bmad-output/planning-artifacts/gdd.md#Controls and Input`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Decisions`
- `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#Implementation Patterns`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md` (On-Foot and Controls entries around lines 370-376 and 814-832)
- `_bmad-output/implementation-artifacts/2-1-switch-between-vehicle-types.md`
- `src/rendering/scene/create-world-scene.ts`
- `src/vehicles/controllers/player-vehicle-controller.ts`
- `src/vehicles/physics/vehicle-manager.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/app/state/session-state-machine.ts`
- `src/world/chunks/slice-manifest.ts`
- `tests/integration/vehicle-switching.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test -- --run tests/unit/player-vehicle-controller.spec.ts`
- `npm test -- --run tests/unit/starter-vehicle-camera.spec.ts`
- `npm test -- --run tests/unit/exit-placement.spec.ts tests/unit/on-foot-runtime.spec.ts`
- `npm test -- --run tests/integration/player-possession-runtime.integration.spec.ts`
- `npm test -- --run tests/unit/on-foot-camera.spec.ts`
- `npm test -- --run tests/integration/on-foot-handoff.integration.spec.ts`
- `npm test -- --run tests/unit/player-possession-runtime.spec.ts`
- `npm test -- --run tests/unit/world-scene-runtime.spec.ts tests/smoke/world-scene-possession.smoke.spec.ts`
- `npm run check`
- `npm test`
- `npm run build`

### Implementation Plan

- Add a sandbox-owned on-foot seam for exit placement, possession state, actor runtime, and camera so vehicle and on-foot ownership stay in the world runtime.
- Change controller and world-scene update flow to capture one shared input frame per render and reuse it across the active controller and camera.
- Preserve the existing `controllable-vehicle` ready/restart contract while adding unit, Babylon `NullEngine`, and smoke coverage for exit, re-entry, and restart behavior.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added shared `PlayerInputFrame` capture with explicit `E` interaction requests and a world-level single-read input handoff between possession logic and cameras.
- Added sandbox-owned exit placement, possession runtime, lightweight on-foot actor runtime, and a dedicated on-foot camera so the player can exit safely, walk briefly, and re-enter the exact stored vehicle.
- Updated the Babylon world scene to park the exited vehicle, swap active cameras and possession mode in runtime state, expose possession telemetry on the canvas, and restore driving control without reloading the slice.
- Added unit, integration, and smoke coverage for possession transitions, exit fallback order, invalid interaction gating, controller mode changes, camera/control handoff, and restart baseline behavior.
- Revalidated the story with `npm run check`, `npm test`, and `npm run build` all passing.
- Follow-up tuning reversed horizontal camera look for mouse and gamepad while keeping vertical look unchanged, and aligned the control spec with the shipped behavior.
- Senior review fixes aligned world-scene telemetry with explicit camera names, added production-backed smoke and unit coverage for possession telemetry, and blocked vehicle switching while on foot or mid-handoff.

## Change Log

- 2026-04-07: Implemented world-runtime possession flow with shared per-frame input capture and explicit `E` enter/exit requests.
- 2026-04-07: Added lightweight on-foot runtime, deterministic safe exit placement, dedicated on-foot camera, and exact-vehicle re-entry handling.
- 2026-04-07: Expanded unit/integration/smoke coverage and revalidated the repo with typecheck, the full test suite, and a production build.
- 2026-04-07: Reversed horizontal camera look for mouse and gamepad input, updated controller expectations, and synchronized the GDD with the camera-control behavior.
- 2026-04-07: Fixed review findings by aligning world-scene camera telemetry with explicit test-hook names, blocking invalid vehicle switches during possession handoff, and adding smoke/unit coverage for possession telemetry.

## File List

- `_bmad-output/implementation-artifacts/2-2-exit-and-re-enter-vehicles.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/sandbox/on-foot/create-on-foot-camera.ts`
- `src/sandbox/on-foot/exit-placement.ts`
- `src/sandbox/on-foot/on-foot-runtime.ts`
- `src/sandbox/on-foot/player-possession-runtime.ts`
- `src/vehicles/cameras/create-starter-vehicle-camera.ts`
- `src/vehicles/controllers/player-vehicle-controller.ts`
- `src/vehicles/physics/create-starter-vehicle.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `tests/integration/on-foot-handoff.integration.spec.ts`
- `tests/integration/player-possession-runtime.integration.spec.ts`
- `tests/smoke/world-scene-possession.smoke.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/unit/exit-placement.spec.ts`
- `tests/unit/on-foot-camera.spec.ts`
- `tests/unit/on-foot-runtime.spec.ts`
- `tests/unit/player-possession-runtime.spec.ts`
- `tests/unit/player-vehicle-controller.spec.ts`
- `tests/unit/starter-vehicle-camera.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`

## Senior Developer Review (AI)

### Reviewer

Chris

### Date

2026-04-07T23:22:46-07:00

### Outcome

Approve

### Summary

- Verified the implemented acceptance criteria against the changed source and test files.
- Fixed world-scene telemetry so runtime hooks expose explicit `starter-vehicle-camera` and `on-foot-camera` names.
- Added production-backed smoke and unit coverage for possession telemetry and blocked invalid vehicle switches while on foot or mid-handoff.

### Findings Addressed

- [fixed][HIGH] Removed the false File List claim that `_bmad-output/planning-artifacts/gdd.md` changed.
- [fixed][MEDIUM] World-scene camera telemetry now reports explicit camera names instead of Babylon class names.
- [fixed][MEDIUM] Added smoke coverage that exercises real exit and re-entry telemetry instead of mutating fake canvas state.
- [fixed][MEDIUM] Vehicle switching is now denied while on foot, and exit interaction is ignored during an in-flight vehicle switch.
