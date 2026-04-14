# Story 2.4: Use Simple Navigation Cues Like Street Names or a Minimap

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can use simple navigation cues like street names or a minimap,
so that place recognition is easier to sustain.

## Acceptance Criteria

1. Given a loaded sandbox session has reached `world-ready`, when gameplay is active, then a lightweight navigation HUD renders in the DOM shell layer without blocking canvas input or the existing location-shell controls.
2. Given the player is driving or on foot, when their controlled actor moves through the slice, then the HUD resolves the current road from the actor's live world position and shows a human-readable street label plus the slice's district/location anchor instead of only echoing spawn metadata or raw internal road ids.
3. Given the active slice comes from preset road data or fallback-generated roads, when the street label is shown, then preset roads preserve recognizable names and fallback roads use deterministic friendly display labels rather than slugs like `san-francisco-ca-arterial`.
4. Given the navigation HUD renders the minimap, when the scene updates, then it shows the full current slice in a fixed orientation using existing bounds and road geometry plus the active actor marker and facing, with no route guidance, zoom controls, map tiles, or extra rendering framework.
5. Given the player switches vehicles, exits, re-enters, hijacks another vehicle, or restarts from spawn, when control transfers or the scene resets, then the street label and minimap continue to follow the currently controlled actor without breaking the existing `controllable-vehicle`, `activeCamera`, `possessionMode`, and restart contracts.
6. Given the feature is implemented, when repo validation runs, then unit, integration, smoke, typecheck, and build checks confirm road-label resolution, fallback naming, minimap projection, non-blocking overlay behavior, and continuity across possession changes and restart.

## Tasks / Subtasks

- [x] Task 1: Add immutable road display metadata and current-road resolution helpers (AC: 2, 3, 4)
  - [x] Extend `SliceRoad` with a narrow display-label seam such as optional `displayName` while keeping `id` as the stable internal key used by chunks, spawns, and tests.
  - [x] Populate explicit road display names in `public/data/world-gen/location-presets.json` and keep any new road-display field optional or carefully updated in test fixtures that hand-construct manifests.
  - [x] Add a deterministic fallback label formatter for generated roads so derived slices never expose raw reuse-key slugs to players.
  - [x] Add a helper that resolves the current road from the active actor's `x/z` position against road segments with stable tie-breaking and low-flicker behavior near intersections.
- [x] Task 2: Expose a typed navigation snapshot from the world runtime (AC: 1, 2, 4, 5)
  - [x] Extend `WorldSceneHandle` with a narrow HUD-facing snapshot or subscription seam instead of making UI poll raw `canvas.dataset` strings.
  - [x] Publish the active actor position, facing, current street label, district/location copy, slice bounds, and minimap road geometry from `create-world-scene.ts`.
  - [x] Keep existing `scene.metadata` and `canvas.dataset` test hooks intact; add only non-breaking telemetry if extra hooks are needed.
- [x] Task 3: Build the lightweight navigation HUD overlay (AC: 1, 2, 4)
  - [x] Add a dedicated HUD host/component under the shell layer so `LocationEntryScreen.render()` cannot wipe the HUD DOM with its current `innerHTML` render strategy.
  - [x] Render current street plus district/location copy in a restrained GTA-familiar layout that supports recognition without dominating the screen.
  - [x] Render a simple fixed-orientation minimap for the full current slice using the existing bounds and road geometry, with only the active actor marker and facing.
  - [x] Keep the HUD non-interactive with `pointer-events: none` so canvas input and existing shell buttons still work.
- [x] Task 4: Preserve continuity across vehicle, on-foot, hijack, and restart transitions (AC: 2, 5)
  - [x] Follow the active vehicle in vehicle mode and the on-foot actor in on-foot mode using existing `VehicleManager` and `PlayerPossessionRuntime` seams.
  - [x] Ensure street labels and the minimap marker update correctly after `Tab` switches, `E` exit and re-entry, hijack completion, and same-location restart.
  - [x] Keep navigation state out of `session-state-machine.ts` and out of persisted manifest storage.
- [x] Task 5: Add automated coverage and repo validation (AC: 6)
  - [x] Add unit coverage for friendly road-label formatting, nearest-road resolution, intersection tie-breaking or stickiness, and minimap coordinate projection.
  - [x] Add integration or smoke coverage that the HUD host survives shell renders, follows possession changes, and resets cleanly on restart.
  - [x] Re-run `npm run check`, `npm test`, and `npm run build` before marking the story ready for review.

## Dev Notes

- Epic 2 is about turning the vertical slice into a richer exploration sandbox. Story 2.4 should strengthen familiar-place recognition without turning navigation into a heavy authored waypoint system.
- No dedicated UX artifact or `project-context.md` was found during workflow discovery. Use the GDD, architecture, current repo structure, completed Epic 2 stories, and existing tests as the controlling guidance for this story.
- The brainstorming artifacts point toward a restrained street-aware navigation layer: light HUD assistance that supports recognition, while road geometry and district rhythm remain the primary orientation tools.

### Technical Requirements

- Implement the navigation UI as a DOM overlay mounted beside the existing `LocationEntryScreen`; do not add Babylon GUI, scene-anchored text labels, or a third-party minimap package for this story.
- `LocationEntryScreen.render()` currently rewrites its host with `innerHTML`. Add a separate child or sibling HUD host in `createGameApp()` so the screen render path cannot wipe the HUD DOM.
- Extend `SliceRoad` with a narrow immutable display-label seam such as optional `displayName`; keep `id` as the stable internal key for chunks, spawns, tests, and dataset metadata. Do not repurpose `id` as player-facing UI copy.
- Update preset road data with explicit display names for recognizable roads. For fallback-generated slices, synthesize deterministic friendly labels from road role and stable ordering instead of exposing raw ids or reuse-key slugs.
- Resolve the current road from the live controlled actor position: use `vehicleManager.getActiveVehicle().mesh.position` in vehicle mode and `possessionRuntime.getOnFootRuntime()?.mesh.position` in on-foot mode. Do not keep showing `spawnCandidate.roadId` after scene load.
- Use a deterministic nearest-segment rule. To reduce flicker near intersections, prefer the previously selected road while it remains within tolerance, then break ties by smallest horizontal distance to segment, then road-kind priority (`primary` before `secondary` before `tertiary`), then stable lexical road id.
- The minimap should be fixed-orientation and full-slice. Show only simplified road polylines, the slice boundary, and the active actor marker and facing. No route guidance, mission markers, zoom or pan controls, click interaction, traffic icons, or map tiles are needed.
- Keep the HUD lightweight and readable. The world remains the main recognition source; the UI should assist place memory, not dominate the screen.
- Keep overlay pointer events disabled and rendering cheap. Avoid per-frame DOM subtree rebuilds or unnecessary allocations in the scene render loop; cache static minimap geometry if possible and only update the changing marker or label state.
- If the current road cannot be resolved confidently, fall back to district or location copy rather than blanking the HUD or exposing raw ids.
- Keep input unchanged unless a truly minimal toggle falls out naturally from the existing seams. No new required key binding is needed to use the cues.

### Architecture Compliance

- Keep top-level loading and shell phases in `src/app/state/session-state-machine.ts` unchanged. Navigation state is world-runtime and HUD state, not app-session state. [Source: `src/app/state/session-state-machine.ts`; `_bmad-output/planning-artifacts/game-architecture.md#State Management`]
- Let the world scene runtime remain the source of truth for active actor position, facing, and current-road resolution. `src/app/bootstrap/create-game-app.ts` may bridge typed snapshot data to the HUD, but it should not own gameplay-resolution logic.
- Extend `WorldSceneHandle` with a narrow typed snapshot or subscription seam instead of making UI code parse `canvas.dataset` values every frame. That keeps runtime contracts explicit and testable.
- Preserve the existing `scene.metadata` and `canvas.dataset` contracts such as `readyMilestone`, `spawnRoadId`, `spawnChunkId`, `activeCamera`, and `possessionMode`. Additive telemetry is fine; renames or behavioral regressions are not. [Source: `src/rendering/scene/create-world-scene.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/smoke/world-scene-possession.smoke.spec.ts`]
- Keep road display metadata immutable inside `SliceManifest` and `SliceRoad`. Do not push live `currentRoad` state into manifest storage, session persistence, or world-generation caches. [Source: `src/world/chunks/slice-manifest.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Data Persistence`]
- Keep active actor tracking inside the existing world-runtime seams: `VehicleManager` for the active vehicle and `PlayerPossessionRuntime` for on-foot runtime ownership. Do not introduce a second possession tracker just for HUD updates.
- Prefer a handle-level snapshot or subscription over new high-volume global events. If you add an event, keep it narrow and typed with `domain.action` naming. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`]

### Library / Framework Requirements

- Stay on the repo's pinned stack: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and `vite` `8.0.5`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`]
- Latest stable package check for this workflow: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and `vite` `8.0.7`. Babylon and Havok already match the latest stable versions in use here; do not upgrade Vite inside this story unless there is a separate tooling reason and validation plan.
- Use plain DOM and CSS for the overlay and, if helpful, a tiny `canvas` or `svg` inside the HUD component. Do not add `@babylonjs/gui`, a route-planning library, or any third-party minimap dependency for this story.
- Reuse the current Babylon scene data and TypeScript utilities. No new state-management, physics, rendering, or mapping framework is needed.

### File Structure Requirements

- Keep host wiring in `src/app/bootstrap/create-game-app.ts`; this is the right place to split the current shell host into separate screen and HUD surfaces if needed.
- Keep runtime snapshot publication in `src/rendering/scene/create-world-scene.ts` and focused helper types or utilities in `src/rendering/scene/world-scene-runtime.ts` or another small scene-adjacent helper.
- Add the HUD component under a minimal new seam such as `src/ui/hud/world-navigation-hud.ts`; avoid pushing HUD DOM code into `src/ui/shell/location-entry-screen.ts`.
- Add immutable road display metadata in `src/world/chunks/slice-manifest.ts` and generator or preset plumbing in `src/world/generation/world-slice-generator.ts` plus `public/data/world-gen/location-presets.json`.
- Likely touchpoints for this story are:
  - `src/app/bootstrap/create-game-app.ts`
  - `src/rendering/scene/create-world-scene.ts`
  - `src/rendering/scene/world-scene-runtime.ts`
  - `src/ui/shell/location-entry-screen.ts` only if shell-host ownership needs a narrow adjustment
  - `src/ui/hud/` (new minimal seam)
  - `src/world/chunks/slice-manifest.ts`
  - `src/world/generation/world-slice-generator.ts`
  - `public/data/world-gen/location-presets.json`
  - relevant unit, integration, and smoke tests
- Keep any new road-resolution or minimap-projection helper close to the existing scene or runtime files; do not backfill the entire future `src/world/navigation/` architecture directory for this one story.
- Many tests hand-construct `SliceManifest` objects. Make any new road display field optional or update fixtures carefully so unrelated tests do not fail for the wrong reason.

### Testing Requirements

- Follow the existing repo pattern:
  - unit tests in `tests/unit/*.spec.ts`
  - integration tests in `tests/integration/*.spec.ts`
  - app and scene contract coverage in `tests/smoke/*.spec.ts`
- Add unit coverage for friendly road-label formatting, nearest-road resolution, intersection tie-breaking or stickiness, and minimap coordinate projection or clamping.
- Add scene or runtime unit coverage that the HUD snapshot uses active vehicle position in vehicle mode and on-foot actor position in on-foot mode.
- Add app-bootstrap or integration coverage that the HUD host survives `LocationEntryScreen.render()` and becomes visible at `world-ready` without blocking the location overlay controls.
- Add smoke coverage for `Tab` switching, `E` exit or re-entry, hijack completion, and restart continuity so the street label and minimap marker follow the current controlled actor across possession changes.
- Preserve the current startup success contract: `world.scene.ready` still reports `readinessMilestone: "controllable-vehicle"`, and restart-from-spawn still returns to that baseline. [Source: `src/app/events/game-events.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]
- Finish implementation validation with `npm run check`, `npm test`, and `npm run build`.

### Previous Story Intelligence

- Story 2.3 established `PlayerPossessionRuntime` as the owner of vehicle vs on-foot interaction and hijack transfer. Reuse its mode and `getOnFootRuntime()` seam to decide which actor the HUD should follow. [Source: `_bmad-output/implementation-artifacts/2-3-hijack-another-car.md`]
- Story 2.3 also kept hijackable and abandoned vehicles as dynamic world-root entities. The navigation HUD should follow only the currently controlled actor, not try to track all vehicle runtimes at once.
- Story 2.2 introduced the repo's shared one-read input frame and explicit camera telemetry names. The HUD should consume typed runtime state rather than re-reading input or attaching its own controls. [Source: `_bmad-output/implementation-artifacts/2-2-exit-and-re-enter-vehicles.md`]
- Stories 2.2 and 2.3 both protected same-location restart and `world.scene.ready` contracts. This story must not regress that fast reset loop or readiness telemetry.
- Story 2.1 established `VehicleManager` ownership and `vehicle.switched` handoff semantics. Use the manager's active runtime as the vehicle-mode source of truth after switches and hijacks. [Source: `_bmad-output/implementation-artifacts/2-1-switch-between-vehicle-types.md`]
- Story 1.5 kept restart fast by reusing cached `SliceManifest`. Keep navigation data derived from the current manifest and current actor so restart remains cheap and deterministic. [Source: git commit `545fd25`; `src/app/bootstrap/create-game-app.ts`]

### Git Intelligence Summary

- Recent implementation patterns favor narrow feature additions with explicit unit, integration, and smoke coverage, then story and sprint metadata synchronization.
- Commit `64b284f` (`Add vehicle hijack flow`) extended `create-world-scene.ts`, `player-possession-runtime.ts`, `vehicle-manager.ts`, and focused tests without altering app-session state; follow that pattern for HUD continuity.
- Commit `cdd58a7` (`Add vehicle exit and re-entry flow`) introduced explicit possession telemetry plus on-foot camera and runtime seams; reuse those seams for actor selection and current-road updates.
- Commit `3da8815` (`Add switchable vehicle types with seamless handoff`) established `VehicleManager` and world-scene handoff logic; navigation state must stay aligned with the active vehicle after switches.
- Commit `545fd25` (`Add explicit same-location restart from spawn`) shows restart behavior is first-class and protected by smoke and integration coverage; HUD state must reset cleanly on restart.

### Latest Tech Information

- npm registry checks during this workflow report `@babylonjs/core` `9.1.0` and `@babylonjs/havok` `1.3.12` as the current latest stable releases, matching the repo pins.
- npm registry checks report `vite` `8.0.7` as the latest stable while the repo pin remains `8.0.5`; treat any Vite upgrade as out of scope for this story.
- No extra dependency is needed for the HUD. The current stack already supports the required implementation with Babylon scene data plus a DOM and CSS overlay.
- Current Vite stable still targets Node `^20.19.0 || >=22.12.0`; if local tooling changes later, validate that separately instead of coupling it to this gameplay and UI story.

### Project Structure Notes

- The architecture's long-term `src/ui/hud/` structure is not materialized yet. Today the repo has `src/ui/shell/` only, so this story is the right place to add the smallest dedicated HUD seam.
- `LocationEntryScreen` currently owns its host via `innerHTML`, so sharing that host directly with a new HUD component is a regression risk.
- `WorldSceneHandle` currently exposes only `canvas`, `cycleVehicle`, `switchVehicle`, and `dispose`; a typed HUD snapshot or subscription seam is the smallest clean way to bridge world runtime state to the shell layer.
- Current world data already includes slice bounds and road geometry but not explicit street labels. Add the narrowest immutable label seam needed; do not redesign chunk or spawn contracts.

### Project Context Rules

- No `project-context.md` file was found in the workspace during workflow discovery.
- Use the architecture document, `package.json`, current repo structure, completed Epic 2 stories, and existing tests as the governing project rules for this story.
- The architecture selected Context7 as the default up-to-date docs source for Babylon.js and Vite work. If implementation needs external docs, prefer that tool rather than introducing speculative library changes. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 2: Exploration & Vehicle Interaction Sandbox`
- `_bmad-output/planning-artifacts/gdd.md#Core Gameplay Loop`
- `_bmad-output/planning-artifacts/gdd.md#Game Mechanics`
- `_bmad-output/planning-artifacts/gdd.md#Controls and Input`
- `_bmad-output/planning-artifacts/gdd.md#Level Design Principles`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/game-architecture.md#UI Architecture`
- `_bmad-output/planning-artifacts/game-architecture.md#Scene Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#Implementation Patterns`
- `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md` (UI entries around lines 382-392 and HUD entries around lines 778-788)
- `_bmad-output/implementation-artifacts/2-1-switch-between-vehicle-types.md`
- `_bmad-output/implementation-artifacts/2-2-exit-and-re-enter-vehicles.md`
- `_bmad-output/implementation-artifacts/2-3-hijack-another-car.md`
- `package.json`
- `public/data/world-gen/location-presets.json`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/app/state/session-state-machine.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/sandbox/on-foot/player-possession-runtime.ts`
- `src/sandbox/on-foot/on-foot-runtime.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/world-scene-possession.smoke.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test -- tests/unit/world-slice-generator.spec.ts tests/unit/world-navigation.spec.ts`
- `npm run check`
- `npm test`
- `npm test -- tests/unit/world-scene-runtime.spec.ts`
- `npm run check`
- `npm test`
- `npm test -- tests/integration/world-navigation-hud.integration.spec.ts`
- `npm run check`
- `npm test`
- `npm test -- tests/unit/world-scene-runtime.spec.ts tests/integration/world-navigation-hud.integration.spec.ts`
- `npm run check`
- `npm test`
- `npm test -- tests/unit/world-navigation-hud.spec.ts tests/integration/world-navigation-hud.integration.spec.ts`
- `npm run check`
- `npm test`
- `npm run build`
- `npm test -- tests/unit/world-navigation-hud.spec.ts tests/unit/world-scene-runtime.spec.ts`
- `npm run check`
- `npm test -- tests/integration/world-navigation-hud.integration.spec.ts`
- `npm test`
- `npm run build`
- `npm test -- tests/smoke/app-bootstrap.smoke.spec.ts tests/smoke/world-scene-possession.smoke.spec.ts tests/smoke/vehicle-hijack-restart.smoke.spec.ts`
- `npm run check`
- `npm test`
- `npm run build`

### Implementation Plan

- Keep `SliceRoad.id` untouched as the internal stable key and add an optional immutable `displayName` seam for UI-facing copy.
- Normalize preset and fallback road labels during slice generation so every manifest road has deterministic player-facing text before scene runtime begins consuming it.
- Add a focused scene-adjacent road resolver that works from live `x/z` positions, prefers the previously selected road while it remains within tolerance, and then breaks ties by distance, road kind priority, and lexical road id.
- Expose navigation data through `WorldSceneHandle` as typed snapshot and subscription seams so the future HUD can subscribe directly to world-runtime state instead of reading `canvas.dataset` strings.
- Mount the HUD in its own host beside the shell host, then keep the overlay DOM persistent while updating only the labels and actor marker from typed navigation snapshots.
- Reset sticky road selection whenever control transfers to a different actor so hijacks, vehicle switches, and other possession handoffs do not incorrectly keep the previous road label.
- Keep minimap projection deterministic by clamping projected points into the fixed padded frame, and cover that projection plus HUD subscription updates with focused unit and integration tests.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- No UX artifact or `project-context.md` was found; story guidance is grounded in the GDD, architecture, current codebase, completed Epic 2 stories, git-history patterns, and latest package-version checks.
- Completed Task 1 by adding optional immutable road display metadata, preset road display names, deterministic fallback labels for generated roads, and a focused current-road resolver.
- Added unit coverage for preset display-name preservation, fallback-friendly labels, previous-road stickiness, distance tie-breaking, road-kind priority, lexical tie-breaking, and no-match behavior.
- Completed Task 2 by publishing a typed world-navigation snapshot with active actor position, facing, current street label, district/location copy, slice bounds, and minimap road geometry.
- Extended `WorldSceneHandle` with snapshot/subscription hooks while preserving the existing `scene.metadata` and `canvas.dataset` telemetry used by current tests.
- Added runtime unit coverage to prove the navigation snapshot follows the active vehicle in vehicle mode and the on-foot actor in on-foot mode.
- Completed Task 3 by adding a dedicated world-navigation HUD host plus a lightweight DOM/SVG overlay for street labels and a fixed-orientation full-slice minimap.
- Kept the HUD non-interactive with `pointer-events: none`, mounted it outside the shell host so shell rerenders cannot wipe it, and wired it to the typed world-scene navigation subscription.
- Added integration coverage proving the HUD renders in `world-ready`, includes the minimap and actor marker, and survives shell rerenders when the player returns to edit mode.
- Completed Task 4 by resetting sticky road state on actor transfer so navigation follows the current controlled actor cleanly through possession changes instead of clinging to a previous road.
- Added continuity coverage for actor-transfer road relabeling and HUD resubscription across restart so street labels and marker position refresh from the newly controlled actor and scene.
- Kept all navigation state runtime-local to the world scene and HUD path; no session-state-machine or manifest persistence changes were introduced.
- Completed Task 5 by adding minimap projection and clamping unit coverage plus integration coverage for HUD updates during possession changes.
- Re-ran the final repo validations required by the story: `npm run check`, `npm test`, and `npm run build` all passed.
- Enhanced definition-of-done validation passed; story status and sprint tracking are both set to `review`.
- Manual QA follow-up fixed the minimap orientation so the projection is top-down and the vehicle marker heading now uses the live mesh forward direction instead of a stale Euler yaw.
- Follow-up validation after the manual QA fix also passed: `npm run check`, `npm test`, and `npm run build`.
- Code review follow-up added smoke coverage for navigation HUD rendering, exit/re-entry continuity, and hijack/restart continuity so AC 6 now includes unit, integration, smoke, typecheck, and build confirmation.
- Code review follow-up cached static navigation road snapshots and removed per-frame HUD geometry serialization so the minimap path no longer rebuilds static geometry inputs every frame.
- Code review follow-up synced the story File List to include `src/app/bootstrap/create-game-app.ts` plus the smoke suites updated during review.
- Final review-fix validation also passed: `npm run check`, `npm test`, and `npm run build`.

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `public/data/world-gen/location-presets.json`
- `src/app/bootstrap/create-game-app.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-navigation.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/styles.css`
- `src/ui/hud/world-navigation-hud.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/road-display-name.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/integration/world-navigation-hud.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`
- `tests/smoke/world-scene-possession.smoke.spec.ts`
- `tests/unit/world-navigation-hud.spec.ts`
- `tests/unit/world-navigation.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`

## Change Log

- 2026-04-08: Added a lightweight street-label and minimap HUD with typed world-scene snapshot wiring, deterministic road naming and resolution, possession-safe continuity updates, and the supporting unit/integration/smoke validation coverage.
- 2026-04-08: Fixed minimap orientation and vehicle heading so the map renders top-down and the driving marker follows the car's real facing direction.
- 2026-04-08: Code review follow-up added explicit navigation smoke coverage, cached static minimap geometry inputs, synced the story file list, and moved the story to done.
