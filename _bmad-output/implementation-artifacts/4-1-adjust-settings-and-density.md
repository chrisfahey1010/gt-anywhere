# Story 4.1: Adjust Settings and Density

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can adjust settings and density,
so that the game fits my hardware.

## Acceptance Criteria

1. Given the player is on the startup shell or the world-ready shell overlay, when they open the settings surface, then they can use a browser-native, driver-centric settings flow for the shipped 4.1 settings contract only: `worldSize`, `graphicsPreset`, `trafficDensity`, and `pedestrianDensity`, with preset-first controls and no extra speculative sliders or engine-default menus.
2. Given the player changes settings, when they save or apply them, then the app persists those values locally through a dedicated persistence seam, restores them on reload, and rehydrates the shell with deterministic precedence rules where current explicit shell edits beat saved values, saved values beat capability defaults, and capability defaults beat hard fallbacks, without breaking location entry, restart, replay, retry, or recoverable error flows.
3. Given a chosen setting affects static slice generation or manifest-planned world content, when the next run is launched, then that value flows through typed launch and generation contracts plus compatible cache identity rules instead of DOM scraping or place-only cache assumptions, so the player gets the intended world-size or density result rather than a stale cached slice.
4. Given a chosen setting affects dynamic runtime scalability, when the world scene boots or is recreated, then the existing scene and runtime seams apply those values through explicit config mappings and additive telemetry without changing the readiness milestone `controllable-vehicle`, the shell and HUD ownership split, or typed world-load failure behavior.
5. Given the player keeps using restart, same-location replay, edit location, retry load, vehicle switching, traffic, pedestrians, combat, heat, and run-outcome flows, when settings and density support are implemented, then those contracts remain intact and only regenerate or recreate the parts of the experience that the changed settings actually require.
6. Given the feature is implemented, when repository validation runs, then unit, integration, smoke, typecheck, build, and browser checks confirm settings persistence, launch-time hydration, generation and cache identity, density application, shell UX continuity, and no regression in the current desktop-browser gameplay loop.

## Tasks / Subtasks

- [x] Task 1: Add a typed settings schema, default resolution, and persistence seam (AC: 1, 2, 3, 6)
  - [x] Add a small app-owned settings contract under `src/app/config/` for world-size, graphics or scalability preset, and density settings, with a clear split between generation-affecting and runtime-only values.
  - [x] Introduce the smallest useful browser-storage seam under `src/persistence/settings/`, including schema versioning and safe fallback to defaults when storage is unavailable.
  - [x] Add capability-aware default resolution so recommended settings can adapt to browser or hardware tier without replacing explicit player choices as the source of truth.
- [x] Task 2: Add a shell-owned settings flow and startup controls (AC: 1, 2, 5, 6)
  - [x] Extend the startup shell with the essential launch choices that must be visible before entering the world, including a world-size choice and a settings entry point for deeper tuning.
  - [x] Keep the settings surface in the browser shell, available from location select and the world-ready overlay, with stable `data-testid` hooks and clear copy around when a change applies immediately versus on the next recreated run.
  - [x] Preserve the low-friction startup flow described in planning artifacts: visible essentials first, deeper tuning behind the settings surface.
- [x] Task 3: Thread settings through launch, generation, and cache identity seams (AC: 2, 3, 5, 6)
  - [x] Extend typed launch and generation contracts with the minimum settings payload needed for world-size and any other static generation inputs.
  - [x] Update same-location cache identity and manifest reuse rules so place-only caching does not return an incompatible slice when generation-affecting settings differ.
  - [x] Preserve the current restart and replay contracts when settings are unchanged, and use the existing typed recreation flow when changed settings require a new compatible run.
- [x] Task 4: Apply density and scalability values through existing world and scene seams (AC: 1, 3, 4, 5, 6)
  - [x] Reuse the current road-placement and planner seams for traffic, pedestrians, and other manifest-planned ambient content instead of creating a second density system.
  - [x] Apply runtime graphics or scalability values through explicit scene-level mappings in or adjacent to `create-world-scene.ts`, keeping telemetry additive and testable.
  - [x] Keep presets bounded and conservative so the feature establishes user control without trying to complete the broader optimization work reserved for Story 4.2.
- [x] Task 5: Add guardrail coverage and run repository validation (AC: 6)
  - [x] Add unit coverage for settings schema validation, default resolution, persistence behavior, and any cache-key or launch-contract helpers.
  - [x] Add integration coverage for shell hydration, apply behavior, restart or replay correctness, and generation-affecting setting changes.
  - [x] Add smoke and browser coverage that settings survive reload, preserve world-ready contracts, and produce observable traffic or pedestrian density differences without breaking existing flows.
  - [x] Run `npm run check`, `npm test`, `npm run build`, and `npm run test:browser` before moving the story beyond implementation.

## Dev Notes

- Story 4.1 starts Epic 4. Its job is to give players safe, understandable control over hardware-fit settings and density, not to complete the full optimization pass, load-time work, browser-compatibility matrix, or public-release packaging that belong to later Epic 4 stories. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`; `_bmad-output/planning-artifacts/gdd.md#Development Epics`]
- The planning artifacts consistently frame settings as part of the product experience, not an afterthought: players should see a simple startup surface with essential launch controls first, then deeper tuning behind a settings button, and remembered graphics settings on return. [Source: `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`; `_bmad-output/planning-artifacts/game-brief.md#Mitigation Strategies`; `_bmad-output/planning-artifacts/gdd.md#Controls and Input`]
- No dedicated UX file was discovered during workflow input loading. Use the GDD, architecture, project-context, brainstorming notes, current shell implementation, and current test suite as the controlling guidance for this story. [Source: workflow discovery results]

### Shipped Settings Contract

- `worldSize`: `small`, `medium`, `large`
- `graphicsPreset`: `low`, `medium`, `high`
- `trafficDensity`: `low`, `medium`, `high`
- `pedestrianDensity`: `off`, `low`, `medium`, `high`
- `medium` is the recommended default world-size tier called out in planning; do not invent a larger preset catalog for 4.1. [Source: `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Settings #6`]
- `drawDistance`, per-effect graphics toggles, and other deeper graphics controls from brainstorming and the game brief are explicitly deferred from 4.1 unless they are represented entirely through `graphicsPreset` without expanding the user-facing contract beyond the four shipped settings above. [Source: `_bmad-output/planning-artifacts/game-brief.md#Mitigation Strategies`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Performance #5`; `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md#Settings #4`]

### Non-Negotiables

- Do not widen this story into the full performance-optimization pass from Story 4.2, load-time pipeline work from Story 4.3, browser-support certification from Story 4.5, or launch packaging from Story 4.6.
- Do not add a UI framework, state-management library, or settings package. The current DOM plus CSS shell is sufficient.
- Do not read or write browser storage directly from `src/app/`, `src/ui/`, `src/world/`, `src/traffic/`, `src/pedestrians/`, or `src/rendering/`; storage ownership must live under `src/persistence/`.
- Do not create a second density-placement system. Reuse the existing planner seams that already own ambient traffic, pedestrian, and breakable-prop counts and spacing.
- Do not keep manifest reuse keyed only by place identity if generation-affecting settings such as world size or static density now change the generated slice or manifest-planned content.
- Do not mutate a live scene in place for changes that require a new compatible slice or a recreated world. Use the existing typed reload or recreation flow instead.
- Do not change the readiness milestone `controllable-vehicle`, the shell or HUD split, the typed world-load failure path, or existing restart and replay semantics except where generation-affecting settings explicitly require a compatible new run.

### Settings Application Rules

- `worldSize` is a generation-affecting launch setting. It applies on the next compatible new run only, must extend typed launch or generation contracts, and must participate in compatible manifest identity instead of reusing a place-only cached slice.
- `graphicsPreset` is a runtime scene setting. It must never change manifest identity and must apply through scene recreation or the next compatible restart rather than mutating the active live world in an ad hoc way.
- `trafficDensity` and `pedestrianDensity` are 4.1 next-run settings. Because the current repository serializes traffic and pedestrian plans into `SliceManifest`, these settings must be treated as compatible-manifest inputs for now and applied through regeneration or recreated-run paths rather than live mutation.
- If a settings edit is made during `world-ready`, `world-load-error`, or another shell-visible state, the new values become pending for the next compatible restart, replay, retry, or new launch according to the rules above. Do not silently keep stale settings or mutate the current active world in place.
- `Retry load` may reuse the existing `handoff` and cached manifest only when the effective settings that shaped that failed request are unchanged. If the player edits a generation-affecting or compatible-manifest setting before retry, rebuild the effective request or require an explicit new launch path instead of reusing stale cached inputs. [Source: `src/app/bootstrap/create-game-app.ts`]

### Technical Requirements

- The architecture already reserves `src/app/config/platform.ts` and `src/app/config/settings-schema.ts` for platform overrides and player settings. Use those intended seams instead of scattering settings constants across shell UI, planners, and scene bootstrap. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Configuration`; `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`]
- The current repository has no general `src/persistence/` or `src/ui/settings/` implementation yet. This story is the right place to add the smallest architecture-aligned versions of those seams rather than burying settings logic inside `create-game-app.ts` or `location-entry-screen.ts`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`; repo structure]
- `LocationEntryScreen` currently owns the startup shell and world-ready overlay actions, and `createGameApp()` already owns shell visibility, cached restart, replay, retry, and typed failure orchestration. Reuse those seams for settings instead of inventing a second shell or a parallel app bootstrap path. [Source: `src/ui/shell/location-entry-screen.ts`; `src/app/bootstrap/create-game-app.ts`]
- `SessionState` currently models session flow plus replay selection but has no settings state. Add the smallest app-owned settings seam needed; do not create a second top-level gameplay mode or a parallel app state machine. [Source: `src/app/state/session-state-machine.ts`; `_bmad-output/planning-artifacts/game-architecture.md#State Management`]
- Capability detection and default resolution must live in a narrow injectable seam under `src/app/config/`, not inside shell rendering, persistence code, or gameplay domains, so tests can control it deterministically. Use two explicit resolution contexts instead of one ambiguous rule: boot hydration uses `saved player choice > capability default > hard fallback`, while interactive shell state uses `current explicit shell edit > saved player choice > capability default > hard fallback`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Configuration`; `_bmad-output/project-context.md#Code Organization Rules`; `_bmad-output/project-context.md#Testing Rules`]
- `WorldGenerationRequest` currently carries only location identity, seed, and pipeline metadata. If world size or any other static setting affects generation, extend typed launch contracts deliberately rather than scraping shell DOM state inside world-generation code. [Source: `src/world/generation/location-resolver.ts`; `src/world/generation/world-slice-generator.ts`]
- `SliceManifestStore` is currently keyed by `sliceId` and `reuseKey`, where `reuseKey` is place-only. If generation-affecting settings now change bounds, roads, or manifest-planned ambient content, update cache identity so replay and restart do not silently reuse an incompatible manifest. [Source: `src/world/generation/slice-manifest-store.ts`; `src/world/generation/world-slice-generator.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`]
- `DefaultWorldSliceGenerator` currently derives traffic, pedestrians, and breakable props through `createTrafficPlan()`, `createPedestrianPlan()`, and `createBreakablePropPlan()` with fixed counts and spacing. Thread density settings into those typed planning seams instead of inventing a second spawn pass or post-hoc mesh deletion logic. [Source: `src/world/generation/world-slice-generator.ts`; `src/traffic/planning/traffic-plan.ts`; `src/pedestrians/planning/pedestrian-plan.ts`; `src/world/planning/breakable-prop-plan.ts`]
- Reuse `src/world/chunks/road-placement.ts` as the shared density-aware placement seam. That file already centralizes candidate collection, starter clearance, spacing, and deterministic ordering. [Source: `src/world/chunks/road-placement.ts`]
- `create-world-scene.ts` is currently where the Babylon engine, scene, active-world telemetry, and runtime updates are assembled. Apply resolved runtime graphics or scalability settings there or through a narrow adjacent helper, but do not let that file become the home of settings schema or persistence logic. [Source: `src/rendering/scene/create-world-scene.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- The current scene already publishes additive telemetry through `scene.metadata` and `canvas.dataset`, including traffic, pedestrian, heat, run-outcome, and readiness fields. If settings need test-visible proof, add telemetry additively and preserve all current field meanings. [Source: `src/rendering/scene/create-world-scene.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/smoke/heat-scene-runtime.smoke.spec.ts`]
- If settings effects need explicit test-visible telemetry, prefer additive keys such as `settingsWorldSize`, `settingsGraphicsPreset`, `settingsTrafficDensity`, and `settingsPedestrianDensity` in `scene.metadata` and `canvas.dataset`, alongside the already existing traffic or pedestrian count fields. Do not rename or repurpose current readiness, possession, heat, or navigation telemetry. [Source: `src/rendering/scene/create-world-scene.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]
- For initial browser-persisted player settings, a small versioned `localStorage`-backed repository is acceptable because the data is tiny and must work across supported browsers, but it must fail safe. `localStorage` is origin-specific and can throw `SecurityError` when persistence is blocked, so settings load or save must gracefully fall back to defaults instead of blocking startup. [Source: `https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage`; `_bmad-output/planning-artifacts/game-architecture.md#Data Persistence`; `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- Keep capability-based defaults separate from explicit player settings. Architecture calls for layered configuration where platform overrides and player settings coexist, not a single hard-coded preset table hidden inside UI code. Use explicit resolution contexts so saved values win on boot hydration and current explicit edits win during shell interaction. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Configuration`]

### Architecture Compliance

- Keep settings schema and default resolution in `src/app/config/`, shell rendering in `src/ui/shell/` and `src/ui/settings/`, persistence in `src/persistence/settings/`, world-generation impacts in `src/world/generation/` or adjacent typed launch contracts, and density application in the existing traffic, pedestrian, and world-planning domains. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/project-context.md#Code Organization Rules`]
- Respect the architecture boundary that `src/app/` owns bootstrap, orchestration, config, logging, events, and debug tooling; gameplay truth remains in domain folders; `src/rendering/` consumes domain state; and `src/persistence/` is the only layer allowed to touch browser storage. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`; `_bmad-output/project-context.md#Code Organization Rules`]
- If settings changes need coordination across domains, use typed contracts or typed events rather than DOM queries, ad hoc globals, or shell-owned mutable singletons. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `_bmad-output/project-context.md#Engine-Specific Rules`]
- Keep static slice inputs separate from dynamic session state. A density or world-size setting that changes generation inputs should produce a compatible new slice or manifest identity, while restart and replay must still preserve the same static slice when those inputs are unchanged. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`; `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- Do not move settings logic into `public/`. Runtime-loaded data may live there later if truly needed, but settings behavior, schema, migrations, and mapping logic belong in source modules. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`; `_bmad-output/project-context.md#Code Organization Rules`]

### Library / Framework Requirements

- Stay on the repo's pinned runtime stack for this story: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, `vite` `8.0.5`, TypeScript `5.9.3`, Vitest `3.2.4`, and Playwright `1.59.1`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`; `_bmad-output/project-context.md#Technology Stack & Versions`]
- Latest checks during this workflow show `@babylonjs/core` `9.2.0` as the current npm release while the repo remains pinned to `9.1.0`; `@babylonjs/havok` `1.3.12` still matches the current latest release; and `vite` `8.0.8` is newer than the repo's `8.0.5`. Do not widen this story into dependency upgrades. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `https://registry.npmjs.org/@babylonjs/havok/latest`; `https://registry.npmjs.org/vite/latest`]
- Use the current HTML plus CSS shell for settings UI. Do not add React, Vue, or a third-party menu layer just to render settings controls. [Source: `src/ui/shell/location-entry-screen.ts`; `src/styles.css`; `_bmad-output/planning-artifacts/game-architecture.md#UI Architecture`]
- Do not add a new physics stack, scene-management library, settings package, or storage library for this story. The current TypeScript plus Babylon.js plus Havok plus browser APIs stack is sufficient. [Source: `package.json`; `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- The architecture selected Context7 as the preferred up-to-date documentation source for Babylon.js, Vite, and related web tooling. If implementation needs extra external documentation, prefer that path over speculative dependency changes. [Source: `_bmad-output/planning-artifacts/game-architecture.md#AI Tooling (MCP Servers)`]

### File Structure Requirements

- Likely primary touchpoints for this story are:
  - `src/app/bootstrap/create-game-app.ts`
  - `src/app/state/session-state-machine.ts`
  - new files under `src/app/config/` for settings schema and platform-default resolution
  - new files under `src/persistence/settings/`
  - `src/ui/shell/location-entry-screen.ts`
  - new files under `src/ui/settings/`
  - `src/styles.css`
  - `src/world/generation/location-resolver.ts` or adjacent launch-contract seams if generation-affecting settings are threaded through requests
  - `src/world/generation/world-slice-generator.ts`
  - `src/world/generation/slice-manifest-store.ts`
  - `src/traffic/planning/traffic-plan.ts`
  - `src/pedestrians/planning/pedestrian-plan.ts`
  - `src/world/planning/breakable-prop-plan.ts`
  - `src/rendering/scene/create-world-scene.ts`
  - relevant unit, integration, smoke, and browser tests
- Keep world-generation identity changes in `src/world/`, shell presentation in `src/ui/`, browser storage in `src/persistence/`, and explicit settings contracts in `src/app/config/`. Do not bury cache-identity logic inside shell components or planner-local constants. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/project-context.md#Code Organization Rules`]
- Follow repository naming conventions exactly: `kebab-case` files and directories, `PascalCase` classes and types, `camelCase` functions and variables, `UPPER_SNAKE_CASE` constants, and `domain.action` event names. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Naming Conventions`; `_bmad-output/project-context.md#Code Organization Rules`]

### Testing Requirements

- Follow the existing repository test structure:
  - unit tests in `tests/unit/`
  - integration tests in `tests/integration/`
  - smoke tests in `tests/smoke/`
  - browser coverage through Playwright on Chromium, Firefox, and WebKit
- Add unit coverage for settings schema parsing, migration or version handling, capability-based default resolution, browser-storage failure fallback, and any cache-key helpers that distinguish compatible versus incompatible manifest reuse. [Source: `_bmad-output/project-context.md#Testing Rules`; `playwright.config.ts`]
- Add integration coverage that the shell hydrates remembered settings, that launch-affecting setting changes feed the next run correctly, and that unchanged settings still preserve the current cached same-location restart or replay contract. [Source: `tests/integration/location-entry.integration.spec.ts`; `_bmad-output/implementation-artifacts/2-5-replay-the-same-location-with-different-vehicles-or-intentions.md`; `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`]
- Add coverage that world-size or other generation-affecting settings do not silently reuse an incompatible manifest from the current `reuseKey`-based cache. [Source: `src/world/generation/slice-manifest-store.ts`; `src/world/generation/world-slice-generator.ts`]
- Add unit or integration coverage that traffic, pedestrian, and other ambient density settings measurably affect the resulting planned or runtime counts through the existing planners and scene telemetry rather than through ad hoc post-processing. [Source: `src/traffic/planning/traffic-plan.ts`; `src/pedestrians/planning/pedestrian-plan.ts`; `src/world/planning/breakable-prop-plan.ts`; `src/rendering/scene/create-world-scene.ts`]
- Add smoke and browser coverage that settings survive reload, keep the startup flow readable, preserve `controllable-vehicle`, and do not break restart, replay, location edit, HUD visibility, or world-ready telemetry. [Source: `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Finish implementation validation with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`. [Source: `package.json`; `playwright.config.ts`]

### Latest Tech Information

- `@babylonjs/core` `9.2.0` is the current latest npm release while the repository is pinned to `9.1.0`; `@babylonjs/havok` `1.3.12` still matches the latest release; `vite` `8.0.8` is newer than the repo's `8.0.5`; and Vite still documents Node `20.19+` or `22.12+` as the baseline. No upgrade is required to implement this story. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `https://registry.npmjs.org/@babylonjs/havok/latest`; `https://registry.npmjs.org/vite/latest`; `https://vite.dev/guide/`]
- Babylon's current optimization guidance still favors explicit, targeted performance control over blanket magic: use `TransformNode` for containers, reduce per-frame overhead deliberately, and prefer instrumentation when validating performance changes. That aligns with this story's need for explicit presets and density mapping instead of one giant hidden toggle. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`]
- Babylon docs note that adapting to device ratio is not enabled by default for performance reasons, which supports using explicit resolution or hardware-fit settings instead of assuming device-pixel-ratio scaling is always the right default. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`]
- Babylon performance-priority modes can disable or alter picking, auto-clear, bounding updates, and other scene behavior. Do not blindly enable `Intermediate` or `Aggressive` scene modes as a one-click solution for this story without proving they do not break the repo's current dynamic scene and interaction assumptions. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`]
- `localStorage` remains widely available and persists across sessions, but it is origin-specific and may be blocked by security or privacy settings. Settings persistence must therefore be resilient, versioned, and non-fatal. [Source: `https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage`]

### Project Structure Notes

- `create-world-scene.ts` is already one of the largest assembly files in the repo. Keep settings resolution, persistence, and mapping logic outside it so the scene file only consumes resolved runtime values. [Source: `src/rendering/scene/create-world-scene.ts`]
- `location-entry-screen.ts` and `styles.css` are the current startup and world-ready shell surfaces. They are the natural place to add a settings button and visible launch essentials without inventing a separate menu system. [Source: `src/ui/shell/location-entry-screen.ts`; `src/styles.css`]
- The current manifest store and generation path assume that place identity is enough for cached reuse. Story 4.1 is the first place where that assumption may become invalid because world-size or static density settings can change the generated or manifest-planned content. [Source: `src/world/generation/slice-manifest-store.ts`; `src/world/generation/world-slice-generator.ts`]
- The current density system is already distributed across traffic, pedestrian, and breakable-prop planners, each of which exposes stable counts and spacing in serializable plans. Those are the right seams to parameterize. [Source: `src/traffic/planning/traffic-plan.ts`; `src/pedestrians/planning/pedestrian-plan.ts`; `src/world/planning/breakable-prop-plan.ts`]
- The current retry path in `createGameApp()` will reuse `state.handoff` and a cached manifest when possible. Story 4.1 must keep that path coherent with edited settings so retry does not accidentally relaunch stale generation inputs. [Source: `src/app/bootstrap/create-game-app.ts`]
- Current scene telemetry already exposes traffic, pedestrian, heat, run-outcome, readiness, and possession state through `scene.metadata` and `canvas.dataset`, giving this story a test-friendly way to prove settings effects without new debug-only UI. [Source: `src/rendering/scene/create-world-scene.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/smoke/heat-scene-runtime.smoke.spec.ts`]

### Project Context Rules

- Keep Babylon's scene graph as a rendering and composition layer, not the sole source of gameplay truth.
- Keep gameplay simulation on a `60 Hz` fixed step with interpolation; do not drive gameplay truth directly from render delta.
- Use HTML and CSS for startup, loading, and settings flows, and keep the in-game HUD in its dedicated gameplay UI layer.
- Prefer constructor injection inside a domain and typed contracts or typed events across domains instead of ad hoc global access.
- Treat world streaming, vehicle simulation, traffic, and pedestrians as hot-path systems; avoid per-frame allocations and keep density presets conservative.
- Keep domain logic in its owning folder. `src/app/` owns config and orchestration, `src/rendering/` consumes state, and `src/persistence/` is the only layer allowed to read or write browser storage.
- Runtime-loaded assets and data belong under `public/`, but application logic must not move there.
- Keep unit, integration, smoke, and browser tests aligned with existing repo conventions and use deterministic seams where reproducibility matters.
- Target desktop browsers with WebGL2 support first, and keep keyboard plus mouse and gamepad as first-class inputs.
- Use the Vite toolchain already selected by the architecture; do not introduce a second bundler.
- Do not call storage APIs directly from gameplay domains, and do not bypass typed generation or cache seams for convenience.
- When in doubt, choose the more restrictive, less magical implementation path that preserves existing contracts. [Source: `_bmad-output/project-context.md`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`
- `_bmad-output/planning-artifacts/gdd.md#Controls and Input`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/gdd.md#Success Metrics`
- `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`
- `_bmad-output/planning-artifacts/game-architecture.md#UI Architecture`
- `_bmad-output/planning-artifacts/game-architecture.md#Configuration`
- `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`
- `_bmad-output/planning-artifacts/game-architecture.md#Project Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`
- `_bmad-output/planning-artifacts/game-brief.md#Mitigation Strategies`
- `_bmad-output/planning-artifacts/brainstorming-session-2026-04-05T23:22:10-07:00.md`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/1-5-restart-from-spawn-in-the-same-location.md`
- `_bmad-output/implementation-artifacts/2-5-replay-the-same-location-with-different-vehicles-or-intentions.md`
- `package.json`
- `playwright.config.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/state/session-state-machine.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/styles.css`
- `src/traffic/planning/traffic-plan.ts`
- `src/pedestrians/planning/pedestrian-plan.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/world/chunks/road-placement.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/location-resolver.ts`
- `src/world/generation/slice-manifest-store.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/world/planning/breakable-prop-plan.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/heat-scene-runtime.smoke.spec.ts`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/vite/latest`
- `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`
- `https://vite.dev/guide/`
- `https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Implementation Plan

- Add a versioned player-settings seam with platform-aware defaults, then expose a shell-owned preset-first settings flow that keeps visible launch essentials light.
- Thread generation-affecting settings through typed launch and cache identity seams while routing density values through the existing traffic, pedestrian, and breakable-prop planners plus explicit scene-level scalability mappings.
- Prove the behavior with unit, integration, smoke, and browser tests that cover persistence, hydration, restart or replay correctness, and test-visible density effects without regressing the current world-ready loop.

### Debug Log References

- `npm run check`
- `npm test`
- `npm run build`
- `npm run test:browser`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/vite/latest`
- `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`
- `https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage`

### Completion Notes List

- Added a versioned player-settings contract plus a localStorage-backed persistence seam with capability-aware boot and shell precedence rules.
- Added shell-owned launch controls and a settings surface that work from startup and world-ready, persist applied values, and preserve restart, replay, retry, and edit-location flows.
- Threaded settings through typed launch identity, settings-aware cache compatibility, density-scaled planners, scene graphics mappings, additive telemetry, and unit/integration/smoke/browser guardrails.

### File List

- `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/config/platform.ts`
- `src/app/config/settings-schema.ts`
- `src/app/state/session-state-machine.ts`
- `src/persistence/settings/local-storage-player-settings-repository.ts`
- `src/pedestrians/planning/pedestrian-plan.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/styles.css`
- `src/traffic/planning/traffic-plan.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/world/generation/location-resolver.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/world/planning/breakable-prop-plan.ts`
- `tests/integration/player-settings.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/unit/player-settings-repository.spec.ts`
- `tests/unit/player-settings.spec.ts`
- `tests/unit/world-generation-request.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`

## Change Log

- 2026-04-11: Created the comprehensive story context for Story 4.1 and marked it ready for development.
- 2026-04-11: Implemented the settings and density feature end-to-end, including persistence, shell UX, typed launch/cache identity, density-aware planning, runtime graphics mappings, and validation coverage.
