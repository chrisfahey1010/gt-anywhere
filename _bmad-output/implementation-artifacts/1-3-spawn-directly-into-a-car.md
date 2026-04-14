# Story 1.3: Spawn Directly Into a Car

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to spawn directly into a car,
so that the first interaction is immediate driving.

## Acceptance Criteria

1. Given I have already reached a valid loaded slice from Story 1.2, when Story 1.3 continues the flow, then the app uses the existing `SliceManifest` and planned spawn data to place a starter vehicle without asking me to re-enter the location or regenerate the slice.
2. Given the starter vehicle spawns successfully, when the world becomes playable, then I begin already seated in and possessing that vehicle with baseline throttle, brake or reverse, steering, and handbrake input active through a device-agnostic controller contract that preserves keyboard support and does not block first-class gamepad mappings, so the first interaction is immediate motion rather than an on-foot or enter-vehicle step.
3. Given a planned spawn location is chosen, when the starter vehicle is created, then it spawns on the selected road, lane, or shoulder, aligned to the chosen heading, clear of slice bounds, buildings, barriers, and placeholder massing, and ready for immediate control.
4. Given Story 1.2 already separates static slice data from runtime state, when Story 1.3 introduces the starter vehicle, then the manifest remains static and serializable while vehicle and possession state live in dynamic session or runtime state.
5. Given the current world-loading flow uses `world-loading` and `world-ready` phases, when vehicle spawn is integrated, then the app does not report `world-ready` until the starter vehicle is present and controllable, it measures that milestone as the drivable-world readiness point for timing and logging, and it preserves the existing shell and render-host ownership model.
6. Given the browser shell already collapses to a lightweight overlay after slice load, when direct car spawn completes, then the Babylon world remains the primary viewport and any remaining shell UI stays minimal and non-blocking.
7. Given starter vehicle spawn or possession fails in a recoverable way, when the player cannot be placed into a usable car, then the app emits typed structured failure details with distinct stage and code coverage for vehicle spawn versus possession failures, preserves the resolved location and loaded slice context, and offers retry or edit without forcing location re-entry.
8. Given supported desktop browsers are part of the core product promise, when this story is validated, then automated coverage exists for the accepted location-query to slice-ready to controllable-vehicle path, browser smoke coverage continues on Chromium, Firefox, and WebKit or Safari-aligned browsers, and typed events or logs continue to measure submit-to-drivable-world timing against the under-60-second world-entry KPI.

## Tasks / Subtasks

- [x] Extend static spawn planning and starter-vehicle contracts (AC: 1, 3, 4)
  - [x] Update `src/world/chunks/slice-manifest.ts` so spawn data can describe starter-vehicle placement cleanly without storing runtime-only physics state in the static manifest.
  - [x] Extend `runSpawnPlanner()` in `src/world/generation/world-slice-generator.ts` to emit car-ready spawn data from the existing slice manifest while keeping behavior deterministic for tests.
  - [x] Keep the manifest-store boundary as the source of truth for static spawn data; do not invent a second spawn-data path in Babylon scene code.
- [x] Add the first minimal starter-vehicle runtime and direct possession flow (AC: 1, 2, 4, 5)
  - [x] Add the smallest `src/vehicles/` modules needed to create one starter vehicle with Babylon.js plus Havok and bind player input directly to it.
  - [x] Support baseline throttle, brake or reverse, steering, and handbrake input through a device-agnostic controller contract that preserves keyboard support and does not block first-class gamepad mappings.
  - [x] Keep player and vehicle runtime state dynamic to the active session or run and do not write it back into the static `SliceManifest`.
  - [x] Keep scope to one placeholder player vehicle only; do not absorb enter or exit flow, vehicle classes, damage systems, tuning UI, or traffic interaction beyond passive collision with the static world.
- [x] Integrate direct car spawn into the existing world-loading and scene bootstrap path (AC: 1, 3, 5, 6)
  - [x] Build on `src/rendering/scene/create-world-scene.ts` and the existing Havok-backed static world bootstrap instead of reinitializing the world or replacing render-host lifecycle ownership.
  - [x] Prefer keeping the current `world-loading` to `world-ready` flow so `world-ready` means the starter vehicle is spawned and controllable; only add a new top-level session phase if the current contract becomes ambiguous.
  - [x] Replace or disable the current free-orbit `ArcRotateCamera` driving conflict with the smallest camera or vehicle-follow behavior needed to make direct spawn testable; defer readable third-person camera polish and tuning to Story 1.4.
- [x] Preserve recovery, logging, and typed event contracts (AC: 5, 6, 7)
  - [x] Reuse the existing event bus, logger, and recoverable `world.load.failed` pattern for spawn or possession failures instead of adding ad hoc console-only handling.
  - [x] Add distinct typed failure stages or codes for vehicle spawn versus vehicle possession failure instead of collapsing everything into generic scene-load failure.
  - [x] Update typed events and structured timing logs so the measured success milestone becomes submit to controllable vehicle, not merely slice-ready scene load.
  - [x] Keep edit and retry flows anchored to the current resolved location and loaded slice so players do not need to restart the full session-setup flow.
  - [x] Maintain the shell overlay as lightweight recovery or status UI without letting it take ownership of the Babylon canvas lifecycle.
- [x] Add automated and browser validation for the first spawned-vehicle milestone (AC: 2, 3, 7, 8)
  - [x] Unit-test deterministic spawn-planning helpers, spawn-related contracts, and any state or event changes.
  - [x] Integration-test accepted location to manifest to starter-vehicle-spawn success, direct possession with no extra interaction prompt, and a recoverable spawn-or-possession failure path that preserves slice context.
  - [x] Add cancellation or abandonment coverage so Edit or stale async work during delayed spawn or possession cannot emit ready, attach controls, or overwrite the active session.
  - [x] Update jsdom smoke and Playwright coverage so Chromium, Firefox, and WebKit validate first-session progression into a spawned drivable vehicle.
  - [x] Run `npm test`, `npm run check`, `npm run build`, and `npm run test:browser`.

## Dev Notes

- Story 1.3 is the bridge between Story 1.2's slice-ready world and the first player-controlled vehicle runtime. The implementation should reuse the existing manifest, `spawnCandidate`, render-host split, and recoverable loading flow instead of reintroducing any earlier setup steps. [Source: `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Goal" and "Epic 1: Stories"; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "Dev Notes" and "Completion Notes List"; `src/app/bootstrap/create-game-app.ts`]
- The product promise here is immediate post-load driving, not on-foot onboarding, a fresh enter-vehicle step, or a second loading flow. The GDD explicitly treats direct in-world play as the onboarding philosophy. [Source: `_bmad-output/planning-artifacts/gdd.md`, "Executive Summary", "Core Gameplay Loop", and "Tutorial Integration"]
- Scope boundary: implement one starter vehicle spawn and direct possession flow now, but do not absorb Story 1.4 chase-camera polish, Story 1.5 restart loop, Epic 2 vehicle interaction, or later traffic, pedestrian, and chaos systems. [Source: `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Stories", "Epic 1: Scope", and "Epic 2: Stories"; `_bmad-output/planning-artifacts/gdd.md`, "Development Epics"]
- No dedicated UX artifact exists. Keep the flow browser-native, low-friction, and recognition-first, with the Babylon world remaining the primary viewport after the slice is loaded. [Source: workflow discovery results; `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Goal"; `_bmad-output/planning-artifacts/gdd.md`, "Unique Selling Points" and "Core Gameplay Loop"; `src/ui/shell/location-entry-screen.ts`]

### Technical Requirements

- Start from the existing world-load seam in `src/app/bootstrap/create-game-app.ts`. The current flow already generates a manifest, stores a `spawnCandidate`, loads the scene with `{ renderHost, manifest, spawnCandidate }`, and only then emits `world.scene.ready`. Keep that as the core orchestration path instead of introducing a second startup path for vehicle spawn. [Source: `src/app/bootstrap/create-game-app.ts`]
- The current `SessionState` already carries `sliceManifest` and `spawnCandidate` through `world-loading`. Reuse or extend those typed contracts rather than creating parallel UI-only or scene-only state for starter spawn data. [Source: `src/app/state/session-state-machine.ts`]
- `runSpawnPlanner()` currently returns one generic spawn point from the first road point with a fixed heading. Story 1.3 should make this data vehicle-ready while keeping the planner deterministic so tests and later same-location reset behavior remain stable. [Source: `src/world/generation/world-slice-generator.ts`; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "Technical Requirements" and "Completion Notes List"]
- Route direct-drive input through a device-agnostic controller contract so Story 1.3 preserves keyboard support and does not hard-code a keyboard-only vehicle-control path that would undermine first-class gamepad support. [Source: `_bmad-output/project-context.md`, "Platform & Build Rules"; `_bmad-output/planning-artifacts/gdd.md`, "Controls and Input"]
- `src/rendering/scene/create-world-scene.ts` already owns the only Babylon.js plus Havok scene bootstrap and currently renders a visual `spawn-marker`. Replace or extend that seam to create and possess the starter vehicle instead of starting a second scene bootstrap or bypassing the existing world-root and chunk-root structure. [Source: `src/rendering/scene/create-world-scene.ts`; `_bmad-output/planning-artifacts/game-architecture.md`, "Scene Structure"]
- The starter vehicle should support the minimum baseline input needed for immediate post-load driving validation, but readable chase-camera behavior and deeper handling feel still belong to Story 1.4. Keep Story 1.3 focused on possession, spawn stability, first motion, and eliminating the current free-orbit camera conflict during drive. [Source: `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Stories"; `_bmad-output/planning-artifacts/gdd.md`, "Core Concept", "Core Gameplay Loop", and "Controls and Input"; `src/rendering/scene/create-world-scene.ts`]
- Prefer keeping `world-ready` defined as starter vehicle spawned and controllable. Only add a new top-level session phase if the current `world-loading` to `world-ready` contract becomes genuinely ambiguous after implementation. [Source: `src/app/bootstrap/create-game-app.ts`; `src/app/state/session-state-machine.ts`; `_bmad-output/planning-artifacts/game-architecture.md`, "State Management"]
- Use the existing typed recoverable failure model for spawn or possession problems so retry and edit preserve the resolved location and loaded slice context instead of forcing the player back through full setup. Add distinct stage and code coverage for vehicle spawn versus possession failure so the logs and recovery behavior stay actionable. [Source: `src/app/bootstrap/create-game-app.ts`; `src/world/generation/world-load-failure.ts`; `_bmad-output/planning-artifacts/game-architecture.md`, "Error Handling" and "Logging"]
- Update typed events and structured timing logs so the success milestone now reflects submit to controllable vehicle rather than only submit to scene load, preserving the under-60-second world-entry KPI against the story's real outcome. [Source: `_bmad-output/planning-artifacts/gdd.md`, "Technical Specifications" and "Success Metrics"; `src/app/bootstrap/create-game-app.ts`; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "Technical Requirements"]

### Architecture Compliance

- `src/app/` should orchestrate spawn flow, state transitions, logging, and event wiring only; it should not own vehicle simulation rules or direct physics behavior. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping" and "Architectural Boundaries"]
- Add the first vehicle runtime under `src/vehicles/` in the architecture-owned folders, with physics in `src/vehicles/physics/`, input or control in `src/vehicles/controllers/`, and any minimal camera helper in `src/vehicles/cameras/` only if it is strictly required for this story. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping"]
- `src/rendering/` should consume vehicle and world state to display it; do not make Babylon nodes the only source of spawn or possession truth. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Architectural Boundaries"]
- Keep one `world-root` with chunk subtrees. Do not flatten starter-vehicle ownership into a new monolithic scene structure or bypass the chunk-based world composition model established in Story 1.2. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Scene Structure" and "Consistency Rules"; `src/rendering/scene/create-world-scene.ts`]
- Cross-domain communication must continue through typed events and explicit contracts. Inside a domain, prefer constructor injection over new global mutable singletons. [Source: `_bmad-output/project-context.md`, "Engine-Specific Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Event System", "Communication Patterns", and "Consistency Rules"]
- Keep static `SliceManifest` data immutable for the run and store starter-vehicle plus possession state as dynamic session or runtime state only. That separation is required for later reset and replay stories. [Source: `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Stable City / Living Session" and "Consistency Rules"]
- Use Havok as the only physics backend and keep gameplay simulation aligned with the architecture's `60 Hz` fixed-step direction. Do not introduce a second physics or vehicle-simulation stack. [Source: `_bmad-output/project-context.md`, "Engine-Specific Rules" and "Critical Don't-Miss Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Physics and Simulation"]
- Do not couple the starter-vehicle runtime to a preload-all static-scene assumption. Keep vehicle and world-contact ownership compatible with later `src/world/streaming/` chunk residency and lifecycle boundaries. [Source: `_bmad-output/project-context.md`, "Performance Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Asset Management" and "System Location Mapping"]

### Library / Framework Requirements

- Use the repo's selected stack: Babylon.js `9.1.0`, `@babylonjs/havok` `1.3.12`, Vite `8.0.5`, and TypeScript. Do not introduce Three.js, another physics backend, another bundler, or a UI framework for this story. [Source: `package.json`; `_bmad-output/project-context.md`, "Technology Stack & Versions"; `_bmad-output/planning-artifacts/game-architecture.md`, "Toolchain" and "Physics and Simulation"]
- `@babylonjs/core` latest stable remains `9.1.0`, which matches the pinned repo and architecture version. No upgrade work is required for Story 1.3. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `package.json`; `_bmad-output/planning-artifacts/game-architecture.md`, "Verified Technology Versions"]
- `@babylonjs/havok` latest stable remains `1.3.12`, which also matches the repo and architecture version. Keep Havok as the only runtime physics backend. [Source: `https://registry.npmjs.org/@babylonjs/havok/latest`; `package.json`; `_bmad-output/planning-artifacts/game-architecture.md`, "Verified Technology Versions"]
- `vite` latest stable is `8.0.7`, while the repo currently pins `8.0.5`. The patch gap is small and not story-critical; stay on the pinned version for Story 1.3 unless the spawn work uncovers a concrete toolchain issue worth separating from gameplay scope. [Source: `https://registry.npmjs.org/vite/latest`; `package.json`; `_bmad-output/planning-artifacts/game-architecture.md`, "Toolchain"]
- Current Vite guidance continues to favor explicit import paths, minimal plugin overhead, and avoiding barrel files. Keep any new `src/vehicles/` modules lean and direct. [Source: `https://vite.dev/guide/performance`]
- Use Context7 for up-to-date Babylon.js and Vite documentation lookup during implementation if deeper library detail is needed. [Source: `_bmad-output/project-context.md`, "Technology Stack & Versions"; `_bmad-output/planning-artifacts/game-architecture.md`, "AI Tooling (MCP Servers)"]

### File Structure Requirements

- Modify the existing Story 1.2 seams first:
  - `src/app/bootstrap/create-game-app.ts`
  - `src/rendering/scene/create-world-scene.ts`
  - `src/world/chunks/slice-manifest.ts`
  - `src/world/generation/slice-manifest-store.ts`
  - `src/world/generation/world-slice-generator.ts`
  These are the current orchestration, scene-bootstrap, spawn-contract, manifest-store, and spawn-planning boundaries. [Source: `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/create-world-scene.ts`; `src/world/chunks/slice-manifest.ts`; `src/world/generation/slice-manifest-store.ts`; `src/world/generation/world-slice-generator.ts`]
- Prefer not to change `src/app/state/session-state-machine.ts` or `src/app/events/game-events.ts` unless direct car spawn creates a real contract gap. The minimal approach is to keep `world-loading` and only emit `world-ready` after the vehicle is spawned and controllable. [Source: `src/app/state/session-state-machine.ts`; `src/app/events/game-events.ts`; `src/app/bootstrap/create-game-app.ts`]
- A minimal Story 1.3 file plan is:
  - `src/vehicles/physics/create-starter-vehicle.ts`
  - `src/vehicles/controllers/player-vehicle-controller.ts`
  - `tests/unit/player-vehicle-controller.spec.ts`
  - `tests/unit/world-slice-generator.spec.ts`
  - `tests/integration/location-entry.integration.spec.ts`
  - `tests/integration/world-slice-loading.integration.spec.ts`
  - `tests/smoke/app-bootstrap.smoke.spec.ts`
  - `tests/smoke/app-bootstrap.pw.spec.ts`
  If a tiny camera helper is required for spawn validation, add it under `src/vehicles/cameras/` and keep it strictly minimal so Story 1.4 still owns readable third-person camera work. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping"; current repository structure]
- Keep runtime-loaded data under `public/` only. Do not place application logic there, and do not create ad hoc vehicle or spawn logic in shell UI modules. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Architectural Boundaries"]
- Follow the established naming standards exactly: `kebab-case` modules and directories, `PascalCase` types and classes, `camelCase` functions and variables, `UPPER_SNAKE_CASE` constants, and `domain.action` event names. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Naming Conventions"]

### Testing Requirements

- Keep tests under `tests/unit/`, `tests/integration/`, `tests/smoke/`, and `tests/fixtures/`. Extend the current structure instead of inventing a parallel test layout. [Source: `_bmad-output/project-context.md`, "Testing Rules"; current repository `tests/` tree]
- Unit tests should cover deterministic spawn-planning helpers, any manifest or starter-vehicle spawn contracts, and any state or event changes needed to represent direct possession cleanly. [Source: `_bmad-output/project-context.md`, "Testing Rules"; `src/world/generation/world-slice-generator.ts`; `_bmad-output/planning-artifacts/game-architecture.md`, "State Patterns"]
- Integration tests should cover the accepted location to manifest to starter-vehicle-spawn success path, direct possession with no extra interaction prompt, a recoverable spawn or possession failure that preserves location identity and loaded slice context, and stale or abandoned async work that must not attach controls or overwrite the active session. [Source: `_bmad-output/project-context.md`, "Testing Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Error Handling"; existing integration patterns in `tests/integration/`; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "Completion Notes List"]
- Update smoke tests so the critical first-session path proves the player can reach a spawned, drivable starter vehicle rather than only a slice-ready world. Keep Playwright coverage on Chromium, Firefox, and WebKit or Safari-aligned browsers for this milestone. [Source: `_bmad-output/project-context.md`, "Testing Rules" and "Platform & Build Rules"; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "Testing Requirements" and "Completion Notes List"]
- Validate that `world-ready` and related structured logs now represent a controllable vehicle milestone rather than a scene-only milestone so automated and manual checks continue to target the correct KPI. [Source: `_bmad-output/planning-artifacts/gdd.md`, "Success Metrics"; `src/app/bootstrap/create-game-app.ts`]
- Use deterministic seeds and stable fixtures for all spawn and generation related tests. Avoid live network calls in automated coverage for this story. [Source: `_bmad-output/project-context.md`, "Testing Rules"; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "Testing Requirements"]
- Run `npm test`, `npm run check`, `npm run build`, and `npm run test:browser` as the expected verification commands for this story unless implementation changes the project scripts in a justified way. [Source: `package.json`; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "Testing Requirements"]

### Previous Story Intelligence

- Story 1.1 already established the browser-native shell, typed event bus, structured logger, serializable session identity, and recoverable error flow. Story 1.3 should extend those seams rather than replace them. [Source: `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`, "Technical Requirements", "Architecture Compliance", and "Completion Notes List"]
- Story 1.2 already established explicit load phases, deterministic slice generation, `SliceManifest`, `spawnCandidates`, manifest-store-backed slice handoff, stable render-host ownership, and Havok-backed static world collision. Story 1.3 should consume those outputs directly. [Source: `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "Acceptance Criteria", "Technical Requirements", and "Completion Notes List"]
- Story 1.2 code review fixes ignored stale resolve results after the player chooses Edit, moved slice handoff through the generator-owned manifest store boundary, and enabled Havok-backed static physics for ground, roads, bounds, and placeholder massing. Do not regress those seams while adding starter-vehicle spawn. [Source: `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "Completion Notes List"]
- Story 1.2 already reduced the shell to a lightweight overlay once the world is ready. Story 1.3 should preserve that viewport pattern during spawn and recovery rather than returning to a full-screen blocker. [Source: `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "Tasks / Subtasks", "Project Structure Notes", and "Completion Notes List"; `src/ui/shell/location-entry-screen.ts`]
- Cross-browser Playwright smoke coverage already exists and should be updated, not replaced, for the first spawned-vehicle milestone. [Source: `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`, "Completion Notes List"; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "Completion Notes List"; `tests/smoke/app-bootstrap.pw.spec.ts`]

### Git Intelligence Summary

- The repo is a git work tree, and recent commit titles are `Add generated playable slice loading flow` and `Add initial project scaffold for GitHub collaboration`. If the dev agent later commits Story 1.3, follow the same plain-English, imperative, capitalized style rather than switching formats. [Source: local `git rev-parse --is-inside-work-tree`; local `git log --oneline -5`]
- Recent commits and the current tree show a style built around small typed contracts, concern-based folders, and behavior-first tests. Story 1.3 should continue that style rather than adding broad abstractions or generic event names. [Source: local `git log -5 --stat --name-only`; current `src/` and `tests/` structure]

### Latest Technical Information

- `@babylonjs/core` latest stable remains `9.1.0`, matching the project's selected architecture and current package pin. No Babylon core upgrade work is needed for this story. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `package.json`; `_bmad-output/planning-artifacts/game-architecture.md`, "Verified Technology Versions"]
- `@babylonjs/havok` latest stable remains `1.3.12`, also matching the architecture and current package pin. Keep that package as the only physics backend for direct car spawn work. [Source: `https://registry.npmjs.org/@babylonjs/havok/latest`; `package.json`; `_bmad-output/planning-artifacts/game-architecture.md`, "Verified Technology Versions"]
- `vite` latest stable is `8.0.7`, but the repo and architecture currently pin `8.0.5`. The patch gap is not story-critical, so stay on the pinned version unless implementation uncovers a concrete issue worth isolating. [Source: `https://registry.npmjs.org/vite/latest`; `package.json`; `_bmad-output/planning-artifacts/game-architecture.md`, "Toolchain"]
- Current Vite docs still center the app around `index.html` at the project root and keep the Node requirement at `^20.19.0 || >=22.12.0`. Keep any Story 1.3 source additions aligned with that existing setup instead of inventing a custom bootstrap layout. [Source: `https://vite.dev/guide/`; `https://registry.npmjs.org/vite/latest`; `_bmad-output/project-context.md`, "Technology Stack & Versions"]
- Current Vite performance guidance continues to recommend explicit imports, minimal plugin overhead, and avoiding barrel files. That guidance matters directly if Story 1.3 introduces the project's first `src/vehicles/` modules. [Source: `https://vite.dev/guide/performance`]

### Project Structure Notes

- The repo now contains the Story 1.1 and Story 1.2 seams under `src/app/`, `src/world/generation/`, `src/rendering/scene/`, and `src/ui/shell/`, plus unit, integration, and smoke tests. Story 1.3 should extend those exact seams rather than creating a parallel bootstrap path. [Source: current repository structure; `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`, "File List"; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`, "File List"]
- There is still no `src/vehicles/` domain in the repo. Story 1.3 is the first justified point to add the smallest `src/vehicles/` structure needed for a single player starter vehicle. [Source: current repository structure; `_bmad-output/planning-artifacts/game-architecture.md`, "Directory Structure" and "System Location Mapping"]
- Keep the browser-native shell as the lightweight player-facing overlay and recovery surface while the Babylon world remains the main viewport. Do not let shell rerenders reclaim canvas lifecycle ownership once the world scene exists. [Source: `src/app/bootstrap/create-game-app.ts`; `src/ui/shell/location-entry-screen.ts`; `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture"]
- No dedicated UX planning artifact exists. UX guidance for this story comes from the epics, GDD, architecture, project-context, and the existing shell and world-loading implementation. [Source: workflow discovery results; `_bmad-output/planning-artifacts/epics.md`; `_bmad-output/planning-artifacts/gdd.md`; `_bmad-output/project-context.md`]

### Project Context Rules

- Engine and toolchain rules: use Babylon.js `9.1.0`, Havok `1.3.12`, Vite `8.0.5`, TypeScript, Node `^20.19.0` or `>=22.12.0`, and desktop browsers with WebGL2 support as the primary target. [Source: `_bmad-output/project-context.md`, "Technology Stack & Versions"]
- UI rules: keep startup, loading, and recovery flows in HTML and CSS shell UI; keep any in-game HUD concerns separate from shell flow. [Source: `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- Communication rules: prefer constructor injection inside a domain and typed events across domains instead of ad hoc global access. [Source: `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- Performance rules: design for stable `60 FPS`, treat world streaming and vehicle simulation as hot paths, avoid per-frame allocations where possible, and do not drift toward preload-all world assumptions. [Source: `_bmad-output/project-context.md`, "Performance Rules"]
- Organization rules: keep domain logic in its owning folders, let `src/app/` orchestrate, let `src/rendering/` display, let `src/services/` own optional remote calls, let `src/persistence/` own browser storage, and keep runtime-loaded assets and data in `public/` only. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"]
- Testing rules: keep tests under the standard `tests/` folders and prefer deterministic seeds, stable fixtures, and test helpers over brittle ad hoc setup. [Source: `_bmad-output/project-context.md`, "Testing Rules"]
- Platform rules: keep desktop browser support, keyboard and mouse, and gamepad compatibility as first-class constraints from the start; do not optimize first for native desktop, console, or mobile. [Source: `_bmad-output/project-context.md`, "Platform & Build Rules"]
- Critical don't-miss rules: do not bypass the world-slice generation pipeline, do not mix static slice state with dynamic session state, do not introduce a second physics stack, do not fetch or parse runtime data directly from gameplay systems, do not call storage or remote APIs directly from gameplay domains, and do not trade away road truth, scale, terrain, or district rhythm for arbitrary visual embellishment. [Source: `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"]

### References

- `_bmad-output/planning-artifacts/epics.md`, "Epic 1: World Slice & Core Driving"
- `_bmad-output/planning-artifacts/gdd.md`, "Executive Summary"
- `_bmad-output/planning-artifacts/gdd.md`, "Core Gameplay Loop"
- `_bmad-output/planning-artifacts/gdd.md`, "Controls and Input"
- `_bmad-output/planning-artifacts/gdd.md`, "Technical Specifications"
- `_bmad-output/planning-artifacts/gdd.md`, "Success Metrics"
- `_bmad-output/planning-artifacts/gdd.md`, "Tutorial Integration"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Physics and Simulation"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Scene Structure"
- `_bmad-output/planning-artifacts/game-architecture.md`, "State Management"
- `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture"
- `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Architectural Boundaries"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Communication Patterns"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Error Handling"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Logging"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Consistency Rules"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Naming Conventions"
- `_bmad-output/project-context.md`, "Technology Stack & Versions"
- `_bmad-output/project-context.md`, "Engine-Specific Rules"
- `_bmad-output/project-context.md`, "Performance Rules"
- `_bmad-output/project-context.md`, "Code Organization Rules"
- `_bmad-output/project-context.md`, "Testing Rules"
- `_bmad-output/project-context.md`, "Platform & Build Rules"
- `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"
- `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`
- `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `package.json`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/app/state/session-state-machine.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/slice-manifest-store.ts`
- `src/world/generation/world-load-failure.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- local `git rev-parse --is-inside-work-tree`
- local `git log --oneline -5`
- local `git log -5 --stat --name-only`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/vite/latest`
- `https://vite.dev/guide/`
- `https://vite.dev/guide/performance`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Implementation Plan

- Extend `SpawnCandidate` so the manifest carries static starter-vehicle placement metadata such as source road, lane index, surface, heading, and placeholder vehicle dimensions without embedding runtime physics state.
- Keep the manifest-store handoff as the only static spawn-data source, then let the Babylon scene consume that plan to create one dynamic starter vehicle and mark `world-ready` only after direct possession is attached.
- Preserve the existing recovery flow and typed event/log seams while shifting readiness timing from scene bootstrap to controllable-vehicle availability.

### Debug Log References

- `npm test -- tests/unit/world-slice-generator.spec.ts`
- `npm test -- tests/unit/player-vehicle-controller.spec.ts`
- `npm test -- tests/unit/starter-vehicle-camera.spec.ts`
- `npm test -- tests/integration/location-entry.integration.spec.ts`
- `npm test -- tests/integration/location-entry.integration.spec.ts tests/smoke/app-bootstrap.smoke.spec.ts`
- `npm test`
- `npm run check`
- `npm run build`
- `npm run test:browser`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Loaded and analyzed `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/gdd.md`, `_bmad-output/planning-artifacts/game-architecture.md`, `_bmad-output/project-context.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, previous stories `1-1` and `1-2`, current source seams, recent git history, and current package-version information.
- No dedicated UX artifact was found; UX guidance for this story was derived from the epics, GDD, architecture, project context, and the existing shell and world-loading flow.
- Story guidance is optimized to prevent reinventing the existing world-generation, manifest-store, render-host, typed-event, and recoverable-failure patterns already established in Stories 1.1 and 1.2.
- Extended the static `SpawnCandidate` contract with road, lane, surface, heading, and placeholder starter-vehicle metadata while keeping runtime state out of the serializable `SliceManifest`.
- Updated deterministic spawn planning to align the starter vehicle to the chosen road segment and inset the spawn point away from the edge of the road segment for immediate-drive placement.
- Added unit coverage for the new static starter-vehicle spawn contract and updated existing spawn fixtures so the full Vitest suite remains green.
- Added the first `src/vehicles/` runtime modules: a device-agnostic player controller and a minimal Havok-backed starter vehicle that consumes the static spawn plan at load time.
- Kept possession and vehicle state runtime-only inside the active scene bootstrap, preserving the manifest-store handoff as static data only.
- Limited Story 1.3 vehicle scope to one placeholder drivable car with baseline forward, reverse, steering, and handbrake input while leaving deeper vehicle systems out of scope.
- Replaced the free-orbit scene camera with a minimal follow camera locked to the spawned starter vehicle so the direct-drive path stays testable without introducing Story 1.4 polish work early.
- Kept the existing `world-loading` to `world-ready` state contract and render-host ownership model intact while moving starter-vehicle spawn and possession into the current scene bootstrap seam.
- Added typed starter-vehicle spawn and possession failure handling to the existing recoverable `world.load.failed` path so retry and edit continue to preserve the resolved location and loaded slice context.
- Updated the `world.scene.ready` event and structured log context so success timing now records the controllable-vehicle milestone rather than a generic scene-bootstrap milestone.
- Added stale scene-load cancellation coverage plus updated jsdom smoke and Playwright smoke assertions so the first-session path is validated as a spawned, drivable vehicle milestone across Chromium, Firefox, and WebKit.
- Code review follow-up replaced the solid slice-wide boundary collider with perimeter walls, skipped placeholder massing in the spawn chunk, and tightened deterministic spawn inset logic so the starter car spawns clear of barriers and can drive immediately.
- Code review follow-up strengthened validation with explicit spawn-candidate handoff assertions, deterministic spawn-clearance coverage, and real browser smoke checks that prove the spawned car moves after load.
- Verified the story with `npm test`, `npm run check`, `npm run build`, and `npm run test:browser`; all commands passed, and Playwright reported two passing smoke tests in each supported browser project.
- Definition of done validation passed with all story tasks checked, story status set to `done`, and sprint tracking updated to `done` for `1-3-spawn-directly-into-a-car`.

### Change Log

- 2026-04-07: Implemented Story 1.3 direct starter-car spawn, follow-camera possession flow, typed spawn-versus-possession failures, and cross-browser drivable-world validation.
- 2026-04-07: Fixed code review findings by making spawn clearance safe in the real scene and upgrading browser validation to prove actual vehicle movement.

### File List

- `_bmad-output/implementation-artifacts/1-3-spawn-directly-into-a-car.md`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/vehicles/cameras/create-starter-vehicle-camera.ts`
- `src/vehicles/controllers/player-vehicle-controller.ts`
- `src/vehicles/physics/create-starter-vehicle.ts`
- `src/world/generation/world-load-failure.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/unit/player-vehicle-controller.spec.ts`
- `tests/unit/session-state-machine.spec.ts`
- `tests/unit/starter-vehicle-camera.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
