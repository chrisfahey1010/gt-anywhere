# Sprint Change Proposal

Project: `gt-anywhere`
Workflow: `correct-course`
Date: `2026-04-12T20:50:42-07:00`
Mode: `Incremental`

## 1. Issue Summary

GT Anywhere reached the end of its initial four-epic BMAD implementation, but the resulting v1 build does not satisfy the intended product fantasy. The triggering evaluation happened after the build was effectively treated as the outcome of `Story 4.6: Ship a Public-Quality Browser Build`, with the clearest direct contradiction sitting in `Story 4.4: Experience Coherent Visual and Audio Polish`.

The current build is feature-complete enough to demonstrate systems, but it is not quality-complete enough to deliver the intended experience. The major failures are:

- the chosen location is not recognizable enough through the world itself
- roads, buildings, props, and vehicles read as prototype geometry rather than an intentional stylized world
- driving feel is weak and does not deliver the promised core pleasure
- mouse/camera/cursor behavior is awkward and limits normal play
- crosshair/combat state handling appears incorrect in live use
- the asset pipeline does not yet clearly support manual replacement with externally authored 3D models

Evidence used in this proposal:

- direct user evaluation after full Epic 1-4 completion
- provided gameplay screenshot showing prototype-grade presentation
- user-reported live issues with combat, crosshair state, and cursor behavior
- conflicts against existing promises in `1.2`, `1.4`, `3.4`, `3.5`, `4.4`, and `4.6`

## 2. Impact Analysis

### Epic Impact

- `Epic 4` revealed the gap but should remain as the historical v1 foundation rather than being rewritten as unfinished work.
- A new corrective `Epic 5` is required because the needed changes exceed normal polish and cut across world generation, driving, presentation, input, and QA.
- No future planned epics exist yet, so the roadmap impact is additive rather than a reshuffle of unfinished epics.
- Priority must change so core-fantasy recovery comes before any further expansion, extra chaos systems, or broader release ambitions.

### Story Impact

The following completed stories now have known quality or behavior gaps relative to product intent:

- `1.2 Load Into a Generated Playable Slice`
- `1.4 Drive with a Readable Third-Person Camera`
- `3.4 Use Limited Combat Options`
- `3.5 Accumulate Danger Through Chaotic Play`
- `4.4 Experience Coherent Visual and Audio Polish`
- `4.5 Use the Game on Major Supported Browsers`
- `4.6 Ship a Public-Quality Browser Build`

Recommended response:

- preserve those stories as the v1 implementation record
- add a new `Epic 5` with corrective v2 stories instead of rewriting history

### Artifact Conflicts

- `game-brief.md` needs the MVP and launch-quality bar clarified
- `gdd.md` needs stronger requirements for recognizability, driving feel, input-state behavior, and replaceable assets
- `game-architecture.md` needs explicit support for asset replacement, stronger world-generation fidelity, better vehicle-handling architecture, and pointer-lock/input-state ownership
- `_bmad-output/project-context.md` needs rules that prevent the same input-state and asset-pipeline gaps from recurring
- `_bmad-output/implementation-artifacts/sprint-status.yaml` needs new Epic 5 entries
- no narrative artifact exists and narrative impact is negligible
- no separate UX artifact exists; approved handling is to keep UX/input changes inside the GDD

### Technical Impact

The correction affects these technical areas:

- world-generation pipeline: roads, buildings, block rhythm, landmark identity, and road presentation
- asset pipeline: stable ids, anchors, fallback proxies, and manual model replacement
- vehicle simulation: suspension, tire/slip behavior, tuning, and readable handling
- input/camera stack: pointer lock, cursor visibility, crosshair gating, possession-aware control state
- combat reliability: valid fire behavior, feedback, and heat linkage
- quality validation: recognizability, driving feel, and input reliability need explicit test/playtest gates

## 3. Recommended Approach

### Chosen Path

`Hybrid`

- Primary path: `Option 1 - Direct Adjustment`
- Supporting path: `Option 3 - MVP/GDD Review`
- Rejected path: `Option 2 - Potential Rollback`

### Recommendation

Add a new corrective `Epic 5: Core Fantasy Recovery & V2 Quality Pass`, then update the core planning artifacts so the backlog reflects the actual product need instead of only the already-implemented systems.

### Rationale

- It preserves useful v1 technical foundations.
- It avoids rewriting the historical record of Epics 1-4.
- It aligns the next phase with the user's real priorities: recognizability, driving feel, better assets, sane controls, and asset replaceability.
- It corrects the planning documents so future implementation is measured against the real quality bar.

### Effort, Risk, Timeline

- Effort: `High`
- Risk: `Medium`
- Timeline impact: at least one additional corrective epic before the build should be treated as public-quality

## 4. Detailed Change Proposals

### Stories / Roadmap

Artifact: `epics.md`

OLD:

```md
| 1 | World Slice & Core Driving | ... |
| 2 | Exploration & Vehicle Interaction Sandbox | ... |
| 3 | Living City & Chaos Escalation | ... |
| 4 | Polish, Performance & Launch Readiness | ... |
```

NEW:

```md
| 1 | World Slice & Core Driving | ... |
| 2 | Exploration & Vehicle Interaction Sandbox | ... |
| 3 | Living City & Chaos Escalation | ... |
| 4 | Polish, Performance & Launch Readiness | ... |
| 5 | Core Fantasy Recovery & V2 Quality Pass | Recover the intended GT Anywhere fantasy by making the chosen place recognizable, the driving satisfying, the controls sane, and the world visually intentional | Epics 1-4 | A v2 build that feels like a recognizable, stylized GTA-inspired sandbox instead of a prototype |
```

Add new Epic 5 stories:

- `5.1 External Asset Replacement Pipeline`
- `5.2 Recognition-First World Generation Upgrade`
- `5.3 Road and Urban Presentation Upgrade`
- `5.4 Driving Feel, Camera, and Mouse Control Overhaul`
- `5.5 Combat, Crosshair, and Possession-State Reliability Fixes`
- `5.6 V2 Quality Validation and Playtest Gates`

Justification: the current backlog has no explicit container for the corrective work now required.

Artifact: `_bmad-output/implementation-artifacts/sprint-status.yaml`

OLD:

```yaml
development_status:
  epic-1: done
  ...
  epic-4: done
```

NEW:

```yaml
development_status:
  epic-1: done
  ...
  epic-4: done
  epic-5: backlog
  5-1-external-asset-replacement-pipeline: backlog
  5-2-recognition-first-world-generation-upgrade: backlog
  5-3-road-and-urban-presentation-upgrade: backlog
  5-4-driving-feel-camera-and-mouse-control-overhaul: backlog
  5-5-combat-crosshair-and-possession-state-reliability-fixes: backlog
  5-6-v2-quality-validation-and-playtest-gates: backlog
  epic-5-retrospective: optional
```

Justification: preserve v1 history while making Epic 5 executable in BMAD tracking.

### PRD / Brief

Artifact: `game-brief.md`

OLD:

```md
### MVP Definition
The MVP for GT Anywhere is a single-player web experience that proves the core fantasy of loading a real-world location and freely interacting with it in a GTA-inspired sandbox.
```

NEW:

```md
### MVP Definition
The MVP for GT Anywhere is a single-player web experience that proves the core fantasy of loading a real-world location and freely interacting with it in a GTA-inspired sandbox. The MVP is not satisfied by feature presence alone. It also requires recognizable roads and district structure, satisfying driving feel, sane mouse/camera/input behavior, and a presentation pass strong enough that the world no longer reads as raw placeholder geometry during normal play.
```

Also update `Vision Statement` and `Launch Goals` so public release is gated by quality validation rather than feature presence alone.

Justification: the current product brief understates the required quality bar.

### GDD

Artifact: `gdd.md`

Update these sections:

- `Level Design Principles`
- `Controls and Input`
- `Asset Requirements`
- `Gameplay Metrics`

Key additions:

- building and district truth must matter alongside road truth
- roads must visually read as roads at driving speed
- pointer-lock/captured mouse control must be a first-class rule
- crosshair and combat validity must follow possession state
- replaceable external assets must be explicitly supported
- recognizability, driving feel, and input reliability become measured quality gates

Representative before/after:

OLD:

```md
- Road truth first: Preserve recognizable road flow, topology, and route logic so the location feels authentic and useful for navigation.
```

NEW:

```md
- Road truth first: Preserve recognizable road flow, topology, and route logic so the location feels authentic and useful for navigation.
- Building and district truth next: When source data exists, building footprints, massing, block rhythm, and neighborhood character should follow the real place before decorative filler is introduced.
- Recognition beats filler density: If fidelity and density conflict, prefer clearer recognizable structure over adding more generic props or noise.
```

Justification: the GDD needs to express the exact qualities that failed in v1.

### Architecture

Artifact: `game-architecture.md`

Update these sections:

- `Decision Summary`
- `Physics and Simulation`
- `Asset Management`
- `UI Architecture`
- `Real-place World Slice Generation`

Key changes:

- keep Havok, but add an explicit data-driven handling layer for suspension, tire grip/slip, and vehicle tuning
- expand the slice pipeline to cover building footprints, block massing, and road-surface profiles where data exists
- add a replaceable asset registry/import contract
- make pointer-lock/cursor/crosshair state part of the architecture instead of an implicit implementation detail

Representative before/after:

OLD:

```md
| Vehicle Simulation | Plugin-heavy rigid-body vehicles | ... |
| Asset Management | Chunk streaming with predictive prefetch | ... |
| UI Framework | Hybrid HTML/CSS shell + in-game HUD layer | ... |
```

NEW:

```md
| Vehicle Simulation | Havok rigid-body foundation + explicit arcade handling layer | ... |
| Asset Management | Chunk streaming with predictive prefetch + replaceable asset registry/import contract | ... |
| UI Framework | Hybrid HTML/CSS shell + in-game HUD layer with captured-input state model | ... |
```

Justification: the current architecture is viable, but it does not explicitly encode the systems the user now needs.

### Project Context

Artifact: `_bmad-output/project-context.md`

Update rules so future implementation agents follow these constraints:

- active gameplay mouse look uses captured input so the cursor does not block rotation
- crosshair/cursor/combat validity must follow possession state explicitly
- replaceable art assets bind through stable ids, transforms, and fallback proxies
- filler density must not obscure recognizable roads, building footprints, or district structure

Justification: these are repeat-failure guardrails, not optional preferences.

### Narrative / UX Handling

- Narrative artifact: `N/A`
- Separate UX artifact: `Not created`
- Approved handling: keep UX/input changes inside `gdd.md` rather than creating a separate UX spec

## 5. Implementation Handoff

### Scope Classification

`Major`

This correction changes roadmap structure, quality gates, and multiple planning/architecture artifacts. It is more than a small backlog adjustment.

### Handoff Recipients

- `Product Manager / Solution Architect`
- `Scrum Master / Product Owner`
- `Development team`

### Responsibilities

Product Manager / Solution Architect:

- approve the new Epic 5 direction
- approve the updated quality bar for recognizability, driving feel, and input reliability
- confirm that public-release claims stay blocked until Epic 5 success criteria are met

Scrum Master / Product Owner:

- update `epics.md` with Epic 5
- update `game-brief.md`, `gdd.md`, `game-architecture.md`, and `_bmad-output/project-context.md`
- add Epic 5 entries to `sprint-status.yaml`
- create the Epic 5 story files in implementation artifacts

Development team:

- implement Epic 5 in this priority order:
  1. `5.4 Driving Feel, Camera, and Mouse Control Overhaul`
  2. `5.2 Recognition-First World Generation Upgrade`
  3. `5.3 Road and Urban Presentation Upgrade`
  4. `5.1 External Asset Replacement Pipeline`
  5. `5.5 Combat, Crosshair, and Possession-State Reliability Fixes`
  6. `5.6 V2 Quality Validation and Playtest Gates`

### Success Criteria

- players can recognize the chosen place from the world layout itself, not mainly from labels
- driving is described as satisfying and readable in first-session playtests
- active play no longer shows the system cursor or mouse-boundary camera failure during normal use
- crosshair and combat behavior are correct by possession state
- at least one externally authored asset can replace a default in-game asset through the documented pipeline
- release/public-quality claims remain blocked until the corrective Epic 5 acceptance gates are met

## Approval and Handoff Record

- Approval status: `Approved`
- Approved by: `Chris`
- Approval date: `2026-04-12`
- Scope classification: `Major`
- Routed to: `Product Manager / Solution Architect`
- Handoff status: `Complete`
