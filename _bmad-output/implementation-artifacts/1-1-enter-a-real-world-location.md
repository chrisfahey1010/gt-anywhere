# Story 1.1: Enter a Real-World Location

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to enter a real-world location,
so that I can quickly start a session in a place I care about.

## Acceptance Criteria

1. Given I open a new session in the desktop-browser app, when the app boots, then I am shown a browser-native location entry shell with a free-text location field and a clear primary action to start.
2. Given I enter a valid real-world location query and submit it, when the query is accepted, then the app normalizes and stores the chosen location as the current session identity and hands off to the world-generation/loading flow.
3. Given I submit an empty, invalid, or unresolvable location query, when validation or resolution fails, then the app keeps me in the location-entry flow, shows a player-visible recoverable error, and does not start a session.
4. Given a location has been accepted, when the app transitions into the next loading stage, then the UI shows immediate loading feedback and displays the resolved place name that will be used for the session.
5. Given I have chosen a location for the current session, when later stories implement restart/reset, then the chosen location can be reused as the same-location session identity without requiring the player to re-enter it.
6. Given the location entry flow is the first product touchpoint, when it is used on supported desktop browsers, then it stays low-friction, keyboard-usable, and aligned with the browser-shell UX rather than the in-game HUD.

## Tasks / Subtasks

- [x] Scaffold the browser-first TypeScript app foundation required for the first story (AC: 1, 2, 6)
  - [x] Initialize the repo as a Vite `vanilla-ts` app at the project root and add the Babylon.js and Havok packages selected in architecture.
  - [x] Create the minimum architecture-aligned folders needed for this story: `src/app/bootstrap/`, `src/app/config/`, `src/app/events/`, `src/app/logging/`, `src/app/state/`, `src/ui/shell/`, `src/world/generation/`, `tests/unit/`, `tests/integration/`, `tests/smoke/`, and `tests/fixtures/`.
  - [x] Wire `index.html` and `src/main.ts` so the app boots into a browser-native shell flow instead of a Babylon HUD-first flow.
- [x] Implement the location-entry shell flow (AC: 1, 2, 4, 6)
  - [x] Build a free-text location entry form in `src/ui/shell/`; coordinates, map picking, and autocomplete are out of scope for this story.
  - [x] Keep the form keyboard-usable and low-friction with submit, edit, and retry states.
  - [x] Show immediate loading feedback after a valid submission and display the resolved place name used for the session.
- [x] Implement session-state orchestration and handoff contract (AC: 2, 4, 5)
  - [x] Model explicit top-level states for `boot`, `location-select`, `location-resolving`, `world-generation-requested`, and `error`.
  - [x] Normalize and store the chosen location as session identity in app state and expose a serializable handoff contract that later stories can reuse for loading and same-location restart.
  - [x] Emit typed events and structured logs for submit, resolve success, resolve failure, and generation handoff.
- [x] Implement validation and recoverable failure handling (AC: 2, 3, 4)
  - [x] Accept free-text inputs for real-world place names and address-like queries and reject empty submissions.
  - [x] Return typed recoverable failures for invalid or unresolvable queries and surface player-visible error messaging without losing the current form state.
  - [x] Keep world-generation logic behind the `src/world/generation/` boundary; do not construct chunks or call remote data APIs directly from UI code.
- [x] Add test coverage for the first-session location flow (AC: 1, 2, 3, 4, 5, 6)
  - [x] Unit-test validation helpers and state-machine transitions.
  - [x] Integration-test the submit-to-handoff success path and the invalid or unresolvable failure path.
  - [x] Add a smoke test proving the app boots to the location shell and a valid submission advances into the loading/requested state.

## Dev Notes

- This repo currently contains planning artifacts only; there is no app scaffold yet. Story 1 must create the minimum project foundation in the architecture-prescribed shape. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "First Steps" and "Directory Structure"; workspace root inspection]
- This story is the front door to Epic 1's vertical slice. It must cleanly hand off into the later load, spawn, drive, and same-location restart stories without absorbing their scope. [Source: `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Goal", "Epic 1: Deliverable", and "Epic 1: Stories"; `_bmad-output/planning-artifacts/gdd.md`, "Development Epics" and "Core Gameplay Loop"]
- No previous story intelligence is available because this is the first story in Epic 1. [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml`, `development_status`]
- No git intelligence is available because the current workspace is not a git repository.
- No dedicated UX artifact was found during discovery, so UX guidance for this story comes from the epics, GDD, architecture, and project-context artifacts.

### Technical Requirements

- Use TypeScript with Vite `8.0.5`, Babylon.js `9.1.0`, and `@babylonjs/havok` `1.3.12`. Node must be `^20.19.0` or `>=22.12.0`. [Source: `_bmad-output/project-context.md`, "Technology Stack & Versions"; `_bmad-output/planning-artifacts/game-architecture.md`, "Toolchain" and "Development Environment"]
- Keep startup, location selection, and loading-state UI in the HTML/CSS shell layer; do not implement this flow as Babylon GUI or HUD-first UI. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture" and "System Location Mapping"; `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- Preserve the world-slice generation boundary. Story 1 can scaffold a thin implementation, but the location flow must hand off through `src/world/generation/` instead of bypassing the architecture with ad hoc chunk creation. The expected pipeline concepts are `LocationResolver`, `GeoDataFetcher`, `SliceBoundaryPlanner`, `RoadNormalizer`, `PlayabilityPassPipeline`, `ChunkAssembler`, `SpawnPlanner`, and `SliceManifestStore`. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Real-place World Slice Generation" and "Consistency Rules"]
- Use typed recoverable results for validation and resolution failures, and log failures with enough context to debug location-query issues without crashing the shell flow. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Error Handling" and "Logging"]
- Treat the chosen location as session identity that later stories can reuse for load, spawn, and same-location restart. Capture the contract in app state now, but do not overbuild long-term browser persistence unless the implementation needs it. [Source: `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Stories"; `_bmad-output/planning-artifacts/gdd.md`, "Core Gameplay Loop" and "Win/Loss Conditions"]
- Implementation assumption for this story: use a free-text query as the minimum browser-first location input because the planning artifacts do not yet specify autocomplete, map picking, or coordinate entry. City, town, neighborhood, landmark, and address-like queries are acceptable; if implementation uncovers a better minimal input path, preserve the same acceptance criteria and document the deviation.

### Architecture Compliance

- `src/app/` owns bootstrap, state orchestration, config, logging, events, and debug wiring only; it does not own world-generation rules. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping" and "Architectural Boundaries"; `_bmad-output/project-context.md`, "Code Organization Rules"]
- `src/ui/shell/` owns the browser-native startup and location-entry flow. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture" and "System Location Mapping"]
- `src/world/generation/` owns location resolution and slice-generation responsibilities. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping" and "Real-place World Slice Generation"]
- Cross-domain communication must use typed events with `domain.action` naming. Inside a domain, prefer constructor injection instead of global access. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Event System", "Communication Patterns", and "Consistency Rules"; `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- Use an explicit state machine for session flow transitions; do not manage this flow with scattered booleans. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "State Management", "State Patterns", and "Consistency Rules"; `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"]
- Do not call browser storage or remote APIs directly from UI or gameplay domains. If storage is introduced, route it through `src/persistence/`; if network access is introduced later, route it through `src/services/`. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Architectural Boundaries"; `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"]
- Do not assume public map data is directly playable. This story may only scaffold the entry and handoff path, but any generation work still needs normalization and playability passes. [Source: `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Real-place World Slice Generation"]

### Library / Framework Requirements

- `vite@8.0.5` is the latest stable version found during workflow research and matches the architecture decision. Use its standard `index.html` entry model and keep the setup lean. [Source: `https://registry.npmjs.org/vite/latest`; `https://vite.dev/guide/`; `_bmad-output/planning-artifacts/game-architecture.md`, "Toolchain"]
- `@babylonjs/core@9.1.0` is the latest stable Babylon core version found during workflow research and matches the project architecture. [Source: `https://registry.npmjs.org/@babylonjs/core/latest`; `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`; `_bmad-output/planning-artifacts/game-architecture.md`, "Verified Technology Versions"]
- `@babylonjs/havok@1.3.12` is the latest stable Havok package found during workflow research and matches the architecture. [Source: `https://registry.npmjs.org/@babylonjs/havok/latest`; `_bmad-output/planning-artifacts/game-architecture.md`, "Verified Technology Versions"]
- Use Context7 for up-to-date Babylon.js and Vite documentation lookup during implementation. [Source: `_bmad-output/project-context.md`, "Technology Stack & Versions"; `_bmad-output/planning-artifacts/game-architecture.md`, "AI Tooling (MCP Servers)"]
- Do not introduce a separate UI framework or extra Vite plugin stack for this story unless the implementation reveals a concrete need. The architecture already specifies HTML/CSS shell UI and a browser-first Vite setup. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture" and "Toolchain"]

### File Structure Requirements

- Create the minimum root scaffold required by the architecture: `index.html`, `src/main.ts`, `package.json`, `tsconfig.json`, and `vite.config.ts`. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "Setup Commands", "First Steps", and "Directory Structure"]
- Create only the directories this story needs now: `src/app/bootstrap/`, `src/app/config/`, `src/app/events/`, `src/app/logging/`, `src/app/state/`, `src/ui/shell/`, `src/world/generation/`, `tests/unit/`, `tests/integration/`, `tests/smoke/`, and `tests/fixtures/`. Keep other domain folders deferred until the related stories need them. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "First Steps", "Directory Structure", and "System Location Mapping"]
- Keep runtime-loaded data under `public/` only. Do not place application logic there. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Architectural Boundaries"]
- Follow the naming standards exactly: `kebab-case` modules and directories, `PascalCase` classes and types, `camelCase` functions and variables, `UPPER_SNAKE_CASE` constants, and `domain.action` event names. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Naming Conventions"]
- A minimal first-story file plan is:
  - `src/main.ts`
  - `src/app/bootstrap/create-game-app.ts`
  - `src/app/state/session-state-machine.ts`
  - `src/app/events/game-events.ts`
  - `src/app/logging/logger.ts`
  - `src/ui/shell/location-entry-screen.ts`
  - `src/world/generation/location-resolver.ts`
  - `tests/unit/session-state-machine.spec.ts`
  - `tests/integration/location-entry.integration.spec.ts`
  - `tests/smoke/app-bootstrap.smoke.spec.ts`

### Testing Requirements

- Put tests under `tests/unit/`, `tests/integration/`, `tests/smoke/`, and `tests/fixtures/`. [Source: `_bmad-output/project-context.md`, "Testing Rules"]
- Unit tests should cover validation helpers, canonicalization or normalization helpers, repository or manager logic, and explicit state-machine transitions for `boot`, `location-select`, `location-resolving`, `world-generation-requested`, and `error`. [Source: `_bmad-output/project-context.md`, "Testing Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "State Management"]
- Integration tests should cover the browser-shell submit flow through app-state handoff into the world-generation boundary, including both success and recoverable failure paths. [Source: `_bmad-output/project-context.md`, "Testing Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "Real-place World Slice Generation" and "Error Handling"]
- Smoke tests should prove the app boots, renders the location shell, accepts a valid submission, and advances into the loading or requested state that later stories will complete. [Source: `_bmad-output/project-context.md`, "Testing Rules"; `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture"]
- Use deterministic seeds anywhere generation is exercised in tests. Prefer stable fixtures and helpers over hardcoded raw asset paths. [Source: `_bmad-output/project-context.md`, "Testing Rules"]
- Validate the shell flow manually on Chromium, Firefox, and Safari or WebKit if automated cross-browser coverage is not yet available, because browser compatibility is a core project requirement from the start. [Source: `_bmad-output/planning-artifacts/gdd.md`, "Platform-Specific Details" and "Success Metrics"; `_bmad-output/project-context.md`, "Platform & Build Rules"]
- Keyboard and mouse support are required for this story. Do not block later gamepad support in the shell flow; if full gamepad text-entry ergonomics are deferred, document that gap explicitly instead of silently omitting it. [Source: `_bmad-output/planning-artifacts/gdd.md`, "Target Platform(s)" and "Controls and Input"; `_bmad-output/project-context.md`, "Platform & Build Rules"]

### Latest Technical Information

- Workflow research confirmed that the architecture-selected versions are still current at story-creation time: `vite@8.0.5`, `@babylonjs/core@9.1.0`, and `@babylonjs/havok@1.3.12`. No upgrade work is needed for this story. [Source: `https://registry.npmjs.org/vite/latest`; `https://registry.npmjs.org/@babylonjs/core/latest`; `https://registry.npmjs.org/@babylonjs/havok/latest`]
- Vite `8.x` keeps `index.html` as the app entry point and requires Node `^20.19.0 || >=22.12.0`; align the initial scaffold with that model instead of inventing a custom bootstrap layout. [Source: `https://vite.dev/guide/`; `https://registry.npmjs.org/vite/latest`]
- Current Vite performance guidance recommends explicit imports, minimal plugin overhead, and avoiding unnecessary barrel files or heavyweight preprocessing in early app setup. Keep the first-story scaffold lean. [Source: `https://vite.dev/guide/performance`]
- Babylon.js `9.1.0` release notes show active engine changes, but nothing in the current research requires deviating from the selected Babylon package set for this story. Keep the browser shell separate from render-scene concerns. [Source: `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`; `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture"]

### Project Structure Notes

- The current workspace contains planning artifacts and docs but no existing `src/`, `public/`, or `tests/` tree. Story 1 must create the initial project structure instead of assuming a pre-existing app. [Source: `_bmad-output/planning-artifacts/game-architecture.md`, "First Steps" and "Directory Structure"; workspace root inspection]
- `sprint-status.yaml` still points `story_location` at `/home/chris/repos/gt-anywhere/_bmad-output/implementation-artifacts`, which does not match this workspace path. Treat that as stale metadata only; use `_bmad-output/implementation-artifacts/` in the current repo for story files. [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml`]
- No dedicated UX artifact exists for this project yet. Keep the UX simple, fast, browser-native, and recognition-first based on the epics and GDD. [Source: `_bmad-output/planning-artifacts/epics.md`, "Epic 1: Goal" and "Epic 1: Stories"; `_bmad-output/planning-artifacts/gdd.md`, "Executive Summary", "Unique Selling Points", and "Core Gameplay Loop"]

### Project Context Rules

- Engine and toolchain: Babylon.js `9.1.0`, Havok `1.3.12`, Vite `8.0.5`, TypeScript, Node `^20.19.0` or `>=22.12.0`, desktop browsers with WebGL2 support. [Source: `_bmad-output/project-context.md`, "Technology Stack & Versions"]
- Use HTML/CSS for startup, loading, and settings flows. Keep the in-game HUD separate. [Source: `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- Prefer constructor injection inside a domain and typed events across domains. [Source: `_bmad-output/project-context.md`, "Engine-Specific Rules"]
- Keep domain logic in its owning folders; `src/app/` orchestrates and `src/rendering/` only displays. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"]
- Runtime-loaded assets and data live under `public/`; application logic does not. [Source: `_bmad-output/project-context.md`, "Code Organization Rules"]
- Tests belong under the standard `tests/` folders and should favor deterministic seeds and stable fixtures. [Source: `_bmad-output/project-context.md`, "Testing Rules"]
- Do not bypass the world-slice generation pipeline, do not mix static slice state with dynamic session state, and do not fetch or parse runtime data directly from gameplay systems. [Source: `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"]
- Do not call storage or remote APIs directly from gameplay domains; use `persistence/` or `services/`. [Source: `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"]
- Treat world streaming, vehicle simulation, traffic, and pedestrians as hot paths later, and avoid per-frame allocations or preload-all assumptions now. This first story should not create architecture debt that conflicts with those performance rules. [Source: `_bmad-output/project-context.md`, "Performance Rules"]

### References

- `_bmad-output/planning-artifacts/epics.md`, "Epic 1: World Slice & Core Driving"
- `_bmad-output/planning-artifacts/gdd.md`, "Executive Summary"
- `_bmad-output/planning-artifacts/gdd.md`, "Unique Selling Points"
- `_bmad-output/planning-artifacts/gdd.md`, "Core Gameplay Loop"
- `_bmad-output/planning-artifacts/gdd.md`, "Win/Loss Conditions"
- `_bmad-output/planning-artifacts/gdd.md`, "Platform-Specific Details"
- `_bmad-output/planning-artifacts/gdd.md`, "Success Metrics"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Technical Requirements"
- `_bmad-output/planning-artifacts/game-architecture.md`, "UI Architecture"
- `_bmad-output/planning-artifacts/game-architecture.md`, "System Location Mapping"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Architectural Boundaries"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Real-place World Slice Generation"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Error Handling"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Logging"
- `_bmad-output/planning-artifacts/game-architecture.md`, "Naming Conventions"
- `_bmad-output/project-context.md`, "Technology Stack & Versions"
- `_bmad-output/project-context.md`, "Engine-Specific Rules"
- `_bmad-output/project-context.md`, "Code Organization Rules"
- `_bmad-output/project-context.md`, "Testing Rules"
- `_bmad-output/project-context.md`, "Platform & Build Rules"
- `_bmad-output/project-context.md`, "Critical Don't-Miss Rules"
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `https://registry.npmjs.org/vite/latest`
- `https://registry.npmjs.org/@babylonjs/core/latest`
- `https://registry.npmjs.org/@babylonjs/havok/latest`
- `https://vite.dev/guide/`
- `https://vite.dev/guide/performance`
- `https://github.com/BabylonJS/Babylon.js/releases/tag/9.1.0`

## Dev Agent Record

### Implementation Plan

- Establish a minimal Vite `8.0.5` TypeScript app scaffold at the repo root with only the Babylon core and Havok packages required by the story.
- Keep the first-touch experience in an HTML/CSS shell, with `src/app/` owning orchestration and `src/world/generation/` owning location resolution and handoff contracts.
- Add deterministic smoke, integration, and unit coverage incrementally while preserving the explicit session-state flow required by the architecture.

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- Smoke test initially failed as expected because `src/app/bootstrap/create-game-app.ts` did not exist yet.
- Vitest globals were enabled in `vite.config.ts` after the first post-implementation smoke run surfaced `describe is not defined`.
- Integration coverage exposed a loading-state bug where the primary action stayed enabled after a successful submission; the shell now disables it while requested-state feedback is visible.
- The orchestration tests required injecting a shared `GameEventBus` into `createGameApp()` so typed event emission could be observed and validated.
- Adding Playwright smoke coverage exposed an overly broad Vitest include glob; `vite.config.ts` now excludes `*.pw.spec.ts` from the Vitest run.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- No previous story intelligence was available because this is the first story in Epic 1.
- No git intelligence was available because the current workspace is not a git repository.
- No dedicated UX artifact was found; UX guidance was derived from the epics, GDD, architecture, and project-context documents.
- Scaffolded the Vite/TypeScript project root, added Babylon core plus Havok dependencies, and created the minimum story-specific source and test folders.
- Wired `index.html` and `src/main.ts` into a browser-native location shell bootstrap and verified the shell advances into the loading/requested state with a passing smoke test.
- Implemented the location-entry shell, explicit session state machine, typed event bus, structured logger, heuristic location resolver, and serializable world-generation handoff contract.
- Added unit, integration, and smoke coverage for validation, success handoff, edit/retry flow, and recoverable unresolved-location failures.
- `npm test`, `npm run check`, and `npm run build` all pass.
- Added Playwright-based browser smoke coverage and validated the shell flow on Chromium, Firefox, and WebKit.
- Code review fixes tightened the heuristic resolver so unsupported single-token queries fail recoverably, and added direct unit/integration coverage for the invalid-query path.

### File List

- `_bmad-output/implementation-artifacts/1-1-enter-a-real-world-location.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `index.html`
- `package-lock.json`
- `package.json`
- `playwright.config.ts`
- `dist/assets/index-qdTCPXZ9.js`
- `dist/assets/index-DKco7Poy.css`
- `dist/index.html`
- `src/app/bootstrap/create-game-app.ts`
- `src/app/config/session-config.ts`
- `src/app/events/game-events.ts`
- `src/app/logging/logger.ts`
- `src/app/state/session-state-machine.ts`
- `src/main.ts`
- `src/styles.css`
- `src/ui/shell/location-entry-screen.ts`
- `src/world/generation/location-resolver.ts`
- `tests/fixtures/location-queries.ts`
- `tests/integration/location-entry.integration.spec.ts`
- `tests/smoke/app-bootstrap.pw.spec.ts`
- `tests/smoke/app-bootstrap.smoke.spec.ts`
- `tests/unit/session-state-machine.spec.ts`
- `tsconfig.json`
- `vite.config.ts`

## Change Log

- 2026-04-07: Implemented the browser-native location-entry shell, session handoff scaffold, validation/error states, and automated unit/integration/smoke coverage for Story 1.1.
- 2026-04-07: Added Playwright cross-browser smoke validation for Chromium, Firefox, and WebKit and finalized Story 1.1 for review.
- 2026-04-07: Fixed code review findings by rejecting unsupported single-token queries with recoverable failures, expanding invalid-query coverage, and closing Story 1.1.

## Senior Developer Review (AI)

- Reviewer: OpenCode (`openai/gpt-5.4`)
- Date: 2026-04-07T00:52:14-07:00
- Outcome: Approve
- Fixed during review: unsupported single-token queries now return a typed recoverable `LOCATION_QUERY_UNRESOLVABLE` result instead of requesting world generation.
- Fixed during review: unit and integration coverage now exercise the invalid-but-non-empty failure path.
- Validation: `npm test`, `npm run check`, `npm run build`, and `npm run test:browser`
