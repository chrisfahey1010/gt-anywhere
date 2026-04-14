---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
inputDocuments:
  - /home/chris/repos/gt-anywhere/_bmad-output/game-brief.md
  - /home/chris/repos/gt-anywhere/_bmad-output/planning-artifacts/research/technical-browser-capable-game-engines-and-web-focused-tech-stacks-for-a-high-performance-open-world-driving-game-research-2026-04-06T14:37:48-07:00.md
  - /home/chris/repos/gt-anywhere/_bmad-output/planning-artifacts/research/market-browser-based-open-world-games-experiences-built-around-real-world-data-and-location-generation-research-2026-04-06T13:14:03-07:00.md
  - /home/chris/repos/gt-anywhere/_bmad-output/brainstorming-session-2026-04-05T23:22:10-07:00.md
documentCounts:
  briefs: 1
  research: 2
  brainstorming: 1
  projectDocs: 0
workflowType: 'gdd'
lastStep: 0
project_name: 'gt-anywhere'
user_name: 'Chris'
date: '2026-04-06T19:13:13-07:00'
game_type: 'sandbox'
game_name: 'GT Anywhere'
---

# {{game_name}} - Game Design Document

**Author:** {{user_name}}
**Game Type:** {{game_type}}
**Target Platform(s):** {{platforms}}

---

## Executive Summary

### Core Concept

{{description}}

### Target Audience

{{target_audience}}

### Unique Selling Points (USPs)

{{unique_selling_points}}

---

## Goals and Context

### Project Goals

{{goals}}

### Background and Rationale

{{context}}

---

## Core Gameplay

### Game Pillars

{{game_pillars}}

### Core Gameplay Loop

{{gameplay_loop}}

### Win/Loss Conditions

{{win_loss_conditions}}

---

## Game Mechanics

### Primary Mechanics

{{primary_mechanics}}

### Controls and Input

{{controls}}

---

## Sandbox Specific Design

### Creation Tools

GT Anywhere does not include player-facing creation or building tools in v1. Players are not expected to place, delete, modify, or assemble world objects as part of the core experience. The sandbox value comes from freedom within a generated real-world environment rather than from constructing one.

### Physics and Building Systems

The sandbox should rely on vehicle-focused physics and selective destruction rather than a heavy building simulation. Driving, collisions, vehicle handling, and crash feedback are core, while breakable objects should stay curated and lightweight. Structural integrity systems, deep material simulation, and broad construction physics are not part of the initial design.

### Sharing and Community

There is no in-game user-generated-content sharing layer in v1. GT Anywhere is not initially focused on workshops, galleries, or collaborative building. Community interest should come from the core fantasy itself, with possible future sharing centered more on interesting locations, runs, or memorable moments rather than player-authored creations.

### Constraints and Rules

The game uses a single default sandbox ruleset in v1. Players enter a chosen real-world location, play freely inside a bounded generated slice, and operate within a soft-failure structure rather than a heavily segmented set of modes. Additional challenge variants could be explored later, but they are not part of the initial design.

### Tools and Editing

There are no player-facing editing tools in v1. Players are not expected to edit terrain, author logic, adjust weather systems, or manipulate the world directly through sandbox tooling. The primary control layer is gameplay plus settings, not in-world editing.

### Emergent Gameplay

Emergence is one of the defining strengths of GT Anywhere. Players create their own moments through cruising, recognizing places, swapping vehicles, causing collisions, escalating into chaos, escaping danger, and replaying different locations with different moods and behaviors. The game's version of sandbox creativity comes from self-directed driving and chaos in a recognizable place, not from building structures or scripting contraptions.

## Progression and Balance

### Player Progression

GT Anywhere does not use a formal progression structure in v1. There is no persistent meta progression, no major unlock ladder, and no expectation that players steadily power up across sessions. The game is designed as a fresh sandbox experience each time the player spawns in.

#### Progression Types

The main form of progress is informal player mastery rather than system-driven advancement. Players improve through familiarity with controls, better understanding of how different places and vehicles behave, and increased confidence in navigating, escaping, and creating chaos inside the sandbox.

#### Progression Pacing

Players should feel meaningful payoff within the first session. Recognition of real places, satisfying driving feel, and immediate sandbox freedom should create a sense of value quickly without requiring hours of investment before the game becomes interesting.

### Difficulty Curve

The difficulty curve is primarily player-controlled rather than strictly authored. GT Anywhere should allow players to determine much of their own challenge by how aggressively they drive, how much chaos they create, what location they choose, and what settings they use.

#### Challenge Scaling

Challenge scales through player behavior and world conditions. Safer cruising, lighter density settings, and cautious play keep the experience more relaxed, while higher traffic density, reckless driving, combat escalation, and more aggressive experimentation naturally increase pressure.

#### Difficulty Options

Difficulty adjustment should come mainly through settings and sandbox parameters rather than traditional named modes. Traffic and density controls, graphics/performance settings, and the player's own appetite for risk all contribute to how demanding a session feels.

### Economy and Resources

GT Anywhere does not feature a formal currency economy in v1, but it does include light resource systems that shape play without dominating it.

#### Resources

The main light resources are vehicle condition, player health or survivability, and ammunition. These add stakes to chaos and combat, but they should not turn the game into a heavy survival or resource-management experience.

#### Economy Flow

These resources operate under light pressure. Vehicle condition degrades through collisions and reckless use, health is threatened by dangerous situations, and ammo is spent during combat. Recovery primarily comes from restarting a run, stealing a fresh vehicle, or finding pickups where appropriate, keeping the loop readable and fast.

## Level Design Framework

### Structure Type

GT Anywhere uses a hybrid open-world and procedural structure. Each session generates a bounded playable slice of a real-world location, creating an open roaming space rather than a discrete authored level. The world is continuous within that slice, but the slice itself is regenerated and selected on a per-session basis.

### Level Types

The primary "level type" is a mixed real-place slice, where the chosen location determines the composition of roads, density, landmarks, elevation, and district character. Rather than relying on a fixed authored catalog of stages, the game's spatial variety comes from the natural differences between selected real-world places.

#### Tutorial Integration

GT Anywhere does not use a separate formal tutorial in v1. Players learn by spawning directly into the world and understanding the game through movement, environment, and first-use interaction. The onboarding philosophy is to teach through environment and immediate play rather than through explicit tutorial stages.

#### Special Levels

There are no dedicated boss levels, secret levels, or other special area structures planned for v1. The emphasis is on making the normal generated sandbox consistently compelling rather than carving out bespoke exceptions early.

### Level Progression

Content progression is based on open selection by location. Players choose where they want to play each session rather than unlocking a prescribed sequence of levels or areas.

#### Unlock System

There is no traditional unlock system for areas in v1. Access to content is driven by the player's own choice of location rather than by progression gates or performance milestones.

#### Replayability

Replayability comes from loading different places, revisiting the same place with different vehicles or moods of play, and seeing how geography changes the driving and chaos experience. Players can effectively replay content indefinitely by selecting new real-world locations or returning to familiar ones.

### Level Design Principles

- **Road truth first:** Preserve recognizable road flow, topology, and route logic so the location feels authentic and useful for navigation.
- **Building and district truth next:** When source data exists, building footprints, massing, block rhythm, and neighborhood character should follow the real place before decorative filler is introduced.
- **Roads must read as roads:** Lane width, edge treatment, intersections, curbs/sidewalk cues, and surface presentation should make the street network legible at driving speed.
- **Teach through environment:** Let players learn through the structure of roads, intersections, density, and spatial cues rather than through explicit tutorial text or segregated training spaces.
- **Recognition beats filler density:** If fidelity and density conflict, prefer clearer recognizable structure over adding more generic props or noise.

## Art and Audio Direction

### Art Style

GT Anywhere uses a stylized 3D visual direction inspired by the PS2-era look of classic GTA. The goal is not realism for its own sake, but a lightweight, readable urban world that feels expressive, coherent, and performant in the browser. Visual priority should go to road readability, spatial clarity, and recognizable urban structure rather than to high-detail simulation fidelity.

#### Visual References

The primary visual reference is **GTA III**, especially its grounded urban mood, strong readability, and classic open-world presentation. The game should capture that era's sense of stylized city exploration while adapting it to a browser-first, procedurally generated real-world context.

#### Color Palette

The palette should support readable daylight realism with fixed-time-of-day clarity. Colors should help roads, buildings, traffic, and environmental features stay easy to parse at driving speed rather than leaning on extreme stylization or heavy cinematic grading.

#### Camera and Perspective

The game uses a third-person 3D perspective with a stable, readable chase camera designed around vehicle control and spatial awareness. Camera behavior should support speed, turns, impacts, and urban navigation without becoming disorienting.

### Audio and Music

The audio identity is driven primarily by environmental sound, vehicle presence, and combat-capable reactive effects rather than by a music-led presentation. Sound should make the city feel inhabited and make driving, collisions, near misses, and escalation feel physically legible and exciting.

#### Music Style

There is no music in v1. The soundscape should rely on engines, tires, crashes, distant city ambience, and reactive world audio to define mood.

#### Sound Design

Sound design should emphasize vehicles, impacts, traffic, urban ambience, and combat feedback. Driving audio needs strong engine character and motion clarity, while crashes, scrapes, gunfire, and environmental reactions should feel punchy and readable. The mix should support both relaxed cruising and sudden spikes of chaos.

#### Voice/Dialogue

There is no structured dialogue or voiced narrative layer in v1. Voice use should be limited to light reactions such as pedestrian grunts or occasional short reactive lines where they add presence without expanding scope significantly.

### Aesthetic Goals

The art and audio direction should reinforce the game's three core pillars. Visual readability and stable camera behavior support great driving controls. Recognizable urban layout, daylight clarity, and environmental ambience support familiar-place exploration. Punchy collision audio, reactive city sound, and stylized urban presentation support unpredictable chaos without requiring expensive realism.

## Technical Specifications

### Performance Requirements

GT Anywhere is targeting a browser-first performance profile built around responsive desktop play. Technical requirements should prioritize smooth driving feel, fast time-to-interaction, and lightweight delivery over visual complexity.

#### Frame Rate Target

The target is 60 FPS on desktop-class browsers for the core experience.

#### Resolution Support

The baseline target is 720p, scalable up to 1080p and down to 480p depending on hardware and settings.

#### Load Times

The game should get players to a generated playable slice in under one minute, with strong emphasis on fast first interaction and low friction before the first meaningful drive.

### Platform-Specific Details

GT Anywhere is designed for desktop browsers first, with broad modern browser support and settings-based scalability.

#### Web Browser Requirements

The v1 target includes Chromium-based browsers, Firefox, and Safari/WebKit, with gamepad support included alongside keyboard and mouse. Offline play is not required in v1. The delivery posture should stay lightweight, rely heavily on client-side processing to control server costs, and leave open the possibility of a native wrapper or desktop shell later if needed.

### Asset Requirements

Asset scope should stay lightweight and stylized to support browser delivery, procedural world generation, and solo development constraints.

#### Art Assets

Key art requirements include a stylized but intentionally readable urban kit, a replaceable vehicle roster, modular and footprint-aware building assets, simple pedestrian and traffic vehicle assets, limited animation scope, and a minimal but readable UI asset set.

#### Audio Assets

Audio requirements are SFX-heavy rather than music-heavy. Priority assets include vehicle engines, tire and road sounds, impacts, crashes, gunfire, urban ambience, and other reactive world sounds needed to support both cruising and chaos.

#### External Assets

The production workflow should use AI-assisted asset creation where helpful, with manual editing and refinement used when better control is needed. External AI tools may be used as part of the pipeline, but the project must also support manual replacement of in-game vehicles, buildings, props, and other world assets through a stable import contract so externally authored 3D models can replace default proxies without large code rewrites.

### Technical Constraints

GT Anywhere must remain lightweight enough for browser delivery, support scalable settings tiers, and favor client-side computation over expensive server-side runtime processing. The combination of 60 FPS desktop targets, sub-minute load/generation goals, broad browser compatibility, and a solo-friendly asset scope should act as the main technical constraints guiding later architecture decisions.

## Development Epics

### Epic Overview

| # | Epic Name | Scope | Dependencies | Est. Stories |
| --- | --- | --- | --- | --- |
| 1 | World Slice & Core Driving | Browser-first vertical slice that proves location selection, world loading, spawning, camera, and core driving feel | None | 5 |
| 2 | Exploration & Vehicle Interaction Sandbox | Deepen the sandbox with recognition, vehicle interaction, replay flow, and vehicle variety | Epic 1 | 5 |
| 3 | Living City & Chaos Escalation | Add traffic, pedestrians, collisions, combat-capable chaos, and flee/recovery pressure | Epics 1-2 | 6 |
| 4 | Polish, Performance & Launch Readiness | Make the browser experience stable, scalable, polished, and ready for public release | Epics 1-3 | 6 |

### Recommended Sequence

Start with **World Slice & Core Driving** to prove the project's core fantasy as early as possible. Then expand into **Exploration & Vehicle Interaction Sandbox** so the player can do more meaningful self-directed play inside the generated space. After that, add **Living City & Chaos Escalation** to widen the sandbox into a more complete GTA-style experience. Finish with **Polish, Performance & Launch Readiness** so the browser build becomes stable, performant, and presentable.

### Vertical Slice

**The first playable milestone:** A browser build where the player chooses a real-world location, loads a generated playable slice, spawns directly into a car, and can drive around with satisfying controls.

## Success Metrics

### Technical Metrics

Technical success for GT Anywhere is defined primarily by browser-first playability, reliability, and cost discipline. The project should prove that the core fantasy can run smoothly, load fast enough, remain stable in playtests, and avoid unsustainable operating costs.

#### Key Technical KPIs

| Metric | Target | Measurement Method |
| --- | --- | --- |
| Frame rate | Stable 60 FPS on target desktop browsers | In-build performance counters plus browser profiling during representative playtests |
| World entry time | Playable world generated and entered in under 60 seconds | Timed startup-to-drivable-world measurements across test runs |
| Crash-free sessions | 95%+ crash-free sessions in testing | Playtest logs, error tracking, and manual issue review |
| Monthly hosting cost | At or below $10/month unless growth clearly justifies more | Hosting and infrastructure cost tracking |
| Browser reliability | Core loop works on Chromium, Firefox, and Safari/WebKit targets | Cross-browser smoke tests and structured playtest coverage |

### Gameplay Metrics

Gameplay success is defined by whether players quickly feel the intended fantasy, recognize meaningful places, and want to come back to the sandbox for more experimentation.

#### Key Gameplay KPIs

| Metric | Target | Measurement Method |
| --- | --- | --- |
| Place recognition | A clear majority of trusted testers can recognize the chosen place from roads, buildings, and district structure rather than mainly from street labels or HUD aids | Post-playtest surveys, screenshot review, and structured feedback notes |
| Driving feel | A clear majority of trusted testers describe driving as satisfying, controllable, and readable in the first session | Immediate post-session feedback and handling-focused playtest notes |
| Input reliability | Core playtests complete without recurring cursor-visible, mouse-boundary, or invalid crosshair-state complaints | Structured QA checklist and browser playtests |
| First-session fun | A clear majority of trusted testers say the game is fun in the first session | Immediate post-session feedback and follow-up interviews |
| Repeat sessions | A meaningful share of testers return for additional sessions | Session tracking across repeated private builds and test invites |
| Vehicle switching usage | Vehicle switching/hijacking shows up regularly in sandbox playtests | Observed playtest behavior, instrumentation, or session notes |

### Qualitative Success Criteria

- Players say some version of "this feels like my place."
- Players specifically praise the driving feel rather than only the technical novelty.
- The project improves the developer's portfolio and reputation by demonstrating strong engineering and game-design execution.

### Metric Review Cadence

Metrics should be reviewed on every meaningful playtest and build. Technical metrics such as frame rate, load time, crash behavior, and browser support should be checked continuously, while gameplay and qualitative metrics should be reviewed after each external or trusted-tester session to catch whether the core fantasy is actually landing.

## Out of Scope

- Multiplayer or other online shared-play features
- Structured missions or campaign content
- Enterable building interiors
- Console ports
- Mobile version
- Full voice acting
- Level editor or mod tools
- Music/radio system
- Large content expansion beyond the disciplined v1 sandbox

### Deferred to Post-Launch

- More vehicle variety
- Deeper traffic and pedestrian behavior
- Expanded combat systems
- Native desktop wrapper or desktop-shell packaging

---

## Assumptions and Dependencies

### Key Assumptions

- The project will remain tightly scoped for solo development.
- The primary audience will play on desktop browsers.
- Public real-world map data will be usable enough to support recognizable playable slices.
- AI-assisted asset creation will help keep production practical.
- Players will accept stylized, lightweight fidelity as long as driving feel and recognition are strong.
- Hosting can remain at or below the intended low-cost target.

### External Dependencies

- Public map and geographic data providers
- Browser platform behavior across Chromium, Firefox, and Safari/WebKit
- Web hosting and delivery infrastructure
- Final engine/framework selection in the architecture phase

### Risk Factors

- Real-world data may be inconsistent or difficult to convert into fun, drivable spaces.
- Browser compatibility and performance variance may create extra implementation and testing overhead.
- Solo-dev throughput may limit how much simulation depth and polish can fit into v1.
- The asset pipeline may still require manual cleanup despite AI assistance.
- If hosting or distribution assumptions break, launch scope may need to narrow further.

---

## Document Information

**Document:** GT Anywhere - Game Design Document
**Version:** 1.0
**Created:** 2026-04-06T19:13:13-07:00
**Author:** Chris
**Status:** Complete

### Change Log

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-04-06T19:13:13-07:00 | Initial GDD complete |

---

## Progression and Balance

### Player Progression

{{player_progression}}

### Difficulty Curve

{{difficulty_curve}}

### Economy and Resources

{{economy_resources}}

---

## Level Design Framework

### Level Types

{{level_types}}

### Level Progression

{{level_progression}}

---

## Art and Audio Direction

### Art Style

{{art_style}}

### Audio and Music

{{audio_music}}

---

## Technical Specifications

### Performance Requirements

{{performance_requirements}}

### Platform-Specific Details

{{platform_details}}

### Asset Requirements

{{asset_requirements}}

---

## Development Epics

### Epic Structure

{{epics}}

---

## Success Metrics

### Technical Metrics

{{technical_metrics}}

### Gameplay Metrics

{{gameplay_metrics}}

---

## Out of Scope

{{out_of_scope}}

---

## Assumptions and Dependencies

{{assumptions_and_dependencies}}

## Executive Summary

### Game Name

GT Anywhere

### Core Concept

GT Anywhere is a browser-first open-world sandbox where players choose a real-world location and enter a procedurally generated urban play space inspired by classic GTA-style free-roaming action. The core fantasy is simple and immediate: load a place that matters to you, spawn directly into a car, and start driving through recognizable streets, neighborhoods, and landmarks with responsive, satisfying controls.

The game is designed around three linked pleasures: strong driving feel, familiar-place exploration, and emergent chaos. Players cruise, recognize roads and districts, hijack vehicles, crash through traffic, flee danger, and create their own stories inside a world generated from public geographic data. Rather than relying on a traditional mission structure, GT Anywhere aims to prove that a compact, performant, single-player sandbox can stand on the emotional novelty of "play in your own place" and the replayability of trying different locations, vehicles, and moods of play.

### Game Type

**Type:** Sandbox
**Framework:** This GDD uses the sandbox template with type-specific sections for creative freedom, minimal objectives, and open-ended play

## Target Platform(s)

### Primary Platform

Web Browser

### Platform Considerations

GT Anywhere is being designed browser-first, so instant access and low friction are central to the product experience. The game should prioritize fast startup, fast enough world generation, and a stable 60 FPS target on representative desktop-class hardware.

Because the browser is the primary platform, scope and technical decisions should favor low hosting cost and client-side execution where practical. The design should stay disciplined around browser performance limits, memory usage, and loading size while preserving the core fantasy of driving through a recognizable real-world location.

### Control Scheme

Keyboard and mouse should be fully supported as the baseline control scheme for desktop browser play, with strong gamepad support included from the start. Input design should favor responsive driving, readable on-foot transitions, and low-friction vehicle interaction.

---

## Target Audience

### Demographics

The primary audience is players age 17 and up, especially older teens and adults who are comfortable with action-oriented open-world play and interested in recognizable real-world locations.

### Gaming Experience

Core gamers - regular players who are already comfortable with modern or classic open-world sandbox conventions and can quickly understand driving, free-roaming, and chaos-driven gameplay.

### Genre Familiarity

The game is aimed primarily at players who are already familiar with GTA-style or open-world sandbox conventions. The design can still be approachable, but it does not need to treat genre literacy as completely absent.

### Session Length

Both short and long - GT Anywhere should support quick novelty sessions where players jump in to try a location, as well as longer exploratory sessions focused on cruising, recognition, experimentation, and emergent chaos.

### Player Motivations

This audience is drawn by the chance to explore familiar real-world places, enjoy great driving feel, create open-ended chaos, access the game instantly in a browser, and experience the technical novelty of real-world location generation.

## Goals and Context

### Project Goals

1. **Prove the core fantasy**
   Demonstrate that loading a real-world location and driving through a recognizable playable version of it is genuinely fun, not just technically novel.

2. **Ship a playable web build**
   Deliver a browser-first version that players can access easily and use to experience the core loop without installation friction.

3. **Hold a 60 FPS target**
   Preserve responsive driving feel and overall playability by treating smooth performance as a core design requirement, not a late optimization goal.

4. **Keep hosting costs cheap**
   Maintain a sustainable hobby-project cost structure by minimizing server-side runtime demands and keeping operating costs low.

### Background and Rationale

GT Anywhere is being made to fulfill a very specific fantasy that existing games rarely provide: playing a GTA-style sandbox in a place that is personally meaningful to the player. The project is motivated by the appeal of exploring familiar streets, neighborhoods, and towns through free-roaming driving gameplay rather than through trivia, heavy simulation, or a fixed fictional city.

The project also exists because there is a visible gap in the market. There is no strong browser-first, open-source game that combines player-chosen real-world locations, public-data world generation, and lightweight open-world chaos. GT Anywhere is an attempt to fill that gap while also serving as an ambitious public project that showcases technical execution, creative direction, and the possibility of turning real-world geographic data into a compelling interactive toybox.

---

## Unique Selling Points (USPs)

1. **Any chosen real-world location**
   The player selects the setting, turning the game from a fixed authored city into a flexible real-place sandbox.

2. **Familiar-place exploration**
   Recognition is part of the play experience itself, giving the game an emotional hook that goes beyond novelty or spectacle.

3. **Browser-first access**
   The game is designed for instant access and low friction, making it easier for players to try the concept quickly than traditional download-heavy open-world games.

4. **Public-data generation**
   The world is built from real geographic data, creating a distinctive technical and experiential foundation for the sandbox.

5. **Open-source sandbox**
   The project is free and openly developed, which supports community interest, transparency, and long-term extensibility.

### Competitive Positioning

GT Anywhere sits between several existing categories without fitting neatly into any of them. It is not a traditional authored GTA-style game, not a flight simulator, not a geography trivia experience, and not a map-economy product. Its position is a lightweight, browser-first, open-source driving sandbox where the main draw is exploring and causing chaos in a recognizable place the player chose themselves.

That combination gives the project a clear angle: it competes on personal relevance, immediacy, and technical novelty rather than on AAA production scale. The goal is not to outmatch major open-world games on content volume, but to offer an experience those games usually cannot: "play in your own place" with instant browser access.

## Core Gameplay

### Game Pillars

1. **Great Driving Controls**
   The car must feel responsive, readable, and satisfying from the first moments of play. If driving does not feel good, the core fantasy collapses.

2. **Familiar-Place Exploration**
   The game should reward players for moving through recognizable roads, districts, intersections, and landmarks. Exploration is not filler between action beats; it is one of the main pleasures of the experience.

3. **Unpredictable Chaos**
   The sandbox should support emergent moments of crashes, vehicle swaps, escapes, and mayhem without requiring heavily scripted content to stay interesting.

**Pillar Prioritization:** When pillars conflict, prioritize in this order:
Great Driving Controls -> Familiar-Place Exploration -> Unpredictable Chaos

### Core Gameplay Loop

The player chooses a real-world location, loads into a generated playable slice, and immediately begins driving through the area. During play, they explore roads and districts, recognize familiar geography, switch vehicles when useful, and decide whether to stay in a cruising mindset or escalate into more chaotic sandbox behavior.

As the session develops, chaos can emerge through crashes, reckless driving, hijacking, combat escalation, or pursuit. Failure or collapse of the current run resets the player back to the starting point in the same chosen location, letting them jump back into the loop quickly while preserving the identity of the place.

**Loop Diagram:**
Choose location -> Load playable slice -> Drive and explore -> Recognize / experiment / escalate -> Crash / flee / recover -> Restart from spawn in same location -> Repeat

**Loop Timing:** 5-10 minutes for a typical meaningful cycle, with overall play sessions able to run much longer.

**Loop Variation:** Each iteration feels different because the chosen location changes the road network and atmosphere, vehicle swaps change handling and play style, player behavior changes the chaos level, and recognition of real places creates different emotional payoffs from run to run.

### Win/Loss Conditions

#### Victory Conditions

There is no single definitive final win state in the core sandbox mode. Success is ongoing and self-directed: exploring a meaningful place, sustaining a fun driving session, recognizing familiar geography, creating memorable chaos, or pushing the sandbox into new situations.

#### Failure Conditions

Failure is primarily soft failure rather than permanent defeat. A run can end when the player loses control of the situation, destroys or loses their current vehicle in a way that ends momentum, gets busted, gets wasted, or otherwise reaches a state where the current attempt is over.

#### Failure Recovery

Failure should restart the player from the spawn point within the same chosen location rather than forcing a full location-selection flow again. This preserves consequence while keeping the browser-first sandbox rhythm fast, readable, and easy to repeat.

## Game Mechanics

### Primary Mechanics

1. **Drive**
   This is the constant primary mechanic and the foundation of the entire game. It tests positioning, speed control, steering, route choice, and recovery under pressure. It should feel responsive, readable, and arcade-sim in style, with enough weight and momentum to make near-loss-of-control moments fun rather than frustrating.
   Supports pillars: Great Driving Controls, Familiar-Place Exploration, Unpredictable Chaos

2. **Explore / Recognize**
   Players use driving and movement to discover streets, districts, intersections, terrain, and landmarks that feel familiar or interesting. This mechanic tests navigation, observation, memory, and curiosity, and it is central to the emotional payoff of the game.
   Supports pillars: Familiar-Place Exploration, Great Driving Controls

3. **Hijack**
   Hijacking is a situational but important mechanic used to preserve momentum, recover from failure states, and change play style through vehicle swaps. It should function as a short bridge between cars rather than a deep standalone on-foot system.
   Supports pillars: Unpredictable Chaos, Great Driving Controls

4. **Cause Chaos**
   Players can escalate the sandbox through reckless driving, collisions, vehicle theft, combat, and disruptive behavior. In v1, this is a secondary chaos layer rather than the main focus, widening the range of play without displacing driving and exploration.
   Supports pillars: Unpredictable Chaos, Great Driving Controls

5. **Flee / Recover**
   When a run becomes unstable or dangerous, players escape, reset momentum, or re-enter the sandbox after failure. This mechanic tests route improvisation, situational judgment, and willingness to push risk.
   Supports pillars: Unpredictable Chaos, Familiar-Place Exploration

### Mechanic Interactions

These mechanics are designed to chain naturally. Driving enables exploration, exploration creates recognition and curiosity, chaos creates damage or danger, hijacking restores momentum, and fleeing or restarting from spawn resets the player into another run through the same place. Vehicle choice changes how every other mechanic feels, so the same world can support different rhythms of cruising, aggression, escape, and experimentation.

### Mechanic Progression

The mechanics are mostly static at the system level rather than built around a large unlock tree. Progression comes more from player familiarity with locations, increasing control mastery, discovering how different vehicle types reinterpret the map, and learning how to push the sandbox further without losing flow.

---

## Controls and Input

### Control Scheme (Web Browser)

The baseline scheme is keyboard and mouse with full gamepad support.

- `WASD`: Drive or move on foot
- `Mouse`: Control camera and support aiming/look direction through captured in-game mouse control during active play
- `Space`: Handbrake / sharper driving expression
- `E`: Enter/exit vehicles and interact
- `Gamepad`: Supported with genre-standard driving, camera, and interaction mappings
- Horizontal camera look should use reversed left-right orbiting for both mouse and gamepad, while vertical look remains standard non-inverted look.

This scheme should keep the most common actions easy to reach and preserve a familiar GTA-style input grammar for desktop players.

### Input State Rules

- Active gameplay should support pointer-lock or equivalent captured mouse control so camera rotation is not limited by screen bounds and the system cursor is not visible during normal play.
- Vehicle possession must not show a combat crosshair.
- The crosshair should appear only when the player is on foot, has a firearm equipped, and combat input is valid.
- Combat input must be explicitly gated off during vehicle possession and transition states.
- The player must have a clear, low-friction way to release the cursor and return to browser UI control.

### Input Feel

Controls should feel responsive, stable, and low-friction. Driving should be immediate and readable, with enough momentum to create satisfying slides, close calls, and recoveries. On-foot input should feel functional and efficient rather than overly deep, since its main purpose is to support transitions between vehicles and brief moments of vulnerability.

### Accessibility Controls

Planned control and accessibility support includes rebindable controls, mouse sensitivity options, graphics presets, and traffic or density sliders. These settings should help players adapt the game both to their hardware and to their comfort with the control and performance profile.
