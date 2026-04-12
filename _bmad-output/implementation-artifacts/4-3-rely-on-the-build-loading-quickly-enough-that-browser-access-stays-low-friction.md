# Story 4.3: Rely on the Build Loading Quickly Enough That Browser Access Stays Low-Friction

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can rely on the build loading quickly enough that browser access stays low-friction,
so that browser access stays low-friction.

## Acceptance Criteria

1. Given a cold page visit or hard reload of the built desktop-browser app, when the player opens GT Anywhere, then the browser reaches a usable location-entry shell through a lean HTML/CSS/entry-module path, and the implementation exposes additive shell/build/load telemetry that makes shell-ready, `world.manifest.ready`, and `world.scene.ready` timing observable without blocking first interaction on Babylon scene code or full gameplay runtime bootstrap.
2. Given the player submits a valid location or restarts or replays a compatible slice, when Story 4.3 load-path work lands, then it reduces avoidable JavaScript, fetch, and bootstrap waterfall through targeted changes in the existing Vite, bootstrap, generation, vehicle-data, and scene seams rather than by removing current mechanics, shrinking default scope, or moving the readiness milestone earlier than actual control.
3. Given compatible slice data, preset data, or vehicle tuning data has already been produced or fetched, when the next compatible run or repeat visit occurs, then the app reuses version-safe cached results through explicit typed seams instead of redundant regeneration or duplicate `/data/...` fetches, while preserving `compatibilityKey`, `reuseKey`, `generationVersion`, and current settings semantics.
4. Given the player keeps using location submit, retry, edit location, restart, Backspace quick restart, same-location replay, remembered settings, vehicle switching, hijacking, traffic, pedestrians, combat, heat, and run-outcome flows, when build-loading improvements land, then those flows still preserve typed `world.load.failed` behavior, the shell or HUD ownership split, single-active-scene safety, and all current ready or telemetry contracts.
5. Given load-time improvements may defer non-critical work, when the world is reported ready, then the player can actually control the starter vehicle at the existing readiness milestone `controllable-vehicle`, any deferred work remains additive, and superseded loads still dispose cleanly without resurrecting stale scenes after edit, retry, restart, or replay cancellation.
6. Given repository validation runs, when unit, integration, smoke, typecheck, build, and Playwright browser coverage execute, then Chromium, Firefox, and WebKit checks confirm shell-first boot, preserved event order, additive load telemetry, compatible cache reuse, and no regression in the desktop-browser gameplay loop, while CI assertions avoid brittle wall-clock thresholds and rely on structured timings, dataset fields, request counts, or cache-hit signals instead.

### Start Here

- `src/main.ts`
- `index.html`
- `vite.config.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/app/state/session-state-machine.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/world/generation/slice-manifest-store.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/vehicles/physics/vehicle-manager.ts`
- `src/traffic/runtime/traffic-system.ts`
- `src/rendering/scene/responder-scene-runtime.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`
- `tests/integration/quick-restart.integration.spec.ts`
- `tests/integration/run-outcome-restart.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`

## Tasks / Subtasks

- [x] Task 1: Add additive shell, build, and load telemetry across the existing bootstrap and scene lifecycle (AC: 1, 2, 6)
  - [x] Keep `world.manifest.ready`, `world.scene.ready`, and `world.load.failed` intact; add any new shell or build timing outputs additively through typed seams, structured logs, `scene.metadata`, `canvas.dataset`, or `renderHost.dataset`.
  - [x] If Story 4.3 adds a shell-ready milestone before scene creation, surface it explicitly through a render-host key such as `data-shell-ready-at-ms` and a structured `app.shell.ready` log or equivalent typed seam rather than trying to reuse canvas-only telemetry.
  - [x] Prefer browser `performance` APIs and existing readiness milestones over a second custom telemetry surface.
  - [x] Ensure new telemetry resets correctly on reload, retry, restart, and replay.
- [x] Task 2: Reduce the current startup and scene-load waterfall through the existing lazy-loading seams (AC: 1, 2, 5, 6)
  - [x] Keep the startup shell fast and interactive before the world scene is requested.
  - [x] Use `createDefaultWorldSceneLoader()` and `getSceneLoader()` as the first place to prewarm or split the world-scene load path instead of pulling Babylon runtime code back into initial boot.
  - [x] If some runtime work can be safely staged after the player can drive, defer it without changing the meaning of `controllable-vehicle` or weakening teardown safety.
- [x] Task 3: Reuse compatible data and eliminate redundant fetch or generation work (AC: 2, 3, 4, 6)
  - [x] Add shared caching or prefetch for location preset and vehicle tuning data before inventing broader data-delivery systems.
  - [x] Preserve `compatibilityKey`, `reuseKey`, `generationVersion`, and current settings compatibility rules for restart, replay, retry, and repeat visits.
  - [x] Keep any persistent cache versioned and explicitly disposable so stale build or data artifacts cannot serve the wrong world or vehicle setup.
- [x] Task 4: Tighten production build delivery only where measured bottlenecks justify it (AC: 1, 2, 3, 4, 6)
  - [x] If Story 4.3 needs Vite build changes, keep them minimal and explicit around chunking, preload, or static-asset delivery rather than introducing new tooling.
  - [x] If a service worker or Cache API layer is introduced for repeat-visit speed, keep it narrow, HTTPS-safe, versioned, and cleanup-aware; do not widen this story into a full offline/PWA or public packaging initiative.
  - [x] Do not add new dependencies, frameworks, or a second bundler to solve load friction.
- [x] Task 5: Add guardrail coverage and run repository validation (AC: 4, 5, 6)
  - [x] Extend unit, integration, smoke, and browser tests for load telemetry, request dedupe or cache reuse, event order, and ready-safe staged initialization.
  - [x] Assert semantics such as milestone order, nonzero timing fields, cache-hit or call-count behavior, and stable dataset keys instead of brittle time thresholds.
  - [x] Run `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.

## Dev Notes

- Story 4.3 is the load-time and browser-access story inside Epic 4. It should improve shell boot, compatible warm-load behavior, and submit-to-drivable-world latency without widening into Story 4.2 runtime FPS stabilization, Story 4.4 polish, Story 4.5 browser-certification scope, or Story 4.6 public-build packaging. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md`]
- The browser-first product promise treats instant access, fast enough first interaction, and low-friction repeat entry as core value. Slow or unreliable first-session loading is a product failure, not just a technical nuisance. [Source: `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`; `_bmad-output/planning-artifacts/gdd.md#Platform-Specific Details`; `_bmad-output/planning-artifacts/game-brief.md`; `_bmad-output/planning-artifacts/research/market-browser-based-open-world-games-experiences-built-around-real-world-data-and-location-generation-research-2026-04-06T13:14:03-07:00.md`]
- Default `worldSize` remains an intentional product dial and the default experience favors meaningful exploration, not the absolute fastest fake startup. Story 4.3 may improve load time, but it must not silently shrink the product promise or settings semantics to do it. [Source: `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Settings Application Rules`]
- No dedicated UX artifact was discovered during workflow input loading. Use the GDD, architecture, project-context, game brief, brainstorming, research, current shell implementation, and current tests as the controlling guidance for this story. [Source: workflow discovery results]

### Previous Story Intelligence

- Story 4.2 explicitly reserved Story 4.3 for load-time pipeline work and already added additive performance telemetry plus browser-family defaults. Build-load work should extend those surfaces rather than inventing a second reporting system. [Source: `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Dev Notes`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Technical Requirements`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Latest Tech Information`]
- Story 4.1 established the only shipped settings contract, saved-setting precedence rules, and compatibility-key semantics. Do not widen or violate them while chasing load speed. [Source: `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Shipped Settings Contract`; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Settings Application Rules`; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Technical Requirements`]
- Story 1.2 established the typed load lifecycle, shell loading copy, `world.manifest.ready` versus `world.scene.ready`, cached retry or edit semantics, and under-60-second world-entry instrumentation. Story 4.3 should build on those seams instead of replacing them. [Source: `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md#Acceptance Criteria`; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md#Technical Requirements`; `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md#Previous Story Intelligence`]
- Story 3.6 unified overlay restart, Backspace restart, and auto-restart around the cached same-slice path with stale-load cancellation safety. Any new preload, deferred-init, or cache work must preserve that behavior. [Source: `_bmad-output/implementation-artifacts/3-6-escape-fail-and-restart-the-run.md`; `src/app/bootstrap/create-game-app.ts`; `tests/integration/quick-restart.integration.spec.ts`]

### Current Load Contracts

- Session flow is explicit and test-visible: `location-select` -> `location-resolving` -> `world-generation-requested` -> `world-generating` -> `world-loading` -> `world-ready`, with recoverable `world-load-error`; `renderHost.dataset.phase` mirrors the active phase. [Source: `src/app/state/session-state-machine.ts`; `src/app/bootstrap/create-game-app.ts`]
- Successful load event order is already locked in as `session.location.submitted`, `session.location.resolved`, `world.generation.requested`, `world.generation.started`, `world.manifest.ready`, and `world.scene.ready`. [Source: `src/app/events/game-events.ts`; `src/app/bootstrap/create-game-app.ts`; `tests/integration/location-entry.integration.spec.ts`]
- The canonical ready contract is `controllable-vehicle` on both the typed event and the canvas `data-ready-milestone`. [Source: `src/app/events/game-events.ts`; `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/create-world-scene.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- `LocationEntryScreen` owns `loading-feedback`, `retry-load`, `edit-location`, `restart-from-spawn`, replay buttons, and settings visibility. Load-time work must preserve those player-visible control points. [Source: `src/ui/shell/location-entry-screen.ts`; `tests/integration/location-entry.integration.spec.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Restart, replay, retry, and stale-load cancellation are app-owned through `createGameApp()` using `activeLoadId`, cached manifest reuse, and single-scene disposal. [Source: `src/app/bootstrap/create-game-app.ts`; `tests/integration/location-entry.integration.spec.ts`; `tests/integration/quick-restart.integration.spec.ts`; `tests/integration/run-outcome-restart.integration.spec.ts`]
- Any new shell-ready signal must exist before canvas creation, so it should live on the render host and structured logs or typed events instead of scene-only telemetry. [Source: `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/create-world-scene.ts`]
- Existing browser-visible telemetry already includes `data-performance-*`, `data-settings-*`, `data-graphics-browser-family`, `data-traffic-vehicle-count`, `data-responder-vehicle-count`, `data-run-outcome*`, `data-active-camera`, and possession or navigation surfaces. New Story 4.3 telemetry must be additive. [Source: `src/rendering/scene/world-scene-runtime.ts`; `src/rendering/scene/create-world-scene.ts`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Technical Requirements`]

### Non-Negotiables

- Do not change the readiness milestone `controllable-vehicle` or report `world.scene.ready` before the player can actually drive.
- Do not break the typed `world.load.failed` path, current failure codes or stages, or the existing retry, edit-location, restart, replay, and Backspace semantics.
- Do not move startup, loading, or settings UI out of the HTML and CSS shell into Babylon GUI or a new UI framework.
- Do not silently reduce default world scope, density semantics, or the shipped settings contract just to make the load path look faster.
- Do not eagerly import the full Babylon world scene into initial shell boot merely to simplify code organization.
- Do not add new dependencies, a second bundler, remote analytics, or backend services to solve this story.
- Do not introduce persistent caches without explicit versioning and cleanup keyed to compatible slice identity and current build or data versions. [Source: `_bmad-output/project-context.md`; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md`; `src/app/bootstrap/create-game-app.ts`]

### Technical Requirements

- `src/main.ts` currently imports styles and `createGameApp()` directly, then renders a fatal shell fallback if bootstrap fails. Keep the initial entry lean; any new lazy boundary, preload hook, or service-worker registration must preserve that immediate shell boot and failure posture. [Source: `src/main.ts`]
- `index.html` currently boots a single module entry at `/src/main.ts`. Keep first paint and shell boot simple; do not stuff large inline bootstrap logic or speculative preloads into the HTML unless they clearly improve measured access friction and preserve build portability. [Source: `index.html`; `_bmad-output/planning-artifacts/game-architecture.md#Toolchain`]
- `vite.config.ts` currently only configures Vitest. If Story 4.3 adds production build options, keep them minimal, explicit, and justified by measured load-path gains rather than broad configuration churn. [Source: `vite.config.ts`]
- The current dynamic scene seam is `createDefaultWorldSceneLoader()` plus `getSceneLoader()` inside `createGameApp()`, which lazily imports `../../rendering/scene/create-world-scene`. Use that seam first for prewarming or additional async splitting instead of collapsing Babylon code back into shell boot. Preserve `sceneLoaderPromise` memoization so multiple submissions or restarts do not duplicate scene-chunk requests. [Source: `src/app/bootstrap/create-game-app.ts`]
- `createGameApp()` already owns `activeLoadId` cancellation, cached restart or replay reuse, typed load events, shell visibility, and render-host lifecycle. Extend those helpers rather than inventing a second bootstrap path, parallel retry flow, or UI-owned cache path. [Source: `src/app/bootstrap/create-game-app.ts`; `src/ui/shell/location-entry-screen.ts`]
- Current timed outputs are `world.manifest.ready.durationMs`, `world.scene.ready.durationMs`, and `world.load.failed.durationMs`. If shell-ready, build-load, or cache-hit telemetry is added, make it additive and typed instead of renaming existing events or overloading current meanings. [Source: `src/app/events/game-events.ts`; `src/app/bootstrap/create-game-app.ts`; `tests/integration/location-entry.integration.spec.ts`]
- Because canvas telemetry does not exist until scene creation, any pre-scene shell-ready metric should be emitted before `getSceneLoader()` work begins and should live on `renderHost.dataset`, structured logs, or a new typed app-level event rather than on `canvas.dataset`. [Source: `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/create-world-scene.ts`]
- Manifest reuse currently depends on `compatibilityKey` plus a `reuseKey` fallback. If Story 4.3 adds cross-reload or browser-persistent caching, preserve `generationVersion`, compatible settings semantics, and typed manifest ownership so stale worlds are never reused. [Source: `src/world/generation/world-slice-generator.ts`; `src/world/generation/slice-manifest-store.ts`; `src/app/bootstrap/create-game-app.ts`; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Settings Application Rules`]
- `FetchGeoDataPresetSource` already memoizes `/data/world-gen/location-presets.json` per generator instance, but `loadTuningProfile()` still fetches `/data/tuning/${vehicleType}.json` directly. Shared cache or preload work should start at those existing data seams before inventing a broader delivery system. [Source: `src/world/generation/world-slice-generator.ts`; `src/vehicles/physics/vehicle-factory.ts`]
- `createTrafficSystem()` currently awaits vehicle tuning in a serial loop, responder runtime loads tuning separately, and `createVehicleManager()` keeps its own per-manager tuning cache for vehicle switching. If load friction is dominated by vehicle data startup, prefer one shared deduped cache or preload path that covers starter spawn, hijackables, traffic, responders, and later vehicle switching. [Source: `src/traffic/runtime/traffic-system.ts`; `src/rendering/scene/responder-scene-runtime.ts`; `src/vehicles/physics/vehicle-factory.ts`; `src/vehicles/physics/vehicle-manager.ts`]
- `create-world-scene.ts` currently waits for static physics, starter vehicle, hijackables, traffic, pedestrians, chaos, combat, heat, responder runtime, camera setup, and render-loop start before writing `data-ready-milestone`. If staged initialization is introduced, keep `controllable-vehicle` tied to real player control and ensure deferred subsystems still dispose cleanly on superseded loads. [Source: `src/rendering/scene/create-world-scene.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Keep new browser-readable load telemetry on existing surfaces such as `renderHost.dataset.phase`, `scene.metadata`, and `canvas.dataset`. New keys must be additive and must reset or repopulate correctly on reload, retry, restart, and replay. [Source: `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/world-scene-runtime.ts`; `src/rendering/scene/create-world-scene.ts`]
- If a service worker or Cache API path is introduced, remember service workers require HTTPS or localhost, need install or activate version management and cache cleanup, and should stay narrowly focused on immutable build or data caching rather than full offline-first product scope. [Source: `https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers`; `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md`]
- Runtime-fetched static data belongs under `public/data/`, but application logic must not move there. Improve delivery, parsing, or caching logic in source code, not by burying new behavior in data files or UI modules. [Source: `_bmad-output/project-context.md#Code Organization Rules`; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Technical Requirements`]

### Architecture Compliance

- Keep orchestration, state transitions, logging, event wiring, and shell or build delivery control in `src/app/`. Do not move gameplay truth into `src/app/` or `src/ui/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`; `_bmad-output/project-context.md#Code Organization Rules`]
- `src/rendering/` should continue consuming domain state to display the world. Load-time work may stage scene bootstrap, but it must not convert the Babylon scene graph into the source of truth for generation, persistence, or session compatibility. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Scene Structure`; `_bmad-output/project-context.md#Engine-Specific Rules`]
- Preserve the static-slice versus dynamic-session split. Improve load time by reusing compatible static data or deferring non-critical dynamic systems, not by mixing run-state into manifest cache or session identity. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`; `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- Keep cross-domain coordination on typed events, typed contracts, or narrow injected collaborators rather than DOM scraping, ad hoc globals, or side-channel state. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `_bmad-output/planning-artifacts/game-architecture.md#Consistency Rules`; `_bmad-output/project-context.md#Engine-Specific Rules`]
- Maintain the `60 Hz` fixed-step gameplay rule. Story 4.3 is about getting to the world faster, not changing runtime simulation truth to render-delta logic. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Physics and Simulation`; `_bmad-output/project-context.md#Engine-Specific Rules`]
- Respect the chunk-oriented world model and streaming architecture. Do not "optimize" load time by turning the world into one monolithic resident scene or bypassing the existing chunk and manifest boundaries. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Asset Management`; `_bmad-output/planning-artifacts/game-architecture.md#Scene Structure`; `_bmad-output/project-context.md#Performance Rules`]

### Library / Framework Requirements

- Stay on the repository's pinned stack for this story: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, `vite` `8.0.5`, TypeScript `5.9.3`, Vitest `3.2.4`, and Playwright `1.59.1`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`; `_bmad-output/project-context.md#Technology Stack & Versions`]
- Latest checks during this workflow show `@babylonjs/core` `9.2.0` is newer than the pinned `9.1.0`, `@babylonjs/havok` `1.3.12` still matches latest, `vite` `8.0.8` is newer than the pinned `8.0.5`, and `@playwright/test` `1.59.1` still matches latest. Do not widen Story 4.3 into dependency upgrades. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `https://registry.npmjs.org/@babylonjs/havok/latest`; `https://registry.npmjs.org/vite/latest`; `https://registry.npmjs.org/@playwright/test/latest`]
- Current Vite guidance still recommends dynamic-importing large conditional code, avoiding barrel files, preferring explicit import paths, and profiling build or transform cost before guessing. Follow that guidance if bundle or startup work is needed. [Source: `https://vite.dev/guide/performance`]
- Vite build options relevant to this story include `build.modulePreload`, `build.assetsInlineLimit`, `build.cssCodeSplit`, `build.manifest`, and `build.target`. Use them only if they solve measured Story 4.3 bottlenecks; do not add config complexity speculatively. [Source: `https://vite.dev/config/build-options`]
- Babylon ES6 guidance still says the best tree-shaking results come from targeted imports and avoiding legacy bundle-style imports. If bundle profiling proves Babylon chunk weight is a real blocker, prefer narrower import boundaries or smaller async seams instead of adding another 3D layer or importing `Legacy/legacy.js`. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/setup/frameworkPackages/es6Support.md`]
- Keep the current HTML and CSS shell. Do not add React, Vue, a PWA plugin, or another loader framework just to chase load-time improvements. [Source: `src/ui/shell/location-entry-screen.ts`; `src/styles.css`; `_bmad-output/project-context.md#Platform & Build Rules`]

### File Structure Requirements

- Likely primary touchpoints for Story 4.3 are:
  - `src/main.ts`
  - `index.html`
  - `vite.config.ts`
  - `src/app/bootstrap/create-game-app.ts`
  - `src/app/events/game-events.ts`
  - `src/app/state/session-state-machine.ts` only if a new typed load event or shell milestone is truly necessary
  - `src/ui/shell/location-entry-screen.ts`
  - `src/world/generation/world-slice-generator.ts`
  - `src/world/generation/slice-manifest-store.ts`
  - `src/rendering/scene/create-world-scene.ts`
  - `src/rendering/scene/world-scene-runtime.ts`
  - `src/vehicles/physics/vehicle-factory.ts`
  - `src/vehicles/physics/vehicle-manager.ts`
  - `src/traffic/runtime/traffic-system.ts`
  - `src/rendering/scene/responder-scene-runtime.ts`
  - relevant unit, integration, smoke, and browser tests
- Keep any new helper file small and adjacent to the owning layer. For example, browser-persistent caching beyond the current in-memory manifest store belongs under `src/persistence/` or a narrow app-owned bootstrap seam, not inside `src/ui/`, `public/`, or gameplay runtime modules. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/project-context.md#Code Organization Rules`]
- If a service worker is introduced, keep the worker path and registration explicit so scope is obvious, update behavior is versioned, and shell boot is not blocked. [Source: `https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers`]
- Follow repository naming conventions exactly: `kebab-case` modules and directories, `PascalCase` classes and types, `camelCase` functions and variables, `UPPER_SNAKE_CASE` constants, and `domain.action` event names. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Naming Conventions`; `_bmad-output/project-context.md#Code Organization Rules`]

### Testing Requirements

- Preserve the existing success-path event order, ready milestone, and recoverable failure contracts already asserted in `tests/integration/location-entry.integration.spec.ts`. Story 4.3 must not reorder or rename those milestones casually. [Source: `tests/integration/location-entry.integration.spec.ts`; `src/app/events/game-events.ts`]
- Add unit coverage for any new tuning or preset cache helper, load telemetry helper, service-worker or cache utility, or scene-staging helper. High-value existing unit files include `tests/unit/vehicle-factory.spec.ts`, `tests/unit/traffic-system.spec.ts`, `tests/unit/responder-scene-runtime.spec.ts`, `tests/unit/create-world-scene.spec.ts`, `tests/unit/world-scene-runtime.spec.ts`, and `tests/unit/session-state-machine.spec.ts`. [Source: repository test tree]
- Extend integration coverage in `tests/integration/location-entry.integration.spec.ts`, `tests/integration/world-slice-loading.integration.spec.ts`, `tests/integration/quick-restart.integration.spec.ts`, and `tests/integration/run-outcome-restart.integration.spec.ts` for cache reuse, request dedupe, staged initialization safety, and preserved stale-load cancellation. [Source: repository test tree; `src/app/bootstrap/create-game-app.ts`]
- Extend smoke coverage in `tests/smoke/app-bootstrap.smoke.spec.ts` and Playwright coverage in `tests/smoke/app-bootstrap.pw.spec.ts` to prove shell-first boot, `controllable-vehicle`, additive load telemetry, and warm-load or repeat-visit behavior on Chromium, Firefox, and WebKit. [Source: `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`; `playwright.config.ts`]
- Prefer `whenIdle()`, semantic milestones, dataset fields, cache-hit or call-count assertions, and nonzero timing checks over hard time thresholds in CI. Existing patterns already prove this is the repo standard. [Source: `tests/integration/location-entry.integration.spec.ts`; `tests/integration/quick-restart.integration.spec.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Testing Requirements`]
- If browser networking is part of the optimization, add at least one built-preview browser test that observes request counts or warm-load reuse for `/data/world-gen/location-presets.json` and `/data/tuning/*.json` without relying on unstable absolute millisecond cutoffs. [Source: `tests/smoke/app-bootstrap.pw.spec.ts`; `playwright.config.ts`; `src/world/generation/world-slice-generator.ts`; `src/vehicles/physics/vehicle-factory.ts`]
- Manual profiling should use one cold visit and one warm repeat visit per supported browser engine, recording shell-ready, `world.manifest.ready`, `world.scene.ready`, request waterfalls, and cache behavior from the same representative location. [Source: `_bmad-output/planning-artifacts/gdd.md#Success Metrics`; `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md`]
- Finish validation with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`. [Source: `package.json`; `playwright.config.ts`]

### Git Intelligence Summary

- Last 5 commit titles:
  - `Add performance telemetry and browser capability defaults`
  - `Update sprint status`
  - `Add player settings and density configuration`
  - `Update sprint status`
  - `Add pursuit, run outcomes, and quick restart loop`
- Recent work concentrates changes in orchestration, scene bootstrap, platform config, and tests rather than isolated leaf files. Story 4.3 should follow that pattern and work through the existing typed seams. [Source: recent git history; `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/create-world-scene.ts`; `src/app/config/platform.ts`]
- Recent Epic 4 work favors conservative settings behavior, additive telemetry, restart safety, and broad automated coverage. Keep that implementation style for load-time work. [Source: recent git history; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md`]
- Recent commits did not add dependencies. Keep Story 4.3 inside the current Babylon, Vite, TypeScript, Vitest, and Playwright stack unless a concrete blocker appears. [Source: recent git history; `package.json`]

### Latest Tech Information

- Vite `8.0.8` is the current latest release while the repo remains pinned to `8.0.5`. Vite's current guidance still emphasizes profiling before guessing, dynamic-importing large conditional code, avoiding barrel files, and using explicit imports where possible. [Source: `https://registry.npmjs.org/vite/latest`; `https://vite.dev/guide/performance`]
- Vite's current build docs still expose focused levers for this story, especially `build.modulePreload`, `build.assetsInlineLimit`, `build.cssCodeSplit`, `build.manifest`, and `build.target`. Those are enough to solve most measured delivery issues without changing tools. [Source: `https://vite.dev/config/build-options`]
- `@babylonjs/core` `9.2.0` is newer than the pinned `9.1.0`, but Babylon's ES6 documentation still says tree-shaking is strongest when imports stay targeted and side-effect-heavy legacy patterns are avoided. Treat that as guidance if bundle-size work touches Babylon imports. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/setup/frameworkPackages/es6Support.md`]
- `@babylonjs/havok` `1.3.12` still matches the current latest release, so the existing physics dependency is already current enough for Story 4.3. [Source: `https://registry.npmjs.org/@babylonjs/havok/latest`]
- Playwright `1.59.1` still matches the latest release, so the repository's current cross-browser smoke harness is already current enough for this story. [Source: `https://registry.npmjs.org/@playwright/test/latest`; `playwright.config.ts`]
- MDN's current service-worker guidance still requires secure context, versioned install and activate behavior, explicit cache cleanup, and optionally navigation preload when you want cached or parallelized repeat visits. If Story 4.3 introduces that path, keep it narrow and well-versioned. [Source: `https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers`]

### Project Structure Notes

- `src/main.ts` is still a small shell entrypoint. Keep it that way. Treat it as the first-paint and shell-boot seam, not a dumping ground for gameplay or scene logic. [Source: `src/main.ts`]
- `src/app/bootstrap/create-game-app.ts` already owns world-load timing, cached restart or replay behavior, lazy scene-loader memoization, shell visibility, and stale-load cancellation. It is the best place for shell-ready telemetry, loader warmup, and compatible load orchestration. [Source: `src/app/bootstrap/create-game-app.ts`]
- `src/rendering/scene/create-world-scene.ts` is already one of the largest files in the repo. If Story 4.3 needs staged initialization or repeated data prefetch helpers, extract only the smallest useful helper instead of spreading load logic across many new files. [Source: `src/rendering/scene/create-world-scene.ts`]
- `src/world/generation/world-slice-generator.ts` and `src/world/generation/slice-manifest-store.ts` are the clean seams for preset-data and manifest reuse. Do not move those responsibilities into shell code. [Source: `src/world/generation/world-slice-generator.ts`; `src/world/generation/slice-manifest-store.ts`]
- `src/vehicles/physics/vehicle-factory.ts`, `src/vehicles/physics/vehicle-manager.ts`, `src/traffic/runtime/traffic-system.ts`, and `src/rendering/scene/responder-scene-runtime.ts` are the most obvious repeated tuning-fetch seams. Start there before inventing new asset-pipeline machinery. [Source: `src/vehicles/physics/vehicle-factory.ts`; `src/vehicles/physics/vehicle-manager.ts`; `src/traffic/runtime/traffic-system.ts`; `src/rendering/scene/responder-scene-runtime.ts`]
- `tests/smoke/app-bootstrap.pw.spec.ts` already exercises the built preview across Chromium, Firefox, and WebKit. Keep Story 4.3 validation centered there rather than inventing a second browser harness. [Source: `tests/smoke/app-bootstrap.pw.spec.ts`; `playwright.config.ts`]

### Project Context Rules

- Use Babylon.js `9.1.0`, Havok `1.3.12`, Vite `8.0.5`, TypeScript, and desktop browsers with WebGL2 support as the enforced baseline stack. [Source: `_bmad-output/project-context.md#Technology Stack & Versions`]
- Keep gameplay simulation on a `60 Hz` fixed step with interpolation; do not drive gameplay truth directly from render delta. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Treat world streaming, vehicle simulation, traffic, and pedestrians as hot-path systems; avoid per-frame allocations and unnecessary work in those loops. [Source: `_bmad-output/project-context.md#Performance Rules`]
- Keep domain logic in its owning folder. `src/app/` owns config and orchestration, `src/rendering/` consumes state, and `src/persistence/` is the only layer allowed to touch browser storage. [Source: `_bmad-output/project-context.md#Code Organization Rules`]
- Use HTML and CSS for startup, loading, and settings flows, and keep the in-game HUD in its dedicated gameplay UI layer. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Keep the primary platform focus on desktop web browsers. Do not optimize first for native desktop, console, or mobile in this story. [Source: `_bmad-output/project-context.md#Platform & Build Rules`]
- Do not bypass the world-slice generation pipeline, mix static slice state with dynamic session state, or bypass factories and pools for high-churn runtime entities. [Source: `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- Do not fetch or parse runtime data directly from gameplay systems, and do not call storage or remote APIs directly from gameplay domains. [Source: `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- Keep test coverage aligned with unit, integration, smoke, and browser conventions already in the repo, using deterministic seams where reproducibility matters. [Source: `_bmad-output/project-context.md#Testing Rules`]
- When in doubt, choose the more restrictive and less magical implementation path that preserves current contracts. [Source: `_bmad-output/project-context.md#Usage Guidelines`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/gdd.md#Platform-Specific Details`
- `_bmad-output/planning-artifacts/gdd.md#Success Metrics`
- `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`
- `_bmad-output/planning-artifacts/game-architecture.md#Asset Management`
- `_bmad-output/planning-artifacts/game-architecture.md#Toolchain`
- `_bmad-output/planning-artifacts/game-architecture.md#Scene Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`
- `_bmad-output/planning-artifacts/game-architecture.md#Event System`
- `_bmad-output/planning-artifacts/game-architecture.md#Naming Conventions`
- `_bmad-output/planning-artifacts/game-brief.md`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`
- `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md`
- `_bmad-output/planning-artifacts/research/market-browser-based-open-world-games-experiences-built-around-real-world-data-and-location-generation-research-2026-04-06T13:14:03-07:00.md`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`
- `_bmad-output/implementation-artifacts/3-6-escape-fail-and-restart-the-run.md`
- `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md`
- `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md`
- `package.json`
- `index.html`
- `vite.config.ts`
- `playwright.config.ts`
- `src/main.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/app/state/session-state-machine.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/world/generation/slice-manifest-store.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/vehicles/physics/vehicle-manager.ts`
- `src/traffic/runtime/traffic-system.ts`
- `src/rendering/scene/responder-scene-runtime.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/integration/world-slice-loading.integration.spec.ts`
- `tests/integration/quick-restart.integration.spec.ts`
- `tests/integration/run-outcome-restart.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/vite/latest`
- `https://registry.npmjs.org/@playwright/test/latest`
- `https://vite.dev/guide/performance`
- `https://vite.dev/config/build-options`
- `https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers`
- `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/setup/frameworkPackages/es6Support.md`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Implementation Plan

- Keep the initial browser shell lean and measurable, then reduce submit-to-ready latency through the existing lazy scene-loader seam instead of collapsing the whole Babylon runtime into app boot.
- Eliminate redundant preset or tuning fetches and preserve compatible manifest reuse before considering broader persistent caching or service-worker work.
- Prove the result with additive load telemetry plus unit, integration, smoke, and Playwright coverage that checks event order, ready safety, and warm-load behavior without brittle timing gates.
- Added render-host telemetry for shell-ready, manifest-ready, scene-ready, and load-failed timing while preserving the existing typed world events and resetting load-specific fields on each new attempt.
- Prewarm the memoized world-scene loader in a background task after shell boot so scene-chunk fetch can overlap with player think time without dragging Babylon back into the initial entry path.
- Reuse exact-match manifests by `compatibilityKey` and `generationVersion`, share in-flight tuning fetches, and prefetch unique traffic tuning types while keeping caches in-memory only so stale cross-build artifacts cannot persist.
- Keep build delivery changes confined to measured Vite chunking: consolidate Babylon runtime fan-out into stable vendor chunks, leave service-worker work out of scope, and avoid any new tooling or framework surface.

### Debug Log References

- `git log --oneline -5`
- `git log --stat --oneline -5`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/vite/latest`
- `https://registry.npmjs.org/@playwright/test/latest`
- `https://vite.dev/guide/performance`
- `https://vite.dev/config/build-options`
- `https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers`
- `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/setup/frameworkPackages/es6Support.md`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- No dedicated UX artifact was found; UX guidance for this story was derived from the GDD, architecture, project-context, game brief, brainstorming, research, and current shell or test seams.
- Story 4.3 is scoped to shell or build-load improvements, cache-safe data reuse, and ready-safe staged initialization while preserving current runtime and player contracts.
- Existing load-event order, typed failure handling, stale-load cancellation, Vite build posture, current lazy scene boundary, repeated tuning-fetch seams, and browser-test guardrails are embedded above.
- Added additive `app.shell.ready` telemetry plus render-host timing fields for shell, manifest, scene, and failure milestones without changing the existing world-event contracts.
- Added integration coverage proving the new timing fields appear on first load and reset correctly on replay, restart, and retry.
- Validated Task 1 with `npm run check`, the targeted `location-entry` integration spec, and the full `npm test` suite (`58` files, `209` tests passing).
- Added non-blocking scene-loader prewarm scheduling plus a reusable loader-factory seam so the existing lazy loader can warm in the background and still reuse the same memoized promise on first submit.
- Chose not to stage additional runtime systems after `controllable-vehicle` yet because loader prewarm was the smallest safe waterfall reduction that preserved current teardown and readiness semantics.
- Validated Task 2 with `npm run check`, the targeted `location-entry` integration spec, and the full `npm test` suite (`58` files, `210` tests passing).
- Added version-safe manifest reuse in `DefaultWorldSliceGenerator`, shared in-flight tuning fetch caching, and per-system unique tuning prefetch so compatible reruns stop redoing the same generation and data fetch work.
- Kept the new caches in-memory only, which preserves current compatibility semantics without introducing stale persistent artifacts or new cleanup requirements.
- Added unit coverage for manifest reuse, shared tuning-fetch reuse, and traffic tuning dedupe, then validated Task 3 with `npm run check` and the full `npm test` suite (`58` files, `213` tests passing).
- Measured the production build before changing config: the shell entry was already lean, but the lazy world-scene path emitted a 4 MB scene chunk plus heavy Babylon fan-out, so Task 4 adds only explicit Babylon manual chunks in Vite.
- Kept repeat-visit packaging scope narrow by intentionally not introducing a service worker or Cache API layer in this task; the build delivery change stays inside Vite chunking with no new dependencies.
- Added a dedicated Vite config unit test, re-ran `npm run build`, and validated Task 4 with `npm run check` plus the full `npm test` suite (`59` files, `214` tests passing).
- Extended smoke and Playwright coverage to assert render-host timing order, restart-safe telemetry refresh, and no duplicate preset or tuning requests on cached restart paths.
- Final repository validation passed with `npm run check`, `npm test` (`59` files, `214` tests), `npm run build`, and `npm run test:browser` (`12` browser tests across Chromium, Firefox, and WebKit).
- Guardrail assertions stay on structured timing fields, request counts, and stable dataset keys rather than brittle wall-clock thresholds.
- Story 4.3 is marked `review` after passing the full definition-of-done validation and preserving the current ready milestone, restart safety, and typed failure contracts.
- Fixed a medium severity issue where `FetchGeoDataPresetSource` would permanently cache an empty map on fetch failure, breaking future generation attempts.

### File List

- `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/traffic/runtime/traffic-system.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `vite.config.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/unit/traffic-system.spec.ts`
- `tests/unit/vehicle-factory.spec.ts`
- `tests/unit/vite-config.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`

## Change Log

- 2026-04-11: Created the comprehensive story context for Story 4.3 and marked it ready for development.
- 2026-04-11: Added shell and load telemetry on the render host, preserved existing world events, and covered reset-safe timing behavior in integration tests.
- 2026-04-11: Added non-blocking world-scene loader prewarm through the existing lazy seam and covered memoized reuse with integration tests.
- 2026-04-11: Added compatible manifest reuse plus shared tuning-data caching and prefetch to avoid redundant generation and duplicate vehicle-data fetches.
- 2026-04-11: Tightened Vite chunking for Babylon delivery after measuring the production build, without widening into service-worker or toolchain changes.
- 2026-04-11: Added smoke and browser guardrails for telemetry ordering and restart-safe request reuse, then completed the full repository validation commands.
- 2026-04-11: Fixed caching of failed location preset fetches in `world-slice-generator.ts` to allow recovery from transient network errors.
