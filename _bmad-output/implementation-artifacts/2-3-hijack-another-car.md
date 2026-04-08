# Story 2.3: Hijack Another Car

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can hijack another car,
so that I can preserve momentum after damage or curiosity.

## Acceptance Criteria

1. Given a loaded sandbox session, when Story 2.3 scene setup completes, then the slice contains a small deterministic set of secondary hijackable vehicles in addition to the controlled starter vehicle, using existing tuning profiles and road-aligned placements that stay within slice bounds and do not block the starter spawn.
2. Given the player is on foot near one or more interactable vehicles, when they press `E`, then the runtime resolves exactly one target using an explicit distance-and-facing rule instead of a generic nearest-mesh scan.
3. Given the resolved target is the player's exact stored vehicle from Story 2.2, when the interaction resolves, then the existing exact-vehicle re-entry flow still works without reloading the world or breaking session continuity.
4. Given the resolved target is a different hijackable secondary vehicle, when the interaction resolves, then a short readable hijack window begins before possession transfers so the player remains briefly exposed between vehicles.
5. Given the hijack window completes successfully, when the takeover resolves, then control, active-camera ownership, telemetry, and active-vehicle runtime transfer to the hijacked vehicle without reloading the world, while the previously used vehicle remains in the scene as an abandoned non-controlled vehicle until restart or explicit session cleanup.
6. Given the player attempts to hijack from an invalid state, when no eligible target exists, the target is out of range, the player is not on foot, or a switch or handoff is already in flight, then the request fails safely without breaking possession state, duplicating vehicles, or corrupting camera or input ownership.
7. Given the feature is implemented, when repo validation runs, then unit, integration, smoke, typecheck, and build checks confirm deterministic hijackable-vehicle spawning, target selection, takeover timing, exact re-entry compatibility, restart cleanup, and hijack-to-drive continuity.

## Tasks / Subtasks

- [x] Task 1: Add deterministic hijackable secondary vehicles to the world runtime (AC: 1, 5)
  - [x] Spawn a small set of road-aligned secondary vehicles from existing tuning profiles without replacing the active starter vehicle.
  - [x] Keep these vehicles as dynamic session entities under the world root, not baked into static chunk geometry.
  - [x] Ensure placement is deterministic, in-bounds, and compatible with the current slice roads and restart flow.
- [x] Task 2: Extend on-foot interaction targeting from exact re-entry to explicit multi-vehicle resolution (AC: 2, 3, 6)
  - [x] Generalize the Story 2.2 exact-vehicle interaction path into a single resolver that can consider both the stored vehicle and nearby hijackable targets.
  - [x] Use a clear distance-plus-facing rule so the player can intentionally choose between re-entry and hijack.
  - [x] Keep invalid requests as no-ops rather than falling through to ambiguous nearest-mesh behavior.
- [x] Task 3: Implement the readable hijack handoff window and control transfer (AC: 4, 5, 6)
  - [x] Add a short takeover timer or equivalent explicit handoff state instead of instant teleport-style possession.
  - [x] Ignore duplicate `E` or `Tab` requests while the hijack handoff is active.
  - [x] On completion, transfer active vehicle ownership, camera target, and telemetry to the hijacked runtime while abandoning the prior vehicle cleanly.
- [x] Task 4: Preserve restart and current runtime contracts (AC: 3, 5, 6)
  - [x] Keep same-location restart returning to the starter-vehicle-ready baseline in the same slice.
  - [x] Rebuild or clear abandoned and hijackable vehicle state on restart so no stale takeover state survives into the restarted scene.
  - [x] Preserve the existing `world.scene.ready` contract, scene metadata, and canvas test hooks.
- [x] Task 5: Add automated coverage and repo validation (AC: 7)
  - [x] Add unit tests for hijack target resolution, interaction gating, and takeover timing.
  - [x] Add Babylon `NullEngine` integration coverage for exit -> target another vehicle -> hijack -> drive continuity.
  - [x] Add smoke coverage that proves restart clears stale hijack state and retains coherent possession telemetry.
  - [x] Re-run `npm run check`, `npm test`, and `npm run build` before marking the story ready for review.

## Dev Notes

- Epic 2 is about turning the vertical slice into a richer vehicle-interaction sandbox. Story 2.3 is the first story that should let the player convert on-foot exposure into a different drivable vehicle without depending on Epic 3 traffic or pedestrian systems.
- No dedicated UX artifact or `project-context.md` was found during workflow discovery. Use the GDD, architecture, current repo structure, and the completed Epic 2 stories as the controlling guidance.

### Technical Requirements

- Keep `E` as the single interaction key for exit, exact re-entry, and hijack. Keep `Tab` reserved for vehicle switching from Story 2.1.
- Story 2.2 intentionally stopped at exact-vehicle re-entry. Story 2.3 should extend that path into an explicit vehicle-interaction resolver rather than adding a second possession system.
- Because traffic and pedestrians are Epic 3 work, do not depend on moving AI traffic, NPC flee behavior, combat, or crowd logic in this story. Provide hijack opportunities through deterministic secondary vehicles that already exist in the slice.
- Keep hijacking as a short bridge between vehicles, not a deep on-foot expansion. No jump, combat, ragdoll, melee, door animations, or broad character-controller work is needed here.
- The interaction target rule must be explicit and testable. Use a short forward-facing interaction cone plus range check, then resolve candidates deterministically by smallest facing angle, then shortest horizontal distance, then prefer the exact stored vehicle over other candidates on ties, then a stable runtime identifier. A generic nearest-mesh scan is not acceptable.
- Preserve the readable risk window from the planning artifacts. Hijack should not be an instant swap from one controlled vehicle to another while the player is on foot.
- Model the hijack risk window as deterministic world-runtime state advanced through the existing per-frame update path using `deltaSeconds`. Do not implement it with `setTimeout`, animation callbacks, or other async side channels that can drift from restart, tests, or scene disposal.
- The previous active vehicle should remain in the scene as abandoned session state after a successful hijack so the sandbox feels continuous. Do not silently despawn it during the handoff unless you introduce a clearly defined cleanup rule that still preserves session continuity.
- Exactly one vehicle runtime may be player-controlled at a time. Secondary or abandoned vehicles must remain inert session entities until possession transfers; they must not consume player input or receive the active per-frame control update loop.
- Current world generation only creates one `spawnCandidate`. If the story needs more vehicle opportunities, derive them deterministically from the existing slice roads and chunk layout or add a narrow helper for extra session vehicle placement instead of overhauling the full generation pipeline.
- If extra hijackable vehicles need explicit placement data, introduce a small runtime placement helper or type separate from `SpawnCandidate`, or add a narrow wrapper around the vehicle factory. Do not mutate the starter-vehicle spawn contract into a general-purpose multi-vehicle session container.
- If hijackable targets use the existing vehicle factory, keep their physics stack, tuning data, and runtime update rules aligned with the current player vehicle implementation.

### Architecture Compliance

- Keep top-level loading and shell phases in `src/app/state/session-state-machine.ts` unchanged. Hijack state is world-runtime state, not app-session state. [Source: `src/app/state/session-state-machine.ts`; `_bmad-output/planning-artifacts/game-architecture.md#State Management`]
- Keep hijackable vehicles and abandoned vehicles under the runtime world root as dynamic session entities. Do not encode them into `SliceManifest` as if they were static world geometry. [Source: `src/rendering/scene/create-world-scene.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Scene Structure`]
- Reuse the existing possession seam in `src/sandbox/on-foot/player-possession-runtime.ts` instead of inventing a second controller-handoff path somewhere else.
- Reuse `VehicleManager` patterns or add a narrow runtime registry for non-controlled hijackable vehicles. Do not bypass vehicle ownership with ad hoc scene meshes that skip the vehicle factory and tuning system.
- Do not call `VehicleManager.switchVehicle()` to finish a hijack. That path disposes the previous runtime, which conflicts with this story's requirement to leave the abandoned vehicle in-scene. Reuse the handoff, camera, and controller-binding patterns from Story 2.1, but implement hijack completion as a separate active-vehicle transfer that preserves the prior runtime.
- If new gameplay events are added, keep them typed with `domain.action` naming such as `vehicle.hijack.started` or `vehicle.hijacked`. Do not introduce ad hoc cross-domain state mutation. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`]
- Do not overload `SpawnCandidate` into a mutable multi-vehicle session container. If you need extra placement metadata, add a dedicated helper or explicit immutable data structure instead of repurposing the starter-vehicle spawn contract. [Source: `src/world/chunks/slice-manifest.ts`]
- Keep controller and camera ownership explicit at the world runtime layer. Do not attach Babylon default controls directly to the canvas as a shortcut around the repo's possession patterns.

### Library / Framework Requirements

- Stay on the repo's pinned stack: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and `vite` `8.0.5`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`]
- Latest stable package check for this workflow: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and `vite` `8.0.7`. Babylon and Havok already match the latest stable versions in use here; do not upgrade Vite inside this story unless there is a separate tooling reason and validation plan.
- Reuse the existing Babylon plus Havok physics path for hijackable vehicles. Do not add a new character-controller, traffic-simulation, or scene-management dependency for this story.
- Preserve the repo's explicit camera and input ownership model instead of relying on Babylon convenience APIs that bypass testable controller state.

### File Structure Requirements

- Keep world-scene orchestration in `src/rendering/scene/create-world-scene.ts`, but extract hijack target selection or takeover helpers once logic stops being simple coordination.
- Preferred minimal extension: keep hijack and vehicle-interaction seams under `src/sandbox/on-foot/` while the feature is still tightly coupled to on-foot possession. If the helper count grows beyond one focused file, split into a small `src/sandbox/vehicle-interaction/` seam rather than spreading logic across `app/` or `world/generation/`.
- Likely touchpoints for this story are:
  - `src/rendering/scene/create-world-scene.ts`
  - `src/rendering/scene/world-scene-runtime.ts`
  - `src/sandbox/on-foot/player-possession-runtime.ts`
  - `src/vehicles/physics/vehicle-manager.ts`
  - `src/vehicles/physics/vehicle-factory.ts`
  - `src/vehicles/controllers/player-vehicle-controller.ts` only for shared interaction gating if truly needed
- Avoid large refactors to `src/world/generation/world-slice-generator.ts` unless a tiny deterministic placement helper cannot be expressed at runtime. The current architecture and codebase do not justify a broad spawn-system rewrite yet.
- Do not add full traffic or pedestrian domains for this story. Epic 3 owns those systems.

### Testing Requirements

- Follow the existing repo pattern:
  - unit tests in `tests/unit/*.spec.ts`
  - Babylon `NullEngine` integration tests in `tests/integration/*.spec.ts`
  - app and scene contract coverage in `tests/smoke/*.spec.ts`
- Add unit coverage for target resolution, interaction priority, takeover timing, and invalid-state gating.
- Add integration coverage that proves the player can exit, move to another vehicle, complete the hijack window, and drive the hijacked vehicle without breaking current scene continuity.
- Preserve Story 2.2 exact re-entry coverage by adding a case where both the stored vehicle and another hijackable vehicle are present so the explicit targeting rule stays deterministic.
- Preserve the current startup success contract: `world.scene.ready` still reports `readinessMilestone: "controllable-vehicle"`, and restart-from-spawn still returns to that baseline. [Source: `src/app/events/game-events.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]
- Add smoke-level assertions for restart after abandoning one vehicle and hijacking another so stale on-foot or takeover state cannot survive into the restarted scene.
- Finish implementation validation with `npm run check`, `npm test`, and `npm run build`.

### Previous Story Intelligence

- Story 2.2 established `PlayerPossessionRuntime` as the owner of vehicle vs on-foot control, plus the shared one-read input frame used by both possession and camera logic. Extend that seam instead of inventing a parallel hijack controller. [Source: `_bmad-output/implementation-artifacts/2-2-exit-and-re-enter-vehicles.md`]
- Story 2.2 intentionally limited interaction to the exact stored vehicle and explicitly deferred generic nearest-vehicle or hijack flow. This story is the place to widen the interaction model, but it must do so without regressing the exact-vehicle re-entry path.
- Story 2.2 also fixed world-scene telemetry naming and blocked vehicle switching while on foot or mid-handoff. Keep those protections when hijack introduces another transfer state.
- Story 2.1 established `VehicleManager` ownership, `vehicle.switched` handoff semantics, tuning-backed vehicle creation, and camera retargeting. Reuse those active-vehicle ownership patterns when a hijack finishes. [Source: `_bmad-output/implementation-artifacts/2-1-switch-between-vehicle-types.md`]
- Story 1.5 added same-location restart by reusing the cached `SliceManifest`. Story 2.3 must not break that fast restart loop or force a full location-selection flow after abandoning and stealing vehicles. [Source: git commit `545fd25`; `src/app/bootstrap/create-game-app.ts`]

### Git Intelligence Summary

- Recent implementation patterns favor narrow feature commits with strong unit and integration coverage, then story and sprint metadata synchronization.
- Commit `cdd58a7` (`Add vehicle exit and re-entry flow`) introduced the exact seams this story should reuse: `create-world-scene.ts`, `world-scene-runtime.ts`, `player-possession-runtime.ts`, the on-foot runtime helpers, and the possession smoke/integration tests.
- Commit `3da8815` (`Add switchable vehicle types with seamless handoff`) established `VehicleManager`, tuning-backed vehicle creation, and explicit camera/controller retargeting. Use those patterns for the final hijack takeover instead of creating a new one-off handoff mechanism.
- Commit `99907c4` (`Fix third-person camera readability`) shows the repo preference for controller-driven camera behavior with explicit tests for look-input behavior. Preserve that style if hijack introduces another camera transition edge case.
- Commit `545fd25` (`Add explicit same-location restart from spawn`) shows restart behavior is a first-class feature with smoke coverage; this story must keep restart compatible with abandoned and hijacked vehicles.

### Latest Tech Information

- Babylon.js and Havok package versions already match the latest stable npm versions currently reported during this workflow, so the story should focus on runtime implementation rather than dependency churn.
- Vite has a newer stable patch (`8.0.7`) than the repo pin (`8.0.5`), but architecture verification and the existing repo both target `8.0.5`. Treat any Vite upgrade as out of scope for this story.
- No extra library is needed for this story's hijack window, targeting, or multi-vehicle scene state. Reuse the existing Babylon scene, Havok physics bodies, and typed runtime helpers already in the repo.

### Project Structure Notes

- The architecture document defines a fuller long-term structure than the current repo has materialized. Today the repo has `src/app`, `src/rendering`, `src/sandbox/on-foot`, `src/ui`, `src/vehicles`, and `src/world`.
- The current runtime assumes one controlled player vehicle plus an optional on-foot actor. Story 2.3 is the first feature that likely needs multiple vehicle runtimes alive in one session. Add the smallest ownership seam that supports that need rather than backfilling the full future traffic architecture.
- Current world generation emits only one starter `spawnCandidate`. If you need extra hijack targets, prefer deterministic secondary placements derived from current roads and chunk bounds over a broad manifest-schema expansion.

### Project Context Rules

- No `project-context.md` file was found in the workspace during workflow discovery.
- Use the architecture document, `package.json`, current source structure, completed Epic 2 story files, and the current repo tests as the governing project rules for this story.

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 2: Exploration & Vehicle Interaction Sandbox`
- `_bmad-output/planning-artifacts/gdd.md#Core Gameplay Loop`
- `_bmad-output/planning-artifacts/gdd.md#Game Mechanics`
- `_bmad-output/planning-artifacts/gdd.md#Controls and Input`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/game-brief.md#Success Criteria`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Decisions`
- `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#Implementation Patterns`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md` (Hijack and On-Foot sections around lines 358-379 and parked-car notes around lines 566-568)
- `_bmad-output/implementation-artifacts/2-1-switch-between-vehicle-types.md`
- `_bmad-output/implementation-artifacts/2-2-exit-and-re-enter-vehicles.md`
- `package.json`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/sandbox/on-foot/player-possession-runtime.ts`
- `src/sandbox/on-foot/on-foot-runtime.ts`
- `src/sandbox/on-foot/exit-placement.ts`
- `src/vehicles/controllers/player-vehicle-controller.ts`
- `src/vehicles/physics/vehicle-manager.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `tests/integration/on-foot-handoff.integration.spec.ts`
- `tests/integration/player-possession-runtime.integration.spec.ts`
- `tests/integration/vehicle-switching.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/world-scene-possession.smoke.spec.ts`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- Targeted red/green validation: `npm test -- tests/unit/hijackable-vehicle-spawns.spec.ts`, `npm test -- tests/unit/vehicle-interaction-target.spec.ts tests/unit/player-possession-runtime.spec.ts`, and `npm test -- tests/unit/player-possession-runtime.spec.ts tests/unit/vehicle-manager.spec.ts`
- Focused regression verification: `npm test -- tests/integration/on-foot-handoff.integration.spec.ts tests/smoke/world-scene-possession.smoke.spec.ts tests/integration/vehicle-hijack.integration.spec.ts tests/smoke/vehicle-hijack-restart.smoke.spec.ts`
- Final repo validation: `npm run check`, `npm test`, `npm run build`

### Implementation Plan

- Derive deterministic hijackable vehicle placements from the current slice roads at scene-load time, then spawn those runtimes under `world-root` with stable runtime names and existing tuning profiles.
- Route all on-foot interaction through an explicit target resolver, then layer a timed hijack handoff onto `PlayerPossessionRuntime` so exact re-entry and hijack share one possession seam.
- Finish the takeover with a non-destructive `VehicleManager` active-vehicle transfer so controller, camera, telemetry, abandoned-vehicle continuity, and restart behavior stay aligned with the existing world-scene contract.

### Completion Notes List

- Added deterministic hijackable secondary vehicle spawning via `src/rendering/scene/hijackable-vehicle-spawns.ts` and wired those runtimes into `create-world-scene.ts` as dynamic world-root entities.
- Added explicit distance-plus-facing interaction targeting in `src/sandbox/on-foot/vehicle-interaction-target.ts` and extended `PlayerPossessionRuntime` to support exact re-entry plus timed hijack handoffs from the same on-foot interaction path.
- Added a non-destructive `VehicleManager.setActiveVehicle()` handoff path so hijacks transfer control, camera, and telemetry to the hijacked runtime while leaving the previous vehicle abandoned in-scene until restart or later cleanup.
- Added unit, integration, and smoke coverage for deterministic secondary spawns, targeting priority, hijack timing, hijack-to-drive continuity, restart cleanup, and updated explicit re-entry positioning under the new interaction cone.
- Validation passed with `npm run check`, `npm test`, and `npm run build`.
- Senior developer review verified all acceptance criteria, reran `npm run check`, `npm test`, and `npm run build`, and synced story tracking to `done`.

### File List

- _bmad-output/implementation-artifacts/2-3-hijack-another-car.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/rendering/scene/create-world-scene.ts
- src/rendering/scene/hijackable-vehicle-spawns.ts
- src/sandbox/on-foot/player-possession-runtime.ts
- src/sandbox/on-foot/vehicle-interaction-target.ts
- src/vehicles/physics/vehicle-factory.ts
- src/vehicles/physics/vehicle-manager.ts
- tests/integration/on-foot-handoff.integration.spec.ts
- tests/integration/vehicle-hijack.integration.spec.ts
- tests/smoke/vehicle-hijack-restart.smoke.spec.ts
- tests/smoke/world-scene-possession.smoke.spec.ts
- tests/unit/hijackable-vehicle-spawns.spec.ts
- tests/unit/player-possession-runtime.spec.ts
- tests/unit/vehicle-interaction-target.spec.ts
- tests/unit/vehicle-manager.spec.ts

## Change Log

- 2026-04-08: Added deterministic hijackable vehicle spawning, explicit on-foot target resolution, timed hijack handoff/active-vehicle transfer, and full unit/integration/smoke validation for hijack and restart continuity.
- 2026-04-08: Senior developer review approved the story, fixed the git/story metadata discrepancy, and synced story status tracking to done.

## Senior Developer Review (AI)

### Reviewer

Chris

### Date

2026-04-08T00:28:31-07:00

### Outcome

Approve

### Summary

- Verified all 7 acceptance criteria against the changed source and test files.
- Reran `npm run check`, `npm test`, and `npm run build`; all passed.
- Fixed the review discrepancy by updating the story artifact and status tracking so the File List and current git worktree now align.

### Findings Addressed

- [fixed][HIGH] The story File List claimed `_bmad-output/implementation-artifacts/2-3-hijack-another-car.md` as a changed file before the review updated it, but `git status --porcelain` showed no corresponding worktree change at review start.
