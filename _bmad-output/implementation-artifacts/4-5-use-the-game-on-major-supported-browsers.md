# Story 4.5: Use the Game on Major Supported Browsers

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I can use the game on major supported browsers,
so that access is broad enough for testing and release.

## Acceptance Criteria

1. Given GT Anywhere is opened on a supported desktop browser (`Chromium`-based, `Firefox`, or `Safari`/`WebKit`) and the player has not changed any settings yet, when the shell boots and a world is loaded, then the app derives and exposes a first-class browser-support snapshot through the existing `src/app/config/`, app-bootstrap, scene-metadata, and browser-visible telemetry seams so browser family, support tier, key capability flags, and any conservative defaults are explicit instead of hidden UA-dependent behavior.
2. Given a supported browser has degraded optional capabilities such as blocked audio, unavailable browser storage, browser-family-specific graphics concessions, or missing convenience APIs already treated as recoverable, when the player boots, loads, restarts, reloads, or re-enters the world, then the game stays usable via existing fail-soft seams, keeps `controllable-vehicle` truthful, and exposes the degraded state additively through shell or canvas messaging plus typed logs or events without inventing duplicate runtime state.
3. Given the player opens GT Anywhere in a browser that does not meet the project's desktop-browser and `WebGL2` baseline or encounters browser-specific render-context failure before the world becomes usable, when startup or scene creation runs, then the app fails soft into a clear shell-owned supported-browser guidance or error state, preserves the current recovery posture around retry or edit-location instead of leaving a broken half-loaded scene behind, and records the rejection or failure reason through the existing app telemetry and logging seams.
4. Given the player uses the current core flows including location submit, shell-ready, world generation, world-ready, driving, restart, replay, quick restart, vehicle switching or hijacking, on-foot transfer, settings persistence, keyboard or mouse play, gamepad play, and audio unlock, when those flows run on Chromium, Firefox, and WebKit, then browser-specific concessions remain encoded through `platform.ts`, `create-world-scene.ts`, `create-game-app.ts`, and the audio or persistence seams rather than as scattered one-off checks, and no supported browser regresses the core desktop-browser sandbox loop.
5. Given browser support is a release-readiness concern, when unit, integration, smoke, typecheck, build, and Playwright browser coverage execute, then the test suite asserts browser-family detection, browser-visible support telemetry, supported or degraded or unsupported behavior, current cross-browser flow stability, and browser-safe input coverage across Chromium, Firefox, and WebKit without relying on brittle wall-clock thresholds or screenshot diffs.

### Start Here

- `src/app/config/platform.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/events/game-events.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/world/generation/world-load-failure.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/audio/world-audio-runtime.ts`
- `src/persistence/settings/local-storage-player-settings-repository.ts`
- `playwright.config.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/unit/player-settings.spec.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/unit/player-settings-repository.spec.ts`

## Tasks / Subtasks

- [x] Task 1: Add a first-class browser-support snapshot through the existing platform and settings seams (AC: 1, 2, 3, 4)
  - [x] Extend `src/app/config/platform.ts` with the smallest explicit model needed for browser support status, browser family, and key capability flags rather than spreading new checks across unrelated modules.
  - [x] Preserve the current 4.1 and 4.2 settings contract and conservative browser-family defaults instead of widening the player-facing settings surface.
  - [x] Keep any unsupported or degraded classification deterministic and testable from typed inputs rather than from hidden DOM-only heuristics.
- [x] Task 2: Surface supported, degraded, and unsupported browser state through the existing shell, telemetry, and logging seams (AC: 1, 2, 3, 4)
  - [x] Use `src/app/bootstrap/create-game-app.ts`, `src/ui/shell/location-entry-screen.ts`, `renderHost.dataset`, `canvas.dataset`, and `scene.metadata` as the primary observability surfaces.
  - [x] Reuse the existing typed load-failure path or add the smallest app-level typed event only if the current world events cannot represent the support-state distinction cleanly.
  - [x] Keep unsupported-browser handling fail-soft and cleanup-safe so no partial scene or stale world survives a rejected load.
- [x] Task 3: Keep browser-specific runtime fallbacks and lifecycle behavior centralized and recoverable (AC: 2, 3, 4)
  - [x] Reuse `src/audio/world-audio-runtime.ts` and `src/persistence/settings/local-storage-player-settings-repository.ts` for blocked-audio and blocked-storage behavior rather than duplicating capability detection.
  - [x] If hidden-tab or render-context interruptions are handled, use explicit browser APIs such as `visibilitychange`, `webglcontextlost`, and `webglcontextrestored` instead of `blur` or `focus` guesswork.
  - [x] Preserve restart, replay, retry, stale-load cancellation, and `controllable-vehicle` readiness semantics across all supported browser families.
- [x] Task 4: Expand cross-browser automated coverage around the supported-browser contract (AC: 4, 5)
  - [x] Extend Playwright browser coverage to assert `data-graphics-browser-family`, support status telemetry, and at least one browser-family-specific expectation for both Firefox and WebKit instead of only generic success plus the current WebKit audio check.
  - [x] Add or extend unit tests for browser detection, support-tier resolution, browser-adjusted defaults, and any new scene or app telemetry mapping.
  - [x] Add integration or jsdom smoke coverage for unsupported or degraded boot paths if those flows are difficult to exercise directly in Playwright.
- [x] Task 5: Validate the supported-browser story end to end (AC: 5)
  - [x] Run `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.
  - [x] Record any follow-up manual verification needed for real Safari if Playwright WebKit coverage is insufficient for release confidence.

## Dev Notes

- Story 4.5 is the browser-compatibility and supported-browser certification story inside Epic 4. It should turn the repo's existing browser-aware defaults, telemetry, and fallbacks into an explicit supported-browser contract without widening into Story 4.6 hosting, packaging, CDN, deployment, or public-release operations work. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`; `_bmad-output/planning-artifacts/gdd.md#Platform-Specific Details`; `_bmad-output/planning-artifacts/gdd.md#Success Metrics`; `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md`]
- The product promise remains desktop-browser-first with support across Chromium, Firefox, and Safari or WebKit, stable `60 FPS` intent, low-friction browser access, and `WebGL2` as the baseline rendering expectation. Story 4.5 should strengthen reliability and diagnosability across those browsers, not broaden platform scope to mobile or native packaging. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`; `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`; `_bmad-output/project-context.md#Platform & Build Rules`]
- No dedicated UX artifact was discovered during workflow input loading. Use the GDD, architecture, project-context, technical research, prior Epic 4 stories, current code seams, and current tests as the controlling guidance for this story. [Source: workflow discovery results]

### Epic 4 Cross-Story Context

- Story 4.1 established the shipped player settings and density contract that already adapts the sandbox to different hardware tiers.
- Story 4.2 added supported-browser performance telemetry plus conservative browser-family defaults and scene-profile adjustments.
- Story 4.3 tightened shell and load telemetry, cached restart or replay reuse, and cross-browser smoke guardrails.
- Story 4.4 added browser-safe audio behavior, WebKit-specific ambience concessions, and more browser-visible telemetry through existing canvas and metadata seams.
- Story 4.5 should formalize the supported-browser contract, make supported versus degraded versus unsupported behavior explicit, and widen browser-matrix guardrails.
- Story 4.6 will package the public-quality browser build, so Story 4.5 should stop at runtime compatibility, diagnostics, and browser validation rather than host or release engineering. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`; `_bmad-output/planning-artifacts/gdd.md#Development Epics`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md`; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md`; `_bmad-output/implementation-artifacts/4-4-experience-coherent-visual-and-audio-polish.md`]

### Previous Story Intelligence

- Story 4.4 already routes browser-aware audio behavior through `resolveAudioPolishProfile()`, `create-game-app.ts`, and `world-audio-runtime.ts`, including explicit WebKit ambience concessions plus blocked or unsupported audio states. Story 4.5 should reuse those seams rather than re-detect audio capability in a second system. [Source: `_bmad-output/implementation-artifacts/4-4-experience-coherent-visual-and-audio-polish.md#Previous Story Intelligence`; `_bmad-output/implementation-artifacts/4-4-experience-coherent-visual-and-audio-polish.md#Technical Requirements`; `src/app/bootstrap/create-game-app.ts`; `src/audio/world-audio-runtime.ts`]
- Story 4.2 already established browser-family capability defaults and explicit graphics-profile adjustments. Story 4.5 should extend those same seams with support-state clarity rather than adding ad hoc browser checks in shell, simulation, or test code. [Source: `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Previous Story Intelligence`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Technical Requirements`; `src/app/config/platform.ts`; `src/rendering/scene/create-world-scene.ts`]
- Story 4.3 already made shell-ready, manifest-ready, and scene-ready timing visible and restart-safe. Story 4.5 should keep any new supported-browser telemetry additive on those same render-host and canvas surfaces. [Source: `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Current Load Contracts`; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Technical Requirements`; `src/app/bootstrap/create-game-app.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Story 4.1 established the only shipped settings contract and persistence seam for Epic 4. Story 4.5 must not widen that contract or bypass the local-storage repository just to express browser support behavior. [Source: `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md`; `src/persistence/settings/local-storage-player-settings-repository.ts`; `tests/unit/player-settings-repository.spec.ts`]

### Current Browser Support State

- `src/app/config/platform.ts` already models `chromium`, `firefox`, `webkit`, and `unknown`, derives capability-default settings from browser family plus hardware tier, and adjusts audio polish by browser family. That is the current canonical seam for browser-specific behavior. [Source: `src/app/config/platform.ts`; `tests/unit/player-settings.spec.ts`]
- `src/rendering/scene/create-world-scene.ts` already resolves a browser-adjusted graphics profile, writes `graphicsBrowserFamily` into `scene.metadata`, and exposes `data-graphics-browser-family` plus related graphics telemetry on the world canvas. [Source: `src/rendering/scene/create-world-scene.ts`; `tests/unit/create-world-scene.spec.ts`]
- `src/app/bootstrap/create-game-app.ts` already reads browser platform signals, applies audio polish through browser family, exposes shell and load telemetry on `renderHost.dataset`, and contains fallbacks for `requestIdleCallback`, `MutationObserver`, and `performance.now`. [Source: `src/app/bootstrap/create-game-app.ts`; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Current Load Contracts`]
- `src/audio/world-audio-runtime.ts` already supports `AudioContext` plus `webkitAudioContext` and surfaces `blocked`, `uninitialized`, `unlocked`, and `unsupported` states. [Source: `src/audio/world-audio-runtime.ts`; `tests/unit/world-audio-runtime.spec.ts`]
- `src/persistence/settings/local-storage-player-settings-repository.ts` already fails safe when `localStorage` is unavailable or throws. [Source: `src/persistence/settings/local-storage-player-settings-repository.ts`; `tests/unit/player-settings-repository.spec.ts`]
- Real-browser automation already runs on Chromium, Firefox, and WebKit through `playwright.config.ts`, but current browser-matrix assertions are still narrow: the main Playwright smoke file proves bootstrap, restart, and settings behavior, yet it does not fully assert browser-family telemetry, supported or degraded or unsupported support-state behavior, or enough Firefox-specific expectations. [Source: `playwright.config.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Current structured logs and typed app events do not include a first-class browser support snapshot or support tier, which makes browser-specific regressions harder to diagnose during QA or release readiness review. [Source: `src/app/events/game-events.ts`; `src/app/logging/logger.ts`; `src/app/bootstrap/create-game-app.ts`]
- There is no explicit preflight or shell-owned unsupported-browser path yet for `WebGL2` baseline failure or browser-specific render-context interruption. The story should close that gap without leaving partial Babylon boot state behind. [Source: `_bmad-output/project-context.md#Platform & Build Rules`; `src/rendering/scene/create-world-scene.ts`; `https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext`; `https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event`]

### Non-Negotiables

- Do not widen this story into Story 4.6 release packaging, deployment environments, CDN configuration, service-worker rollout, source-map upload, analytics vendor integration, or public host disclosure work.
- Do not broaden platform scope to mobile browsers, native wrappers, or desktop shells in this story.
- Do not add a browser-detection dependency, UI framework, analytics SDK, or alternative rendering stack unless a concrete blocker appears. The current Babylon.js, browser API, and Playwright stack is sufficient. [Source: `package.json`; `_bmad-output/project-context.md#Technology Stack & Versions`; `_bmad-output/planning-artifacts/game-architecture.md#UI Architecture`]
- Do not break `controllable-vehicle`, typed `world.load.failed` handling, current restart or replay or retry semantics, current settings precedence, existing dataset keys, current camera names, or the shell versus HUD ownership split. [Source: `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Non-Negotiables`; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Non-Negotiables`; `_bmad-output/implementation-artifacts/4-4-experience-coherent-visual-and-audio-polish.md#Non-Negotiables`]
- Do not scatter browser-family conditionals across gameplay, traffic, pedestrian, or world-generation modules. Keep them centralized in `src/app/config/`, app bootstrap, rendering assembly, audio, or persistence seams. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Configuration`; `_bmad-output/project-context.md#Code Organization Rules`]
- Do not use brittle screenshot diffs, absolute timing thresholds, or pixel-perfect rendering assertions as the main proof of browser support. Prefer additive telemetry, typed events, and explicit state checks. [Source: `_bmad-output/project-context.md#Testing Rules`; `tests/smoke/app-bootstrap.pw.spec.ts`]

### Technical Requirements

- `src/app/config/platform.ts` is the canonical seam for browser family detection, capability-default settings, and browser-adjusted audio behavior. If Story 4.5 introduces support tiers or capability flags, define them there or in a tiny adjacent helper so browser support stays explicit and testable. [Source: `src/app/config/platform.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Configuration`]
- Preserve the current settings contract exactly. Browser support work may influence capability defaults or support telemetry, but it must not add new player-facing settings or cause `graphicsPreset` changes to regenerate the world. [Source: `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md`; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md#Technical Requirements`]
- `createGameApp()` already owns shell boot, render-host creation, world-load timing, scene disposal, stale-load cancellation, and typed load events. It is the right seam for browser support messaging, render-host support telemetry, and fail-soft unsupported-browser handling before or around scene creation. [Source: `src/app/bootstrap/create-game-app.ts`; `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`]
- `create-world-scene.ts` already exposes `graphicsBrowserFamily` and graphics-profile data through `scene.metadata` and `canvas.dataset`. Extend those surfaces additively for browser support diagnostics instead of inventing a second scene-debug path. [Source: `src/rendering/scene/create-world-scene.ts`; `tests/unit/create-world-scene.spec.ts`]
- `src/world/generation/world-load-failure.ts` is the typed failure contract for world-load problems. If Story 4.5 introduces unsupported-browser or unsupported-capability rejection before the world becomes usable, route that behavior through the existing typed failure model or a minimal adjacent extension instead of inventing a one-off shell error shape. [Source: `src/world/generation/world-load-failure.ts`; `src/app/bootstrap/create-game-app.ts`; `src/app/events/game-events.ts`]
- If the story rejects unsupported browsers or unsupported GPU capability, keep that distinction explicit. A browser that is outside the supported desktop-browser or `WebGL2` baseline should stay in a clear shell-owned failure or guidance state instead of partially entering world load. [Source: `_bmad-output/project-context.md#Platform & Build Rules`; `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`; `https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext`]
- Reuse the existing audio and storage fail-soft seams. Browser support work should observe and surface `audio-unlock-state`, blocked storage, and similar recoverable capability differences rather than implementing parallel capability caches or hidden flags. [Source: `src/audio/world-audio-runtime.ts`; `src/persistence/settings/local-storage-player-settings-repository.ts`; `tests/unit/player-settings-repository.spec.ts`]
- If background-tab or render-context behavior is addressed, prefer explicit browser APIs. MDN's current guidance still points to `visibilitychange` for hidden-tab handling and `webglcontextlost` or `webglcontextrestored` for render-context interruption rather than `blur` or `focus` guesswork. [Source: `https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API`; `https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event`]
- Keep browser-readable support telemetry on existing observability seams such as `renderHost.dataset`, `canvas.dataset`, `scene.metadata`, structured logs, and typed events. New keys must be additive and must reset correctly on reload, retry, restart, and replay. [Source: `src/app/bootstrap/create-game-app.ts`; `src/rendering/scene/create-world-scene.ts`; `src/rendering/scene/world-scene-runtime.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- If browser-family or support-tier context is added to logs or events, keep the payload typed and lightweight. Do not overload the meaning of `world.manifest.ready`, `world.scene.ready`, or `world.load.failed`; add only the smallest new fields or app-level event needed for clear QA diagnostics. [Source: `src/app/events/game-events.ts`; `src/app/logging/logger.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Logging`; `_bmad-output/planning-artifacts/game-architecture.md#Event System`]
- `playwright.config.ts` already uses desktop Chromium, Firefox, and WebKit projects. Treat that as the primary browser-matrix harness for Story 4.5, and only extend it narrowly if a stable-channel or branded-browser check becomes concretely necessary. [Source: `playwright.config.ts`; `https://playwright.dev/docs/browsers`]

### Architecture Compliance

- Keep browser-support modeling and capability logic in `src/app/config/`, app orchestration and typed events in `src/app/`, shell messaging in `src/ui/shell/`, rendering diagnostics in `src/rendering/`, audio behavior in `src/audio/`, and storage behavior in `src/persistence/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`; `_bmad-output/project-context.md#Code Organization Rules`]
- Treat Babylon's scene graph as a rendering and composition layer only. Browser support telemetry or compatibility handling must not make the scene graph the source of gameplay truth. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Keep cross-domain coordination on typed events, typed contracts, or narrow injected collaborators rather than DOM scraping or ad hoc globals. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `_bmad-output/planning-artifacts/game-architecture.md#Consistency Rules`; `_bmad-output/project-context.md#Engine-Specific Rules`]
- Maintain the architecture's `60 Hz` fixed-step simulation rule and the static-slice versus dynamic-session boundary. Browser-support work is compatibility and diagnostics work, not gameplay-timing or session-identity redesign. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Physics and Simulation`; `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`; `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- Keep the primary focus on desktop web browsers with `WebGL2` support. Do not dilute the story with mobile-browser concessions or native packaging assumptions. [Source: `_bmad-output/project-context.md#Platform & Build Rules`; `_bmad-output/planning-artifacts/gdd.md#Platform-Specific Details`]

### Library / Framework Requirements

- Stay on the repository's pinned runtime stack for this story: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, `vite` `8.0.5`, TypeScript `5.9.3`, Vitest `3.2.4`, and Playwright `1.59.1`. [Source: `package.json`; `_bmad-output/project-context.md#Technology Stack & Versions`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`]
- Latest checks during this workflow show `@babylonjs/core` `9.2.0` is newer than the pinned `9.1.0`, `@babylonjs/havok` `1.3.12` still matches the latest release, and `@playwright/test` `1.59.1` still matches the latest release. Do not widen Story 4.5 into dependency upgrades. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `https://registry.npmjs.org/@babylonjs/havok/latest`; `https://registry.npmjs.org/@playwright/test/latest`; `package.json`]
- Playwright's current browser guidance still expects browser binaries to stay aligned with the installed Playwright version and continues to recommend multi-project browser matrices for Chromium, Firefox, and WebKit. If browser-matrix failures are caused by stale local binaries, refresh them with `npx playwright install`, but keep Story 4.5 focused on product compatibility rather than tooling churn. [Source: `https://playwright.dev/docs/browsers`]
- Playwright's WebKit browser is derived from current WebKit sources rather than branded Safari. It is strong early-warning coverage, but release confidence for Safari-specific issues may still require a real Safari spot-check on macOS. [Source: `https://playwright.dev/docs/browsers`; `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md`]
- MDN currently marks `WebGL2RenderingContext` as baseline and widely available across browsers since September 2021, with some feature-level variation. That supports keeping `WebGL2` as the explicit runtime baseline while still surfacing clear unsupported-browser guidance when the baseline is not met. [Source: `https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext`; `_bmad-output/project-context.md#Platform & Build Rules`]
- MDN currently marks `webglcontextlost` and the Page Visibility API as broadly available. If Story 4.5 hardens browser lifecycle handling, use those standard APIs rather than browser-specific heuristics. [Source: `https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event`; `https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API`]

### File Structure Requirements

- Likely primary touchpoints for Story 4.5 are:
  - `src/app/config/platform.ts`
  - `src/app/bootstrap/create-game-app.ts`
  - `src/app/events/game-events.ts`
  - `src/world/generation/world-load-failure.ts`
  - `src/app/logging/logger.ts` only if browser-support context needs structured log fields
  - `src/ui/shell/location-entry-screen.ts`
  - `src/rendering/scene/create-world-scene.ts`
  - `src/rendering/scene/world-scene-runtime.ts` only if new support telemetry needs runtime sync
  - `src/audio/world-audio-runtime.ts`
  - `src/persistence/settings/local-storage-player-settings-repository.ts`
  - `playwright.config.ts`
  - `tests/smoke/app-bootstrap.pw.spec.ts`
  - `tests/smoke/app-bootstrap.smoke.spec.ts`
  - `tests/integration/location-entry.integration.spec.ts`
  - `tests/unit/player-settings.spec.ts`
  - `tests/unit/create-world-scene.spec.ts`
  - `tests/unit/player-settings-repository.spec.ts`
- Keep any new helper small and adjacent to the owning seam. Browser-support modeling belongs near `platform.ts`, shell messaging near `create-game-app.ts` or `location-entry-screen.ts`, and scene-level compatibility telemetry near `create-world-scene.ts`, not inside gameplay systems. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/project-context.md#Code Organization Rules`]
- Follow repository naming conventions exactly: `kebab-case` modules and directories, `PascalCase` classes and types, `camelCase` functions and variables, `UPPER_SNAKE_CASE` constants, and `domain.action` event names. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Naming Conventions`; `_bmad-output/project-context.md#Code Organization Rules`]

### Testing Requirements

- Extend `tests/unit/player-settings.spec.ts` for any new browser-support snapshot, support-tier resolution, or browser-adjusted default rules so the support contract stays explicit and deterministic. [Source: `tests/unit/player-settings.spec.ts`; `src/app/config/platform.ts`]
- Extend `tests/unit/create-world-scene.spec.ts` if the scene gains new browser-support telemetry or scene-profile mapping fields. Keep those mappings explicit rather than implicit. [Source: `tests/unit/create-world-scene.spec.ts`; `src/rendering/scene/create-world-scene.ts`]
- Extend `tests/unit/player-settings-repository.spec.ts` or `tests/unit/world-audio-runtime.spec.ts` if Story 4.5 adds support-state derivation from blocked storage or blocked audio behavior. [Source: `tests/unit/player-settings-repository.spec.ts`; `tests/unit/world-audio-runtime.spec.ts`; `src/audio/world-audio-runtime.ts`; `src/persistence/settings/local-storage-player-settings-repository.ts`]
- Extend `tests/integration/location-entry.integration.spec.ts` or `tests/smoke/app-bootstrap.smoke.spec.ts` for unsupported or degraded boot paths, render-host support telemetry, and cleanup-safe failure handling that Playwright cannot easily simulate. [Source: `tests/integration/location-entry.integration.spec.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`; `src/app/bootstrap/create-game-app.ts`]
- Extend `tests/smoke/app-bootstrap.pw.spec.ts` to assert `data-graphics-browser-family`, supported-browser telemetry, browser-adjusted defaults on first run, browser-safe keyboard or mouse plus gamepad coverage where practical, and stronger Firefox plus WebKit expectations while preserving the current bootstrap, restart, quick-restart, and settings-persistence contracts. [Source: `tests/smoke/app-bootstrap.pw.spec.ts`; `playwright.config.ts`; `_bmad-output/planning-artifacts/gdd.md#Controls and Input`]
- Prefer additive dataset, metadata, event, and log assertions over screenshot diffs or brittle timing thresholds. Existing CI patterns already use nonzero timing fields, request counts, and semantic milestones; keep that standard. [Source: `tests/smoke/app-bootstrap.pw.spec.ts`; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Testing Requirements`]
- Manual validation should include at least one real Safari pass before claiming broad release-browser readiness, because Playwright WebKit is not branded Safari. [Source: `https://playwright.dev/docs/browsers`; `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md`]
- Finish validation with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`. [Source: `package.json`; `playwright.config.ts`]

### Git Intelligence Summary

- Last 5 commit titles:
  - `Add coherent visual and audio polish (Story 4.4)`
  - `Add build loading optimizations and telemetry (Story 4.3)`
  - `Add performance telemetry and browser capability defaults`
  - `Update sprint status`
  - `Add player settings and density configuration`
- Recent Epic 4 work continues to concentrate changes in `src/app/bootstrap/create-game-app.ts`, `src/app/config/platform.ts`, `src/rendering/scene/create-world-scene.ts`, and `tests/smoke/app-bootstrap.pw.spec.ts`. Story 4.5 should follow that integration-first pattern instead of drifting into isolated browser hacks in leaf gameplay files. [Source: recent git history; `src/app/bootstrap/create-game-app.ts`; `src/app/config/platform.ts`; `src/rendering/scene/create-world-scene.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Recent commits favor conservative defaults, additive telemetry, restart safety, and broad automated validation. Keep that implementation style for browser support instead of adding opaque heuristics or one-off browser workarounds with no observability. [Source: recent git history; `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md`; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md`; `_bmad-output/implementation-artifacts/4-4-experience-coherent-visual-and-audio-polish.md`]
- Recent commits did not add dependencies. Keep Story 4.5 inside the current Babylon.js, Havok, Vite, TypeScript, Vitest, and Playwright stack unless a concrete blocker appears. [Source: recent git history; `package.json`]

### Latest Tech Information

- `@babylonjs/core` `9.2.0` is the current latest npm release while the repo remains pinned to `9.1.0`. No upgrade is required to implement Story 4.5. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `package.json`]
- `@babylonjs/havok` `1.3.12` still matches the current latest release, so the repo's current physics dependency is already current enough for this story. [Source: `https://registry.npmjs.org/@babylonjs/havok/latest`; `package.json`]
- `@playwright/test` `1.59.1` still matches the current latest release, so the repository's browser-matrix tooling is already current enough for Story 4.5. [Source: `https://registry.npmjs.org/@playwright/test/latest`; `package.json`]
- Playwright's current browser documentation still ties each Playwright release to specific browser binaries, supports Chromium, Firefox, and WebKit projects, and notes that WebKit coverage is not the same thing as branded Safari coverage. [Source: `https://playwright.dev/docs/browsers`]
- MDN currently marks `WebGL2RenderingContext` as baseline and widely available across browsers since September 2021, which supports an explicit `WebGL2` support gate for this project. [Source: `https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext`]
- MDN currently marks `webglcontextlost` as widely available and intended for handling lost WebGL drawing buffers, making it the correct API if Story 4.5 needs render-context interruption handling. [Source: `https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event`]
- MDN's current Page Visibility guidance still says background tabs commonly stop `requestAnimationFrame()` callbacks and throttle timers. If browser-support work addresses background or resume behavior, it should use `visibilitychange` explicitly rather than assuming foreground timing rules always apply. [Source: `https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API`]

### Project Structure Notes

- `src/app/config/platform.ts` is already the canonical browser-family seam. Keep Story 4.5 logic centralized there so later browser-support stories do not need to reverse-engineer scattered conditionals. [Source: `src/app/config/platform.ts`]
- `src/app/bootstrap/create-game-app.ts` already owns shell visibility, render-host lifecycle, typed world events, restart or replay behavior, and fail-soft cleanup. It is the best place for supported-browser messaging and app-level browser support telemetry. [Source: `src/app/bootstrap/create-game-app.ts`]
- `src/rendering/scene/create-world-scene.ts` already exposes browser-family telemetry on the world canvas. Keep scene-facing browser diagnostics additive there instead of creating a second render-debug transport. [Source: `src/rendering/scene/create-world-scene.ts`]
- `src/audio/world-audio-runtime.ts` and `src/persistence/settings/local-storage-player-settings-repository.ts` already isolate browser-specific audio and storage failures. Reuse them. [Source: `src/audio/world-audio-runtime.ts`; `src/persistence/settings/local-storage-player-settings-repository.ts`]
- Current real-browser coverage lives primarily in `tests/smoke/app-bootstrap.pw.spec.ts`. Expand that matrix first before inventing a second browser harness. [Source: `tests/smoke/app-bootstrap.pw.spec.ts`; `playwright.config.ts`]

### Project Context Rules

- Use Babylon.js `9.1.0`, Havok `1.3.12`, Vite `8.0.5`, TypeScript, and desktop browsers with `WebGL2` support as the enforced baseline stack. [Source: `_bmad-output/project-context.md#Technology Stack & Versions`; `_bmad-output/project-context.md#Platform & Build Rules`]
- Keep gameplay simulation on a `60 Hz` fixed step with interpolation; do not drive gameplay truth directly from render delta. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Keep domain logic in its owning folder. `src/app/` owns config and orchestration, `src/rendering/` consumes state, `src/audio/` owns audio runtime behavior, and `src/persistence/` is the only layer allowed to touch browser storage. [Source: `_bmad-output/project-context.md#Code Organization Rules`]
- Use HTML and CSS for startup, loading, and settings flows, and keep the in-game HUD in its dedicated gameplay UI layer. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Do not bypass the world-slice generation pipeline, mix static slice state with dynamic session state, or bypass factories and pools for high-churn runtime entities while adding browser support work. [Source: `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- When in doubt, choose the more restrictive and less magical implementation path that preserves current contracts. [Source: `_bmad-output/project-context.md#Usage Guidelines`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/gdd.md#Platform-Specific Details`
- `_bmad-output/planning-artifacts/gdd.md#Success Metrics`
- `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`
- `_bmad-output/planning-artifacts/game-architecture.md#Configuration`
- `_bmad-output/planning-artifacts/game-architecture.md#Logging`
- `_bmad-output/planning-artifacts/game-architecture.md#Event System`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/4-2-get-stable-performance-on-supported-desktop-browsers.md`
- `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md`
- `_bmad-output/implementation-artifacts/4-4-experience-coherent-visual-and-audio-polish.md`
- `package.json`
- `playwright.config.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/config/platform.ts`
- `src/app/events/game-events.ts`
- `src/world/generation/world-load-failure.ts`
- `src/app/logging/logger.ts`
- `src/audio/world-audio-runtime.ts`
- `src/persistence/settings/local-storage-player-settings-repository.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/rendering/scene/world-scene-runtime.ts`
- `src/ui/shell/location-entry-screen.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/unit/player-settings-repository.spec.ts`
- `tests/unit/player-settings.spec.ts`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/@playwright/test/latest`
- `https://playwright.dev/docs/browsers`
- `https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext`
- `https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event`
- `https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `git log -n 5 --format='%H%x09%s'`
- `git log -n 5 --name-status --format='COMMIT %H%nTITLE %s'`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/@playwright/test/latest`
- `https://playwright.dev/docs/browsers`
- `https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext`
- `https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event`
- `https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API`

### Implementation Plan

- Add a typed browser-support snapshot in `src/app/config/platform.ts` that resolves browser family, support tier, capability flags, and conservative capability defaults from explicit inputs.
- Thread that snapshot through `create-game-app.ts`, `location-entry-screen.ts`, `world-load-failure.ts`, `game-events.ts`, and scene telemetry so supported, degraded, and unsupported states stay observable without widening player settings.
- Extend unit, jsdom smoke, and Playwright coverage to assert the support contract, unsupported-browser fail-soft behavior, and browser-family-specific concessions across Chromium, Firefox, and WebKit.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Loaded planning context from `epics.md`, `gdd.md`, `game-architecture.md`, and `_bmad-output/project-context.md`; no dedicated UX artifact was found.
- Story 4.5 is intentionally scoped to explicit supported-browser behavior, diagnostics, and cross-browser validation, not deployment or public-release packaging.
- Existing browser-family defaults, scene telemetry, audio unlock behavior, persistence fallback behavior, and current Chromium or Firefox or WebKit test seams are embedded above so the dev agent can extend the correct surfaces.
- Implemented a first-class browser-support snapshot in `src/app/config/platform.ts`, including support tiers, typed capability flags, and deterministic unsupported or degraded classification from explicit inputs.
- Surfaced browser support through shell copy, `renderHost.dataset`, `canvas.dataset`, `scene.metadata`, and typed `app.shell.ready`, `world.scene.ready`, and `world.load.failed` telemetry without widening the player settings contract.
- Reused the existing audio and persistence seams so blocked audio and unavailable storage feed support diagnostics through `world-audio-runtime.ts` and `local-storage-player-settings-repository.ts` instead of parallel capability caches.
- Added an explicit unsupported-browser fail-soft path for unsupported browser family or missing `WebGL2`, routed through `world-load-failure.ts` so retry or edit-location recovery remains cleanup-safe.
- Expanded automated coverage with unit tests for support resolution and scene telemetry mapping, jsdom smoke coverage for degraded and unsupported paths, and Playwright browser-matrix assertions for browser telemetry plus Firefox and WebKit scene concessions.
- Validation completed with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.
- Follow-up manual verification: run one real Safari smoke pass on macOS before release sign-off because Playwright WebKit is still an approximation of branded Safari.
- Automatically fixed HIGH issue: Implemented `webglcontextlost` handling in `create-world-scene.ts` to properly fail soft with a `WORLD_SCENE_LOAD_FAILED` error if context is lost during scene load.

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/4-5-use-the-game-on-major-supported-browsers.md`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/config/browser-support-telemetry.ts`
- `src/app/config/platform.ts`
- `src/app/events/game-events.ts`
- `src/persistence/settings/local-storage-player-settings-repository.ts`
- `src/rendering/scene/create-world-scene.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/world/generation/world-load-failure.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/unit/create-world-scene.spec.ts`
- `tests/unit/player-settings.spec.ts`

## Change Log

- 2026-04-12: Added explicit browser-support snapshot modeling, fail-soft unsupported-browser handling, additive shell or scene telemetry, and expanded cross-browser automated coverage for Story 4.5.
