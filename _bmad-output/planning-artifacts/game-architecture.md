---
title: 'Game Architecture'
project: 'gt-anywhere'
date: '2026-04-06T20:36:30-07:00'
author: 'Chris'
version: '1.0'
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
status: 'complete'
engine: 'Babylon.js'
platform: 'Desktop web browsers'

# Source Documents
gdd: '/home/chris/repos/gt-anywhere/_bmad-output/planning-artifacts/gdd.md'
epics: '/home/chris/repos/gt-anywhere/_bmad-output/planning-artifacts/epics.md'
brief: '/home/chris/repos/gt-anywhere/_bmad-output/planning-artifacts/game-brief.md'
---

# Game Architecture

## Executive Summary

**GT Anywhere** architecture is designed for **Babylon.js** targeting **desktop web browsers**.

**Key Architectural Decisions:**

- Use Babylon.js `9.1.0` with Havok `1.3.12` and a `60 Hz` fixed-step simulation for browser-first driving and rigid-body gameplay.
- Organize the project with a hybrid structure, chunk-based world streaming, and a world-root-plus-chunk-subtrees scene model.
- Enforce AI-agent consistency through typed events, factory-plus-pooling entity creation, explicit state machines, and repository-based data access.

**Project Structure:** Hybrid organization with 10 core systems mapped to explicit locations.

**Implementation Patterns:** 6 patterns defined ensuring AI agent consistency.

**Ready for:** Epic implementation phase

## Document Status

This architecture document is being created through the GDS Architecture Workflow.

**Steps Completed:** 9 of 9 (Initialize, Project Context, Engine & Framework, Architectural Decisions, Cross-cutting Concerns, Project Structure, Implementation Patterns, Validation, Completion)

---

## Project Context

### Game Overview

**GT Anywhere** - A browser-first, third-person, driving-focused open-world sandbox where players choose a real-world location and enter a bounded, recognizable generated slice built for exploration, vehicle play, and emergent chaos.

### Technical Scope

**Platform:** Desktop web browsers  
**Genre:** Browser-first open-world driving sandbox  
**Project Level:** High technical complexity with disciplined v1 scope

### Core Systems

| System | Complexity | GDD Reference |
| --- | --- | --- |
| Real-world location input and slice generation | High | `Level Design Framework`, `Technical Specifications`, `Assumptions and Dependencies` |
| World streaming and chunk residency | High | `Level Design Framework`, `Technical Constraints`, technical research |
| Vehicle handling, camera, and crash feedback | High | `Primary Mechanics`, `Camera and Perspective`, `Sandbox Specific Design` |
| Traffic simulation and road behavior | High | `Development Epics` 3, `Risk Factors`, `Technical Challenges` |
| Pedestrians and ambient city life | Medium | `Development Epics` 3, `Content Framework`, brainstorming themes |
| Vehicle interaction, hijacking, and on-foot transfer | Medium | `Primary Mechanics`, `Development Epics` 2 |
| Collision, vehicle damage, and selective destruction | Medium | `Sandbox Specific Design`, `Development Epics` 3 |
| Chaos escalation, health/ammo, flee, and recovery | Medium | `Economy and Resources`, `Primary Mechanics`, `Development Epics` 3 |
| Session restart, persistence, and same-location replay | Medium | `Core Gameplay Loop`, `Failure Recovery` |
| Settings, scalability, telemetry, and browser compatibility | High | `Performance Requirements`, `Success Metrics`, `Development Epics` 4 |

### Technical Requirements

- Desktop-browser-first delivery with support across Chromium, Firefox, and Safari/WebKit
- Stable 60 FPS target on representative desktop hardware
- 720p baseline with scalability up to 1080p and down to 480p
- Drivable generated world in under 60 seconds
- Keyboard/mouse baseline plus strong gamepad support
- Single-player-only v1 with no real-time multiplayer architecture
- Low recurring server cost through client-heavy runtime processing
- Stylized, lightweight 3D assets and fixed-time-of-day readability
- Scalable density, graphics, and world-size settings to fit varied hardware
- Engine/framework choice must favor browser-first runtime constraints

### Complexity Drivers

- Real-world map ingestion and cleanup must preserve road truth while producing fun, drivable spaces
- World streaming, memory residency, and asset delivery must stay browser-safe and fast
- Vehicle handling, camera stability, and collision feedback are make-or-break first-session systems
- Traffic and pedestrian simulation must feel alive without breaking solo scope or frame budgets
- Recognition depends on correct scale, terrain, density, and route logic rather than on expensive art fidelity

### Technical Risks

- Open map data may be inconsistent or hard to convert into compelling driving spaces
- Browser compatibility and performance variance may increase QA and optimization costs
- Scope creep in world size or simulation depth could overwhelm the project
- Asset cleanup and consistency may still require significant manual work despite AI assistance
- Premature engine lock-in could create expensive rework if browser constraints are discovered late

## Engine & Framework

### Selected Engine

**Babylon.js** v9.1.0

**Rationale:** Babylon.js best matches GT Anywhere's browser-first requirements while keeping strong TypeScript ergonomics and direct architectural control over rendering, streaming, simulation, and asset loading. It provides a modern web-native 3D foundation without forcing the project into a native-first export model.

### Engine-Provided Architecture

| Component | Solution | Notes |
| --------- | -------- | ----- |
| Rendering | Browser-native scene renderer with WebGL baseline and WebGPU support | Strong fit for desktop-browser delivery; quality tiers remain a project decision |
| Physics | Plugin-based physics integration layer | Babylon.js provides the hook points, but the actual backend for driving physics still needs to be chosen |
| Audio | Built-in audio engine with web-native playback and spatial support | Good base for vehicle, crash, and ambient city audio |
| Input | Browser input abstraction for keyboard, mouse, touch, and gamepad | Aligns well with desktop-browser and gamepad requirements |
| Scene Management | Scene graph, cameras, lights, materials, asset loaders, and utilities | Good foundation for streamed world composition |
| Build System | External JavaScript toolchain | Because the project is starting from scratch, the exact scaffold and bundler remain an explicit setup choice |

### Decision Follow-through

Babylon.js provides the engine-level foundations above. Project-specific choices that the engine does not decide are resolved in the **Architectural Decisions** section below.

## Architectural Decisions

### Decision Summary

| Category | Decision | Version | Rationale |
| -------- | -------- | ------- | --------- |
| Vehicle Simulation | Havok rigid-body foundation + explicit arcade handling layer | N/A | Keep Havok as the single physics backend, but add a data-driven handling layer for suspension, tire grip/slip, weight transfer, and vehicle tuning so driving quality is no longer limited to basic rigid-body motion |
| Physics Backend | Havok | 1.3.12 | Official Babylon-compatible rigid-body backend with the cleanest browser-first integration path |
| Simulation Timing | 60 Hz fixed-step with interpolation | N/A | Stable driving feel without the CPU cost of a higher browser tick rate |
| State Management | Hybrid state machine + data-oriented subsystems | N/A | Clear session flow plus scalable simulation for chunks, traffic, and pedestrians |
| Data Persistence | Local-first versioned browser storage with future cloud hook | N/A | Fits single-player, low-cost, browser-first constraints while leaving room for sync later |
| Asset Management | Chunk streaming with predictive prefetch + replaceable asset registry/import contract | N/A | Preserve browser-safe streaming while allowing default proxy meshes to be replaced by externally authored vehicles, buildings, and props through stable anchors, scale/orientation rules, and metadata contracts |
| Scene Structure | World root with chunk subtrees | N/A | Keeps chunk ownership and streaming boundaries explicit inside Babylon.js |
| AI Systems | Simple state machines + rule-based traffic | N/A | Delivers believable city life without overbuilding v1 AI complexity |
| UI Framework | Hybrid HTML/CSS shell + in-game HUD layer with captured-input state model | N/A | Keep browser-native shell flows, but make pointer-lock/cursor state, possession-aware HUD visibility, crosshair gating, and release-to-shell behavior first-class architecture concerns |
| Audio Architecture | Babylon built-in audio | N/A | Keeps the SFX-heavy v1 audio stack lean and engine-integrated |
| Backend / Services | Thin optional backend later | N/A | Avoids premature infrastructure while preserving telemetry/cloud-save expansion room |
| Toolchain | Vite | 8.0.5 | Best fit for a modern browser-first Babylon.js project starting from scratch |

### State Management

**Approach:** Hybrid state machine + data-oriented subsystems

Use a state machine for top-level game flow such as boot, location selection, world generation, in-run play, failure/reset, and return-to-start. Keep hot-path simulation for chunk residency, traffic, pedestrians, and other high-entity systems in data-oriented subsystems so update cost stays predictable.

### Data Persistence

**Save System:** Local-first versioned browser storage with future cloud hook

Persist settings, session metadata, and save-state records locally first. Use a versioned schema so the save format can evolve safely over time, and leave a clean boundary for future cloud sync without making backend infrastructure mandatory in v1.

### Asset Management

**Loading Strategy:** Chunk streaming with predictive prefetch

Stream world content by chunk and prefetch based on player position and expected driving direction. Use explicit residency budgets and unload rules so the browser runtime keeps memory and hitching under control.

Add a stable asset replacement contract so proxy/default meshes can be swapped with externally authored content without rewriting gameplay systems. Vehicle, building, road-prop, and landmark presentation should bind through explicit asset ids, attachment points, scale/orientation conventions, and fallback proxies.

### Physics and Simulation

**Vehicle Model:** Havok rigid-body foundation + explicit arcade handling layer  
**Physics Backend:** Havok `1.3.12`  
**Timing Model:** `60 Hz` fixed-step with interpolation

Use Babylon's rigid-body integration with Havok as the physics foundation. Layer a data-driven arcade handling model on top of that foundation so suspension, tire grip/slip, weight transfer, and per-vehicle tuning can improve without replacing the physics backend. Run gameplay and physics on a fixed 60 Hz simulation step, then interpolate for rendering so handling remains stable across frame-rate variation.

### Scene Structure

**Approach:** World root with chunk subtrees

Keep one active world root and attach/detach chunk subtrees beneath it as streaming changes residency. Treat the scene graph as the composition layer for loaded content while maintaining clear chunk lifecycle ownership in the streaming systems.

### AI Systems

**Approach:** Simple state machines + rule-based traffic

Use lightweight state machines for pedestrians and traffic agents, with rule-based lane following, intersection behavior, spacing, and obstruction handling. Budget AI work by residency and distance so simulation remains believable without becoming a browser-performance liability.

### UI Architecture

**Approach:** Hybrid HTML/CSS shell + in-game HUD layer

Use HTML/CSS for browser-native flows such as startup, settings, loading, and other menu-heavy screens. Keep the in-game HUD as a dedicated gameplay UI layer so it can stay tightly aligned with the running simulation and camera context.

The UI architecture must also own an explicit captured-input model for active play: pointer-lock or equivalent mouse capture, hidden system cursor during normal play, possession-aware crosshair visibility, and a clear path back to shell/browser control.

### Audio Architecture

**Approach:** Babylon built-in audio

Use Babylon's built-in audio stack for vehicle audio, impacts, ambience, and UI sounds. Keep the v1 mix simple and structured around categories like vehicle, crash, world ambience, and interface audio, with no separate music system required.

### Optional Services

**Approach:** Thin optional backend later

Do not build gameplay networking into v1. Leave a thin service boundary for later telemetry, cloud saves, or account-linked features if the project proves the need, but keep the initial architecture local-first and client-heavy.

### Toolchain

**Approach:** Vite `8.0.5` + TypeScript + Babylon.js `9.1.0`

Initialize the project from scratch with Vite as the frontend toolchain. This keeps the build pipeline lightweight, fast to iterate on, and well aligned with a browser-first Babylon.js codebase.

### Verified Technology Versions

- Babylon.js `9.1.0` verified `2026-04-06`
- `@babylonjs/havok` `1.3.12` verified `2026-04-06`
- Vite `8.0.5` verified `2026-04-06`

### Architecture Decision Records

- Vehicle simulation will prioritize engine-integrated rigid-body foundations over a larger custom handling stack.
- Streaming is the core world-loading model, not a late optimization.
- The scene graph will follow chunk boundaries instead of becoming one monolithic world object.
- Traffic and pedestrian AI will favor low-cost believability over deep planning systems.
- UI will be split between browser-native shell surfaces and a dedicated in-game HUD layer.
- Services remain optional and non-authoritative for v1.

## Cross-cutting Concerns

These patterns apply to ALL systems and must be followed by every implementation.

### Error Handling

**Strategy:** Global handler + result objects

**Error Levels:**
- **Fatal:** Unrecoverable boot, config, or data-integrity failures. Stop the affected flow and surface a clear user-facing failure state.
- **Recoverable:** Runtime issues like chunk-load failure, missing optional asset, or transient service failure. Return a typed failure result, log it, and continue with fallback or retry logic.
- **Player-visible:** Only show an in-game error state when player action or session continuity is affected.

**Example:**

```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string; recoverable: boolean };

function reportError(error: unknown, context: Record<string, unknown>): void {
  logger.error("system.error", { error, ...context });
}

async function loadChunk(chunkId: string): Promise<Result<ChunkData>> {
  try {
    const chunk = await chunkRepository.load(chunkId);
    return { ok: true, value: chunk };
  } catch (error) {
    reportError(error, { system: "streaming", chunkId });
    return {
      ok: false,
      code: "CHUNK_LOAD_FAILED",
      message: `Failed to load chunk ${chunkId}`,
      recoverable: true
    };
  }
}
```

### Logging

**Format:** Structured logs with stable event names and typed metadata  
**Destination:** Browser console in development, buffered/sampled external sink later if telemetry is added

**Log Levels:**
- **ERROR:** Unrecoverable failure, broken contract, or player-affecting issue
- **WARN:** Recoverable fallback, retry, degraded subsystem behavior
- **INFO:** Session milestones, world generation completion, chunk lifecycle milestones, save/load success
- **DEBUG:** Chunk residency, AI counts, physics state, tool activation in dev builds
- **TRACE:** Very high-volume subsystem traces, disabled by default and scoped to local debugging only

**Example:**

```ts
logger.info("world.chunk.loaded", {
  chunkId,
  loadMs,
  residentChunkCount,
  playerSpeed
});

logger.warn("ai.traffic.route_fallback", {
  vehicleId,
  laneId,
  reason: "blocked_intersection"
});
```

### Configuration

**Approach:** Layered configuration

**Configuration Structure:**
- **Constants:** compile-time or code-owned rules that should not change at runtime
- **Tuning data:** gameplay and balancing values stored in explicit config modules or data files
- **Player settings:** persisted separately in browser storage
- **Platform/runtime settings:** capability-based overrides for browser tier, density, and graphics
- **Remote overrides:** optional and additive later, never the only source of truth in v1

Suggested structure:
- `src/app/config/constants.ts`
- `src/app/config/platform.ts`
- `src/app/config/settings-schema.ts`
- `public/data/tuning/*.json`

### Event System

**Pattern:** Typed event bus

**Event Naming:** `domain.action` with typed payloads, for example `world.chunk.loaded`, `vehicle.crashed`, `session.reset`

**Example:**

```ts
type GameEvent =
  | { type: "world.chunk.loaded"; chunkId: string }
  | { type: "vehicle.crashed"; vehicleId: string; severity: number }
  | { type: "session.reset" };

eventBus.emit({ type: "world.chunk.loaded", chunkId });

eventBus.on("vehicle.crashed", (event) => {
  audioSystem.playCrash(event.severity);
  hudSystem.flashDamage();
});
```

### Debug Tools

**Available Tools:**
- Runtime debug overlay with FPS, frame time, chunk residency, active AI counts, and streaming queue depth
- Command palette / debug console for reset, teleport, spawn vehicle, reload chunk, and density toggles
- State inspection hooks for session flow, player vehicle, and active chunk metadata
- Profiling markers and performance hooks for generation, streaming, AI, and physics
- Safe testing commands in non-release builds only

**Activation:** Enabled only in development and staging builds. Suggested defaults: `F1` toggles overlay, `` ` `` opens command console.

## Development Environment

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- npm-compatible package manager
- Modern desktop browser with WebGL2 support for local testing
- Optional Context7 API key for higher rate limits

### AI Tooling (MCP Servers)

The following MCP server was selected during architecture to enhance AI-assisted development:

| MCP Server | Purpose | Install Type |
| ---------- | ------- | ------------ |
| Context7 | Up-to-date library and API documentation lookup for Babylon.js, Vite, and related web tooling | `npx` setup or MCP URL |

**Setup:**
- `npx ctx7 setup`
- Or configure the MCP URL `https://mcp.context7.com/mcp`
- Repo: `https://github.com/upstash/context7`

No Babylon.js-specific MCP server was verified during this workflow, so Context7 is the default documentation tool for AI-assisted development.

### Setup Commands

```bash
npm create vite@9.0.4 gt-anywhere -- --template vanilla-ts
cd gt-anywhere
npm install
npm install @babylonjs/core@9.1.0 @babylonjs/gui@9.1.0 @babylonjs/havok@1.3.12 @babylonjs/inspector@9.1.0 @babylonjs/loaders@9.1.0 @babylonjs/materials@9.1.0
```

### First Steps

1. Create the Vite project and install the Babylon.js/Havok packages
2. Lay down the `src/app`, `src/world`, `src/vehicles`, `src/traffic`, `src/pedestrians`, and `src/ui` structure from the architecture
3. Configure Context7 using the AI Tooling instructions above
4. Implement bootstrap, engine initialization, and the first world-slice loading scaffold

## Project Structure

### Organization Pattern

**Pattern:** Hybrid

**Rationale:** GT Anywhere needs clear top-level technical buckets for a browser-first TypeScript project, but it also needs domain ownership inside `src/` so world generation, vehicles, traffic, pedestrians, UI, and sandbox logic stay easy to locate and evolve.

### Directory Structure

```text
gt-anywhere/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   └── tuning/
├── public/
│   ├── assets/
│   │   ├── audio/
│   │   │   ├── ambience/
│   │   │   ├── sfx/
│   │   │   ├── ui/
│   │   │   └── vehicles/
│   │   ├── fonts/
│   │   ├── models/
│   │   │   ├── props/
│   │   │   ├── vehicles/
│   │   │   └── world/
│   │   ├── shaders/
│   │   ├── textures/
│   │   │   ├── decals/
│   │   │   ├── terrain/
│   │   │   ├── ui/
│   │   │   ├── vehicles/
│   │   │   └── world/
│   │   └── ui/
│   └── data/
│       ├── locales/
│       ├── tuning/
│       └── world-gen/
├── scripts/
│   ├── build/
│   ├── data/
│   └── validation/
├── src/
│   ├── app/
│   │   ├── bootstrap/
│   │   ├── config/
│   │   ├── debug/
│   │   ├── events/
│   │   ├── logging/
│   │   └── state/
│   ├── audio/
│   │   ├── buses/
│   │   ├── events/
│   │   └── zones/
│   ├── core/
│   │   ├── math/
│   │   ├── memory/
│   │   ├── platform/
│   │   └── time/
│   ├── data/
│   │   ├── events/
│   │   └── models/
│   ├── pedestrians/
│   │   ├── agents/
│   │   ├── spawning/
│   │   └── states/
│   ├── persistence/
│   │   ├── migrations/
│   │   ├── saves/
│   │   └── settings/
│   ├── rendering/
│   │   ├── lighting/
│   │   ├── lod/
│   │   ├── materials/
│   │   └── scene/
│   ├── sandbox/
│   │   ├── chaos/
│   │   ├── combat/
│   │   ├── heat/
│   │   └── reset/
│   ├── services/
│   │   ├── cloud-sync/
│   │   ├── remote-config/
│   │   └── telemetry/
│   ├── traffic/
│   │   ├── agents/
│   │   ├── routing/
│   │   ├── rules/
│   │   └── spawning/
│   ├── ui/
│   │   ├── hud/
│   │   ├── overlays/
│   │   ├── settings/
│   │   └── shell/
│   ├── vehicles/
│   │   ├── audio/
│   │   ├── cameras/
│   │   ├── controllers/
│   │   ├── damage/
│   │   └── physics/
│   ├── world/
│   │   ├── chunks/
│   │   ├── generation/
│   │   ├── landmarks/
│   │   ├── navigation/
│   │   └── streaming/
│   └── main.ts
├── tests/
│   ├── fixtures/
│   ├── integration/
│   ├── smoke/
│   └── unit/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### System Location Mapping

| System | Location | Responsibility |
| ------ | -------- | -------------- |
| App bootstrap and runtime wiring | `src/app/bootstrap/` | Create the game app, attach Babylon engine, start systems |
| Session flow and top-level game state | `src/app/state/` | Boot, location select, load, in-run, fail/reset flow |
| Configuration and feature flags | `src/app/config/` | Constants, runtime config access, capability gating |
| Logging and diagnostics | `src/app/logging/` | Structured log formatting and sinks |
| Global event contracts | `src/app/events/` and `src/data/events/` | Typed cross-system event definitions and dispatch |
| Debug tools | `src/app/debug/` | Overlay, command console, debug toggles |
| World generation | `src/world/generation/` | Transform input geography into playable chunk data |
| World streaming and residency | `src/world/streaming/` | Prefetch, load, unload, and budget chunk residency |
| Chunk models and metadata | `src/world/chunks/` | Chunk schemas, handles, residency state |
| Navigation and road graph logic | `src/world/navigation/` | Pathing graph, route queries, road connectivity |
| Landmark and recognition data | `src/world/landmarks/` | Place-identity markers and lookup data |
| Vehicle physics | `src/vehicles/physics/` | Havok integration, rigid-body setup, tuning hooks |
| Vehicle controllers | `src/vehicles/controllers/` | Player and AI driving control logic |
| Vehicle cameras | `src/vehicles/cameras/` | Chase camera behavior and transitions |
| Vehicle damage | `src/vehicles/damage/` | Collision response and vehicle degradation state |
| Vehicle audio | `src/vehicles/audio/` | Engine, skid, crash, and vehicle-specific sound triggers |
| Traffic simulation | `src/traffic/` | Lane rules, routing, spawning, and agent lifecycle |
| Pedestrian simulation | `src/pedestrians/` | Pedestrian states, spawning, and reactive behavior |
| Sandbox escalation systems | `src/sandbox/` | Chaos, combat, heat, and reset loops |
| Rendering composition | `src/rendering/scene/` | Scene graph ownership and loaded visual composition |
| Materials, lighting, and LOD | `src/rendering/` | Visual rules, quality tiers, and render-facing content policy |
| UI shell | `src/ui/shell/` | Browser-native startup, loading, and menu flows |
| HUD and overlays | `src/ui/hud/` and `src/ui/overlays/` | In-game status, alerts, and debug-facing overlays |
| Settings UI | `src/ui/settings/` | Player graphics, controls, and gameplay preference panels |
| Audio bus/orchestration | `src/audio/` | Category routing, mix policy, and ambient zones |
| Save/settings persistence | `src/persistence/` | Serialization, migrations, and browser-storage access |
| Optional external services | `src/services/` | Telemetry, future cloud sync, remote config boundaries |
| Runtime-loaded tuning and world data | `public/data/` | Browser-loaded JSON/data assets, not source logic |
| Tests | `tests/` | Unit, integration, smoke, and fixture coverage |

### Naming Conventions

#### Files
- TypeScript source modules use `kebab-case.ts`
- Test files use `*.spec.ts`, `*.integration.spec.ts`, and `*.smoke.spec.ts`
- Data files use `kebab-case.json`
- Runtime-loaded assets use `kebab-case` with domain-first prefixes where useful

#### Code Elements
| Element | Convention | Example |
| ------- | ---------- | ------- |
| Classes | `PascalCase` | `ChunkStreamer` |
| Interfaces / Types | `PascalCase` | `ChunkLoadResult` |
| Functions | `camelCase` | `loadChunk` |
| Variables | `camelCase` | `residentChunkCount` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_ACTIVE_CHUNKS` |
| Event names | `domain.action` | `world.chunk.loaded` |

#### Game Assets
- Models: `vehicle-compact-default.glb`, `world-road-sign-stop.glb`
- Textures: `world-road-asphalt.ktx2`, `vehicle-body-sedan-red.ktx2`
- Audio: `vehicle-engine-compact-idle-01.wav`, `sfx-crash-heavy-01.wav`
- Tuning data: `traffic-density-default.json`, `vehicle-handling-sedan.json`
- Shader files: `road-surface.glsl`, `distance-fog.glsl`

### Architectural Boundaries

- `src/app/` orchestrates startup, session state, logging, config, events, and debug tools. It does not own gameplay rules.
- Domain folders such as `src/world/`, `src/vehicles/`, `src/traffic/`, `src/pedestrians/`, and `src/sandbox/` own their respective gameplay behavior and state.
- Cross-domain communication happens through typed events, service interfaces, or explicit shared contracts, not through arbitrary sibling-folder imports.
- `src/rendering/` consumes domain state to display the world, but does not define gameplay truth.
- `src/services/` is the only place that talks to optional remote systems. Gameplay systems must not call network APIs directly.
- `src/persistence/` owns serialization, schema evolution, and browser-storage access. Other systems hand it structured state instead of writing storage directly.
- `public/` contains runtime-loaded assets and data only. It must not become a source of application logic.
- `tests/` mirrors behavior coverage, not production folder names exactly; fixtures and integration cases should reference public data through stable test helpers.

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents.

### Novel Patterns

#### Real-place World Slice Generation

**Purpose:** Convert public geographic input into a bounded, drivable, recognizable world slice that can be streamed consistently at runtime.

**Components:**
- `LocationResolver`
- `GeoDataFetcher`
- `SliceBoundaryPlanner`
- `RoadNormalizer`
- `PlayabilityPassPipeline`
- `ChunkAssembler`
- `SpawnPlanner`
- `SliceManifestStore`

**Data Flow:**
1. Resolve a player location into a canonical query target
2. Fetch raw source data for the candidate area
3. Choose a bounded playable slice
4. Normalize roads, widths, intersections, and core geography
5. Extract building footprints, block massing, land-use cues, and landmark candidates where source data exists
6. Run playability and recognition correction passes so the slice stays drivable while preserving place identity
7. Assemble chunk-ready data, road-surface profiles, asset anchors, and a static slice manifest
8. Hand off the manifest to streaming/runtime systems

**Implementation Guide:**

```ts
const result = await worldSliceGenerator.generate({
  locationQuery: "San Francisco, CA",
  radiusMeters: 1800,
  sliceSeed
});

if (result.ok) {
  sessionStore.attachSlice(result.value.manifest);
  eventBus.emit({
    type: "world.slice.ready",
    sliceId: result.value.manifest.sliceId
  });
}
```

**Usage:**
Use this pattern whenever a new location is selected or a slice must be rebuilt for a new generation version.

#### Stable City / Living Session

**Purpose:** Keep geography stable for recognition while allowing session-level traffic, pedestrians, and sandbox chaos to vary from run to run.

**Components:**
- `StaticWorldStore`
- `SessionSeedManager`
- `DynamicPopulationSpawner`
- `SessionRuntimeState`
- `ResetController`

**Data Flow:**
1. Load the static world slice by `sliceId`
2. Create a new session using a fresh `sessionSeed`
3. Spawn traffic and pedestrian populations from the session seed and player settings
4. Track only mutable run state in the session layer
5. On reset, discard dynamic state and start a new session on the same static slice

**Implementation Guide:**

```ts
const slice = await staticWorldStore.load(sliceId);

const session = livingSessionFactory.start({
  sliceId,
  sessionSeed: sessionSeedManager.next(),
  trafficDensity: settings.trafficDensity
});

resetController.resetRun({
  preserveSlice: true,
  nextSessionSeed: sessionSeedManager.next()
});
```

**Usage:**
Use this pattern for reset, respawn, and replay loops where the player should stay in the same recognizable place but get a fresh living run.

### Communication Patterns

**Pattern:** Dependency injection inside domains, event-based communication across domains

**Example:**

```ts
class TrafficSpawner {
  constructor(
    private readonly routeService: RouteService,
    private readonly eventBus: EventBus<GameEvent>
  ) {}

  spawn(chunkId: string): void {
    const route = this.routeService.pickSpawnRoute(chunkId);

    this.eventBus.emit({
      type: "traffic.vehicle.spawned",
      chunkId,
      routeId: route.id
    });
  }
}
```

### Entity Patterns

**Creation:** Factory pattern with object pooling for high-churn entities

**Example:**

```ts
const vehicle = vehicleFactory.acquire("traffic-sedan", {
  chunkId,
  laneId,
  initialSpeed: 12
});

trafficRegistry.add(vehicle);
```

### State Patterns

**Pattern:** Explicit state machines

**Example:**

```ts
if (pedestrianStateMachine.canTransition(pedestrian, "panic")) {
  pedestrianStateMachine.transition(pedestrian, "panic");
}

if (sessionStateMachine.canTransition("in-run", "resetting")) {
  sessionStateMachine.transition("in-run", "resetting");
}
```

### Data Patterns

**Access:** Data manager / repository layer

**Example:**

```ts
const handling = tuningRepository.getVehicleHandling("sedan");
const sliceManifest = worldDataRepository.getSliceManifest(sliceId);
const playerSettings = settingsRepository.load();
```

### Consistency Rules

| Pattern | Convention | Enforcement |
| ------- | ---------- | ----------- |
| Communication | Inject owned collaborators through constructors; use typed events for cross-domain notifications | No cross-domain singleton grabs or ad hoc sibling imports |
| Entity creation | High-churn runtime entities are created through factories and acquired from pools | No direct `new` for pooled traffic, pedestrian, or transient gameplay entities |
| State transitions | All non-trivial entity/session states transition through explicit state machine APIs | No free-form flag mutation as the primary transition mechanism |
| Data access | Gameplay code reads structured data through repositories or managers | No direct fetch/file parsing from gameplay systems |
| World slice generation | Static world content must pass through the slice-generation pipeline and emit a manifest | No subsystem may invent its own world-assembly path |
| Stable city / living session | Static slice data is immutable for a run; resets replace dynamic session state only | Reset logic must route through `ResetController` and `SessionSeedManager` |

## Architecture Validation

### Validation Summary

| Check | Result | Notes |
| ------ | ------ | ----- |
| Decision Compatibility | PASS | Babylon.js, Havok, Vite, cross-cutting rules, and implementation patterns are internally consistent |
| GDD Coverage | PASS | All identified core systems and technical requirements have architectural support |
| Pattern Completeness | PASS | Entity creation, communication, state handling, data access, error handling, and novel patterns are all covered |
| Epic Mapping | PASS | All four epics map cleanly to structure, decisions, and implementation patterns |
| Document Completeness | PASS | Required sections are present, placeholder text is removed, and Context7 tooling is documented |

### Coverage Report

**Systems Covered:** 10/10  
**Patterns Defined:** 6  
**Decisions Made:** 12

### Issues Resolved

- Removed the stale placeholder line from the document status section
- Replaced the stale “remaining decisions” block in the engine section with a resolved handoff note
- Aligned configuration paths with the final project structure
- Added a Development Environment section documenting the accepted Context7 setup

### Validation Date

2026-04-06T22:01:02-07:00
