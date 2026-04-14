# Story 1.4: Drive with a Readable Third-Person Camera

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to drive with a readable third-person camera,
so that control feels reliable and satisfying.

## Acceptance Criteria

1. Given the player has spawned directly into the starter vehicle, when the scene becomes controllable, then the camera smoothly transitions to a chase camera anchored behind and slightly above the vehicle, facing its forward vector, so the player has immediate spatial awareness of the road ahead.
2. Given the player accelerates or reaches high speeds, when the vehicle moves forward, then the camera dynamically adjusts its follow distance, field of view (FOV), or stiffness to convey a sense of speed while keeping the vehicle framed clearly and preventing the view from dropping below the vehicle bounds.
3. Given the vehicle turns, drifts, or experiences sudden rotational changes (e.g., handbrake turns), when the heading shifts, then the camera follows the vehicle's new trajectory with a readable, tuned interpolation delay so the player can anticipate the turn without rigid, disorienting 1:1 rotation lock.
4. Given the vehicle encounters uneven terrain, curbs, or jumps, when the vehicle's pitch and roll change rapidly, then the camera dampens or filters extreme vertical oscillation so the horizon remains relatively stable and motion sickness is minimized.
5. Given the player is driving the starter vehicle, when they use the right stick on a gamepad or the mouse to look around, then the camera allows temporary free-look control while returning smoothly to the vehicle's forward vector once manual look input ceases.
6. Given the player reverses the vehicle, when the vehicle moves backward for more than a brief threshold, then the camera transitions to view the area behind the vehicle or widens its perspective so the player can navigate backward safely without a blind spot.

## Tasks / Subtasks

- [x] Task 1: Replace minimal follow camera with a configurable chase camera (AC: 1, 2)
  - [x] Subtask 1.1: Refactor `src/vehicles/cameras/create-starter-vehicle-camera.ts` to utilize Babylon's advanced camera features (e.g., `FollowCamera`, or a tuned `ArcRotateCamera` with auto-rotation, or a custom script on a `TargetCamera`).
  - [x] Subtask 1.2: Implement dynamic FOV or distance adjustment based on the vehicle's current velocity.
- [x] Task 2: Implement camera interpolation and stabilization (AC: 3, 4)
  - [x] Subtask 2.1: Add rotational damping to soften sudden heading changes.
  - [x] Subtask 2.2: Add vertical filtering to keep the horizon stable over bumps.
- [x] Task 3: Implement free-look and reverse handling (AC: 5, 6)
  - [x] Subtask 3.1: Bind mouse and right gamepad stick input to a temporary free-look override.
  - [x] Subtask 3.2: Implement automatic return-to-center logic when manual input stops.
  - [x] Subtask 3.3: Implement a reverse-cam state when the vehicle is in a sustained backward motion.
- [x] Task 4: Add unit and integration tests (AC: 1-6)
  - [x] Subtask 4.1: Write unit tests in `tests/unit/starter-vehicle-camera.spec.ts` for camera logic, damping calculations, and state transitions.
  - [x] Subtask 4.2: Update or add integration tests to verify camera attachment, input overrides, and reverse transitions within a loaded slice context.

## Dev Notes

- Story 1.3 introduced a minimal follow camera to make direct-drive testable. Story 1.4 expands this into a fully readable chase camera that makes the driving loop satisfying. [Source: `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Stories"; `_bmad-output/implementation-artifacts/1-3-spawn-directly-into-a-car.md`]
- The camera should be self-contained in `src/vehicles/cameras/create-starter-vehicle-camera.ts`. Avoid putting heavy logic inside `create-world-scene.ts` or polluting the main vehicle controller with camera state.
- Keep the design aligned with the 60 Hz fixed-step direction of the architecture. Camera updates should happen on the render loop (e.g., `scene.onBeforeRenderObservable`) but rely on smoothed physics state.

### Technical Requirements

- Build upon `src/vehicles/cameras/create-starter-vehicle-camera.ts`. If using `FollowCamera`, ensure rotation offset and height offset are correctly mapped to the vehicle's changing heading.
- Avoid 1:1 rigid locking. A "readable" camera requires interpolation (lerping) so the car can shift beneath the camera slightly during turns or jumps.
- Integrate look-around input using the existing device-agnostic controller contract (mouse/gamepad right stick). This may require extending the input manager or controller state.

### Architecture Compliance

- Maintain the separation of concerns: The vehicle physics body calculates its state, and the camera reads it to position itself. Do not allow the camera to influence the vehicle's physics.
- Cross-domain communication must continue through typed events if the camera needs to respond to specific non-physics events (e.g., player reset).
- Adhere strictly to the established `kebab-case` file naming and `camelCase` / `PascalCase` code conventions. [Source: `_bmad-output/project-context.md`]

### Library / Framework Requirements

- Babylon.js `9.1.0` provides robust camera types. Evaluate if `FollowCamera` needs to be extended or if an `ArcRotateCamera` driven by custom per-frame logic is more appropriate for smooth chase dynamics.
- Continue using Vite `8.0.5` and `@babylonjs/havok` `1.3.12`.

### File Structure Requirements

- `src/vehicles/cameras/create-starter-vehicle-camera.ts`
- `tests/unit/starter-vehicle-camera.spec.ts`

### Testing Requirements

- Verify the camera's behavior independently of the full world load by mocking the vehicle node and physics state in unit tests.
- Add integration coverage for the camera transitioning smoothly between forward and reverse states.

### Previous Story Intelligence

- Story 1.3 explicitly deferred "readable third-person camera polish and tuning to Story 1.4" to focus on spawn mechanics. The basic `create-starter-vehicle-camera.ts` is in place. Use this foundation. [Source: `_bmad-output/implementation-artifacts/1-3-spawn-directly-into-a-car.md`]

### Git Intelligence Summary

- Recent commits show a behavior-first, small-contract approach. Continue to write unit tests for the camera interpolation logic before relying solely on visual validation in the browser.

### Project Structure Notes

- No new domains are needed. Continue within `src/vehicles/cameras/`.

### Project Context Rules

- Frame-rate independence is crucial. Use `scene.getEngine().getDeltaTime()` or equivalent to ensure camera interpolation (lerping) is smooth regardless of actual FPS, aiming for a stable 60 FPS target. [Source: `_bmad-output/project-context.md`]

### References

- `_bmad-output/planning-artifacts/epics.md`, "Epic 1: World Slice & Core Driving"
- `_bmad-output/implementation-artifacts/1-3-spawn-directly-into-a-car.md`
- `src/vehicles/cameras/create-starter-vehicle-camera.ts`

## Dev Agent Record

### Agent Model Used

gemini-2.5-pro

### Debug Log References

### Completion Notes List
- Implemented a custom `TargetCamera` with smoothed chase behavior, forward/reverse FOV tuning, and heading flattening so pitch/roll spikes do not destabilize the horizon.
- Added source-aware mouse and gamepad free-look handling with smooth auto-centering and frame-rate independent right-stick response.
- Added a sustained reverse-camera state and loaded-slice integration coverage for attachment, free-look, and reverse transitions.
- All tests pass (41/41), including the added reverse and loaded-slice camera coverage.

### File List
- `src/vehicles/cameras/create-starter-vehicle-camera.ts`
- `src/vehicles/controllers/player-vehicle-controller.ts`
- `src/rendering/scene/create-world-scene.ts`
- `tests/unit/starter-vehicle-camera.spec.ts`
- `tests/unit/player-vehicle-controller.spec.ts`
- `tests/integration/starter-vehicle-camera.integration.spec.ts`

### Senior Developer Review (AI)
- Reviewer: Chris
- Date: 2026-04-07T17:35:11-07:00
- Outcome: Approve after automatic fixes
- Resolved findings: implemented the missing reverse camera behavior, flattened tilt handling for a steadier horizon, made gamepad free-look frame-rate independent, and replaced the camera integration test with a loaded-slice flow that verifies attachment, free-look, and reverse transitions.

## Change Log

- 2026-04-07T17:35:11-07:00: Senior developer review fixed the missing reverse-camera path, tightened chase-camera stabilization, updated input handling, and expanded camera test coverage. Story marked done.
