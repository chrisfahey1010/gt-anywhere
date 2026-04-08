# Story 2.1: Switch Between Vehicle Types

Status: done

## Story

As a player,
I can switch between vehicle types,
so that the same location feels different to drive.

## Acceptance Criteria

1. Given the player is in an active sandbox session, when they trigger the vehicle switch action, then their current vehicle is despawned and a new vehicle of a different class (e.g., sports car, truck) is spawned in its place.
2. Given the vehicle is switched, when the new vehicle appears, then the camera and player controls seamlessly attach to the new vehicle without loss of session continuity.
3. Given the vehicle switch occurs while moving, when the new vehicle is spawned, then it inherits the position, heading, and velocity of the previous vehicle to preserve momentum.
4. Given the game supports multiple vehicles, when the switch happens, then the distinct handling profile, physics tuning, and vehicle model are applied correctly based on data from `public/data/tuning/`.

## Tasks / Subtasks

- [x] Task 1: Implement distinct vehicle tuning profiles and models
  - [x] Define at least two distinct vehicle tuning JSON files in `public/data/tuning/` (e.g., default sedan, sports car, heavy truck).
  - [x] Ensure the physics setup in `src/vehicles/physics/create-starter-vehicle.ts` or a new factory can consume these tuning profiles.
- [x] Task 2: Implement the vehicle switching mechanism
  - [x] Add a `VehicleManager` or expand the scene API to handle despawning the active vehicle and spawning a new one.
  - [x] Ensure the new vehicle inherits the `Havok` physics body state (position, rotation, linear velocity, angular velocity) from the previous vehicle.
- [x] Task 3: Seamlessly reattach camera and controls
  - [x] Update `src/vehicles/controllers/player-vehicle-controller.ts` to unbind from the old vehicle and bind to the new one.
  - [x] Update the chase camera in `src/vehicles/cameras/create-starter-vehicle-camera.ts` to transition or snap to the new vehicle target without breaking the view.
- [x] Task 4: Add explicit UI/Input for switching
  - [x] Add a debug/gameplay input binding (e.g., 'Tab' key or a UI button) to cycle through available vehicle types.
- [x] Task 5: Add automated coverage
  - [x] Add unit tests for the vehicle factory and tuning data loading.
  - [x] Add integration tests verifying the vehicle switch preserves velocity and reattaches the camera/controller.

## Dev Notes

- Epic 2 expands the driving slice into a sandbox with vehicle variety. This is the first story of Epic 2, transitioning the epic to `in-progress`.
- The player should be able to press a key to cycle or switch between a few different vehicle types to test different handling profiles.

### Technical Requirements

- Add vehicle variety: Define distinct vehicle handling profiles in `public/data/tuning/`.
- Switch mechanism: Implement a way to switch the active vehicle during the session by despawning the old and spawning a new one at the same position/velocity.
- Ensure the `player-vehicle-controller` and `create-starter-vehicle-camera` attach cleanly to the new vehicle.
- Follow the "Entity Patterns" (Factory pattern with object pooling) as defined in the architecture. Do not just `new` up vehicles, use a factory.

### Architecture Compliance

- Use explicit state machines or events for vehicle switching (`domain.action` like `vehicle.switched`).
- Do not add direct input listeners in the vehicle mesh logic; handle input in `src/vehicles/controllers/`.
- Maintain the strict separation between static world slice and dynamic session state. Vehicles are dynamic session entities.

### Library / Framework Requirements

- Stay on Babylon.js `9.1.0`, `@babylonjs/havok` `1.3.12`, Vite `8.0.5`.
- Do not introduce new physics engines or frameworks.

### File Structure Requirements

- Work within `src/vehicles/physics/`, `src/vehicles/controllers/`, `src/vehicles/cameras/`, and `public/data/tuning/`.
- Do not leak vehicle switching logic into `src/world/generation/`.

### Previous Story Intelligence

- Story 1.5 implemented restart-from-spawn reusing `SliceManifest`. Ensure that restarting the session resets the player to the default starter vehicle.
- The `create-world-scene` currently handles the initial vehicle setup. You may need to decouple vehicle instantiation from the static scene load to allow mid-session swapping.

### Project Context Reference

- Treat world streaming, vehicle simulation, traffic, and pedestrians as hot-path systems.
- Use pooling for high-churn entities (though the player vehicle might just be uniquely instantiated, prepare for a factory pattern for future traffic vehicles).
- Keep loaded world content under a world root.
- Do not bypass the established physics stack.

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test -- --run tests/unit/vehicle-manager.spec.ts`
- `npm test`
- `npm run check`
- `npm test -- --run tests/unit/vehicle-manager.spec.ts tests/unit/vehicle-factory.spec.ts`
- `npm test`
- `npm test -- --run tests/unit/player-vehicle-controller.spec.ts tests/unit/starter-vehicle-camera.spec.ts`
- `npm run check`
- `npm test`
- `npm test -- --run tests/unit/player-vehicle-controller.spec.ts`
- `npm run check`
- `npm test`
- `npm test -- --run tests/integration/vehicle-switching.integration.spec.ts`
- `npm run check`
- `npm test`
- `npm run build`
- `npm test -- --run tests/unit/vehicle-manager.spec.ts tests/unit/vehicle-factory.spec.ts tests/integration/vehicle-switching.integration.spec.ts`
- `npm run check`
- `npm test`
- `npm run build`

### Implementation Plan

- Keep active player-vehicle ownership in a dedicated `VehicleManager` so switching stays in the vehicles domain instead of leaking into world generation.
- Use the tuning-backed vehicle factory for the active runtime so each switch can respawn a different vehicle profile while preserving the same spawn contract.
- Rebind camera and controller ownership from `vehicle.switched` updates before adding the gameplay input that triggers cycling.
- Finish with explicit unit and integration coverage for vehicle switching, then rerun repo validations and browser checks.

### Completion Notes List

- Added a `VehicleManager` that can switch or cycle the active vehicle type, dispose the previous runtime, and preserve transform plus Havok velocity state across the swap.
- Updated the Babylon world scene to create the player vehicle from the tuning-backed factory, keep vehicle telemetry aligned with the active runtime, and expose scene-level switch/cycle hooks for later input wiring.
- Added unit coverage for state-preserving vehicle swaps and tightened existing vehicle-factory test typing so repo typecheck passes during story validation.
- Added explicit controller possession binding so gameplay input only applies while a vehicle is owned and can be cleanly unbound/rebound across a switch.
- Extended the chase camera with a retargeting API and wired `vehicle.switched` handling in the scene so the active camera and controller follow the replacement vehicle runtime.
- Added unit coverage for controller binding and camera retargeting, then reran full repo tests and typecheck with the new handoff flow in place.
- Added a one-shot `Tab` gameplay binding in the controller plus scene-side request consumption so players can cycle vehicle types without adding input listeners to vehicle mesh logic.
- Guarded scene vehicle switching against overlapping requests and kept the existing scene-level switch hooks aligned with the same cycling path used by the gameplay input.
- Kept the existing vehicle-factory and tuning-data unit coverage in the story’s validation path and added a new integration test that proves switching preserves momentum while the controller and chase camera reattach to the replacement vehicle.
- Revalidated the repo with the new switching integration coverage in place so the story now has explicit unit plus cross-component proof for the main swap behavior.
- Definition-of-done validation passed with all story tasks complete, `npm test`, `npm run check`, and `npm run build` green, and the story ready for review.
- Code review follow-up fixed the Havok switch handoff by teleporting the replacement body before restoring velocity, so swaps now preserve real runtime position and heading instead of only mesh state.
- Added tuning-driven `model.bodyStyle` data and distinct vehicle silhouettes for sedan, sports car, and heavy truck so the active runtime now applies different models alongside each handling profile.
- Strengthened vehicle switching and factory tests to assert the teleport handoff and tuning-driven model composition, then reran `npm run check`, `npm test`, and `npm run build` cleanly.
- Updated the story File List to document the `.gitignore` worktree change that was missing during review.

## Change Log

- 2026-04-07: Implemented Task 2 with a dedicated vehicle manager, state-preserving vehicle switching, scene switch/cycle hooks, and unit coverage for the swap flow.
- 2026-04-07: Implemented Task 3 with controller possession rebinding, camera retargeting, and scene-level `vehicle.switched` handoff wiring.
- 2026-04-07: Implemented Task 4 with a `Tab`-driven vehicle-cycle input path routed through the controller and consumed by the world scene update loop.
- 2026-04-07: Implemented Task 5 by validating the existing vehicle-factory unit coverage and adding integration coverage for state-preserving vehicle switching with camera/controller reattachment.
- 2026-04-07: Final validation passed, story status updated to `review`, and sprint tracking synchronized for code review.
- 2026-04-07: Addressed code review findings by fixing the Havok switch handoff, adding tuning-driven vehicle body styles, strengthening coverage, and synchronizing story metadata back to `done`.

## File List

- `.gitignore`
- `_bmad-output/implementation-artifacts/2-1-switch-between-vehicle-types.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `public/data/tuning/heavy-truck.json`
- `public/data/tuning/sedan.json`
- `public/data/tuning/sports-car.json`
- `src/vehicles/cameras/create-starter-vehicle-camera.ts`
- `src/vehicles/controllers/player-vehicle-controller.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/vehicles/physics/vehicle-manager.ts`
- `tests/integration/starter-vehicle-camera.integration.spec.ts`
- `tests/integration/vehicle-switching.integration.spec.ts`
- `tests/unit/player-vehicle-controller.spec.ts`
- `tests/unit/vehicle-factory.spec.ts`
- `tests/unit/starter-vehicle-camera.spec.ts`
- `tests/unit/vehicle-manager.spec.ts`
