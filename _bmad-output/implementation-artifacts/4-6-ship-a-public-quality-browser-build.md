# Story 4.6: Ship a Public-Quality Browser Build

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I can ship a public-quality browser build,
so that GT Anywhere can be evaluated by real players.

## Acceptance Criteria

1. Given a production build is created for the current Babylon.js/Vite app, when the build is served from preview, staging, or a static public host including nested public paths, then shell entry, lazy-loaded scene chunks, runtime-fetched world/tuning data, and public assets resolve through one host-safe public-base strategy instead of hardcoded root-relative URLs, and no code edit is required per environment.
2. Given a player opens a newly deployed public build or returns after a deployment invalidated an older chunk, when the shell boots or a lazy import fails, then GT Anywhere fails soft through the existing shell-owned error and retry posture, surfaces an intentional public-build recovery path instead of a blank screen, and preserves the current unsupported-browser/load-failure contracts.
3. Given the project's launch goal is a low-cost, client-heavy browser release, when Story 4.6 lands, then the repo produces a documented public-build package and host contract for static hosting that covers HTML/bootstrap caching versus hashed assets/data, compression expectations, and any required headers or base-path assumptions without introducing a mandatory backend, analytics vendor, or platform lock-in.
4. Given public builds need release visibility without leaking dev-only behavior, when the player or tester uses the shipped build, then release/build metadata and public-facing app metadata are surfaced through the existing shell/render-host/canvas seams or static metadata files, current diagnostic telemetry remains additive for QA, and development/staging-only tooling stays absent or gated out of the public player experience.
5. Given Stories 4.1-4.5 already define the shipped settings, performance, load, polish, and browser-support contracts, when the public-quality build runs on Chromium, Firefox, and WebKit, then location submit, world generation, `controllable-vehicle` readiness, restart/replay, settings persistence, browser-support handling, input, and audio unlock remain stable in the built app, and automated validation proves host-safe asset resolution, release metadata, and deploy-safe recovery without brittle timing or screenshot diffs.

### Start Here

- `package.json`
- `vite.config.ts`
- `index.html`
- `src/main.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/config/platform.ts`
- `src/app/config/browser-support-telemetry.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `playwright.config.ts`
- `tests/unit/vite-config.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`

## Tasks / Subtasks

- [x] Task 1: Make runtime URLs and build output safe for public hosting and nested base paths (AC: 1, 3, 5)
  - [x] Replace hardcoded root-relative runtime fetch paths with a single base-aware helper or config seam that uses Vite's public-base rules.
  - [x] Keep Vite build changes minimal and explicit, preserving the current lazy scene-loader split and Babylon manual chunks.
  - [x] Ensure public files and runtime data under `public/` remain loadable on preview, staging, and static-host paths without per-environment code edits.
  - [x] Add one explicit build-and-serve validation path for a nested public base so subpath hosting is proven in automation rather than assumed from root-only preview success.
- [x] Task 2: Add public-build recovery and release metadata through existing shell telemetry seams (AC: 2, 4, 5)
  - [x] Handle stale deployment/lazy-chunk failures through the shell/app bootstrap path so redeploy mismatches fail soft.
  - [x] Expose a lightweight release/build identifier and any public-facing metadata through existing `renderHost.dataset`, shell copy, or adjacent static metadata files rather than ad hoc globals.
  - [x] Derive release metadata from a deterministic build-time source of truth such as package version plus commit/date metadata instead of hand-authored strings.
  - [x] Preserve current `world.load.failed`, unsupported-browser, retry, edit-location, and `controllable-vehicle` semantics.
- [x] Task 3: Define the static-host/public-release contract without adding unnecessary platform lock-in (AC: 3, 4)
  - [x] Create `docs/public-build-hosting.md` describing the required hosting expectations for HTML/bootstrap caching, immutable hashed assets, static data delivery, compression, and any preview/staging/production assumptions.
  - [x] Keep the release posture browser-first, desktop-only, and client-heavy; do not introduce required backend/runtime services.
  - [x] If host-specific config is added, keep it narrowly expressive of cache/rewrite behavior and avoid coupling the product to one provider unless the repo already chooses one.
- [x] Task 4: Keep public builds free of dev-only behavior and preserve existing Epic 4 contracts (AC: 4, 5)
  - [x] Confirm development/staging-only tooling stays gated away from public player flows.
  - [x] Keep current settings schema, browser-support snapshot, render-host/canvas telemetry keys, and scene readiness contracts additive and stable.
  - [x] Reuse the existing shell, platform, browser-support, and scene telemetry seams instead of creating parallel release-only state.
  - [x] Treat Story 4.5 review outcomes as upstream contract changes: if review feedback changes browser-support behavior, absorb those updates in the same seams before finalizing Story 4.6.
- [x] Task 5: Expand release/build validation and run the full repository definition of done (AC: 5)
  - [x] Extend unit/integration/browser coverage for base-path-safe runtime URLs, public-build metadata, and stale-deploy recovery or equivalent host-safe failure handling.
  - [x] Update current root-only smoke assumptions such as `page.goto("/")` and exact `/data/...` request assertions so tests remain valid for non-root deployments.
  - [x] Keep assertions on semantic events, dataset fields, request paths/counts, and typed failures instead of screenshots or brittle wall-clock thresholds.
  - [x] Run `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.

## Dev Notes

- Story 4.6 is the public-release and browser-build packaging story for Epic 4. It should make the existing desktop-browser game shippable to real testers without widening into new mechanics, mandatory backend services, native packaging, or live-service scope. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`; `_bmad-output/planning-artifacts/game-brief.md#Launch Goals`; `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Game Deployment and Release Management`]
- GT Anywhere's launch goals emphasize a playable browser build on its own domain, low hosting cost, client-heavy runtime behavior, and honest external feedback. Story 4.6 should therefore prioritize static-host readiness, deploy-safe updates, and release validation over heavier platform integrations. [Source: `_bmad-output/planning-artifacts/game-brief.md#Launch Goals`; `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`; `_bmad-output/planning-artifacts/gdd.md#Success Metrics`; `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Platform SDKs and Deployment Infrastructure`]
- No dedicated UX file was discovered during workflow input loading. Use the GDD, architecture, project-context, technical browser-stack research, prior Epic 4 stories, current build/config files, and current smoke tests as the controlling guidance for this story. [Source: workflow discovery results]

### Epic 4 Cross-Story Context

- Story 4.1 established the shipped settings and density contract that adapts the sandbox to different hardware tiers.
- Story 4.2 established performance telemetry and browser-family capability defaults.
- Story 4.3 tightened shell/load telemetry, lazy scene delivery, manifest/tuning reuse, and Vite build chunking.
- Story 4.4 added coherent visual/audio polish through existing graphics/browser seams.
- Story 4.5 formalized supported-browser behavior, browser-support telemetry, and fail-soft unsupported-browser handling across Chromium, Firefox, and WebKit.
- Story 4.6 should package those already-working runtime seams into a public-quality browser build with host-safe delivery, deploy-safe recovery, and release validation rather than revisiting core gameplay or browser-support architecture. [Source: `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md`; `_bmad-output/implementation-artifacts/4-4-experience-coherent-visual-and-audio-polish.md`; `_bmad-output/implementation-artifacts/4-5-use-the-game-on-major-supported-browsers.md`]

### Previous Story Intelligence

- Story 4.5 made browser support explicit through `platform.ts`, `browser-support-telemetry.ts`, `create-game-app.ts`, `create-world-scene.ts`, and `world-load-failure.ts`. Story 4.6 should reuse those exact seams for public-build diagnostics and recovery instead of inventing a second browser/release state model. [Source: `_bmad-output/implementation-artifacts/4-5-use-the-game-on-major-supported-browsers.md#Technical Requirements`; `src/app/config/platform.ts`; `src/app/config/browser-support-telemetry.ts`; `src/app/bootstrap/create-game-app.ts`; `src/world/generation/world-load-failure.ts`]
- Story 4.5 is currently tracked as `review` in `sprint-status.yaml`. Treat its browser-support contract as the live baseline and keep 4.6 changes aligned with those seams so any review-driven adjustments can land without a parallel release-specific redesign. [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml`; `_bmad-output/implementation-artifacts/4-5-use-the-game-on-major-supported-browsers.md`]
- Story 4.3 already solved build-load friction through the current Vite manual chunking and memoized lazy scene loader. Story 4.6 should preserve that posture and focus on public-host compatibility, not collapse scene code back into initial boot. [Source: `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Technical Requirements`; `vite.config.ts`; `src/app/bootstrap/create-game-app.ts`]
- Earlier Epic 4 work consistently kept telemetry additive through `renderHost.dataset`, `canvas.dataset`, typed events, and Playwright smoke coverage. Story 4.6 should follow that pattern for release metadata, build recovery, and public-host guardrails. [Source: `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Current Load Contracts`; `_bmad-output/implementation-artifacts/4-5-use-the-game-on-major-supported-browsers.md#Technical Requirements`; `tests/smoke/app-bootstrap.pw.spec.ts`]

### Current Release / Build State

- `package.json` currently exposes `dev`, `build`, `preview`, `check`, `test`, and `test:browser` scripts only. The repo produces a Vite build and verifies it with Playwright preview, but there is no explicit public-build/release script or documented host contract yet. [Source: `package.json`; `playwright.config.ts`]
- `vite.config.ts` currently only manual-chunks Babylon runtime into `babylon-core` and `babylon-havok`. There is no current `base` setting, release metadata injection, sourcemap policy, or deploy-facing build config. [Source: `vite.config.ts`; `tests/unit/vite-config.spec.ts`]
- `index.html` is still a minimal shell with a title and `/src/main.ts` module entry. There is no manifest, icon, or other public-release metadata yet. [Source: `index.html`]
- `src/main.ts` preserves lean shell boot and a fatal fallback UI, but it currently has no deploy-stale chunk recovery such as Vite `vite:preloadError` handling. [Source: `src/main.ts`; `https://vite.dev/guide/build#load-error-handling`]
- Runtime-fetched public data still uses hardcoded root-relative URLs: `FetchGeoDataPresetSource` defaults to `"/data/world-gen/location-presets.json"` and `loadTuningProfile()` fetches `"/data/tuning/${vehicleType}.json"`. Those paths are safe at domain root, but they are the main current blocker to nested-base or subpath hosting. [Source: `src/world/generation/world-slice-generator.ts`; `src/vehicles/physics/vehicle-factory.ts`; `https://vite.dev/guide/build#public-base-path`]
- The current Playwright smoke suite already validates the built preview on Chromium, Firefox, and WebKit, including browser support tier, shell/build timings, readiness telemetry, audio unlock, restart, and settings persistence. This is the right validation seam for public-quality browser builds. [Source: `playwright.config.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- No deployment/provider config is currently present in the repo: no CI workflow, no Pages/Workers/Vercel/Netlify config, and no `src/services/` release integration. Story 4.6 should not assume a provider that the repo has not already chosen. [Source: repository file discovery]

### Non-Negotiables

- Do not widen this story into new gameplay, native desktop packaging, mobile-browser work, multiplayer, leaderboards, or a mandatory backend.
- Do not break the shipped settings contract (`worldSize`, `graphicsPreset`, `trafficDensity`, `pedestrianDensity`), restart/replay semantics, current `world.load.failed` behavior, unsupported-browser handling, or the truthful readiness milestone `controllable-vehicle`. [Source: `_bmad-output/implementation-artifacts/4-1-adjust-settings-and-density.md`; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Non-Negotiables`; `_bmad-output/implementation-artifacts/4-5-use-the-game-on-major-supported-browsers.md#Non-Negotiables`]
- Do not collapse the lazy scene-loader boundary or pull Babylon world-scene code back into the initial shell boot just to simplify release work. [Source: `src/app/bootstrap/create-game-app.ts`; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Technical Requirements`]
- Do not hardcode a hosting provider, analytics vendor, or release-service dependency unless the repo explicitly chooses one. Prefer host-agnostic static-host readiness first. [Source: `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Online Multiplayer and Backend Services`; repository file discovery]
- Do not introduce a full offline/PWA strategy, aggressive service-worker hot swap, or complex live-ops stack unless a narrowly scoped need is proven. Offline play is not required in v1. [Source: `_bmad-output/planning-artifacts/gdd.md#Platform-Specific Details`; `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Live Game Operations and Post-Launch`]
- Do not move application logic into `public/`, bypass the persistence/service ownership rules, or rename existing renderHost/canvas dataset keys that current tests already treat as contracts. [Source: `_bmad-output/project-context.md#Code Organization Rules`; `tests/smoke/app-bootstrap.pw.spec.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`]
- Do not treat `package.json` publication settings as the release objective. A public browser build does not require converting the repo into an npm package. [Source: `package.json`; `_bmad-output/planning-artifacts/game-brief.md#Launch Goals`]
- Do not fork browser-support behavior away from Story 4.5 while that story is still in review. If 4.5 review feedback changes the browser-support contract, 4.6 must absorb it through the same seams before it is treated as release-ready. [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml`; `_bmad-output/implementation-artifacts/4-5-use-the-game-on-major-supported-browsers.md`]

### Technical Requirements

- Use Vite's public-base support for any host-path-sensitive build work. Static assets referenced from HTML/CSS/JS are rewritten through `base`, and any dynamically constructed URLs should use `import.meta.env.BASE_URL` exactly or a tiny adjacent helper built on it. [Source: `https://vite.dev/guide/build#public-base-path`; `vite.config.ts`]
- Replace root-relative runtime fetches for location presets and tuning data with one base-aware path strategy. Those two current fetch seams are the most important release blockers for nested-path/static-host deployments. [Source: `src/world/generation/world-slice-generator.ts`; `src/vehicles/physics/vehicle-factory.ts`]
- Keep release/deploy recovery in the shell/bootstrap layer. Vite's `vite:preloadError` event is the relevant hook when a user has older HTML/chunks after a deploy. If used, connect it through `src/main.ts` or the app bootstrap path so the player sees an intentional recovery behavior instead of a blank page. [Source: `https://vite.dev/guide/build#load-error-handling`; `src/main.ts`; `src/app/bootstrap/create-game-app.ts`]
- If stale-chunk recovery is added, pair it with explicit host guidance for HTML caching. Vite's current docs and MDN caching guidance both point toward revalidated/non-immutable HTML and long-lived immutable hashed assets rather than caching everything the same way. [Source: `https://vite.dev/guide/build#load-error-handling`; `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control`]
- Keep release/build metadata additive and lightweight. Use existing shell/renderHost/canvas telemetry surfaces or adjacent config helpers instead of hidden globals, DOM scraping, or a new analytics subsystem. [Source: `src/app/bootstrap/create-game-app.ts`; `src/app/config/browser-support-telemetry.ts`; `_bmad-output/planning-artifacts/game-architecture.md#Logging`]
- Release/build metadata must come from a deterministic build-time source of truth such as `package.json` version plus commit/date metadata injected through Vite config or an adjacent helper. Do not hand-maintain release strings in UI code. [Source: `package.json`; `vite.config.ts`; `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Game Deployment and Release Management`]
- Public-host packaging should stay static-host friendly: immutable hashed assets, conservative HTML/bootstrap caching, explicit client-cache versioning, compression where the host supports it, and minimal server-side runtime compute. [Source: `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Platform SDKs and Deployment Infrastructure`; `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Game Deployment and Release Management`; `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control`]
- Keep current browser support and load-failure behavior authoritative. Public-build work may enrich recovery messaging or release telemetry, but unsupported browsers must still fail through the typed load-failure path rather than ad hoc page states. [Source: `src/app/config/platform.ts`; `src/world/generation/world-load-failure.ts`; `_bmad-output/implementation-artifacts/4-5-use-the-game-on-major-supported-browsers.md#Technical Requirements`]
- If host-specific config files are added, keep them narrowly focused on static asset delivery, caching, or preview/promote behavior. Do not add gameplay-network services or release-only logic in provider config files. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Optional Services`; `_bmad-output/project-context.md#Platform & Build Rules`]
- Keep preview/staging/prod validation centered on the built app. Playwright's `webServer` and `baseURL` support already match the current repo pattern and are sufficient for public-build smoke validation. [Source: `playwright.config.ts`; `https://playwright.dev/docs/test-webserver`]

### Architecture Compliance

- Keep build/release orchestration and shell-facing recovery in `src/app/`, public metadata or HTML wiring in `index.html` or minimal adjacent static files, runtime path helpers in a tiny config/helper seam, and gameplay/runtime truth in the existing domain folders. [Source: `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`; `_bmad-output/project-context.md#Code Organization Rules`]
- Treat the Babylon scene graph as a rendering layer only. Public-build/release work must not move gameplay truth, persistence rules, or browser-support state into scene-only hacks. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`; `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`]
- Preserve the current static-slice versus dynamic-session split, current generation pipeline, and current client-heavy architecture. Shipping publicly is a delivery concern, not a reason to rewrite world assembly or runtime ownership. [Source: `_bmad-output/project-context.md#Critical Don't-Miss Rules`; `_bmad-output/planning-artifacts/game-architecture.md#Stable City / Living Session`; `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Online Multiplayer and Backend Services`]
- Debug tools are architecture-defined as development/staging-only. If public-build work touches those seams later, keep them disabled or absent in release builds. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Debug Tools`]
- Keep cross-domain coordination on typed events, typed failures, and narrow injected seams rather than ad hoc global release state. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Event System`; `_bmad-output/project-context.md#Engine-Specific Rules`]

### Library / Framework Requirements

- Stay on the repository's pinned runtime stack for this story: `@babylonjs/core` `9.1.0`, `@babylonjs/havok` `1.3.12`, `vite` `8.0.5`, TypeScript `5.9.3`, Vitest `3.2.4`, and Playwright `1.59.1`. [Source: `package.json`; `_bmad-output/project-context.md#Technology Stack & Versions`; `_bmad-output/planning-artifacts/game-architecture.md#Verified Technology Versions`]
- Latest checks during this workflow show `vite` `8.0.8` is newer than the pinned `8.0.5`, `@babylonjs/core` `9.2.0` is newer than the pinned `9.1.0`, `@babylonjs/havok` `1.3.12` still matches the latest release, and `@playwright/test` `1.59.1` still matches the latest release. Do not widen Story 4.6 into dependency upgrades unless a concrete public-build blocker demands it. [Source: `https://registry.npmjs.org/vite/latest`; `https://registry.npmjs.org/@babylonjs/core/latest`; `https://registry.npmjs.org/@babylonjs/havok/latest`; `https://registry.npmjs.org/@playwright/test/latest`; `package.json`]
- Vite's current production-build docs confirm the built output is suitable for static hosting, `base` rewrites asset URLs, `import.meta.env.BASE_URL` is the correct dynamic-base hook, and `vite:preloadError` is the deploy-stale chunk recovery seam. Follow those platform-native hooks instead of inventing a custom bundling layer. [Source: `https://vite.dev/guide/build#public-base-path`; `https://vite.dev/guide/build#load-error-handling`]
- MDN's current caching guidance still supports the standard web-release pattern: `no-cache` or equivalent revalidation for HTML/bootstrap documents and long-lived `max-age` plus `immutable` for hashed static assets. If public-build docs/config are added, follow that split. [Source: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control`]
- Keep the current HTML/CSS shell, browser APIs, and Playwright harness. Do not add React, another bundler, or a second browser-automation stack just to ship the public build. [Source: `_bmad-output/project-context.md#Platform & Build Rules`; `playwright.config.ts`; `src/main.ts`]

### File Structure Requirements

- Likely primary touchpoints for Story 4.6 are:
  - `package.json`
  - `vite.config.ts`
  - `index.html`
  - `src/main.ts`
  - `src/app/bootstrap/create-game-app.ts`
  - `src/app/config/platform.ts`
  - `src/app/config/browser-support-telemetry.ts`
  - `src/world/generation/world-slice-generator.ts`
  - `src/vehicles/physics/vehicle-factory.ts`
  - `playwright.config.ts`
  - `tests/unit/vite-config.spec.ts`
  - `tests/smoke/app-bootstrap.pw.spec.ts`
  - `tests/smoke/app-bootstrap.smoke.spec.ts`
- A small adjacent helper such as `src/app/config/runtime-paths.ts` or similar is acceptable if it centralizes base-aware asset/data URL construction. Do not spread public-base logic across unrelated gameplay files. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Configuration`; `_bmad-output/project-context.md#Code Organization Rules`]
- If public browser metadata is added, keep it in `index.html` and/or minimal files under `public/` such as a manifest or icons. Do not move application logic into `public/`. [Source: `index.html`; `_bmad-output/project-context.md#Code Organization Rules`]
- Add `docs/public-build-hosting.md` as the primary host-contract artifact if release/deploy documentation is needed, and keep any supporting scripts/config narrowly scoped. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Directory Structure`]
- Follow repository naming conventions exactly: `kebab-case` modules/directories, `PascalCase` classes/types, `camelCase` functions/variables, `UPPER_SNAKE_CASE` constants, and `domain.action` event names. [Source: `_bmad-output/planning-artifacts/game-architecture.md#Naming Conventions`; `_bmad-output/project-context.md#Code Organization Rules`]

### Testing Requirements

- Extend `tests/unit/vite-config.spec.ts` for any `base`, build metadata, cache-oriented output, or release-specific Vite config changes so packaging behavior stays explicit and reviewable. [Source: `tests/unit/vite-config.spec.ts`; `vite.config.ts`]
- Add unit coverage for any new runtime-path helper or release-metadata helper so root-relative regressions and host-path bugs are caught without needing a full browser run. [Source: `src/world/generation/world-slice-generator.ts`; `src/vehicles/physics/vehicle-factory.ts`]
- Add at least one automated validation path that runs the built app under a non-root base or nested public path. AC1/AC5 are not satisfied by root-only preview coverage alone. [Source: `playwright.config.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`; `https://vite.dev/guide/build#public-base-path`]
- Extend `tests/smoke/app-bootstrap.pw.spec.ts` as the primary release-validation harness. Keep verifying the built preview across Chromium, Firefox, and WebKit while adding assertions for host-safe data paths, release metadata, and deploy-stale recovery or equivalent recovery signals. [Source: `playwright.config.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Update the current root-relative smoke assumptions in `tests/smoke/app-bootstrap.pw.spec.ts`, especially exact `/data/...` request matching and root `page.goto("/")` usage, so the release harness proves host-safe paths instead of preserving root-only behavior by accident. [Source: `tests/smoke/app-bootstrap.pw.spec.ts`; `src/world/generation/world-slice-generator.ts`; `src/vehicles/physics/vehicle-factory.ts`]
- Extend `tests/smoke/app-bootstrap.smoke.spec.ts` or a narrow integration test for any `vite:preloadError`/stale-chunk recovery path that is easier to simulate in jsdom than in Playwright. [Source: `tests/smoke/app-bootstrap.smoke.spec.ts`; `https://vite.dev/guide/build#load-error-handling`]
- Preserve existing assertions for browser support tier, shell-ready timing, `world.manifest.ready`, `world.scene.ready`, settings persistence, input, audio unlock, and `controllable-vehicle`. Public-build work must add to those contracts, not weaken them. [Source: `tests/smoke/app-bootstrap.pw.spec.ts`; `tests/smoke/app-bootstrap.smoke.spec.ts`; `tests/integration/location-entry.integration.spec.ts`]
- Keep release assertions on semantic milestones, dataset fields, request path resolution, and typed failure behavior rather than screenshot diffs or brittle time thresholds. [Source: `_bmad-output/project-context.md#Testing Rules`; `tests/smoke/app-bootstrap.pw.spec.ts`; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md#Testing Requirements`]
- Finish validation with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`. [Source: `package.json`; `playwright.config.ts`]
- Before marking Story 4.6 complete, reconcile any open Story 4.5 review-driven browser-support changes so the public-build contract does not diverge from the reviewed browser-support baseline. [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml`; `_bmad-output/implementation-artifacts/4-5-use-the-game-on-major-supported-browsers.md`]
- Manual validation should include at least one hosted preview on the intended static-host shape plus one real Safari smoke pass before calling the public build release-ready. [Source: `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Game Deployment and Release Management`; `_bmad-output/implementation-artifacts/4-5-use-the-game-on-major-supported-browsers.md#Testing Requirements`]

### Git Intelligence Summary

- Last 5 commit titles:
  - `feat: implement browser support lifecycle and telemetry (Story 4.5)`
  - `Add coherent visual and audio polish (Story 4.4)`
  - `Add build loading optimizations and telemetry (Story 4.3)`
  - `Add performance telemetry and browser capability defaults`
  - `Update sprint status`
- Recent Epic 4 work continues to concentrate changes in `src/app/bootstrap/create-game-app.ts`, `src/app/config/platform.ts`, `src/rendering/scene/create-world-scene.ts`, `vite.config.ts`, and the smoke/browser tests. Story 4.6 should follow that integration-first pattern instead of introducing a separate release subsystem. [Source: recent git history; `src/app/bootstrap/create-game-app.ts`; `src/app/config/platform.ts`; `vite.config.ts`; `tests/smoke/app-bootstrap.pw.spec.ts`]
- Recent commits favor conservative defaults, additive telemetry, cleanup-safe lifecycle behavior, and broad automated validation. Keep that style for public-build work. [Source: recent git history; `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md`; `_bmad-output/implementation-artifacts/4-5-use-the-game-on-major-supported-browsers.md`]
- Recent commits did not add dependencies. Keep Story 4.6 inside the current Babylon.js, Havok, Vite, TypeScript, Vitest, and Playwright stack unless a concrete blocker appears. [Source: recent git history; `package.json`]

### Latest Tech Information

- `vite` `8.0.8` is the current latest release while the repo remains pinned to `8.0.5`. Vite's current build docs still treat `vite build` output as static-host-ready, `base` as the public-path control, `import.meta.env.BASE_URL` as the correct dynamic-base hook, and `vite:preloadError` as the stale-deploy recovery seam. [Source: `https://registry.npmjs.org/vite/latest`; `https://vite.dev/guide/build#public-base-path`; `https://vite.dev/guide/build#load-error-handling`]
- `@babylonjs/core` `9.2.0` is the current latest release while the repo remains pinned to `9.1.0`. No engine upgrade is required to make Story 4.6 host-safe. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `package.json`]
- `@babylonjs/havok` `1.3.12` still matches the current latest release, so the repo's physics dependency is already current enough for this story. [Source: `https://registry.npmjs.org/@babylonjs/havok/latest`; `package.json`]
- `@playwright/test` `1.59.1` still matches the current latest release, and Playwright's current `webServer` guidance remains aligned with the repo's built-preview smoke setup. [Source: `https://registry.npmjs.org/@playwright/test/latest`; `https://playwright.dev/docs/test-webserver`; `playwright.config.ts`]
- Current research and MDN caching guidance still support the standard public web-release pattern: immutable hashed assets, conservative HTML caching, explicit client-cache versioning, and minimal server compute. [Source: `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Platform SDKs and Deployment Infrastructure`; `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Game Deployment and Release Management`; `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control`]
- Current research still recommends static hosting plus client-side persistence first for a browser-first single-player game, adding only a thin backend later if it unlocks clear value. [Source: `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Online Multiplayer and Backend Services`]

### Project Structure Notes

- `src/app/bootstrap/create-game-app.ts` is already the orchestration center for shell visibility, browser support, load telemetry, restart/replay behavior, and typed failures. It is the correct place for public-build recovery wiring and additive release metadata. [Source: `src/app/bootstrap/create-game-app.ts`]
- `vite.config.ts` is currently intentionally small. Keep 4.6 build changes targeted and explicit rather than turning the config into a deployment framework. [Source: `vite.config.ts`; `tests/unit/vite-config.spec.ts`]
- `src/world/generation/world-slice-generator.ts` and `src/vehicles/physics/vehicle-factory.ts` are the current root-relative runtime data fetch seams. Fix those centrally rather than patching request URLs in many call sites. [Source: `src/world/generation/world-slice-generator.ts`; `src/vehicles/physics/vehicle-factory.ts`]
- `index.html` and `src/main.ts` are the lean shell-entry surfaces. Public browser metadata, deploy-stale recovery, and fatal bootstrap behavior should stay small and intentional there. [Source: `index.html`; `src/main.ts`]
- Current real-browser validation already lives in `tests/smoke/app-bootstrap.pw.spec.ts` against the Vite preview server. Extend that harness first before inventing another release test runner. [Source: `tests/smoke/app-bootstrap.pw.spec.ts`; `playwright.config.ts`]
- The repo currently lacks `src/app/debug/`, `src/services/`, `public/assets/`, and deploy/provider config files. Create only the smallest architecture-aligned additions that Story 4.6 truly needs. [Source: repository file discovery; `_bmad-output/planning-artifacts/game-architecture.md#Directory Structure`]

### Project Context Rules

- Use Babylon.js `9.1.0`, Havok `1.3.12`, Vite `8.0.5`, TypeScript, and desktop browsers with WebGL2 support as the enforced baseline stack. [Source: `_bmad-output/project-context.md#Technology Stack & Versions`]
- Keep gameplay simulation on a `60 Hz` fixed step with interpolation; public-build work must not drive game truth from render delta. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Keep domain logic in its owning folder. `src/app/` owns bootstrap/config/logging/events, `src/rendering/` consumes state, `src/persistence/` owns browser storage, and `public/` holds runtime-loaded assets/data only. [Source: `_bmad-output/project-context.md#Code Organization Rules`]
- Prefer constructor injection inside a domain and typed events across domains instead of ad hoc global release state. [Source: `_bmad-output/project-context.md#Engine-Specific Rules`]
- Keep the primary platform focus on desktop web browsers with WebGL2 support; do not optimize first for native desktop, console, or mobile in this story. [Source: `_bmad-output/project-context.md#Platform & Build Rules`]
- Keep debug overlays and command tools gated to development and staging builds only. [Source: `_bmad-output/project-context.md#Platform & Build Rules`; `_bmad-output/planning-artifacts/game-architecture.md#Debug Tools`]
- Do not bypass the world-slice generation pipeline, mix static slice state with dynamic session state, or bypass persistence/service ownership rules for convenience while shipping the public build. [Source: `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- When in doubt, choose the more restrictive and less magical implementation path that preserves current contracts. [Source: `_bmad-output/project-context.md#Usage Guidelines`]

### References

- `_bmad-output/planning-artifacts/epics.md#Epic 4: Polish, Performance & Launch Readiness`
- `_bmad-output/planning-artifacts/gdd.md#Technical Specifications`
- `_bmad-output/planning-artifacts/gdd.md#Platform-Specific Details`
- `_bmad-output/planning-artifacts/gdd.md#Success Metrics`
- `_bmad-output/planning-artifacts/game-architecture.md#Technical Requirements`
- `_bmad-output/planning-artifacts/game-architecture.md#Debug Tools`
- `_bmad-output/planning-artifacts/game-architecture.md#System Location Mapping`
- `_bmad-output/planning-artifacts/game-architecture.md#Architectural Boundaries`
- `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Platform SDKs and Deployment Infrastructure`
- `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Game Deployment and Release Management`
- `_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md#Online Multiplayer and Backend Services`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/4-3-rely-on-the-build-loading-quickly-enough-that-browser-access-stays-low-friction.md`
- `_bmad-output/implementation-artifacts/4-4-experience-coherent-visual-and-audio-polish.md`
- `_bmad-output/implementation-artifacts/4-5-use-the-game-on-major-supported-browsers.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `package.json`
- `vite.config.ts`
- `index.html`
- `src/main.ts`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/config/platform.ts`
- `src/app/config/browser-support-telemetry.ts`
- `src/world/generation/world-slice-generator.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/world/generation/world-load-failure.ts`
- `playwright.config.ts`
- `tests/unit/vite-config.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `https://registry.npmjs.org/vite/latest`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/@playwright/test/latest`
- `https://vite.dev/guide/build#public-base-path`
- `https://vite.dev/guide/build#load-error-handling`
- `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control`
- `https://playwright.dev/docs/test-webserver`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `git log -n 5 --format='%H%x09%s'`
- `git log -n 5 --name-status --format='COMMIT %H%nTITLE %s'`
- `npm run check`
- `npm test`
- `npm run build`
- `npm run test:browser`
- `npm run build -- --base=/public-build/ && GT_PUBLIC_BASE=/public-build/ npx playwright test tests/smoke/app-bootstrap.pw.spec.ts --project=chromium`
- `https://registry.npmjs.org/vite/latest`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://registry.npmjs.org/@playwright/test/latest`
- `https://vite.dev/guide/build#public-base-path`
- `https://vite.dev/guide/build#load-error-handling`
- `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control`
- `https://playwright.dev/docs/test-webserver`

### Implementation Plan

- Make public/build path handling explicit through Vite `base` plus one tiny runtime-path helper so dynamic data fetches and public assets remain host-safe on root and nested deployments.
- Keep public-build recovery in the shell/bootstrap layer by handling deploy-stale chunk failures and surfacing additive release/build metadata through existing render-host/canvas telemetry seams.
- Preserve current browser-support, load, readiness, settings, and restart/replay contracts while adding a small static-host release contract for caching, preview/staging/public verification, and low-cost delivery.
- Prove the result with unit, smoke, and Playwright coverage focused on host-safe path resolution, release metadata, and deploy-safe recovery rather than timing heuristics or screenshots.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Loaded planning context from `epics.md`, `gdd.md`, `game-architecture.md`, `project-context.md`, the technical browser-stack research, and the prior Epic 4 story artifacts; no dedicated UX artifact was found.
- Story 4.6 is intentionally scoped to public browser-build packaging, host-safe delivery, release metadata, and release guardrails rather than new gameplay or mandatory services.
- Existing shell, browser-support, load, build, and telemetry seams are embedded above so the dev agent can extend the correct layers with minimal churn.
- Added `src/app/config/runtime-paths.ts` and replaced root-relative tuning/preset fetches with one `import.meta.env.BASE_URL` strategy so runtime data resolves on root and nested public paths.
- Added deterministic build metadata injection in `vite.config.ts`, surfaced release metadata through shell/render-host/canvas datasets and shell copy, and kept the telemetry additive.
- Routed stale public-build chunk failures through the existing `world-load-error` posture with a reload action instead of a blank page while preserving unsupported-browser, retry, edit, and readiness behavior.
- Added `scripts/preview-dist.mjs`, updated Playwright to validate both root and nested public bases, and expanded smoke/unit coverage for runtime paths, release metadata, and deploy-safe recovery.
- Added `docs/public-build-hosting.md` plus minimal static metadata in `index.html` to document the public `dist/` package, cache expectations, compression guidance, and base-path contract without choosing a hosting vendor.
- Validation passed with `npm run check`, `npm test`, `npm run build`, and `npm run test:browser`.

### File List

- `_bmad-output/implementation-artifacts/4-6-ship-a-public-quality-browser-build.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/public-build-hosting.md`
- `index.html`
- `package.json`
- `playwright.config.ts`
- `scripts/preview-dist.mjs`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/config/release-metadata.ts`
- `src/app/config/runtime-paths.ts`
- `src/node-globals.d.ts`
- `src/ui/shell/location-entry-screen.ts`
- `src/vehicles/physics/vehicle-factory.ts`
- `src/vite-env.d.ts`
- `src/world/generation/world-slice-generator.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/unit/runtime-paths.spec.ts`
- `tests/unit/vite-config.spec.ts`
- `vite.config.ts`

## Change Log

- 2026-04-12: Created the comprehensive story context for Story 4.6 and marked it ready for development.
- 2026-04-12: Implemented public-host-safe browser packaging, release metadata, stale-build recovery, and release validation for Story 4.6.
