# Story 4.4: Experience Coherent Visual and Audio Polish

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can experience coherent visual and audio polish,
so that the world feels intentional rather than prototype-grade.

## Acceptance Criteria

1. Given the player reaches the existing `controllable-vehicle` readiness milestone on a supported desktop browser, when Story 4.4 lands, then the scene presents a coherent stylized pass across sky, lighting, world palette, primitive world geometry, vehicles, pedestrians, and HUD surfaces so the slice reads as an intentional browser game presentation instead of raw prototype shapes, while preserving readable daylight driving, road truth, and recognizable place identity.
2. Given the player drives, walks, collides, damages vehicles, breaks props, fires weapons, escalates heat, and attracts responders, when Story 4.4 runs, then it adds browser-safe reactive audio and lightweight presentational feedback through the existing event and runtime seams rather than through duplicate gameplay detection, covering at least vehicle presence, impacts, heat or responder pressure, combat feedback, and ambient world mood.
3. Given Epic 4 already ships `graphicsPreset`, browser-family defaults, performance telemetry, restart or replay flow, retry flow, and cached same-slice reuse, when polish work is enabled, then visual and audio features scale through those same explicit seams, preserve the shell or HUD split and typed world-load failure path, keep `data-ready-milestone="controllable-vehicle"` truthful, and reset cleanly on restart, replay, retry, and stale-load cancellation.
4. Given the current repository has no real audio subsystem and the architecture selected Babylon's built-in audio stack for v1, when Story 4.4 introduces sound, then it does so through the smallest architecture-aligned audio runtime, unlocks or resumes audio only through browser-allowed paths, tolerates blocked or unavailable audio contexts without breaking gameplay, and stays scoped to SFX or ambience rather than a music or radio system.
5. Given the current repo already relies on `scene.metadata`, `canvas.dataset`, non-interactive HUD overlays, and stable camera names for regression coverage, when polish is added, then any new visual or audio state is exposed additively through those observability seams, existing dataset keys, test ids, and camera names remain valid, and the HUD never becomes an input-blocking interactive layer.
6. Given repository validation runs, when unit, integration, smoke, typecheck, build, and Playwright browser coverage execute, then Chromium, Firefox, and WebKit checks confirm coherent preset-scaled polish, fail-soft audio initialization, reset-safe cleanup, preserved readiness and gameplay telemetry contracts, and no regression in the current desktop-browser sandbox flow without relying on brittle pixel-diff or hard realtime threshold assertions.

### Start Here

- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/ui/hud/world-navigation-hud.ts`
- `src/ui/hud/world-combat-hud.ts`
- `src/ui/hud/world-heat-hud.ts`
- `src/styles.css`
- `src/rendering/scene/heat-scene-runtime.ts`
- `src/rendering/scene/chaos-scene-runtime.ts`
- `src/rendering/scene/combat-scene-runtime.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/pedestrians/runtime/pedestrian-factory.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/app/config/platform.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`
- `tests/unit/world-navigation-hud.spec.ts`
- `tests/unit/world-heat-hud.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`

## Tasks / Subtasks

- [x] Task 1: Extend the current visual presentation through the existing scene-quality and palette seams (AC: 1, 3, 5)
  - [x] Expand `resolveSceneGraphicsPresetProfile()` with the smallest explicit polish profile needed for Story 4.4 instead of scattering one-off effect booleans across the scene runtime.
  - [x] Keep scene palette ownership centralized through `sceneMetadata` or a narrow adjacent helper so roads, ground, boundaries, chunk massing, props, vehicles, and pedestrians read as one visual language.
  - [x] Preserve readable daylight clarity, current camera names, existing `canvas.dataset` telemetry, and the `controllable-vehicle` readiness contract.
- [x] Task 2: Add the smallest architecture-aligned audio runtime and event-driven sound hooks (AC: 2, 3, 4, 5)
  - [x] Introduce a browser-safe audio unlock or resume path that only starts sound after allowed interaction and never blocks scene readiness.
  - [x] Drive audio cues from the existing combat, chaos, heat, vehicle, and responder seams rather than by re-detecting collisions or gameplay state.
  - [x] Keep v1 scope to lightweight ambience and reactive SFX with no music or radio system.
- [x] Task 3: Add lightweight presentational feedback for damage, combat, heat, and HUD coherence without changing gameplay truth (AC: 1, 2, 3, 5)
  - [x] Reuse the current broken-prop, vehicle-damage, combat, and heat feedback seams before inventing new visual-state systems.
  - [x] Keep HUD layers non-interactive and additive, preserving current test ids, DOM ownership, and world-ready overlay behavior.
  - [x] Ensure transient polish state clears correctly on restart, replay, retry, edit-location, and stale-load disposal.
- [x] Task 4: Scale polish conservatively through existing settings and browser-capability defaults (AC: 1, 2, 3, 5, 6)
  - [x] Keep `graphicsPreset` as the primary runtime quality lever unless a concrete blocker proves otherwise.
  - [x] Route browser-family concessions through `src/app/config/platform.ts` and scene profile mapping instead of spreading browser checks across unrelated modules.
  - [x] Avoid expensive always-on effects, new player-facing settings, per-frame allocation churn, or heavyweight asset work that would fight Epic 4 performance goals.
- [x] Task 5: Add guardrail coverage and run repository validation (AC: 6)
  - [x] Extend unit coverage for graphics profile mapping, audio unlock or fail-soft behavior, and any new telemetry helpers.
  - [x] Extend integration, smoke, and Playwright coverage for readiness preservation, reset-safe cleanup, and additive polish telemetry across Chromium, Firefox, and WebKit.
  - [x] Run `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.

## Dev Notes

- Story 4.4 is the focused visual and audio polish story inside Epic 4. It should make the browser build feel intentional and presentable without widening into Story 4.5 browser-certification scope, Story 4.6 public-build packaging, or major new mechanics. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`; `_bmad-output/planning-artifacts/gdd.md#Development Epics`]
- GT Anywhere's product goals still prioritize browser-first access, readable daylight driving, recognizable real-place structure, low-friction play, and a stable desktop-browser `60 FPS` target. Polish work must reinforce those goals rather than trade them away for heavier fidelity. [Source: `_bmad-output/planning-artifacts/gdd.md#Art and Audio Direction`; `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`; `_bmad-output/planning-artifacts/gdd.md#Success Metrics`; `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`]
- The GDD explicitly says there is no music system in v1. Audio polish should therefore focus on engine presence, impacts, gunfire or hit feedback, ambient city sound, and responder or chaos tension rather than a soundtrack or radio feature. [Source: `_bmad-output/planning-artifacts/gdd.md#Audio and Music`]
- No dedicated UX file was discovered during workflow input loading. Use the GDD, architecture, project-context, prior Epic 4 stories, current rendering or HUD code, and current tests as the controlling guidance for this story. [Source: workflow discovery results]

### Epic 4 Cross-Story Context

- Story 4.1 established the player-facing settings and density contract that lets the sandbox fit different hardware tiers.
- Story 4.2 stabilized runtime performance and browser-aware defaults so the driving loop remains satisfying on supported desktop browsers.
- Story 4.3 reduced shell and load friction so browser access stays low-friction and cached restart or replay paths remain fast.
- Story 4.4 is the presentation layer pass that should make those already-working systems look and sound coherent without rewriting them.
- Story 4.5 will validate major supported browsers broadly enough for testing and release, so Story 4.4 should improve polish without hardcoding one-engine-only assumptions.
- Story 4.6 will package a public-quality browser build, so Story 4.4 should keep asset footprint, startup cost, and operational complexity disciplined enough to hand off cleanly into launch-readiness work. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`; `_bmad-output/planning-artifacts/gdd.md#Development Epics`]

### Previous Story Intelligence

- Story 4.3 protected shell-first boot, `world.manifest.ready`, `world.scene.ready`, and the truthful `controllable-vehicle` readiness milestone while also preserving restart, replay, retry, and cached same-slice behavior. Story 4.4 must keep polish assets and audio initialization additive so it does not fake or delay world readiness. [Source: `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Current Load Contracts`; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Non-Negotiables`; `src/app/bootstrap/create-game-app.ts`]
- Story 4.2 already established explicit graphics preset mapping, browser-family defaults, and additive performance telemetry. Visual polish should extend those same seams rather than add freeform quality knobs or hidden browser-specific hacks. [Source: `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Previous Story Intelligence`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Technical Requirements`; `src/rendering/scene/create-world-scene.ts`; `src/app/config/platform.ts`]
- Story 4.1 created the only shipped player-settings contract for Epic 4. Do not widen player-facing settings just to expose every visual or audio tweak; Story 4.4 should scale through `graphicsPreset` and existing capability defaults unless a concrete blocker appears. [Source: `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Shipped Settings Contract`; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md#Non-Negotiables`]
- The current repository already has stable navigation, combat, and heat HUDs plus the `starter-vehicle-camera` and `on-foot-camera`. Story 4.4 should build on those established presentation surfaces instead of replacing them. [Source: `src/ui/hud/world-navigation-hud.ts`; `src/ui/hud/world-combat-hud.ts`; `src/ui/hud/world-heat-hud.ts`; `src/rendering/scene/world-scene-runtime.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]

### Current Visual / Audio State

- `create-world-scene.ts` currently creates one `HemisphericLight`, one clear sky color, and three scene-wide `StandardMaterial`s for ground, roads, and boundaries. `resolveSceneGraphicsPresetProfile()` only maps hardware scaling and light intensity today. [Source: `src/rendering/scene/create-world-scene.ts`; `tests/unit/create-world-scene.spec.ts`]
- `sceneMetadata` currently carries `displayName`, `districtName`, `roadColor`, `groundColor`, and `boundaryColor`, and `world-slice-generator.ts` hardcodes those palette values when a manifest is created. If Story 4.4 expands the palette, keep that contract centralized rather than scattering color literals across multiple runtimes. [Source: `src/world/chunks/slice-manifest.ts`; `src/world/generation/world-slice-generator.ts`]
- Vehicles and pedestrians are still stylized box-based meshes with `StandardMaterial` colors and metadata-driven interaction roles. They are the current fallback presentation contract and must stay readable even if extra polish layers are added. [Source: `src/vehicles/physics/vehicle-factory.ts`; `src/pedestrians/runtime/pedestrian-factory.ts`]
- `chaos-scene-runtime.ts` already recolors broken props and lerps damaged vehicles toward a darker damage state. Extend those existing feedback seams before inventing a parallel impact-visual system. [Source: `src/rendering/scene/chaos-scene-runtime.ts`; `src/vehicles/damage/vehicle-damage-system.ts`]
- Navigation, combat, and heat HUDs are already non-interactive DOM overlays owned outside the canvas. Their classes, test ids, and pointer-events posture are already covered by tests and should be extended additively. [Source: `src/app/bootstrap/create-game-app.ts`; `src/ui/hud/world-navigation-hud.ts`; `src/ui/hud/world-combat-hud.ts`; `src/ui/hud/world-heat-hud.ts`; `src/styles.css`]
- There is no `src/audio/` subsystem, no current Babylon sound usage, and no `public/assets/` tree in the repo today. Story 4.4 audio work is therefore mostly net-new and should introduce only the smallest architecture-aligned seams required. [Source: repository file discovery; `src/`; `public/`]
- Current observability already depends on `scene.metadata`, `canvas.dataset`, and `renderHost.dataset`. Any new polish state should use additive telemetry instead of hidden globals or DOM scraping. [Source: `src/rendering/scene/world-scene-runtime.ts`; `src/rendering/scene/create-world-scene.ts`; `src/app/bootstrap/create-game-app.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]

### Non-Negotiables

- Do not widen this story into Story 4.5 browser certification, Story 4.6 public-build packaging, a major asset-pipeline overhaul, or new gameplay mechanics.
- Do not add a new UI framework, audio library, render layer, post-processing framework, or scene-management package. Babylon.js plus browser APIs are sufficient. [Source: `_bmad-output/project-context.md#Platform & Build Rules`; `package.json`]
- Do not block `data-ready-milestone="controllable-vehicle"` on optional polish asset loads, audio unlock, or non-critical effects. The player must still actually be able to drive when the scene is reported ready. [Source: `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Non-Negotiables`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Do not add a music or radio system. V1 audio remains SFX- and ambience-driven. [Source: `_bmad-output/planning-artifacts/gdd.md#Audio and Music`]
- Do not rename or remove existing dataset keys, test ids, or camera names such as `starter-vehicle-camera` and `on-foot-camera`. [Source: `src/rendering/scene/world-scene-runtime.ts`; `tests/unit/world-scene-runtime.spec.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]
- Do not make HUD layers interactive or let polish UI steal input from gameplay or shell flows. [Source: `src/styles.css`; `src/ui/hud/world-navigation-hud.ts`; `src/ui/hud/world-heat-hud.ts`]
- Do not re-detect collisions, combat, or heat progression independently when the current event streams already exist. Reuse them. [Source: `src/rendering/scene/heat-scene-runtime.ts`; `src/ui/hud/world-combat-hud.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Event System`]
- Do not use aggressive Babylon scene-wide optimization or performance-priority modes as a shortcut for added polish unless they are proven safe for picking, camera correctness, possession, and dynamic runtime updates. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Non-Negotiables`]
- Do not trade away road truth, scale, readable daylight clarity, or recognition-first fidelity for arbitrary visual embellishment. [Source: `_bmad-output/project-context.md#Critical Don't-Miss Rules`; `_bmad-output/planning-artifacts/gdd.md#Art and Audio Direction`]

### Technical Requirements

- `resolveSceneGraphicsPresetProfile()` in `src/rendering/scene/create-world-scene.ts` is the existing explicit scene-quality seam. If Story 4.4 adds fog, accent lighting, palette variants, camera feedback, or lightweight FX toggles, keep them as named fields on that resolved profile rather than ad hoc booleans spread across the scene runtime. [Source: `src/rendering/scene/create-world-scene.ts`; `tests/unit/create-world-scene.spec.ts`]
- `BabylonWorldSceneLoader.load()` currently sets clear color, hardware scaling, the hemispheric light, and the base ground, road, and boundary materials before bootstrapping runtime systems. Keep visual polish centralized there or in the smallest adjacent helper; do not create a second scene-assembly path. [Source: `src/rendering/scene/create-world-scene.ts`]
- `src/rendering/scene/world-scene-runtime.ts` is the existing seam for additive `scene.metadata` and `canvas.dataset` updates. If visual or audio profile state needs test-visible proof, expose it additively through those surfaces without renaming current readiness, performance, possession, heat, or navigation keys. [Source: `src/rendering/scene/world-scene-runtime.ts`; `tests/unit/world-scene-runtime.spec.ts`]
- `src/world/generation/world-slice-generator.ts` currently hardcodes the scene palette in `sceneMetadata`. If Story 4.4 needs richer palette data, evolve that contract deliberately and keep clear defaults so existing tests and already-generated manifest objects do not fail silently. [Source: `src/world/generation/world-slice-generator.ts`; `src/world/chunks/slice-manifest.ts`]
- `src/vehicles/physics/vehicle-factory.ts` and `src/pedestrians/runtime/pedestrian-factory.ts` own the current low-poly proxy look. Add polish by reusing those mesh and material seams or by adding small nearby helpers rather than replacing interaction meshes, names, or metadata contracts. [Source: `src/vehicles/physics/vehicle-factory.ts`; `src/pedestrians/runtime/pedestrian-factory.ts`]
- `src/rendering/scene/chaos-scene-runtime.ts`, `src/rendering/scene/heat-scene-runtime.ts`, and `src/ui/hud/world-combat-hud.ts` already translate gameplay events into presentational state. Route siren, impact, tension, flash, or responder cues from those typed seams instead of duplicating collision or combat detection inside audio or FX code. [Source: `src/rendering/scene/chaos-scene-runtime.ts`; `src/rendering/scene/heat-scene-runtime.ts`; `src/ui/hud/world-combat-hud.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Event System`]
- `src/app/bootstrap/create-game-app.ts` owns shell, HUD, canvas host creation, restart or replay orchestration, and world-ready visibility. If audio unlock or resume needs a user gesture, hook it through existing shell or canvas interaction seams or a narrow app-owned integration point instead of calling browser audio APIs directly from gameplay domains. [Source: `src/app/bootstrap/create-game-app.ts`; `src/ui/shell/location-entry-screen.ts`; `_bmad-output/project-context.md#Code Organization Rules`]
- Because there is currently no `src/audio/` tree, reusable audio bus or orchestration belongs in a new minimal `src/audio/` seam if the solution grows beyond a tiny scene-local helper. Keep scene hookup in `src/rendering/scene/`, and keep gameplay domains free of direct browser audio API calls. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Directory Structure`; `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/project-context.md#Code Organization Rules`]
- If file-backed clips are introduced, keep the asset footprint intentionally small and runtime-load them from a minimal `public/assets/audio/` path. Do not turn Story 4.4 into a large asset ingestion or streaming system. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Directory Structure`; `_bmad-output/planning-artifacts/gdd.md#Asset Requirements`]
- If optional audio clips or other polish assets are loaded, follow the existing cached-Promise pattern already used by `loadTuningProfile()` and `FetchGeoDataPresetSource` so restart or replay paths do not repeatedly fetch or decode the same resources. [Source: `src/vehicles/physics/vehicle-factory.ts`; `src/world/generation/world-slice-generator.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Audio initialization must tolerate blocked autoplay and unavailable audio contexts. Use async unlock or resume behavior, treat failure as recoverable, and keep the game playable when sound cannot start. [Source: `https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay`; `https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume`]
- Keep v1 audio scope focused on ambience, vehicle presence, impacts, responder or heat pressure, gunfire or hit confirmation, and UI feedback. There is no music system in v1, and any responder or chaos cueing should remain lightweight. [Source: `_bmad-output/planning-artifacts/gdd.md#Audio and Music`; `_bmad-output/planning-artifacts/game-architecture.md#Audio Architecture`]
- If Story 4.4 introduces post-processing or other optional graphics work, keep it lightweight, explicit, and tied to `graphicsPreset` plus current browser-family defaults. Low preset and weaker browser paths must be able to disable or downscale expensive polish cleanly. [Source: `src/rendering/scene/create-world-scene.ts`; `src/app/config/platform.ts`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Technical Requirements`]

### Architecture Compliance

- Keep orchestration and optional browser-audio integration in `src/app/` or a narrow `src/audio/` seam, rendering composition in `src/rendering/`, HUD DOM in `src/ui/`, and gameplay truth in domain folders. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`; `_bmad-output/project-context.md#Code Organization Rules`]
- Treat Babylon's scene graph as a rendering and composition layer. Visual or audio polish must not become the source of gameplay truth. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Maintain the architecture's `60 Hz` fixed-step gameplay rule. Story 4.4 may add presentational feedback, but it must not drive gameplay truth directly from render delta or audio timing. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Physics and Simulation`; `_bmad-output/project-context.md#Engine-Specific Rules`]
- Preserve the static-slice versus dynamic-session boundary. Polish should react to existing session state and manifest data, not blur world identity, restart semantics, or compatibility-key behavior. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`; `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- Keep cross-domain coordination on typed events, typed contracts, or narrow injected collaborators rather than ad hoc globals, DOM scraping, or duplicate polling logic. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `_bmad-output/planning-artifacts/game-architecture.md#Consistency Rules`; `_bmad-output/project-context.md#Engine-Specific Rules`]
- Respect browser-safe runtime budgets. Do not convert the scene into a monolith, preload large optional assets indiscriminately, or add per-frame allocation-heavy polish that fights traffic, pedestrian, physics, and streaming hot paths. [Source: `_bmad-output/project-context.md#Performance Rules`; `_bmad-output/planning-artifacts/game-architecture.md#Asset Management`; `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`]

### Library / Framework Requirements

- Stay on the repository's pinned runtime stack for this story: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, `vite` `8.0.5`, TypeScript `5.9.3`, Vitest `3.2.4`, and Playwright `1.59.1`. [Source: `package.json`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`; `_bmad-output/project-context.md#Technology Stack & Versions`]
- Latest checks during this workflow show `@babylonjs/core` `9.2.0` is newer than the pinned `9.1.0`, `@babylonjs/havok` `1.3.12` still matches the latest release, `vite` `8.0.8` is newer than the pinned `8.0.5`, and `@playwright/test` `1.59.1` still matches latest. Do not widen Story 4.4 into dependency upgrades. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `https://registry.npmjs.org/@babylonjs/havok/latest`; `https://registry.npmjs.org/vite/latest`; `https://registry.npmjs.org/@playwright/test/latest`]
- Babylon's current optimization guidance still favors explicit targeted optimization and instrumentation over blanket performance modes. Be especially cautious with `ScenePerformancePriority`, `freezeActiveMeshes()`, `doNotSyncBoundingInfo`, and pointer-picking shortcuts because this repo depends on active interaction, camera correctness, possession, and typed telemetry. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Latest Tech Information`]
- Browser autoplay guidance still treats audible media and Web Audio playback as blocked until a user gesture or allowlisted path is present. If Story 4.4 uses Babylon's built-in audio or browser audio contexts, treat unlock as an async, recoverable operation. [Source: `https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay`; `https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume`]
- Keep the current HTML and CSS shell plus HUD approach. Do not add React, Vue, or a third-party UI layer to implement polish surfaces. [Source: `_bmad-output/planning-artifacts/game-architecture.md#UI Architecture`; `_bmad-output/project-context.md#Engine-Specific Rules`; `src/styles.css`]
- Do not add another audio middleware or asset-management dependency unless a concrete blocker appears. Babylon's built-in audio architecture and browser APIs are the selected stack for this project. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Audio Architecture`; `package.json`]

### File Structure Requirements

- Likely primary touchpoints for Story 4.4 are:
  - `src/rendering/scene/create-world-scene.ts`
  - `src/rendering/scene/world-scene-runtime.ts`
  - `src/app/bootstrap/create-game-app.ts`
  - `src/app/config/platform.ts`
  - `src/ui/hud/world-navigation-hud.ts`
  - `src/ui/hud/world-combat-hud.ts`
  - `src/ui/hud/world-heat-hud.ts`
  - `src/styles.css`
  - `src/rendering/scene/chaos-scene-runtime.ts`
  - `src/rendering/scene/heat-scene-runtime.ts`
  - `src/rendering/scene/combat-scene-runtime.ts`
  - `src/vehicles/physics/vehicle-factory.ts`
  - `src/pedestrians/runtime/pedestrian-factory.ts`
  - `src/world/chunks/slice-manifest.ts`
  - `src/world/generation/world-slice-generator.ts`
  - new files under `src/audio/` only if a reusable audio seam is truly needed
  - optional new files under `src/vehicles/audio/` only if vehicle-specific audio logic cannot stay tiny and adjacent
  - relevant unit, integration, smoke, and browser tests
- Keep any new helper small and adjacent to the owning layer. If Story 4.4 introduces a reusable audio runtime, prefer `src/audio/` plus a thin scene integration seam instead of burying browser audio state inside `src/world/`, `src/traffic/`, `src/pedestrians/`, or UI components. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/project-context.md#Code Organization Rules`]
- If file-backed audio clips are added, create only the smallest `public/assets/audio/` subtree needed. Keep runtime-loaded assets in `public/` and keep application logic in source modules. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Directory Structure`; `_bmad-output/project-context.md#Code Organization Rules`]
- Follow repository naming conventions exactly: `kebab-case` modules and directories, `PascalCase` classes and types, `camelCase` functions and variables, `UPPER_SNAKE_CASE` constants, and `domain.action` event names. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Naming Conventions`; `_bmad-output/project-context.md#Code Organization Rules`]

### Testing Requirements

- Extend `tests/unit/create-world-scene.spec.ts` if the graphics profile gains new explicit polish fields so the mapping stays conservative, testable, and visible. [Source: `tests/unit/create-world-scene.spec.ts`; `src/rendering/scene/create-world-scene.ts`]
- Extend `tests/unit/world-scene-runtime.spec.ts` if Story 4.4 adds new additive `scene.metadata` or `canvas.dataset` keys for visual or audio profile state. Do not remove the existing readiness, camera, or performance assertions. [Source: `tests/unit/world-scene-runtime.spec.ts`; `src/rendering/scene/world-scene-runtime.ts`]
- Add unit coverage for any new audio unlock or fail-soft helper so blocked autoplay, suspended contexts, or unavailable audio backends do not become scene-load failures. [Source: `https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay`; `https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume`]
- Extend HUD unit coverage so navigation, combat, and heat overlays remain persistent, non-interactive DOM surfaces even if Story 4.4 changes their presentation. [Source: `tests/unit/world-navigation-hud.spec.ts`; `tests/unit/world-heat-hud.spec.ts`; `src/ui/hud/world-navigation-hud.ts`; `src/ui/hud/world-heat-hud.ts`]
- Extend smoke and Playwright coverage to prove the game still reaches `data-ready-milestone="controllable-vehicle"`, preserves current camera-name contracts, and keeps restart or replay behavior stable with polish enabled. [Source: `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- If Story 4.4 adds optional asset fetches, add coverage that restart or replay does not repeatedly refetch or reinitialize the same optional polish assets when the cached same-slice path is reused. Follow the existing request-count pattern from the Playwright smoke suite. [Source: `tests/smoke/app-bootstrap.pw.spec.ts`; `src/vehicles/physics/vehicle-factory.ts`; `src/world/generation/world-slice-generator.ts`]
- Prefer additive metadata, dataset assertions, event-driven state checks, and deterministic helper tests over brittle screenshot diffs or hard realtime thresholds. [Source: `_bmad-output/project-context.md#Testing Rules`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Testing Requirements`]
- Finish validation with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`. [Source: `package.json`; `tests/smoke/app-bootstrap.pw.spec.ts`]

### Git Intelligence Summary

- Last 5 commit titles:
  - `Add build loading optimizations and telemetry (Story 4.3)`
  - `Add performance telemetry and browser capability defaults`
  - `Update sprint status`
  - `Add player settings and density configuration`
  - `Update sprint status`
- Recent work concentrates changes in app bootstrap, scene bootstrap or runtime, platform config, and tests rather than isolated leaf modules. Story 4.4 should follow that integration-first pattern and work through the existing typed seams. [Source: recent git history; `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/world-scene-runtime.ts`]
- Recent Epic 4 work favors conservative defaults, additive telemetry, restart safety, and broad automated coverage. Keep that implementation style for polish instead of adding hidden heuristics or one-off browser behavior. [Source: recent git history; `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md`; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md`]
- Recent commits did not add dependencies. Keep Story 4.4 inside the current Babylon, Havok, Vite, TypeScript, Vitest, and Playwright stack unless a concrete blocker appears. [Source: recent git history; `package.json`]

### Latest Tech Information

- `@babylonjs/core` `9.2.0` is the current latest npm release while the repository remains pinned to `9.1.0`. No upgrade is required to implement Story 4.4. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `package.json`]
- `@babylonjs/havok` `1.3.12` still matches the latest release, so the repo's current physics dependency is already current enough for this story. [Source: `https://registry.npmjs.org/@babylonjs/havok/latest`; `package.json`]
- `vite` `8.0.8` is newer than the pinned `8.0.5`, but Story 4.4 should stay focused on runtime polish rather than toolchain churn. [Source: `https://registry.npmjs.org/vite/latest`; `package.json`]
- `@playwright/test` `1.59.1` still matches the current latest release, so the existing cross-browser smoke harness is already current enough for Story 4.4 validation. [Source: `https://registry.npmjs.org/@playwright/test/latest`; `package.json`; `playwright.config.ts`]
- Babylon's current optimization guidance still emphasizes instrumentation and explicit targeted optimization over aggressive scene-wide shortcuts. That matters here because polish work can easily regress interaction, picking, or active-mesh behavior if it leans on the wrong global switch. [Source: `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`]
- MDN's current autoplay guidance still says audible media and Web Audio playback are commonly blocked until the player interacts with the page or the site is allowlisted. Story 4.4 audio initialization must therefore be recoverable and non-fatal. [Source: `https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay`]
- MDN's `AudioContext.resume()` guidance confirms that audio-context unlock is asynchronous and Promise-based. If Story 4.4 uses Babylon or browser audio context management, treat resume or rejection as an explicit state transition instead of assuming synchronous success. [Source: `https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume`]

### Project Structure Notes

- `src/rendering/scene/create-world-scene.ts` is already one of the repo's main assembly files. Keep Story 4.4 additions targeted and extract only the smallest useful helper if the file would otherwise become harder to reason about. [Source: `src/rendering/scene/create-world-scene.ts`]
- `src/app/bootstrap/create-game-app.ts` already owns world-host creation, shell or HUD orchestration, restart or replay flow, and world-ready visibility. It is the best seam for any audio unlock, lifecycle cleanup, or host-level telemetry work. [Source: `src/app/bootstrap/create-game-app.ts`]
- `src/ui/hud/world-navigation-hud.ts`, `src/ui/hud/world-combat-hud.ts`, `src/ui/hud/world-heat-hud.ts`, and `src/styles.css` already establish the current presentation language. Story 4.4 should refine that language instead of starting over. [Source: `src/ui/hud/world-navigation-hud.ts`; `src/ui/hud/world-combat-hud.ts`; `src/ui/hud/world-heat-hud.ts`; `src/styles.css`]
- `src/world/chunks/slice-manifest.ts` and `src/world/generation/world-slice-generator.ts` are the current source of truth for scene palette data. If the visual contract grows, grow it there deliberately. [Source: `src/world/chunks/slice-manifest.ts`; `src/world/generation/world-slice-generator.ts`]
- The repo currently lacks both `src/audio/` and `public/assets/`. Create only the smallest architecture-aligned version of those paths if the chosen implementation really needs them. [Source: repository file discovery]
- Current tests already rely on HUD DOM, additive telemetry, and browser-visible dataset fields. Use those same seams to prove polish behavior instead of inventing a second debug-only surface. [Source: `tests/unit/world-scene-runtime.spec.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`; `tests/unit/world-navigation-hud.spec.ts`; `tests/unit/world-heat-hud.spec.ts`]

### Project Context Rules

- Keep Babylon's scene graph as a rendering and composition layer, not the sole source of gameplay truth. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Keep gameplay simulation on a `60 Hz` fixed step with interpolation; do not drive gameplay truth directly from render delta. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Use HTML and CSS for shell flows and keep the in-game HUD in its dedicated gameplay UI layer. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Prefer constructor injection inside a domain and typed events across domains instead of ad hoc global access. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Treat world streaming, vehicle simulation, traffic, and pedestrians as hot-path systems; avoid per-frame allocations and unnecessary work in those loops. [Source: `_bmad-output/project-context.md#Performance Rules`]
- Keep domain logic in its owning folder. `src/app/` owns config and orchestration, `src/rendering/` consumes state, and runtime-loaded assets belong under `public/`. [Source: `_bmad-output/project-context.md#Code Organization Rules`]
- Target desktop web browsers with WebGL2 support first. Do not optimize first for native desktop, console, or mobile in this story. [Source: `_bmad-output/project-context.md#Platform & Build Rules`]
- Do not bypass the world-slice generation pipeline, mix static slice state with dynamic session state, or bypass existing factories and pools for convenience. [Source: `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- Do not trade away road truth, scale, terrain, district rhythm, or recognition-first fidelity for arbitrary visual embellishment. [Source: `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- When in doubt, choose the more restrictive and less magical implementation path that preserves current contracts. [Source: `_bmad-output/project-context.md#Usage Guidelines`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`
- `_bmad-output/planning-artifacts/gdd.md#Art and Audio Direction`
- `_bmad-output/planning-artifacts/gdd.md#Audio and Music`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/gdd.md#Platform-Specific Details`
- `_bmad-output/planning-artifacts/gdd.md#Success Metrics`
- `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`
- `_bmad-output/planning-artifacts/game-architecture.md#Audio Architecture`
- `_bmad-output/planning-artifacts/game-architecture.md#UI Architecture`
- `_bmad-output/planning-artifacts/game-architecture.md#Physics and Simulation`
- `_bmad-output/planning-artifacts/game-architecture.md#Asset Management`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`
- `_bmad-output/planning-artifacts/game-architecture.md#Event System`
- `_bmad-output/planning-artifacts/game-architecture.md#Directory Structure`
- `_bmad-output/planning-artifacts/game-architecture.md#Naming Conventions`
- `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md`
- `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md`
- `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md`
- `package.json`
- `playwright.config.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/config/platform.ts`
- `src/pedestrians/runtime/pedestrian-factory.ts`
- `src/rendering/scene/chaos-scene-runtime.ts`
- `src/rendering/scene/combat-scene-runtime.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/heat-scene-runtime.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/styles.css`
- `src/ui/hud/world-combat-hud.ts`
- `src/ui/hud/world-heat-hud.ts`
- `src/ui/hud/world-navigation-hud.ts`
- `src/vehicles/damage/vehicle-damage-system.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/world/chunks/slice-manifest.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/unit/world-navigation-hud.spec.ts`
- `tests/unit/world-scene-runtime.spec.ts`
- `tests/unit/world-heat-hud.spec.ts`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/vite/latest`
- `https://registry.npmjs.org/@playwright/test/latest`
- `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`
- `https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay`
- `https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Implementation Plan

- Expand `resolveSceneGraphicsPresetProfile()` into the single explicit polish-quality seam for fill light, fog density, and boundary alpha so preset scaling stays centralized and browser-aware.
- Centralize visual palette ownership through `sceneMetadata.palette` plus a narrow `resolveSceneVisualPalette()` helper, then thread that palette into the world scene, vehicle factory, pedestrian runtime, and chaos prop visuals without changing readiness truth.
- Add the smallest browser-safe audio runtime wired to existing combat and heat subscriptions plus existing canvas telemetry seams for chaos and vehicle state, with user-gesture unlock, fail-soft behavior, lightweight synthesis, and no music system.
- Prove the result through additive telemetry plus unit, integration, smoke, and Playwright coverage that preserves `controllable-vehicle`, current camera names, current HUD ownership, and restart or replay safety.

### Debug Log References

- `git log --oneline -5`
- `git log --stat --oneline -5`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/vite/latest`
- `https://registry.npmjs.org/@playwright/test/latest`
- `https://raw.githubusercontent.com/BabylonJS/Documentation/master/content/features/featuresDeepDive/scene/optimize_your_scene.md`
- `https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay`
- `https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- No dedicated UX artifact was found; UX guidance for this story was derived from the GDD, architecture, project-context, prior Epic 4 stories, current rendering or HUD code, and current tests.
- Story 4.4 is scoped to coherent visual and audio polish that reinforces readability and reactivity without widening into browser-certification, public-build packaging, or major mechanic changes.
- Existing graphics preset mapping, browser-family defaults, scene metadata and dataset telemetry, DOM HUD ownership, and the lack of a current audio subsystem are embedded above so the dev agent can extend the correct seams.
- Completed Task 1 by extending the scene graphics preset profile with explicit fill-light, fog-density, and boundary-alpha fields, then exposing the new visual state additively through `scene.metadata` and `canvas.dataset` without changing readiness or camera contracts.
- Centralized the visual palette through `sceneMetadata.palette` plus a narrow resolver and threaded that palette into world chunk massing, vehicle tinting, pedestrian presentation, and breakable-prop visuals.
- Verified Task 1 with targeted red-phase unit coverage, `npm run check`, and the full `npm test` suite.
- Completed Task 2 by adding a minimal `src/audio/world-audio-runtime.ts` seam with browser-safe unlock or resume handling, fail-soft unsupported or blocked behavior, lightweight continuous ambience or vehicle presence synthesis, and short reactive cues for combat, impacts, and heat pressure.
- Wired the audio runtime through `create-game-app.ts` using existing combat and heat subscriptions plus existing canvas dataset seams for chaos and vehicle state, then surfaced additive audio telemetry on the world canvas without blocking readiness.
- Verified Task 2 with targeted audio runtime and bootstrap smoke coverage, `npm run check`, and the full `npm test` suite.
- Completed Task 3 by reusing existing combat, heat, and chaos telemetry seams for additive HUD feedback: impact pulses on the combat HUD, possession-mode styling on the navigation HUD, and pressure-stage styling on the heat HUD.
- Added explicit HUD clear paths in `create-game-app.ts` and the combat HUD so transient polish state now resets cleanly across restart, replay, retry, edit-location, and stale scene disposal without changing gameplay truth or input ownership.
- Verified Task 3 with focused HUD unit coverage, a smoke restart check for chaos-driven impact feedback, `npm run check`, and the full `npm test` suite.
- Completed Task 4 by adding a shared `resolveAudioPolishProfile()` seam in `platform.ts` so the current `graphicsPreset` and browser-family defaults remain the only runtime polish levers for audio intensity and ambience.
- Wired the audio runtime and canvas telemetry to that shared profile instead of adding new player-facing toggles or scattered browser checks, keeping low-end and WebKit paths conservative without widening the settings contract.
- Verified Task 4 with focused platform and audio-runtime unit coverage, `npm run check`, and the full `npm test` suite.
- Completed Task 5 by extending integration and browser guardrails for additive polish telemetry, restart-safe cleanup, audio unlock behavior, and preset-scaled polish verification across Chromium, Firefox, and WebKit.
- Final repository validation passed with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.

### File List

- `src/world/chunks/slice-manifest.ts`
- `src/world/chunks/scene-visual-palette.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/audio/world-audio-runtime.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/config/platform.ts`
- `src/ui/hud/world-navigation-hud.ts`
- `src/ui/hud/world-combat-hud.ts`
- `src/ui/hud/world-heat-hud.ts`
- `src/styles.css`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/traffic/runtime/traffic-vehicle-factory.ts`
- `src/traffic/runtime/traffic-system.ts`
- `src/pedestrians/runtime/pedestrian-factory.ts`
- `src/pedestrians/runtime/pedestrian-system.ts`
- `src/rendering/scene/pedestrian-scene-runtime.ts`
- `src/rendering/scene/chaos-scene-runtime.ts`
- `src/rendering/scene/responder-scene-runtime.ts`
- `src/rendering/scene/create-world-scene.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/unit/world-slice-generator.spec.ts`
- `tests/unit/vehicle-factory.spec.ts`
- `tests/unit/world-navigation-hud.spec.ts`
- `tests/unit/world-combat-hud.spec.ts`
- `tests/unit/world-audio-runtime.spec.ts`
- `tests/unit/player-settings.spec.ts`
- `tests/unit/pedestrian-scene-runtime.spec.ts`
- `tests/unit/chaos-scene-runtime.spec.ts`
- `tests/unit/world-heat-hud.spec.ts`
- `tests/integration/polish-telemetry.integration.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `_bmad-output/implementation-artifacts/4-4-experience-coherent-visual-and-audio-polish.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-04-12: Created the comprehensive story context for Story 4.4 and marked it ready for development.
- 2026-04-12: Implemented Task 1 visual-profile and palette seams for coherent daylight presentation and additive telemetry.
- 2026-04-12: Implemented Task 2 browser-safe audio runtime hooks and reset-safe canvas audio telemetry.
- 2026-04-12: Implemented Task 3 HUD feedback polish and reset-safe transient feedback cleanup.
- 2026-04-12: Implemented Task 4 quality scaling through existing graphics and browser-capability seams.
- 2026-04-12: Added final integration and browser guardrails and completed repository validation for Story 4.4.
- 2026-04-12: Marked Story 4.4 ready for review after full validation and cross-browser checks.