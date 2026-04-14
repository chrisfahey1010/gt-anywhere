# GT Anywhere - Development Epics

## Epic Overview

| # | Epic Name | Goal | Dependencies | Deliverable |
| --- | --- | --- | --- | --- |
| 1 | World Slice & Core Driving | Prove the core fantasy in a browser-first playable slice | None | A working browser prototype where the player selects a place, loads in, and drives |
| 2 | Exploration & Vehicle Interaction Sandbox | Turn the slice into a richer sandbox with recognition and vehicle interaction | Epic 1 | A replayable exploration sandbox with multiple vehicles and player-driven interaction |
| 3 | Living City & Chaos Escalation | Add city life and GTA-style pressure/chaos systems | Epics 1-2 | A living sandbox with traffic, pedestrians, collisions, chaos, and escape/recovery |
| 4 | Polish, Performance & Launch Readiness | Make the game stable, scalable, and ready for external players | Epics 1-3 | A polished, publicly presentable browser build |
| 5 | Core Fantasy Recovery & V2 Quality Pass | Recover the intended GT Anywhere fantasy by making the chosen place recognizable, the driving satisfying, the controls sane, and the world visually intentional | Epics 1-4 | A v2 build that feels like a recognizable, stylized GTA-inspired sandbox instead of a prototype |

## Recommended Sequence

Complete Epics 1-4 as the v1 foundation, then prioritize **Core Fantasy Recovery & V2 Quality Pass** before any post-launch or expansion work. Epic 5 exists to close the gap between feature completion and the intended GT Anywhere experience.

---

## Epic 1: World Slice & Core Driving

### Goal

Prove that GT Anywhere's core promise is fun and technically viable: choose a real-world place, load a playable slice, spawn into a car, and drive.

### Scope

**Includes:**
- Browser-first app shell
- Location input and session start flow
- Generated bounded playable slice
- Starter vehicle spawn
- Core third-person camera
- Core driving controls and handling
- Basic restart-from-spawn loop

**Excludes:**
- Traffic and pedestrian systems
- Hijacking and broader vehicle interaction
- Combat, health, ammo, and wanted/heat systems
- Broad art/audio polish beyond minimum viability

### Dependencies

None

### Deliverable

A playable browser vertical slice that proves location selection, loading, spawning, and satisfying driving in a recognizable real-place sandbox.

### Stories

- As a player, I can enter a real-world location so that I can start a session in a place I care about.
- As a player, I can load into a generated playable slice so that I can access the sandbox quickly.
- As a player, I can spawn directly into a car so that the first interaction is immediate driving.
- As a player, I can drive with a readable third-person camera so that control feels reliable and satisfying.
- As a player, I can restart from spawn in the same location so that I can quickly retry the sandbox loop.

---

## Epic 2: Exploration & Vehicle Interaction Sandbox

### Goal

Expand the core driving slice into a richer exploration sandbox centered on recognition, vehicle variety, and momentum-preserving interaction.

### Scope

**Includes:**
- Multiple vehicle classes
- Enter/exit vehicle flow
- Hijacking / vehicle takeover
- Recognition-supporting navigation cues
- Replayable same-location loop improvements
- Exploration-oriented sandbox interactions

**Excludes:**
- Traffic/pedestrian city life
- Major combat systems
- Full chaos escalation layer
- Public release polish work

### Dependencies

Epic 1

### Deliverable

A replayable sandbox where players can explore, recognize places, switch vehicles, and sustain self-directed play beyond simple driving laps.

### Stories

- As a player, I can switch between vehicle types so that the same location feels different to drive.
- As a player, I can exit and re-enter vehicles so that on-foot moments support the sandbox loop.
- As a player, I can hijack another car so that I can preserve momentum after damage or curiosity.
- As a player, I can use simple navigation cues like street names or a minimap so that place recognition is easier to sustain.
- As a player, I can replay the same location with different vehicles or intentions so that the sandbox has immediate replay value.

---

## Epic 3: Living City & Chaos Escalation

### Goal

Add enough life, pressure, and secondary systems to turn the exploration sandbox into a more complete GTA-style chaos playground.

### Scope

**Includes:**
- Traffic systems
- Simple pedestrians
- Vehicle collisions and selective destruction
- Health / survivability
- Ammunition
- Secondary combat layer
- Heat / flee / recovery pressure

**Excludes:**
- Deep mission structure
- Narrative campaign
- Heavy economy systems
- Large content expansion beyond core sandbox needs

### Dependencies

Epics 1-2

### Deliverable

A living city sandbox where players can cruise, collide, escalate into chaos, survive consequences, and escape or recover.

### Stories

- As a player, I can drive through traffic so that the city feels alive and the road becomes more interesting.
- As a player, I can encounter pedestrians so that the world feels inhabited and my actions have clearer consequences.
- As a player, I can damage vehicles and break selected props so that chaos has physical payoff.
- As a player, I can use limited combat options so that sandbox escalation has more range without replacing driving.
- As a player, I can accumulate danger through chaotic play so that reckless behavior creates pressure.
- As a player, I can escape, fail, and restart the run so that chaos has stakes without ending the sandbox permanently.

---

## Epic 4: Polish, Performance & Launch Readiness

### Goal

Transform the playable sandbox into a stable, scalable, publicly presentable browser release.

### Scope

**Includes:**
- Performance optimization toward 60 FPS desktop target
- Resolution/scalability support
- Browser compatibility across Chromium, Firefox, and Safari/WebKit
- Settings presets and density controls
- Visual/audio polish pass
- Lightweight delivery and launch-readiness work

**Excludes:**
- Major new mechanics
- Full live-service/community feature expansion
- Deep post-launch content roadmap items

### Dependencies

Epics 1-3

### Deliverable

A polished browser build that is performant, usable, and ready for real external playtesting or public release.

### Stories

- As a player, I can adjust settings and density so that the game fits my hardware.
- As a player, I can get stable performance on supported desktop browsers so that driving remains satisfying.
- As a player, I can rely on the build loading quickly enough that browser access stays low-friction.
- As a player, I can experience coherent visual and audio polish so that the world feels intentional rather than prototype-grade.
- As a player, I can use the game on major supported browsers so that access is broad enough for testing and release.
- As a developer, I can ship a public-quality browser build so that GT Anywhere can be evaluated by real players.

---

## Epic 5: Core Fantasy Recovery & V2 Quality Pass

### Goal

Recover GT Anywhere's core fantasy so a chosen location feels recognizable, driving feels good, presentation feels intentional, and player controls behave correctly across vehicle and on-foot states.

### Scope

**Includes:**
- Recognition-first world generation improvements for roads, buildings, and district identity
- An explicit replaceable asset pipeline for externally authored vehicle, building, and prop models
- Improved road rendering and urban presentation
- Better vehicle handling, suspension/tire feel, chase camera, pointer lock, and possession-aware cursor/crosshair behavior
- Combat/input reliability fixes and v2 acceptance validation

**Excludes:**
- New missions or campaign content
- Multiplayer
- Major content expansion before core-fantasy recovery is complete

### Dependencies

Epics 1-4

### Deliverable

A v2 build that feels like a recognizable, stylized GTA-inspired sandbox instead of a prototype.

### Stories

- As a developer, I can replace default proxy assets with externally authored 3D models so that manual art improvement does not require major gameplay-code rewrites.
- As a player, I can load a world slice that preserves more real-world building and district structure so that the chosen place is recognizable beyond street labels.
- As a player, I can drive on roads and through districts that look intentionally authored so that navigation and place identity improve.
- As a player, I can rely on better vehicle handling, chase camera behavior, and captured mouse control so that driving feels satisfying and the camera remains reliable.
- As a player, I can rely on combat, crosshair, and possession-state behavior to work consistently so that on-foot escalation feels coherent.
- As a developer, I can validate v2 against explicit recognizability, driving-feel, and input-reliability gates so that feature completion is not mistaken for quality readiness.
