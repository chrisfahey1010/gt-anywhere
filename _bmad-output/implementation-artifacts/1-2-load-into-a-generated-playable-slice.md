# Story 1.2: Load Into a Generated Playable Slice

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to load into a generated playable slice,
so that I can access the sandbox quickly.

## Acceptance Criteria

1. Given I already selected a valid location in the browser shell, when Story 1.2 starts the load flow, then the app keeps the same session identity and advances from `world-generation-requested` through explicit world-loading states without asking me to re-enter the location.
2. Given a valid `WorldGenerationRequest`, when the slice pipeline runs, then it produces a serializable static slice manifest for the chosen location by executing the architecture-defined stages: `LocationResolver`, `GeoDataFetcher`, `SliceBoundaryPlanner`, `RoadNormalizer`, `PlayabilityPassPipeline`, `ChunkAssembler`, `SpawnPlanner`, and `SliceManifestStore`.
3. Given the slice manifest has been produced, when the world becomes ready, then the app creates a Babylon world scene with one world root and chunk subtrees, renders a bounded stylized slice with readable road layout, and shows a player-visible ready state that the next story can use for vehicle spawn.
4. Given the slice is loaded successfully, when the session reaches ready state, then the chosen location identity, slice manifest, and planned spawn data remain available without regeneration so Story 1.3 can spawn into the same slice directly.
5. Given the product is browser-first, when the slice is generated and loaded, then the implementation remains client-heavy, keeps load-to-ready instrumentation aligned with the sub-60-second world-entry goal, and avoids scope that would obviously jeopardize the 60 FPS desktop target.
6. Given generation or scene-loading fails in a recoverable way, when the load cannot complete, then the app logs typed structured failure details, keeps the player in a recoverable browser-shell flow with the resolved place name preserved, and allows retry or edit without losing session context.
7. Given later restart and replay stories depend on stable geography, when the slice is loaded, then static slice data stays separate from dynamic session and run state so same-location reset can preserve the slice and replace only runtime state.
8. Given Story 1.1 already accepts alias, structured, address-like, and approved single-token location queries, when those inputs resolve successfully, then Story 1.2 maps them onto loadable deterministic slice definitions without regressing the current session-start behavior.
9. Given supported desktop browsers are part of the core promise, when this flow is validated, then smoke coverage exists for Chromium, Firefox, and WebKit or Safari-aligned browsers for location-submit to slice-ready behavior.

## Tasks / Subtasks

- [x] Extend session orchestration from request to slice-ready state (AC: 1, 4, 6, 7)
  - [x] Add explicit post-request phases such as `world-generating`, `world-loading`, `world-ready`, and `world-load-error` to the existing session state machine instead of adding ad hoc booleans.
  - [x] Emit typed events and structured logs for `world.generation.started`, `world.manifest.ready`, `world.scene.ready`, and `world.load.failed` using `domain.action` event names.
  - [x] Keep the browser-shell loading flow active until the world is actually ready, with the resolved place name preserved and edit or retry controls available on recoverable failure.
- [x] Implement the first minimal world-slice generation pipeline behind the current handoff contract (AC: 1, 2, 4, 7, 8)
  - [x] Add a `world-slice-generator` orchestration module under `src/world/generation/` that consumes the existing `WorldGenerationRequest` instead of re-deriving location data elsewhere.
  - [x] Represent the architecture-named stages explicitly, but keep the implementation compact; a single generator module with named stage functions is acceptable unless the code becomes unwieldy.
  - [x] For this story, back `GeoDataFetcher` with deterministic in-repo presets or fixtures for the currently supported location set rather than live map-provider calls, while keeping the boundary replaceable for later stories.
  - [x] Ensure every currently valid Story 1.1 location path still reaches a loadable slice definition, either through canonical alias mapping or explicit preset coverage.
  - [x] Produce a serializable `SliceManifest` that includes at minimum `sliceId`, `generationVersion`, `location`, `seed`, `bounds`, `chunks`, `roads`, `spawnCandidates`, and scene-facing metadata needed by Story 1.3.
  - [x] Store static slice data through a generation-owned manifest store or repository boundary rather than burying it in UI-only state.
- [x] Render the generated slice in a Babylon world scene without absorbing later spawn or driving scope (AC: 2, 3, 4, 5, 7)
  - [x] Create the smallest rendering and world modules needed now to bootstrap a Babylon scene, attach a world root, and parent loaded chunk subtrees under that root.
  - [x] Split the single `#app` root into stable shell and render host containers, or an equivalent lifecycle-safe structure, so shell rerenders do not destroy the Babylon canvas or engine state.
  - [x] Render stylized placeholder geometry that establishes readable roads, boundaries, and simple urban massing; do not implement traffic, pedestrians, combat, or full art polish in this story.
  - [x] Initialize the world-loading path so static collision surfaces or ground bodies can be attached through Babylon and Havok without reworking the scene bootstrap in Story 1.3.
  - [x] Surface a player-visible slice-ready state that keeps the Babylon world as the primary viewport while reducing the shell to a lightweight ready or recovery overlay instead of a full-screen blocker.
- [x] Preserve Story 1.1 contracts and failure recovery behavior (AC: 1, 4, 6, 7)
  - [x] Reuse the existing `WorldGenerationRequest`, `SessionLocationIdentity`, event bus, and structured logger patterns rather than inventing parallel load contracts.
  - [x] Preserve keyboard-first shell behavior and the existing edit flow after load success or recoverable failure.
  - [x] Keep static slice state separate from future mutable runtime state so same-location reset can reuse the slice later.
- [x] Add automated and browser validation for slice loading (AC: 5, 6, 8, 9)
  - [x] Unit-test deterministic pipeline helpers, manifest creation, and the new session-state transitions.
  - [x] Integration-test the valid location -> manifest -> world-ready success path, coverage for the currently accepted location query classes, and the recoverable generation or scene-load failure path.
  - [x] Update smoke tests to assert the first slice-ready world state, and keep Playwright coverage on Chromium, Firefox, and WebKit for the load flow.
  - [x] Capture or assert load timing and stage instrumentation without adding flaky hard wall-clock thresholds to CI.

## Dev Notes

- Story 1.1 already created the project scaffold, browser-shell entry flow, serializable `WorldGenerationRequest`, typed event bus, structured logger, and cross-browser smoke coverage. Story 1.2 should extend that foundation instead of re-scaffolding the app. [Source: `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`, "Tasks / Subtasks", "Technical Requirements", and "Completion Notes List"; `src/app/bootstrap/create-game-app.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- The scope boundary for Story 1.2 is: generate and load the static playable slice, render it, and reach a slice-ready state. Do not absorb direct vehicle spawn, chase camera, driving controls, traffic, pedestrians, or restart-loop implementation from later stories. [Source: `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Stories"; `_bmad-output/planning-artifacts/gdd.md`, "Development Epics" and "Core Gameplay Loop"]
- The architecture requires a real-place world-slice pipeline and a world-root plus chunk-subtree scene model. Implement the smallest end-to-end version that satisfies those boundaries now, then let later stories deepen spawn, driving, and streaming behavior. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Scene Structure", "System Location Mapping", and "Real-place World Slice Generation"]
- No dedicated UX artifact exists. Keep the load flow browser-native, fast, readable, and low-friction, with the resolved place name visible during loading and recovery. [Source: `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Goal"; `_bmad-output/planning-artifacts/gdd.md`, "Core Gameplay Loop" and "Technical Specifications"]

### Technical Requirements

- Start from the existing Story 1.1 handoff contract in `src/world/generation/location-resolver.ts`. The new world-loading path must consume `WorldGenerationRequest` and carry forward the accepted `SessionLocationIdentity` instead of reconstructing location data from raw form input. [Source: `src/world/generation/location-resolver.ts`; `src/app/bootstrap/create-game-app.ts`; `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`, "Technical Requirements"]
- Introduce explicit post-request phases for generation, load, ready, and recoverable load error. The current state machine ends at `world-generation-requested`; Story 1.2 should extend that same explicit-flow model instead of adding side-state in the DOM or Babylon scene objects. [Source: `src/app/state/session-state-machine.ts`; `_bmad-output/planning-artifacts/game-architecture.md`, "State Management" and "Consistency Rules"]
- Produce a serializable static `SliceManifest` and keep it distinct from mutable session-run state. The manifest should be stable enough for the later same-location reset pattern and include at least `sliceId`, `generationVersion`, `location`, `seed`, `bounds`, `chunks`, `roads`, `spawnCandidates`, and scene-facing metadata without actually spawning the vehicle here. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Stable City / Living Session" and "Real-place World Slice Generation"; `_bmad-output/planning-artifacts/gdd.md`, "Failure Recovery"]
- The minimal slice loaded in this story should include bounded road-readable geometry, simple chunk ownership metadata, and a recognizable slice identity for the chosen place. It does not need traffic, pedestrians, combat, or full prop density yet. [Source: `_bmad-output/planning-artifacts/gdd.md`, "Level Design Framework", "Level Design Principles", and "Art and Audio Direction"; `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Scope"]
- Instrument the load path with structured timing and milestone logs such as `world.generation.started`, `world.manifest.ready`, `world.scene.ready`, and `world.load.failed` so the under-60-second world-entry target can be observed without building a full telemetry backend. [Source: `_bmad-output/planning-artifacts/gdd.md`, "Technical Specifications" and "Success Metrics"; `_bmad-output/planning-artifacts/game-architecture.md`, "Logging"]
- Implementation assumption for this story: keep `GeoDataFetcher` deterministic and local to the repo using fixtures or presets for the currently supported locations instead of introducing live public-data or geocoding dependencies now. Preserve Story 1.1 behavior by mapping every currently supported successful query path onto a loadable canonical slice definition rather than narrowing support to a smaller demo subset. [Source: `_bmad-output/planning-artifacts/gdd.md`, "Assumptions and Dependencies"; `_bmad-output/planning-artifacts/game-architecture.md`, "Real-place World Slice Generation"; `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"; `src/world/generation/location-resolver.ts`]
- If the existing `SESSION_SEED` placeholder is replaced or extended, keep the chosen slice seed explicit in the handoff and manifest and preserve deterministic tests. Do not hide seed selection in non-serializable engine state. [Source: `src/app/config/session-config.ts`; `tests/unit/session-state-machine.spec.ts`; `_bmad-output/project-context.md`, "Testing Rules"]
- The current app uses one `#app` host and the shell rewrites `host.innerHTML` on render. Introduce stable child ownership for the Babylon canvas and shell UI so shell rerenders, retry paths, or ready-state changes do not tear down the world scene unexpectedly. [Source: `src/main.ts`; `src/app/bootstrap/create-game-app.ts`; `src/ui/shell/location-entry-screen.ts`]

### Architecture Compliance

- `src/app/` continues to own orchestration, state transitions, logging, and event wiring only. It must not own slice-generation rules or direct Babylon world-authoring logic. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping" and "Architectural Boundaries"; `_bmad-output/project-context.md`, "Code Organization Rules"]
- Keep shell loading and recovery UI in `src/ui/shell/` HTML and CSS. Do not replace the browser-native flow with Babylon GUI or HUD-first implementation for this story. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture"; `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- `src/world/generation/` owns the slice pipeline, manifest creation, and generation boundaries. `src/rendering/scene/` should consume that output to display the loaded world, not define gameplay truth. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping", "Architectural Boundaries", and "Real-place World Slice Generation"]
- Build the scene as one world root with chunk subtrees beneath it. Do not create one monolithic world object or flatten chunk ownership into arbitrary scene nodes. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Scene Structure"; `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- Cross-domain communication must continue through typed events and explicit contracts. Inside a domain, prefer constructor injection. Do not introduce global mutable singletons to move slice state around. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Event System", "Communication Patterns", and "Consistency Rules"; `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- Use typed result objects for recoverable generation and load failures, and keep player-visible failure states confined to cases where session continuity is actually affected. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Error Handling" and "Logging"]
- Preserve the static-slice versus dynamic-session split. This story can create the static slice and load it, but it must not mix future runtime-only state into that slice record. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Stable City / Living Session" and "Consistency Rules"; `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"]
- Keep UI and render-surface lifecycle ownership explicit. The HTML shell may remain as a lightweight overlay or recovery surface, but it must not own the Babylon canvas lifecycle once the world scene exists. [Source: `src/app/bootstrap/create-game-app.ts`; `src/ui/shell/location-entry-screen.ts`; `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture"]

### Library / Framework Requirements

- Use the repo's selected stack: Babylon.js `9.1.0`, `@babylonjs/havok` `1.3.12`, Vite `8.0.5`, and TypeScript. Do not introduce Three.js, a second physics backend, another bundler, or a UI framework for this story. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md`, "Engine & Framework", "Physics and Simulation", and "Toolchain"; `_bmad-output/project-context.md`, "Technology Stack & Versions"]
- Keep Babylon usage aligned with the existing package footprint. Story 1.2 should be able to bootstrap the world scene with `@babylonjs/core` and the existing Havok package; do not add extra Babylon packages unless the implementation reveals a concrete need. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md`, "Development Environment"]
- Use Context7 for current Babylon.js and Vite documentation lookup during implementation if the dev agent needs library detail beyond the story. [Source: `_bmad-output/project-context.md`, "Technology Stack & Versions"; `_bmad-output/planning-artifacts/game-architecture.md`, "AI Tooling (MCP Servers)"]
- Keep the early world-loading implementation lean. Avoid unnecessary Vite plugins, barrel files, or heavyweight transforms in the slice-loading path. [Source: `https://vite.dev/guide/performance`; `_bmad-output/planning-artifacts/game-architecture.md`, "Toolchain"]

### File Structure Requirements

- Modify the existing Story 1.1 extension points first: `src/app/bootstrap/create-game-app.ts`, `src/app/state/session-state-machine.ts`, `src/app/events/game-events.ts`, and `src/ui/shell/location-entry-screen.ts`. [Source: `src/app/bootstrap/create-game-app.ts`; `src/app/state/session-state-machine.ts`; `src/app/events/game-events.ts`; `src/ui/shell/location-entry-screen.ts`]
- Add the smallest new world-loading modules needed now. A minimal file plan is:
  - `src/world/generation/world-slice-generator.ts`
  - `src/world/generation/slice-manifest-store.ts`
  - `src/world/chunks/slice-manifest.ts`
  - `src/rendering/scene/create-world-scene.ts`
  - `tests/unit/world-slice-generator.spec.ts`
  - `tests/integration/world-slice-loading.integration.spec.ts`
  - `tests/smoke/app-bootstrap.smoke.spec.ts`
  - `tests/smoke/app-bootstrap.pw.spec.ts`
- If the generation stages remain compact, keep them inside `world-slice-generator.ts` or a similarly small cluster of files instead of scattering one-file-per-stage without need. The architecture requires named stages, not needless file proliferation. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Real-place World Slice Generation"; repository implementation style in `src/`]
- If you introduce deterministic runtime slice presets or raw location data, store data-only artifacts under `public/data/world-gen/` and load them through the generation layer. Do not embed large pseudo-geo datasets in UI modules or `src/app/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Directory Structure" and "System Location Mapping"; `_bmad-output/project-context.md`, "Code Organization Rules"]
- Follow the established naming rules exactly: `kebab-case` modules and directories, `PascalCase` types and classes, `camelCase` functions and variables, `UPPER_SNAKE_CASE` constants, and `domain.action` event names. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Naming Conventions"; `_bmad-output/project-context.md`, "Code Organization Rules"]

### Testing Requirements

- Keep tests under `tests/unit/`, `tests/integration/`, `tests/smoke/`, and `tests/fixtures/`. Extend the current structure instead of inventing a parallel test layout. [Source: `_bmad-output/project-context.md`, "Testing Rules"; current repository test tree]
- Unit tests should cover deterministic generation helpers, slice-manifest creation, chunk metadata assembly, and the new explicit state-machine transitions for world generation, world load, world ready, and recoverable failure. [Source: `_bmad-output/project-context.md`, "Testing Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "State Management" and "Real-place World Slice Generation"]
- Integration tests should cover the accepted location -> manifest -> world-ready flow, plus a recoverable generation or scene-load failure that preserves location identity and recovery controls. [Source: `_bmad-output/project-context.md`, "Testing Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Error Handling" and "Real-place World Slice Generation"]
- Keep coverage for the currently supported successful query classes from Story 1.1: canonical aliases, structured place names, address-like inputs, and approved single-token locations. Story 1.2 must not silently narrow which accepted inputs can reach the next stage. [Source: `src/world/generation/location-resolver.ts`; `tests/fixtures/location-queries.ts`; `tests/integration/location-entry.integration.spec.ts`]
- Smoke tests should prove the app boots, accepts a valid location, and reaches a slice-ready world state. Keep Playwright coverage on Chromium, Firefox, and WebKit or Safari-aligned engines for this critical first-session path. [Source: `_bmad-output/project-context.md`, "Platform & Build Rules" and "Testing Rules"; `tests/smoke/app-bootstrap.pw.spec.ts`; `_bmad-output/planning-artifacts/gdd.md`, "Platform-Specific Details"]
- Use deterministic seeds and stable fixtures for all generation-related tests. Avoid live network calls in automated coverage for this story. [Source: `_bmad-output/project-context.md`, "Testing Rules"; `tests/fixtures/location-queries.ts`]
- Validate load-time instrumentation and milestone events in tests where practical, but do not encode fragile real-time performance thresholds in CI. Use structured timing outputs and targeted manual checks for the under-60-second goal. [Source: `_bmad-output/planning-artifacts/gdd.md`, "Success Metrics"; `_bmad-output/planning-artifacts/game-architecture.md`, "Logging"]
- Run `npm test`, `npm run check`, `npm run build`, and `npm run test:browser` as the expected verification commands for this story unless implementation changes the project scripts in a justified way. [Source: `package.json`; `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`, "Completion Notes List"]

### Previous Story Intelligence

- Story 1.1 already solved the location-entry shell, typed event bus, structured logger, and serializable handoff contract. Story 1.2 should extend those exact seams instead of replacing them. [Source: `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`, "File Structure Requirements" and "Completion Notes List"; `src/app/bootstrap/create-game-app.ts`; `src/app/events/game-events.ts`]
- The current session flow already transitions to `world-generation-requested` after successful location resolution. That is the natural starting point for Story 1.2 orchestration. [Source: `src/app/state/session-state-machine.ts`; `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`, "Tasks / Subtasks"]
- The shell currently disables the primary action during loading and exposes an edit path after load or error. Preserve that low-friction recovery behavior while extending the load flow. [Source: `src/ui/shell/location-entry-screen.ts`; `tests/integration/location-entry.integration.spec.ts`]
- Story 1.1 code review fixed the invalid single-token query path so unsupported non-empty inputs fail recoverably. Do not regress that behavior while adding slice loading. [Source: `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`, "Senior Developer Review (AI)"; `tests/unit/session-state-machine.spec.ts`; `tests/integration/location-entry.integration.spec.ts`]
- Cross-browser Playwright smoke coverage already exists and should be updated, not replaced, for the slice-ready milestone. [Source: `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`, "Completion Notes List"; `tests/smoke/app-bootstrap.pw.spec.ts`]

### Git Intelligence Summary

- The repo currently detects as a git work tree, and recent history contains one scaffold-focused commit: `Add initial project scaffold for GitHub collaboration`. If the dev agent later commits Story 1.2, follow the same plain-English, imperative, capitalized style rather than switching formats. [Source: `git rev-parse --is-inside-work-tree`; `git log --oneline -5`]
- The existing codebase favors small typed contracts, concern-based folders, and behavior-first test names. Story 1.2 should continue that style instead of introducing broad abstractions or generic event names. [Source: `git log -5 --stat --name-only`; current `src/` and `tests/` structure]

### Latest Technical Information

- `@babylonjs/core` latest stable remains `9.1.0`, which matches the project's selected architecture version. No upgrade work is needed for Story 1.2. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `_bmad-output/planning-artifacts/game-architecture.md`, "Verified Technology Versions"]
- `@babylonjs/havok` latest stable remains `1.3.12`, which also matches the project architecture. Do not introduce a second physics backend. [Source: `https://registry.npmjs.org/@babylonjs/havok/latest`; `_bmad-output/planning-artifacts/game-architecture.md`, "Physics and Simulation"; `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"]
- Vite latest stable is `8.0.7`, while the repo and architecture currently pin `8.0.5`. The patch gap is small and not story-critical; stay on the pinned version for Story 1.2 unless implementation uncovers a concrete toolchain issue worth separating into its own change. [Source: `https://registry.npmjs.org/vite/latest`; `package.json`; `_bmad-output/planning-artifacts/game-architecture.md`, "Toolchain"]
- Current Vite documentation still centers the app around `index.html` at the project root and keeps the Node requirement at `^20.19.0 || >=22.12.0`. Keep the world-loading implementation aligned with that existing setup instead of inventing a custom bootstrap layout. [Source: `https://vite.dev/guide/`; `package.json`]
- Current Vite performance guidance continues to recommend minimal plugin overhead, avoiding barrel files, and favoring explicit imports. Keep the first world-loading slice lean and direct. [Source: `https://vite.dev/guide/performance`]

### Project Structure Notes

- The repo now contains the Story 1.1 source scaffold under `src/app/`, `src/ui/shell/`, and `src/world/generation/`, plus unit, integration, and smoke tests. Story 1.2 is the first justified point to add the smallest `src/rendering/scene/` and `src/world/chunks/` structure needed for actual world output. [Source: repository `src/` tree; `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`, "File List"]
- Keep the browser-native shell as the player-facing loading and recovery surface even after the Babylon world is introduced, but reduce it to a lightweight overlay or recovery surface once the slice is ready. The Babylon world should become the primary viewport at that point. [Source: `src/ui/shell/location-entry-screen.ts`; `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture"]
- There is still no dedicated UX planning artifact. The load experience should stay simple, readable, and recognition-first rather than adding complex menus, HUD chrome, or tutorial flows. [Source: workflow discovery results; `_bmad-output/planning-artifacts/gdd.md`, "Tutorial Integration" and "Executive Summary"]

### Project Context Rules

- Treat Babylon's scene graph as a rendering and composition layer, not the sole source of gameplay truth. Keep slice and chunk data in explicit domain structures. [Source: `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- Use Havok as the only runtime physics backend and keep gameplay simulation aligned with the `60 Hz` fixed-step approach chosen in architecture. [Source: `_bmad-output/project-context.md`, "Engine-Specific Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Physics and Simulation"]
- Design for the `60 FPS` desktop-browser target and treat world streaming, vehicle simulation, traffic, and pedestrians as hot-path systems. Even though Story 1.2 is early, avoid architecture debt that assumes preload-all worlds or heavy per-frame allocation. [Source: `_bmad-output/project-context.md`, "Performance Rules"]
- Keep domain logic in its owning folders. `src/app/` orchestrates, `src/rendering/` displays, `src/services/` handles optional remote calls, and `src/persistence/` handles browser storage. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"]
- Runtime-loaded assets and data live under `public/`; do not put application logic there. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"]
- Tests belong under the standard `tests/` folders and should prefer deterministic seeds plus stable fixtures and helpers. [Source: `_bmad-output/project-context.md`, "Testing Rules"]
- The primary target is desktop web browsers with keyboard and mouse plus gamepad as first-class inputs. Do not let the slice-ready implementation block that platform direction. [Source: `_bmad-output/project-context.md`, "Platform & Build Rules"; `_bmad-output/planning-artifacts/gdd.md`, "Controls and Input"]
- Do not bypass the world-slice generation pipeline, do not mix static slice state with dynamic session state, do not fetch or parse runtime data directly from gameplay systems, and do not call storage or remote APIs directly from gameplay domains. [Source: `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"]
- Do not trade away road truth, scale, terrain, or district rhythm for arbitrary visual embellishment. Recognition-first fidelity matters more than high-detail simulation. [Source: `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"; `_bmad-output/planning-artifacts/gdd.md`, "Level Design Principles" and "Art and Audio Direction"]

### References

- `_bmad-output/planning-artifacts/epics.md`, "Epic 1: World Slice & Core Driving"
- `_bmad-output/planning-artifacts/gdd.md`, "Executive Summary"
- `_bmad-output/planning-artifacts/gdd.md`, "Core Gameplay Loop"
- `_bmad-output/planning-artifacts/gdd.md`, "Level Design Framework"
- `_bmad-output/planning-artifacts/gdd.md`, "Level Design Principles"
- `_bmad-output/planning-artifacts/gdd.md`, "Art and Audio Direction"
- `_bmad-output/planning-artifacts/gdd.md`, "Technical Specifications"
- `_bmad-output/planning-artifacts/gdd.md`, "Success Metrics"
- `_bmad-output/planning-artifacts/gdd.md`, "Assumptions and Dependencies"
- `_bmad-output/planning-artifacts/game-architecture.md`, "State Management"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Asset Management"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Physics and Simulation"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Scene Structure"
- `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Error Handling"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Logging"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Project Structure"
- `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Real-place World Slice Generation"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Stable City / Living Session"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Consistency Rules"
- `_bmad-output/project-context.md`, "Technology Stack & Versions"
- `_bmad-output/project-context.md`, "Engine-Specific Rules"
- `_bmad-output/project-context.md`, "Performance Rules"
- `_bmad-output/project-context.md`, "Code Organization Rules"
- `_bmad-output/project-context.md`, "Testing Rules"
- `_bmad-output/project-context.md`, "Platform & Build Rules"
- `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"
- `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/state/session-state-machine.ts`
- `src/app/events/game-events.ts`
- `src/app/config/session-config.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/world/generation/location-resolver.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `https://registry.npmjs.org/vite/latest`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://vite.dev/guide/`
- `https://vite.dev/guide/performance`

## Dev Agent Record

### Implementation Plan

- Extend the current Story 1.1 handoff and session state into an end-to-end world-generation and world-ready flow without breaking the browser-native shell UX.
- Build the first deterministic slice pipeline and renderable Babylon world scene behind explicit generation, manifest, and chunk boundaries.
- Add unit, integration, and browser smoke coverage for the first location-submit to slice-ready milestone before handing off to Story 1.3 spawn work.

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test`
- `npm run check`
- `npm run build`
- `npm run test:browser`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Previous story learnings, current code seams, git conventions, and latest package-version checks are embedded above.
- No dedicated UX artifact was found; UX guidance for this story was derived from the epics, GDD, architecture, project-context, and existing Story 1.1 implementation.
- Extended the Story 1.1 session flow into explicit `world-generation-requested`, `world-generating`, `world-loading`, `world-ready`, and `world-load-error` phases with typed lifecycle events, structured timing logs, and recoverable retry/edit handling.
- Added a deterministic world-slice pipeline with explicit architecture stage functions, a manifest store boundary, preset-backed local geo data, and fallback generation so alias, structured, address-like, and approved single-token queries all reach a loadable slice.
- Added serializable `SliceManifest` and spawn-candidate records that stay separate from future mutable runtime state while remaining available for Story 1.3 handoff.
- Bootstrapped a Babylon world scene with a stable render host, one world root plus chunk subtrees, readable road geometry, bounded slice visuals, simple urban massing, and collision-ready static surfaces.
- Updated shell and smoke flows so the Babylon world becomes the primary viewport at slice-ready while the browser shell collapses into a lightweight ready/recovery overlay.
- Added unit, integration, jsdom smoke, and Playwright smoke coverage for session transitions, deterministic generation, accepted query classes, recoverable failure paths, and slice-ready validation across Chromium, Firefox, and WebKit.
- Code review fixes now ignore stale location-resolution results after the player chooses Edit, so abandoned submissions cannot advance into generation or scene load.
- Code review fixes moved the default Babylon scene bootstrap behind a lazy import and read the loaded slice back through the generator-owned manifest store boundary before scene handoff.
- Code review fixes enabled Havok-backed static physics bodies for ground, roads, chunk floors, slice bounds, and placeholder massing so Story 1.3 can attach runtime collision behavior without reworking scene bootstrap.
- `npm test`, `npm run check`, `npm run build`, and `npm run test:browser` all pass.

### File List

- `public/data/world-gen/location-presets.json`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/app/state/session-state-machine.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/styles.css`
- `src/ui/shell/location-entry-screen.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/slice-manifest-store.ts`
- `src/world/generation/world-load-failure.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/fixtures/location-queries.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/unit/session-state-machine.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`

## Change Log

- 2026-04-07: Implemented deterministic slice generation, Babylon scene loading, explicit world-ready orchestration, recoverable retry/edit handling, and cross-browser slice-ready validation for Story 1.2.
- 2026-04-07: Applied code-review fixes for stale resolve cancellation, manifest-store-backed slice handoff, Havok-ready static physics bootstrap, and accurate story tracking.
