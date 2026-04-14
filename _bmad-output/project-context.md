---
project_name: 'gt-anywhere'
user_name: 'Chris'
date: '2026-04-06T22:01:02-07:00'
sections_completed: ['technology_stack', 'engine_rules', 'performance_rules', 'organization_rules', 'testing_rules', 'platform_rules', 'anti_patterns']
status: 'complete'
rule_count: 41
optimized_for_llm: true
existing_patterns_found: 6
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing game code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Engine:** Babylon.js `9.1.0`
- **Physics:** `@babylonjs/havok` `1.3.12`
- **Toolchain:** Vite `8.0.5`
- **Scaffold:** `create-vite` `9.0.4`
- **Language:** TypeScript
- **Runtime requirement:** Node.js `^20.19.0` or `>=22.12.0`
- **Primary platform:** Desktop web browsers with WebGL2 support
- **AI tooling:** Context7 selected for current library and API documentation lookup

## Critical Implementation Rules

### Engine-Specific Rules

- Treat Babylon's scene graph as a rendering/composition layer, not the sole source of gameplay truth.
- Keep loaded world content under a world root with chunk subtrees; do not build one monolithic scene.
- Use Havok as the physics backend for runtime rigid bodies; do not introduce a second physics stack without an explicit architecture change.
- Keep gameplay simulation on a `60 Hz` fixed-step with interpolation; do not drive game state directly from render delta.
- Use HTML/CSS for shell flows like startup, loading, and settings, and keep the in-game HUD in its dedicated gameplay UI layer.
- Active gameplay mouse look should use captured input (pointer lock or equivalent) so camera rotation is not limited by screen bounds and the system cursor is not visible during normal play.
- Crosshair, cursor visibility, and combat input validity must follow possession state explicitly; vehicle mode and transition states are not valid combat-crosshair states.
- Prefer constructor injection inside a domain and typed events across domains instead of ad hoc global access.

### Performance Rules

- Design for a stable `60 FPS` target on representative desktop browsers.
- Treat world streaming, vehicle simulation, traffic, and pedestrians as hot-path systems.
- Use chunk streaming with predictive prefetch; do not preload the full world slice.
- Avoid per-frame allocations in hot loops wherever possible.
- Use pooling for high-churn entities such as traffic vehicles, pedestrians, and transient effects.
- Respect explicit chunk-residency and memory budgets; unloaded chunks should release runtime-heavy state.
- Favor client-heavy runtime work and avoid introducing avoidable synchronous network dependencies into the gameplay loop.

### Code Organization Rules

- Keep domain logic in its owning folder: `world/`, `vehicles/`, `traffic/`, `pedestrians/`, `sandbox/`, `ui/`, `audio/`, `persistence/`, `services/`.
- `src/app/` owns bootstrap, state orchestration, config, logging, events, and debug tooling; it does not own gameplay rules.
- `src/rendering/` consumes domain state to display the world; it does not define gameplay truth.
- `src/services/` is the only layer allowed to talk to optional remote systems.
- `src/persistence/` is the only layer allowed to read/write browser storage.
- Runtime-loaded assets and data live under `public/`; do not put application logic there.
- Replaceable art assets must bind through stable ids, transforms, and fallback proxies so externally authored models can replace defaults without changing gameplay code.
- Use `kebab-case` for TypeScript modules and directories, `PascalCase` for classes/types, `camelCase` for functions/variables, `UPPER_SNAKE_CASE` for constants, and `domain.action` for event names.

### Testing Rules

- Put tests under `tests/unit/`, `tests/integration/`, `tests/smoke/`, and `tests/fixtures/`.
- Unit tests should target pure logic, repositories, state machines, and deterministic pipeline stages.
- Integration tests should cover cross-system flows such as slice generation, chunk streaming, persistence, and reset behavior.
- Smoke tests should validate boot, load-to-drivable-world flow, and the core reset loop.
- Use deterministic seeds for world-generation and simulation tests where reproducibility matters.
- Prefer stable fixtures and test helpers over hardcoded raw asset paths in test files.

### Platform & Build Rules

- The primary target is desktop web browsers; do not optimize first for native desktop, console, or mobile.
- Treat WebGL2 compatibility as the baseline runtime expectation.
- Keep keyboard/mouse and gamepad support as first-class inputs from the start.
- Use the Vite toolchain for project setup and builds; do not introduce another bundler without an explicit architecture decision.
- Keep debug overlays and command tools gated to development and staging builds.
- Do not introduce gameplay networking in v1; optional backend work is limited to thin later services such as telemetry or cloud sync.

### Critical Don't-Miss Rules

- Do not bypass the world-slice generation pipeline to create world chunks manually.
- Do not mix static slice state with dynamic session state; resets must preserve the slice and replace only session-level runtime state.
- Do not introduce a second physics stack or alternate vehicle-simulation backend without an explicit architecture change.
- Do not bypass factories and pools for high-churn runtime entities such as traffic, pedestrians, or transient effects.
- Do not use ad hoc boolean flags as the primary state-transition mechanism for non-trivial entities or session flow.
- Do not fetch or parse runtime data directly from gameplay systems; use repositories or managers.
- Do not call storage or remote APIs directly from gameplay domains; go through `persistence/` or `services/`.
- Do not trade away road truth, scale, terrain, or district rhythm for arbitrary visual embellishment; recognition-first fidelity is part of the product.
- Do not let generic filler geometry or decorative density obscure recognizable roads, building footprints, or district structure.
- Do not bake asset-specific assumptions into gameplay systems when a stable asset-replacement contract can preserve flexibility.
- Do not assume public map data is directly playable; normalization and playability passes are mandatory.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any game code.
- Follow all rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update it when the technology stack changes.
- Review it periodically for outdated or obvious rules.
- Remove rules that no longer provide unique guidance.

Last Updated: 2026-04-06T22:01:02-07:00
