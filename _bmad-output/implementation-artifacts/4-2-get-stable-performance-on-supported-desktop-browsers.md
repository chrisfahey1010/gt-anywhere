# Story 4.2: Get Stable Performance on Supported Desktop Browsers

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can get stable performance on supported desktop browsers,
so that driving remains satisfying.

## Acceptance Criteria

1. Given the player runs GT Anywhere on a supported desktop browser (`Chromium`-based, `Firefox`, or `Safari`/`WebKit`) and reaches the existing readiness milestone `controllable-vehicle`, when the world is active, then the build exposes additive, browser-safe performance telemetry and structured timing outputs that are sufficient to judge the desktop `60 FPS` target without removing or renaming the current readiness, settings, traffic, pedestrian, heat, run-outcome, possession, or navigation telemetry surfaces.
2. Given the active world scene is running, when Story 4.2 performance stabilization is implemented, then it works through targeted changes in the existing scene, platform, traffic, pedestrian, and generation seams plus the shipped `graphicsPreset` contract rather than through new dependencies, speculative new player-facing settings, or blanket Babylon performance modes that could disable picking, interaction, or runtime correctness.
3. Given scene complexity must stay inside supported desktop-browser budgets, when a run is created or recreated, then `worldSize`, `trafficDensity`, `pedestrianDensity`, and `graphicsPreset` continue to respect the 4.1 split between generation-affecting and runtime-only settings, preserve graphics-only compatible-slice reuse, and keep deterministic generation or placement behavior for any complexity reductions applied.
4. Given the player continues using location submit, world-ready, restart, replay, retry, edit-location, vehicle switching, hijacking, on-foot transitions, traffic, pedestrians, combat, heat, and run-outcome flows, when performance work lands, then those flows still preserve the shell or HUD ownership split, typed world-load failure behavior, and the readiness milestone `controllable-vehicle`.
5. Given representative supported-browser playtests are profiled, when the developer reviews the resulting telemetry and browser traces, then the implementation makes the desktop `60 FPS` target the optimization goal through explicit, conservative preset or browser-capability behavior instead of hidden one-off hacks, and any browser-specific concessions remain encoded through existing typed seams.
6. Given repository validation runs, when unit, integration, smoke, typecheck, build, and Playwright browser coverage execute, then Chromium, Firefox, and WebKit checks confirm the performance telemetry, stable world-ready loop, preserved settings semantics, and no regression in the current desktop-browser gameplay flow, while CI assertions avoid brittle hard realtime thresholds and rely on structured instrumentation instead.

### Start Here

- `src/app/bootstrap/create-game-app.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/app/config/platform.ts`
- `src/traffic/runtime/traffic-system.ts`
- `src/pedestrians/runtime/pedestrian-system.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/integration/player-settings.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`

## Tasks / Subtasks

- [x] Task 1: Add browser-safe performance telemetry and profiling seams to the existing app and scene flow (AC: 1, 5, 6)
  - [x] Reuse the existing `world.manifest.ready`, `world.scene.ready`, and `world.load.failed` typed events and structured logs instead of inventing a second reporting path.
  - [x] Extend `scene.metadata` and `canvas.dataset` additively with runtime performance signals the repo can observe in tests or manual profiling, such as frame-time or FPS summaries and scene counters where supported.
  - [x] Keep any advanced instrumentation graceful on browsers that lack a given API or extension.
- [x] Task 2: Deepen the existing runtime graphics and platform fallback behavior without widening the user-facing settings contract (AC: 2, 5, 6)
  - [x] Keep `graphicsPreset` as the primary user-facing runtime performance control unless a clearly justified product need emerges.
  - [x] Add any browser-family or capability-aware fallback behavior under the current `src/app/config/` and `src/rendering/scene/` seams, preserving the boot-vs-interactive precedence rules added in Story 4.1.
  - [x] Avoid new libraries, ad hoc browser globals spread across the codebase, or implicit scene magic that bypasses the current typed settings flow.
- [x] Task 3: Reduce hot-path runtime overhead in the current world scene and simulation systems (AC: 2, 4, 5)
  - [x] Inspect `create-world-scene.ts`, `traffic-system.ts`, and `pedestrian-system.ts` for avoidable per-frame allocations, repeated full scans, or scene work that can be reduced without changing gameplay truth.
  - [x] Preserve dynamic systems that depend on current interaction and runtime correctness, including possession, vehicle switching, hijacking, traffic, pedestrians, combat, heat, responders, and run-outcome handling.
  - [x] Keep teardown and restart safety intact so retries, restarts, and stale-load cancellation do not leak scene resources.
- [x] Task 4: Keep complexity budgets and generation or runtime boundaries coherent with 4.1 settings semantics (AC: 2, 3, 4, 5)
  - [x] If runtime stabilization requires complexity reductions, route them through the existing planner, generation, or scene-profile seams instead of inventing a second density or performance system.
  - [x] Preserve `createWorldGenerationCompatibilityKey()` rules so graphics-only changes keep compatible-slice reuse while generation-affecting changes still regenerate deterministically.
  - [x] Keep spawn clearance, deterministic placement, and restart or replay behavior coherent when density or budget logic is tuned.
- [x] Task 5: Add guardrail coverage and run full repository validation (AC: 1, 4, 5, 6)
  - [x] Extend unit and integration coverage for performance-profile mapping, browser-safe telemetry, and settings-compatibility invariants.
  - [x] Extend smoke and Playwright browser coverage on Chromium, Firefox, and WebKit to verify world-ready stability plus the new additive telemetry surfaces.
  - [x] Run `npm run check`, `npm test`, `npm run build`, and `npm run test:browser` before moving the story beyond implementation.

## Dev Notes

- Story 4.2 is the focused runtime-performance story inside Epic 4. It should stabilize the existing desktop-browser sandbox around the `60 FPS` target using the current settings contract and supported-browser baseline, without widening into Story 4.3 load-time pipeline work, Story 4.4 polish, Story 4.5 browser-certification scope, or Story 4.6 public-build packaging. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`; `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`; `_bmad-output/planning-artifacts/gdd.md#Success Metrics`]
- The product promise is browser-first and desktop-first: supported targets are Chromium-based browsers, Firefox, and Safari/WebKit, with stable driving feel and low-friction browser access treated as product requirements rather than late cleanup. [Source: `_bmad-output/planning-artifacts/gdd.md#Platform-Specific Details`; `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`; `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`]
- No dedicated UX file was discovered during workflow input loading. Use the GDD, architecture, project-context, existing shell implementation, and current tests as the controlling guidance for this story. [Source: workflow discovery results]

### Previous Story Intelligence

- Story 4.1 already created the only shipped player performance-control contract for Epic 4: `worldSize`, `graphicsPreset`, `trafficDensity`, and `pedestrianDensity`. Do not casually widen that contract with extra sliders or engine-default menus just to chase performance. [Source: `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Shipped Settings Contract`]
- Story 4.1 deliberately split generation-affecting settings from runtime-only settings. `worldSize`, `trafficDensity`, and `pedestrianDensity` participate in generation and compatibility-key logic, while `graphicsPreset` is runtime-only and must not force slice regeneration. Story 4.2 must preserve that contract. [Source: `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Settings Application Rules`; `src/world/generation/location-resolver.ts`; `tests/integration/player-settings.integration.spec.ts`]
- Story 4.1 established additive scene and canvas telemetry (`settings*`, traffic, pedestrian, readiness, heat, run-outcome, possession) as a testing pattern. Story 4.2 should extend those telemetry surfaces additively rather than rename or repurpose them. [Source: `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Technical Requirements`; `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/world-scene-runtime.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Story 4.1 already proved cross-browser Playwright coverage on Chromium, Firefox, and WebKit and verified that density changes are observable on recreated runs. Story 4.2 should build on that browser matrix instead of creating a Chromium-only performance path. [Source: `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Testing Requirements`; `playwright.config.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Recent story work consistently favored explicit typed seams, conservative settings behavior, restart or replay safety, and broad automated coverage. Preserve that implementation style. [Source: `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Completion Notes List`; recent git history]

### Non-Negotiables

- Do not add a new UI framework, performance library, or scene-management package for this story.
- Do not widen the persisted player settings schema unless there is a clear requirement that cannot be satisfied through the existing preset contract.
- Do not break the current `controllable-vehicle` readiness milestone, shell or HUD split, typed world-load failure path, or restart or replay semantics.
- Do not make graphics-only setting changes regenerate a world slice or alter the generation compatibility key.
- Do not invent a second density-placement or performance-budget system outside the existing world-generation, planning, and scene seams.
- Do not encode brittle hard FPS thresholds in CI assertions. Use additive telemetry, structured timings, and representative manual or browser profiling instead.
- Do not blindly enable Babylon `ScenePerformancePriority.Intermediate` or `Aggressive`, `freezeActiveMeshes()`, `skipPointerMovePicking`, `doNotSyncBoundingInfo`, or similar scene-wide switches without proving they do not break possession, hijacking, interaction, camera, physics, or runtime telemetry. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`; `src/rendering/scene/create-world-scene.ts`]
- Performance instrumentation for Story 4.2 must stay inside existing local telemetry, structured logging, and browser-profiler seams. Do not introduce remote analytics, hosted telemetry services, or a new always-on player-facing performance HUD in this story.

### Technical Requirements

- Use the existing typed event and logging seams for world-load timing. `createGameApp()` already emits `world.manifest.ready`, `world.scene.ready`, and `world.load.failed` with `durationMs`; Story 4.2 should extend that instrumentation rather than bypass it. [Source: `src/app/bootstrap/create-game-app.ts`; `src/app/events/game-events.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Logging`; `_bmad-output/planning-artifacts/game-architecture.md#Event System`]
- If Story 4.2 adds runtime performance telemetry, expose it additively through the existing `scene.metadata` and `canvas.dataset` pattern using explicit keys such as `performanceFpsEstimate`, `performanceFrameTimeP50Ms`, `performanceFrameTimeP95Ms`, `performanceSampleCount`, plus optional browser-dependent fields like GPU or long-task timing when available. Reset those values on world recreation, and never rename or repurpose existing readiness, settings, or gameplay telemetry keys. [Source: `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/world-scene-runtime.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Preserve the current settings precedence model: capability defaults feed boot hydration, explicit shell edits win during interaction, and applied settings become the next active-world settings only on a recreated run. [Source: `src/app/config/platform.ts`; `src/app/state/session-state-machine.ts`; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Technical Requirements`]
- `resolveSceneGraphicsPresetProfile()` currently changes only hardware scaling and light intensity. Story 4.2 is the right place to deepen that explicit scene-profile mapping if needed, but keep the profile conservative, explicit, and testable. [Source: `src/rendering/scene/create-world-scene.ts`; `tests/unit/create-world-scene.spec.ts`]
- If runtime performance telemetry is added, prefer Babylon instrumentation or explicit counters that degrade gracefully by browser. The Babylon docs note that GPU timers rely on `EXT_DISJOINT_TIMER_QUERY`, which is not consistently available across browsers, so performance metrics must tolerate missing advanced counters. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`]
- The hottest current runtime seams are the world-scene update loop plus traffic and pedestrian runtime updates. `create-world-scene.ts` updates traffic, responders, pedestrians, combat, chaos, heat, run outcomes, and telemetry every frame; `traffic-system.ts` rebuilds peer-vehicle lists inside per-vehicle updates; and `pedestrian-system.ts` repeatedly scans hits, collisions, and threats per pedestrian. Prefer targeted reductions there before broader architectural changes. [Source: `src/rendering/scene/create-world-scene.ts`; `src/traffic/runtime/traffic-system.ts`; `src/pedestrians/runtime/pedestrian-system.ts`; `_bmad-output/project-context.md#Performance Rules`]
- Tie optimization work directly to the repo's hot-path rule: avoid per-frame allocations where possible and preserve or introduce reuse or pooling patterns when traffic, pedestrian, or scene code currently churns arrays or temporary objects in the frame loop. [Source: `_bmad-output/project-context.md#Performance Rules`; `_bmad-output/project-context.md#Critical Don't-Miss Rules`; `src/traffic/runtime/traffic-system.ts`; `src/pedestrians/runtime/pedestrian-system.ts`]
- Keep world-generation and runtime complexity aligned. If lower scene complexity is needed for stable browser performance, use the existing settings, planner, and manifest seams so traffic, pedestrians, and breakable props still stay deterministic and restart-safe. [Source: `src/world/generation/world-slice-generator.ts`; `src/traffic/planning/traffic-plan.ts`; `src/pedestrians/planning/pedestrian-plan.ts`; `src/world/planning/breakable-prop-plan.ts`; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Settings Application Rules`]
- Maintain the architecture's `60 Hz` simulation rule and avoid driving gameplay truth directly from render delta. Performance work should reduce cost without changing the core fixed-step behavior. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Physics and Simulation`; `_bmad-output/project-context.md#Engine-Specific Rules`]

### Architecture Compliance

- Keep settings and platform-default logic in `src/app/config/`, orchestration and typed events in `src/app/`, runtime scene assembly in `src/rendering/scene/`, simulation logic in the owning domain folders, and any persisted settings behavior in `src/persistence/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`; `_bmad-output/project-context.md#Code Organization Rules`]
- Treat Babylon's scene graph as a rendering and composition layer, not the sole source of gameplay truth. Runtime optimization must not push gameplay state into rendering-only shortcuts. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Cross-domain coordination should continue to flow through typed events, typed contracts, or narrow injected collaborators rather than ad hoc globals or DOM reads. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `_bmad-output/planning-artifacts/game-architecture.md#Implementation Patterns`; `_bmad-output/project-context.md#Engine-Specific Rules`]
- Keep the static-slice versus dynamic-session boundary intact. Stable-city or living-session behavior depends on static slice reuse when compatible and session-only resets when not. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`; `_bmad-output/project-context.md#Critical Don't-Miss Rules`; `src/world/generation/location-resolver.ts`]
- Respect the architecture decision that world streaming, traffic, and pedestrians are hot-path systems with explicit budgets. Do not drift into preload-all or one-monolithic-scene assumptions. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Asset Management`; `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`; `_bmad-output/project-context.md#Performance Rules`]

### Library / Framework Requirements

- Stay on the repository's pinned runtime stack for this story: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, `vite` `8.0.5`, TypeScript `5.9.3`, Vitest `3.2.4`, and Playwright `1.59.1`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`; `_bmad-output/project-context.md#Technology Stack & Versions`]
- Latest checks during this workflow show `@babylonjs/core` `9.2.0` is newer than the pinned `9.1.0`, `@babylonjs/havok` `1.3.12` still matches latest, `vite` `8.0.8` is newer than the pinned `8.0.5`, and `@playwright/test` `1.59.1` still matches latest. Do not widen Story 4.2 into dependency upgrades. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `https://registry.npmjs.org/@babylonjs/havok/latest`; `https://registry.npmjs.org/vite/latest`; `https://registry.npmjs.org/@playwright/test/latest`]
- Use Babylon's explicit optimization APIs carefully. The docs still prefer targeted optimization and instrumentation over blanket performance modes; those modes can disable picking, change active-mesh behavior, or alter render clearing in ways that may break the repo's current interaction model. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`]
- Keep Vite usage lean and direct if any tooling-facing changes are needed: avoid unnecessary plugins, avoid barrel files, and prefer explicit import paths. Story 4.2 is primarily runtime performance, so do not bloat the toolchain while chasing browser FPS work. [Source: `https://vite.dev/guide/performance`; `_bmad-output/project-context.md#Platform & Build Rules`]
- The architecture selected Context7 as the preferred up-to-date documentation source for Babylon.js, Vite, and related tooling. If more external docs are needed during implementation, prefer that path over speculative dependency changes. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### File Structure Requirements

- Likely primary touchpoints for Story 4.2 are:
  - `src/rendering/scene/create-world-scene.ts`
  - `src/rendering/scene/world-scene-runtime.ts`
  - `src/app/bootstrap/create-game-app.ts`
  - `src/app/events/game-events.ts`
  - `src/app/config/platform.ts`
  - `src/app/config/settings-schema.ts` only if a contract change is truly necessary
  - `src/app/state/session-state-machine.ts`
  - `src/traffic/runtime/traffic-system.ts`
  - `src/pedestrians/runtime/pedestrian-system.ts`
  - `src/world/generation/location-resolver.ts`
  - `src/world/generation/world-slice-generator.ts`
  - `src/traffic/planning/traffic-plan.ts`
  - `src/pedestrians/planning/pedestrian-plan.ts`
  - `src/world/planning/breakable-prop-plan.ts`
  - `tests/unit/create-world-scene.spec.ts`
  - `tests/integration/player-settings.integration.spec.ts`
  - `tests/smoke/app-bootstrap.smoke.spec.ts`
  - `tests/smoke/app-bootstrap.pw.spec.ts`
  - `playwright.config.ts`
- Keep browser-specific default or fallback logic centralized in `src/app/config/` or narrow scene helpers, not scattered across shell UI, planners, or unrelated runtime modules. [Source: `src/app/config/platform.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Configuration`]
- Keep any new performance telemetry in existing metadata or dataset patterns used by `create-world-scene.ts` and `world-scene-runtime.ts`; do not create a parallel debug-only data surface unless the current pattern cannot support the requirement. [Source: `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/world-scene-runtime.ts`]
- Follow repository naming conventions exactly: `kebab-case` modules, `PascalCase` classes and types, `camelCase` functions and variables, `UPPER_SNAKE_CASE` constants, and `domain.action` event names. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Naming Conventions`; `_bmad-output/project-context.md#Code Organization Rules`]

### Testing Requirements

#### Automated Validation

- Keep the existing layered test posture: unit tests for deterministic mapping or hot-path helpers, integration tests for app and settings behavior, jsdom smoke for world-ready orchestration, and Playwright browser checks for Chromium, Firefox, and WebKit. [Source: `_bmad-output/project-context.md#Testing Rules`; `playwright.config.ts`]
- Preserve and extend the 4.1 contract tests that lock in graphics-only compatible-slice reuse and generation-setting compatibility changes. Story 4.2 must not accidentally break those invariants while optimizing runtime behavior. [Source: `tests/integration/player-settings.integration.spec.ts`; `tests/unit/world-generation-request.spec.ts`; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Testing Requirements`]
- Extend `tests/unit/create-world-scene.spec.ts` if graphics preset profiles are deepened so the mapping stays explicit and conservative rather than becoming hidden behavior. [Source: `tests/unit/create-world-scene.spec.ts`; `src/rendering/scene/create-world-scene.ts`]
- Add or extend tests that assert new telemetry keys such as `performanceFpsEstimate`, `performanceFrameTimeP50Ms`, `performanceFrameTimeP95Ms`, and `performanceSampleCount` are added through the existing metadata or dataset surfaces, reset when the world is recreated, and do not rename or repurpose current readiness or gameplay telemetry keys. [Source: `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`; `src/rendering/scene/create-world-scene.ts`]
- Keep Playwright coverage on Chromium, Firefox, and WebKit for the world-ready path. Any browser-specific stabilization must be proven not to regress the other supported engines. [Source: `playwright.config.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`; `_bmad-output/planning-artifacts/gdd.md#Success Metrics`]
- Do not encode fragile hard realtime thresholds in automated tests. Use structured performance counters and additive telemetry in CI, not pass or fail FPS timers. [Source: `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md#Testing Requirements`; `_bmad-output/planning-artifacts/gdd.md#Success Metrics`]
- Finish validation with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`. [Source: `package.json`; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Testing Requirements`]

#### Manual Profiling Evidence

- Use one reproducible profiling scenario per supported browser engine: launch a known supported location, wait for `controllable-vehicle`, drive for a short representative interval, trigger at least one restart, and capture both browser-profiler output and Story 4.2 telemetry.
- Evaluate the desktop `60 FPS` goal from that fixed scenario using the additive performance counters and browser traces rather than subjective short runs or cherry-picked locations.
- Record any browser-specific fallback or preset concessions discovered during profiling in implementation notes so future stories do not undo them accidentally. [Source: `_bmad-output/planning-artifacts/gdd.md#Success Metrics`; `tests/smoke/app-bootstrap.pw.spec.ts`]

### Git Intelligence Summary

- Last 5 commit titles:
  - `Update sprint status`
  - `Add player settings and density configuration`
  - `Update sprint status`
  - `Add pursuit, run outcomes, and quick restart loop`
  - `Add heat escalation runtime and HUD`
- Recent implementation work concentrates changes in orchestration layers rather than isolated leaf files. `create-game-app.ts` and `create-world-scene.ts` are active integration seams for settings, restart flow, scene lifecycle, and browser-visible telemetry. [Source: recent git history; `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/create-world-scene.ts`]
- Recent Epic 4 work favors strict schema-backed presets, explicit compatibility rules, conservative browser or capability defaults, and broad test coverage. Follow that pattern for performance stabilization instead of adding freeform knobs or hidden heuristics. [Source: recent git history; `src/app/config/settings-schema.ts`; `src/app/config/platform.ts`; `tests/integration/player-settings.integration.spec.ts`]
- Cleanup and teardown safety are established patterns in recent work. Story 4.2 changes must keep restart, retry, stale-load cancellation, and scene disposal robust. [Source: recent git history; `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/create-world-scene.ts`]
- Recent commits did not add dependencies. Keep Story 4.2 inside the current Babylon, Vite, TypeScript, Vitest, and Playwright stack unless a concrete blocker appears. [Source: recent git history; `package.json`]

### Latest Tech Information

- Babylon's current optimization guidance still emphasizes explicit instrumentation and targeted scene changes over magic switches. Relevant tools include `EngineInstrumentation`, `SceneInstrumentation`, `TransformNode` for non-rendering containers, selective freezing only when safe, and careful use of active-mesh or culling shortcuts. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`]
- Babylon's GPU frame timer requires `EXT_DISJOINT_TIMER_QUERY`, which is not consistently supported across browsers. Performance telemetry in Story 4.2 must therefore degrade gracefully when advanced counters are unavailable, especially on Firefox or WebKit. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`]
- Babylon performance-priority modes can automatically disable pointer-move picking, alter mesh activation behavior, turn off auto-clear, skip frustum clipping, or bypass bounding sync. That is high risk in this repo because the current world scene depends on possession, hijacking, interaction, dynamic runtime updates, and camera correctness. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`; `src/rendering/scene/create-world-scene.ts`]
- Vite `8.0.8` is newer than the pinned `8.0.5`, and Vite's current performance guide still recommends minimizing plugin work, avoiding barrel files, and using profiling tools such as `vite --profile` when dev-server or build overhead becomes relevant. That is useful background, but Story 4.2 should stay focused on runtime browser performance unless tooling overhead is directly implicated. [Source: `https://registry.npmjs.org/vite/latest`; `https://vite.dev/guide/performance`]
- Playwright `1.59.1` still matches the current latest release, which means the repository's existing browser-matrix tooling is already current enough for Story 4.2 validation. [Source: `https://registry.npmjs.org/@playwright/test/latest`; `playwright.config.ts`]

### Project Structure Notes

- `create-world-scene.ts` is already the main runtime assembly file. Keep Story 4.2 changes there targeted and extract only the smallest useful helper if instrumentation or profile mapping would otherwise make the file harder to reason about. [Source: `src/rendering/scene/create-world-scene.ts`]
- `create-game-app.ts` already owns world-load timing, cached restart, retry, replay, scene disposal, and shell orchestration. If Story 4.2 needs additional load-stage telemetry or browser-visible timing, extend that file rather than duplicating orchestration elsewhere. [Source: `src/app/bootstrap/create-game-app.ts`]
- `world-scene-runtime.ts` and the other scene runtime helpers already publish metadata and `canvas.dataset` state. That is the cleanest existing seam for test-visible performance signals. [Source: `src/rendering/scene/world-scene-runtime.ts`; `src/rendering/scene/create-world-scene.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- `traffic-system.ts` currently recalculates peer vehicles inside each vehicle update, making it an obvious candidate for targeted CPU-side optimization if profiling confirms traffic as a hotspot. [Source: `src/traffic/runtime/traffic-system.ts`]
- `pedestrian-system.ts` currently performs repeated `.find()` and threat scans per pedestrian update. If pedestrian pressure is part of a browser-performance regression, optimize there before widening scope elsewhere. [Source: `src/pedestrians/runtime/pedestrian-system.ts`]
- The generation and planning path already exposes explicit control over world size and ambient population counts. If Story 4.2 needs to lower complexity for stability, those are safer seams than scene-only hacks that fight deterministic content planning. [Source: `src/world/generation/world-slice-generator.ts`; `src/traffic/planning/traffic-plan.ts`; `src/pedestrians/planning/pedestrian-plan.ts`; `src/world/planning/breakable-prop-plan.ts`]

### Project Context Rules

- Use Babylon.js `9.1.0`, Havok `1.3.12`, Vite `8.0.5`, TypeScript, and desktop browsers with WebGL2 support as the enforced baseline stack. [Source: `_bmad-output/project-context.md#Technology Stack & Versions`]
- Keep gameplay simulation on a `60 Hz` fixed step with interpolation; do not drive gameplay truth directly from render delta. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Treat world streaming, vehicle simulation, traffic, and pedestrians as hot-path systems; avoid per-frame allocations and unnecessary work in those loops. [Source: `_bmad-output/project-context.md#Performance Rules`]
- Keep domain logic in its owning folder. `src/app/` owns config and orchestration, `src/rendering/` consumes state, and `src/persistence/` is the only layer allowed to touch browser storage. [Source: `_bmad-output/project-context.md#Code Organization Rules`]
- Use HTML and CSS for shell flows and keep the in-game HUD in its dedicated gameplay UI layer. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
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
- `_bmad-output/planning-artifacts/game-architecture.md#Physics and Simulation`
- `_bmad-output/planning-artifacts/game-architecture.md#Configuration`
- `_bmad-output/planning-artifacts/game-architecture.md#Logging`
- `_bmad-output/planning-artifacts/game-architecture.md#Event System`
- `_bmad-output/planning-artifacts/game-architecture.md#AI Systems`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`
- `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md`
- `_bmad-output/implementation-artifacts/1-2-load-into-a-generated-playable-slice.md`
- `package.json`
- `playwright.config.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/config/platform.ts`
- `src/app/config/settings-schema.ts`
- `src/app/events/game-events.ts`
- `src/app/state/session-state-machine.ts`
- `src/pedestrians/runtime/pedestrian-system.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/traffic/runtime/traffic-system.ts`
- `src/world/generation/location-resolver.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/world/planning/breakable-prop-plan.ts`
- `tests/integration/player-settings.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/unit/create-world-scene.spec.ts`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/vite/latest`
- `https://registry.npmjs.org/@playwright/test/latest`
- `https://vite.dev/guide/performance`
- `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Implementation Plan

- Add rolling frame-time telemetry through the existing `scene.metadata`, `canvas.dataset`, typed world-load events, and structured logs so supported browsers expose comparable profiling signals without a second reporting path.
- Keep browser concessions explicit by routing them through `src/app/config/platform.ts` capability defaults and `resolveSceneGraphicsPresetProfile()` scene mapping while preserving the shipped settings contract and graphics-only compatibility rules.
- Reduce hot-path churn by stabilizing traffic and responder vehicle lists, indexing pedestrian collision or combat inputs once per update, and reusing combined vehicle buffers in the scene loop before full repository validation.

### Debug Log References

- `git log --oneline -5`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/vite/latest`
- `https://registry.npmjs.org/@playwright/test/latest`
- `https://vite.dev/guide/performance`
- `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`
- `npx vitest run tests/unit/world-scene-runtime.spec.ts`
- `npm run build && npx playwright test tests/smoke/app-bootstrap.pw.spec.ts -g "boots to the location shell and reaches a slice-ready world after a valid submission"`
- `npx vitest run tests/unit/player-settings.spec.ts tests/unit/create-world-scene.spec.ts tests/unit/traffic-system.spec.ts tests/unit/pedestrian-system.spec.ts tests/unit/world-scene-runtime.spec.ts`
- `npx vitest run tests/integration/location-entry.integration.spec.ts tests/integration/player-settings.integration.spec.ts`
- `npm run check && npm test && npm run build && npm run test:browser`

### Completion Notes List

- Added additive browser-safe performance telemetry for FPS and frame-time summaries on the existing scene metadata and canvas dataset surfaces, and extended test coverage to assert the typed event and telemetry path directly.
- Encoded conservative Firefox and WebKit behavior through the existing platform and scene seams by adjusting capability defaults and runtime graphics scaling without widening the player settings contract.
- Reduced hot-path allocation pressure by stabilizing traffic and responder vehicle lists, indexing pedestrian hit or collision inputs once per update, and reusing combined vehicle arrays inside the world scene loop.
- Full repository validation passed with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.

### File List

- `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/app/config/platform.ts`
- `src/pedestrians/runtime/pedestrian-system.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/responder-scene-runtime.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/traffic/runtime/traffic-system.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/unit/player-settings.spec.ts`
- `tests/unit/traffic-system.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`

## Change Log

- 2026-04-11: Created the comprehensive story context for Story 4.2 and marked it ready for development.
- 2026-04-11: Added supported-browser performance telemetry, conservative browser fallback behavior, hot-path runtime optimizations, and the required guardrail validation coverage for Story 4.2.
