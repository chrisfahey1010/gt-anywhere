# Story 2.5: Replay the Same Location with Different Vehicles or Intentions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can replay the same location with different vehicles or intentions,
so that the sandbox has immediate replay value.

## Acceptance Criteria

1. Given the player has reached `world-ready` in a chosen location, when the world-ready shell overlay is shown, then it exposes a compact same-location replay launcher that uses the current resolved place and cached slice context without requiring the player to retype the location or triggering a new location resolve.
2. Given the player launches a same-location replay variant, when the next run starts, then the app reuses the current cached `SliceManifest`, `reuseKey`, `sliceId`, bounds, roads, and spawn area instead of regenerating the place, and it still disposes the previous scene before the new scene becomes authoritative.
3. Given the replay selection specifies one of the currently shipped starter vehicle types (`sedan`, `sports-car`, or `heavy-truck`), when the replayed run becomes ready, then the player spawns at the existing starter spawn in that chosen vehicle type with the normal `controllable-vehicle` readiness milestone, controller and camera possession, and navigation HUD continuity intact.
4. Given the replay selection specifies an intention preset, when the run is relaunched, then the preset is represented as lightweight session-scoped replay metadata and shell copy that may bundle a default starter vehicle plus a short prompt such as `Cruise`, `Precision`, or `Chaos`, without introducing a mission system, separate authored game mode, altered world-generation path, or persistent replay data inside `SliceManifest`.
5. Given the player uses existing flows such as plain `Restart from spawn`, `Edit location`, `Retry load`, `Tab` vehicle switching, `E` exit and re-entry, hijack, or the navigation HUD, when this story is implemented, then those flows keep their current behavior unless the player explicitly launches a replay variant, and plain restart still avoids location re-resolution.
6. Given the feature is implemented, when repo validation runs, then unit, integration, smoke, typecheck, and build checks confirm replay-option state handling, cached same-location reload behavior, selected starter-vehicle spawning, intention-preset UI continuity, and no regression in restart, possession, hijack, or navigation contracts.

## Tasks / Subtasks

- [x] Task 1: Model replay selections and thread them through existing session contracts (AC: 1, 2, 4, 5)
  - [x] Add one canonical typed seam for same-location replay launch data such as `ReplaySelection`, kept separate from location identity and world-generation presets.
  - [x] Define replay-option and intention-preset data in one app-owned module such as `src/app/config/replay-options.ts` so shell UI and scene bootstrap share the same normalized launch contract.
  - [x] Carry replay-launch selection through `createGameApp()` and the existing handoff or scene-load path without adding a second global source of truth or forcing a new location resolve.
  - [x] Keep plain `Restart from spawn` semantics unchanged; replay variants should be explicit and opt-in.
- [x] Task 2: Add a lightweight same-location replay launcher to the shell overlay (AC: 1, 4, 5)
  - [x] Extend `LocationEntryScreen.render()` to show replay choices only when the current session is `world-ready`.
  - [x] Offer both direct vehicle replays (`sedan`, `sports-car`, `heavy-truck`) and a small intention-preset layer built from current capabilities, not future mission systems.
  - [x] Normalize every replay button or preset selection into the same `ReplaySelection` payload before the reload starts; do not maintain parallel shell-only and scene-only launch rules.
  - [x] Keep the UI low-friction and additive, with stable `data-testid` hooks for tests.
- [x] Task 3: Spawn the selected replay vehicle at world bootstrap without changing static slice data (AC: 2, 3, 4, 5)
  - [x] Extend `CreateWorldSceneOptions` with a narrow starter-vehicle selection and any minimal replay metadata needed at launch time.
  - [x] Replace the hard-coded default starter-vehicle selection in `create-world-scene.ts` only for replay-variant launches while keeping the existing baseline path intact for plain restart and first-load behavior.
  - [x] Reuse `VehicleManager`, tuning loading, controller binding, camera target handoff, and world-scene telemetry patterns from Stories 2.1 through 2.4.
- [x] Task 4: Preserve cached same-location and dynamic-session boundaries (AC: 2, 5)
  - [x] Keep `SliceManifest`, `SpawnCandidate`, `reuseKey`, and manifest-store caching keyed to place identity only; replay variants must not fork static slice storage or mutate manifest data.
  - [x] Keep manifest-store identity stable across replay variants; `sliceId`, `reuseKey`, and store cardinality should remain unchanged when only the replay selection changes.
  - [x] Recreate dynamic session state through the existing reload flow so on-foot, hijackable, abandoned-vehicle, and navigation-runtime state starts clean on replay.
  - [x] Preserve active-load cancellation, scene disposal, `world.scene.ready`, and existing shell and HUD ownership contracts.
- [x] Task 5: Add automated coverage and repo validation (AC: 6)
  - [x] Add unit coverage for replay-selection modeling, state transitions, and any vehicle or intention default mapping.
  - [x] Add integration coverage that replaying the same location reuses the cached manifest and reaches the scene loader with the chosen starter vehicle without a second location resolve.
  - [x] Add smoke coverage that replay variants preserve readiness, navigation HUD continuity, and restart or hijack cleanup while plain restart still behaves as before.
  - [x] Re-run `npm run check`, `npm test`, and `npm run build` before marking the story ready for review.

## Dev Notes

- Epic 2 already delivers mid-session vehicle variety, possession changes, hijacking, and navigation. Story 2.5 should turn those capabilities into an explicit same-location replay loop, not widen scope into missions, traffic, or new persistence infrastructure.
- Immediate replay value is the point: the player should stay anchored to the same recognizable place while deliberately relaunching a different run flavor with minimal friction. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 2: Exploration & Vehicle Interaction Sandbox`; `_bmad-output/planning-artifacts/gdd.md#Core Gameplay Loop`]
- No dedicated UX artifact or `project-context.md` was found during workflow discovery. Use the GDD, architecture, current repo structure, completed Epic 2 stories, git-history patterns, and current test suite as the controlling guidance.

### Non-Negotiables

- Do not re-resolve the location or regenerate the slice for a replay variant; replay is a post-resolve same-location launch on top of cached world data.
- Do not mutate `SliceManifest`, `SpawnCandidate`, `sliceId`, `reuseKey`, or manifest-store identity to represent replay choices.
- Do not move replay controls into the world HUD; keep them in the shell overlay.
- Do not add a second vehicle-ownership system or a new top-level session phase for replay selection.
- Keep plain `Restart from spawn` behavior intact as the existing fast baseline.

### Technical Requirements

- Keep the current plain `Restart from spawn` action intact as the fast baseline restart. Add a separate same-location replay launcher or adjacent action instead of silently changing restart semantics. [Source: `src/ui/shell/location-entry-screen.ts`; `tests/integration/location-entry.integration.spec.ts`; `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`]
- Represent replay choice via one canonical app-level type such as `ReplaySelection`, with definitions centralized in a single module such as `src/app/config/replay-options.ts`. Do not duplicate option arrays or vehicle-intention mappings across shell and scene code, and do not overload location-generation preset terminology for replay-launch options. [Source: `src/world/generation/world-slice-generator.ts`; `public/data/world-gen/location-presets.json`; `_bmad-output/planning-artifacts/game-architecture.md#Configuration`]
- Reuse the currently shipped vehicle types `sedan`, `sports-car`, and `heavy-truck`; do not expand the roster or add new tuning files just to satisfy this story. [Source: `src/rendering/scene/create-world-scene.ts`; `public/data/tuning/`; `_bmad-output/implementation-artifacts/2-1-switch-between-vehicle-types.md`]
- Treat `intentions` as lightweight self-directed replay presets that may preselect a starter vehicle and show short guiding copy such as `Cruise`, `Precision`, or `Chaos`. Do not implement a formal mission system, objective tracker, score layer, new AI density system, or separate authored game mode here. [Source: `_bmad-output/planning-artifacts/gdd.md#Core Gameplay Loop`; `_bmad-output/planning-artifacts/gdd.md#Game Mechanics`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`]
- Same-location replay must reuse the current resolved location and cached manifest data. Do not re-resolve the place, regenerate roads, or mutate `reuseKey`, `sliceId`, bounds, or road layout just to apply a replay choice. [Source: `src/app/bootstrap/create-game-app.ts`; `src/world/generation/location-resolver.ts`; `src/world/generation/slice-manifest-store.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Implementation Patterns`]
- Replay launch data is post-resolve app-session metadata. If it needs to reach scene bootstrap, thread it through typed app or scene contracts such as `WorldGenerationRequest` or `CreateWorldSceneOptions`, but do not push replay choice into `SessionLocationIdentity`, resolver behavior, or manifest keys. Do not rely on DOM scraping, global mutable singletons, or hard-coded UI state. [Source: `src/world/generation/location-resolver.ts`; `src/rendering/scene/create-world-scene.ts`]
- The initial active vehicle in `create-world-scene.ts` is currently hard-coded to `DEFAULT_VEHICLE_TYPE`. Replace that with a typed launch-time selection while keeping current `VehicleManager` cycling and hijack flows intact after `world-ready`. [Source: `src/rendering/scene/create-world-scene.ts`; `src/vehicles/physics/vehicle-manager.ts`]
- Keep replay metadata session-scoped and runtime-light. No browser persistence, cloud sync, IndexedDB, or manifest serialization is required for this story unless a tiny, clearly justified seam is unavoidable. [Source: `src/world/generation/slice-manifest-store.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Data Persistence`]
- Preserve failure handling: if a chosen starter vehicle cannot load or spawn, keep the existing typed world-load failure behavior rather than leaving the app in an ambiguous state. [Source: `src/app/bootstrap/create-game-app.ts`; `src/world/generation/world-load-failure.ts`; `src/rendering/scene/create-world-scene.ts`]
- If a replay launch fails, return through the existing shell or failure path without leaving stale replay labels, stale HUD state, or partially updated selection UI behind. [Source: `src/app/bootstrap/create-game-app.ts`; `src/ui/shell/location-entry-screen.ts`; `src/ui/hud/world-navigation-hud.ts`]
- Keep the replay loop low-friction. The story should not add more than a minimal extra decision layer between `world-ready` and launching a same-location variant. [Source: `_bmad-output/planning-artifacts/gdd.md#Core Gameplay Loop`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`]

### Architecture Compliance

- Do not add a new top-level session phase for replay selection. Replay is launch metadata layered onto the existing same-location reload flow, not a second gameplay mode. [Source: `src/app/state/session-state-machine.ts`; `_bmad-output/planning-artifacts/game-architecture.md#State Management`]
- Keep cached world identity in the manifest store keyed by place identity only. Replay options should not create duplicate static manifests or change store cardinality when geography is unchanged. [Source: `src/world/generation/slice-manifest-store.ts`; `src/world/generation/location-resolver.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`]
- Reuse `LocationEntryScreen` and `createGameApp()` for replay-launch orchestration. Do not move replay UI into the in-world HUD or world-generation layers. [Source: `src/app/bootstrap/create-game-app.ts`; `src/ui/shell/location-entry-screen.ts`; `_bmad-output/planning-artifacts/game-architecture.md#UI Architecture`]
- Extend `CreateWorldSceneOptions` with a narrow launch-selection seam instead of letting `create-world-scene.ts` reach back into app-shell state. [Source: `src/rendering/scene/create-world-scene.ts`]
- Reuse `VehicleManager`, tuning loading, controller binding, and camera retargeting patterns from Stories 2.1 through 2.3. Do not add a second vehicle-ownership system or bypass the current physics stack. [Source: `src/vehicles/physics/vehicle-manager.ts`; `src/vehicles/physics/vehicle-factory.ts`; `_bmad-output/implementation-artifacts/2-1-switch-between-vehicle-types.md`; `_bmad-output/implementation-artifacts/2-3-hijack-another-car.md`]
- Preserve existing `scene.metadata`, canvas dataset telemetry, `world.scene.ready`, navigation subscription, and restart hooks. Additive telemetry is fine; renames or changed readiness semantics are not. [Source: `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/world-scene-runtime.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/integration/location-entry.integration.spec.ts`]
- If intention presets need data-driven definitions, keep them in one small app-owned seam such as `src/app/config/replay-options.ts`. Do not encode replay-launch concerns into `public/data/world-gen/` or `SliceManifest`. [Source: `src/world/chunks/slice-manifest.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Configuration`]
- Keep static slice data immutable. Replay variants should change launch-time dynamic session state only. [Source: `src/world/chunks/slice-manifest.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Consistency Rules`]

### Library / Framework Requirements

- Stay on the repo's pinned stack: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, and `vite` `8.0.5`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`]
- Latest checks during this workflow show `@babylonjs/core` `9.1.0` and `@babylonjs/havok` `1.3.12` still match the current latest stable npm releases, so no Babylon or Havok upgrade is needed for this story. Babylon `9.1.0` release notes are focused on broader engine features such as WebGPU improvements and internal package updates, not anything that should drive replay-flow churn here. [Source: npm registry checks during workflow; `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`]
- Latest checks during this workflow show `vite` `8.0.7` as current stable while the repo stays on `8.0.5`; Vite v8 still requires Node `^20.19.0 || >=22.12.0`. Treat any Vite upgrade as out of scope for this story. [Source: npm registry checks during workflow; `https://vite.dev/guide/`; `https://github.com/vitejs/vite/releases/tag/v8.0.7`]
- Use the existing DOM and CSS shell for replay selection. Do not add a UI framework, state-management library, or third-party menu package for this story. [Source: `src/ui/shell/location-entry-screen.ts`; `_bmad-output/planning-artifacts/game-architecture.md#UI Architecture`]
- Reuse the current Babylon plus Havok runtime path for selected replay vehicles. Do not introduce another physics backend, scene-management dependency, or persistence framework just to support replay launch options. [Source: `src/rendering/scene/create-world-scene.ts`; `src/vehicles/physics/vehicle-factory.ts`]

### File Structure Requirements

- Keep replay-launch UI in `src/ui/shell/location-entry-screen.ts`; store replay-option definitions in a single app-owned module such as `src/app/config/replay-options.ts`. If rendering logic becomes noisy, extract a tiny shell-adjacent helper instead of moving the feature into the world HUD.
- Keep orchestration in `src/app/bootstrap/create-game-app.ts`; that file already owns app-host creation, world-scene disposal, cached reloads, and world-ready transitions.
- Likely touchpoints for this story are:
  - `src/app/bootstrap/create-game-app.ts`
  - `src/app/state/session-state-machine.ts`
  - `src/app/events/game-events.ts` if replay-launch metadata is emitted or logged
  - `src/ui/shell/location-entry-screen.ts`
  - `src/world/generation/location-resolver.ts` only if `WorldGenerationRequest` needs a narrow replay-selection extension
  - `src/rendering/scene/create-world-scene.ts`
  - `src/vehicles/physics/vehicle-manager.ts` only if a tiny startup-selection seam is needed beyond current switching behavior
  - relevant unit, integration, and smoke tests
- Do not move replay-launch concerns into `src/world/generation/world-slice-generator.ts`, `public/data/world-gen/location-presets.json`, or `src/world/chunks/slice-manifest.ts` unless a very small compatibility field is absolutely unavoidable.
- The repo now has both `src/ui/shell/` and `src/ui/hud/`. Replay selection belongs in the shell overlay, while the navigation HUD should remain a separate world-ready display surface.

### Testing Requirements

- Follow the existing repo pattern:
  - unit tests in `tests/unit/*.spec.ts`
  - integration tests in `tests/integration/*.spec.ts`
  - app and scene contract coverage in `tests/smoke/*.spec.ts`
- Add unit coverage for replay-selection mapping, state transitions, and the rule that plain restart remains baseline while explicit replay variants carry different launch selections.
- Add integration coverage that replaying the same location reuses the cached manifest and current place identity, does not trigger a second resolver call, and reaches the scene loader with the chosen starter vehicle.
- Add an explicit assertion that replay variants do not create a second manifest-store entry or alter `sliceId` or `reuseKey` when only the replay selection changes.
- Add smoke coverage that same-location replay still reaches `readinessMilestone: "controllable-vehicle"`, starts with the chosen replay vehicle, and clears prior on-foot or hijack state the same way a clean reload does.
- Add a failure-path assertion that a failed replay launch returns to the existing recoverable shell or failure flow without stale replay labels or stale HUD state surviving the aborted run.
- Preserve current restart, navigation HUD, possession, and hijack coverage. If existing tests assert baseline restart behavior, keep those assertions valid and add separate replay-variant cases rather than rewriting the baseline contract away. [Source: `tests/integration/location-entry.integration.spec.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`; `tests/smoke/world-scene-possession.smoke.spec.ts`]
- Finish implementation validation with `npm run check`, `npm test`, and `npm run build`.

### Previous Story Intelligence

- Story 2.4 introduced the separate HUD host plus typed navigation snapshot subscription. Replay flow must resubscribe the HUD cleanly after a replayed run just as restart currently does; do not fold replay UI into the HUD layer. [Source: `_bmad-output/implementation-artifacts/2-4-use-simple-navigation-cues-like-street-names-or-a-minimap.md`; `src/app/bootstrap/create-game-app.ts`; `src/ui/hud/world-navigation-hud.ts`]
- Story 2.4 also protected `LocationEntryScreen.render()` from wiping the HUD by mounting the HUD elsewhere. Keep new replay controls inside the shell render tree, not beside it in the HUD host. [Source: `_bmad-output/implementation-artifacts/2-4-use-simple-navigation-cues-like-street-names-or-a-minimap.md`; `src/ui/shell/location-entry-screen.ts`]
- Story 2.3 established `PlayerPossessionRuntime` and restart-safe cleanup for hijackable and abandoned vehicles. Replay should start from a clean session baseline rather than carrying hijacked or abandoned vehicles into the new run. [Source: `_bmad-output/implementation-artifacts/2-3-hijack-another-car.md`; `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`]
- Story 2.2 established the shared input-frame and explicit `E` / `Tab` ownership model. Replay should use shell buttons or a similarly narrow app-level launch seam rather than adding new gameplay input bindings unless there is a compelling minimal reason. [Source: `_bmad-output/implementation-artifacts/2-2-exit-and-re-enter-vehicles.md`]
- Story 2.1 established `VehicleManager`, tuning-backed vehicle creation, and the current shipped vehicle roster. Use the same tuning-backed types for replay starter-vehicle selection rather than inventing a second spawn path. [Source: `_bmad-output/implementation-artifacts/2-1-switch-between-vehicle-types.md`; `src/vehicles/physics/vehicle-manager.ts`; `src/vehicles/physics/vehicle-factory.ts`]
- Story 1.5 established same-location restart by reusing the cached `SliceManifest` and guarding late load completions with `activeLoadId`. Replay must preserve that fast-path discipline. [Source: `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`; `src/app/bootstrap/create-game-app.ts`]

### Git Intelligence Summary

- Recent implementation patterns favor narrow feature additions in the current seams, then strong unit, integration, and smoke coverage, followed by story and sprint metadata synchronization.
- Commit `6830bcd` (`Add street-aware navigation HUD with minimap`) reinforced the current split between shell UI, world HUD, and typed world-scene subscriptions. Story 2.5 should use the same `createGameApp()` orchestration style for replay launch and HUD resubscription.
- Commit `64b284f` (`Add vehicle hijack flow`) kept multi-vehicle and restart continuity inside world-runtime reloads rather than layering manual cleanup into app state. Replay should rely on scene recreation to reset dynamic session state.
- Commit `cdd58a7` (`Add vehicle exit and re-entry flow`) protected possession as world-runtime state and kept restart compatible with on-foot transitions. Do not pull replay selection into a deeper possession system.
- Commit `3da8815` (`Add switchable vehicle types with seamless handoff`) established `VehicleManager`, tuning-backed vehicle creation, and camera or controller retargeting as the right vehicle-selection seam.
- Commit `545fd25` (`Add explicit same-location restart from spawn`) established the cached same-location reload contract and the tests that prove restart does not re-resolve or regenerate the location. Story 2.5 should extend around that behavior, not break it.

### Latest Tech Information

- `@babylonjs/core` `9.1.0` and `@babylonjs/havok` `1.3.12` remain the latest stable npm versions checked during this workflow, matching the repo pins. Focus this story on runtime behavior rather than dependency churn.
- Babylon `9.1.0` release notes are dominated by broader engine improvements such as WebGPU additions and internal tooling changes, not replay-flow requirements. There is no story-specific reason to chase engine changes here.
- `vite` `8.0.7` is the current latest stable while the repo remains on `8.0.5`; Vite v8 still targets Node `^20.19.0 || >=22.12.0`, and its guide continues to treat `index.html` as source-root entry. No build-tool change is needed for same-location replay UI or launch metadata.
- No extra dependency is needed for this story. The current stack already supports replay selection through DOM shell UI, typed TypeScript contracts, and the existing Babylon scene bootstrap.

### Project Structure Notes

- `LocationEntryScreen` already owns the `world-ready` overlay actions for restart, edit, and retry, so it is the natural home for replay-variant controls.
- `CreateWorldSceneOptions` currently includes only `renderHost`, `manifest`, and `spawnCandidate`; that is the cleanest existing seam for a minimal starter-vehicle launch extension.
- The manifest store is in-memory and keyed by `sliceId` and `reuseKey`. That is sufficient for immediate same-session replay and reinforces that this story does not need a new persistence layer.
- `create-world-scene.ts` currently hard-codes the initial active vehicle to `DEFAULT_VEHICLE_TYPE`, while later vehicle changes already route through `VehicleManager`. That split is the main current limitation this story needs to close.

### Project Context Rules

- No `project-context.md` file was found in the workspace during workflow discovery.
- Use the architecture document, `package.json`, current source structure, completed Epic 2 story files, and the current repo tests as the governing project rules for this story.
- The architecture selected Context7 as the preferred up-to-date documentation source for Babylon.js and Vite work. If implementation needs external docs, prefer that workflow rather than speculative dependency changes. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 2: Exploration & Vehicle Interaction Sandbox`
- `_bmad-output/planning-artifacts/gdd.md#Core Gameplay Loop`
- `_bmad-output/planning-artifacts/gdd.md#Game Mechanics`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/game-architecture.md#State Management`
- `_bmad-output/planning-artifacts/game-architecture.md#Data Persistence`
- `_bmad-output/planning-artifacts/game-architecture.md#UI Architecture`
- `_bmad-output/planning-artifacts/game-architecture.md#Configuration`
- `_bmad-output/planning-artifacts/game-architecture.md#Implementation Patterns`
- `_bmad-output/planning-artifacts/game-architecture.md#Consistency Rules`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`
- `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`
- `_bmad-output/implementation-artifacts/2-1-switch-between-vehicle-types.md`
- `_bmad-output/implementation-artifacts/2-2-exit-and-re-enter-vehicles.md`
- `_bmad-output/implementation-artifacts/2-3-hijack-another-car.md`
- `_bmad-output/implementation-artifacts/2-4-use-simple-navigation-cues-like-street-names-or-a-minimap.md`
- `package.json`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/app/state/session-state-machine.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/ui/hud/world-navigation-hud.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/vehicles/physics/vehicle-manager.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/location-resolver.ts`
- `src/world/generation/slice-manifest-store.ts`
- `src/world/generation/world-load-failure.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/vehicle-hijack-restart.smoke.spec.ts`
- `tests/smoke/world-scene-possession.smoke.spec.ts`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test -- tests/unit/replay-options.spec.ts tests/unit/session-state-machine.spec.ts`
- `npm test -- tests/integration/location-entry.integration.spec.ts`
- `npm test -- tests/unit/create-world-scene.spec.ts`
- `npm test -- tests/integration/location-entry.integration.spec.ts tests/integration/world-navigation-hud.integration.spec.ts tests/smoke/app-bootstrap.smoke.spec.ts`
- `npm run check`
- `npm test`
- `npm run build`

### Implementation Plan

- Add a canonical `ReplaySelection` config seam for direct vehicle replays and lightweight intention presets, then store that session-scoped metadata in app state instead of location or manifest identity.
- Thread replay launches through `LocationEntryScreen`, `createGameApp()`, and `CreateWorldSceneOptions` so replay variants reuse the cached manifest path while plain restart keeps the current baseline contract.
- Let scene bootstrap honor replay-selected starter vehicles without mutating cached slice data, then cover the flow with unit, integration, and smoke tests before repo-wide validation.

### Completion Notes List

- Added a canonical `ReplaySelection` seam plus centralized replay-option and intention-preset definitions, then stored replay metadata in session state without pushing it into location identity or manifest data.
- Extended the shell overlay with additive same-location replay controls, active replay copy, and stable `data-testid` hooks while keeping plain `Restart from spawn` explicit and unchanged.
- Threaded replay starter-vehicle selection through `createGameApp()` and `CreateWorldSceneOptions`, then let scene bootstrap honor non-default replay vehicles while keeping cached same-location reload behavior intact.
- Added unit, integration, and smoke coverage for replay selection modeling, cached-manifest reuse, starter-vehicle launch selection, HUD continuity, failure recovery, and baseline restart behavior.
- Validation passed with `npm run check`, `npm test` (108 passed), and `npm run build`.
- Senior developer review reran `npm run check`, `npm test`, and `npm run build`, then updated the story metadata so the File List only claims git-visible implementation changes.

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/config/replay-options.ts`
- `src/app/state/session-state-machine.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/styles.css`
- `src/ui/shell/location-entry-screen.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/integration/world-navigation-hud.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/unit/replay-options.spec.ts`
- `tests/unit/session-state-machine.spec.ts`

## Change Log

- 2026-04-08: Created the comprehensive story context for Story 2.5 and marked it ready for development.
- 2026-04-08: Implemented same-location replay variants with centralized replay selection modeling, starter-vehicle launch threading, shell launcher UI, and replay coverage across unit, integration, and smoke tests.
- 2026-04-08: Senior developer review approved the story, fixed the git/story metadata discrepancy, and synced story status tracking to done.

## Senior Developer Review (AI)

### Reviewer

Chris

### Date

2026-04-08T11:26:23-07:00

### Outcome

Approve

### Summary

- Verified all 6 acceptance criteria against the changed source and test files.
- Reran `npm run check`, `npm test`, and `npm run build`; all passed.
- Fixed the review discrepancy by removing the git-ignored story artifact from the File List so it no longer claims a non-git-visible change.

### Findings Addressed

- [fixed][HIGH] The story File List claimed `_bmad-output/implementation-artifacts/2-5-replay-the-same-location-with-different-vehicles-or-intentions.md` as a changed file even though that artifact is ignored by `.gitignore`, so it could never appear in `git status --porcelain`. The review removed that false claim from the File List.
