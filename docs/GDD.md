# Game Design Document – Sperm Odyssey: Race to the Egg

## Vision Statement
An educational, PG-rated multiplayer racing experience celebrating the biological marvel of human reproduction. Players guide stylized sperm cells through the reproductive tract, learning scientific concepts through mechanics, tooltips, and a rich compendium.

## Core Pillars
1. **Respectful Abstraction** – Shapes and glowing gradients replace explicit imagery.
2. **Science First** – Mechanics tie directly to real biological processes.
3. **Friendly Competition** – Cooperative learning, lighthearted racing.
4. **Accessibility & Inclusion** – Flexible controls, readable UI, and adjustable intensity.

## Modes
### Single Player Campaign
* Sequential levels mirroring the reproductive tract regions.
* Tutorials introduce steering, stamina, capacitation, and hyperactivation.
* Progression unlocks compendium entries and glossary terms.

### Multiplayer Race
* 100–500 player rooms using server-authoritative simulation.
* Slipstream, bumping, and power-ups add strategic depth.
* First player to bind to the zona pellucida triggers the polyspermy block and ends the race.

## Game Flow
1. Boot → Menu → Tutorial or Multiplayer Lobby.
2. Lobby matchmaking with quick-join and private room codes.
3. Countdown, region-based racing with live HUD feedback.
4. Finish screen highlighting binder, science recap, and replay ghost.

## Mechanics Overview
| Mechanic | Description | Teaching Moment |
| --- | --- | --- |
| **Fluid Flows** | Regional flow fields influence movement vectors. | Visualize mucus viscosity and cilia motion. |
| **Capacitation Meter** | Gradual percentage increase enabling later gates. | Explains biochemical priming over hours. |
| **Hyperactivation** | Burst movement with high angular velocity, limited stamina. | Demonstrates changes in flagellar beating. |
| **Chemotaxis** | Soft steering bias toward gradients near oocyte. | Introduces chemical signaling and orientation. |
| **UTJ Checkpoint** | Requires capacitation threshold and aligned velocity. | Highlights selective passage into the oviduct. |
| **Acrosome Window** | Timed ability triggered near oocyte. | Explains enzyme release needed for binding. |
| **Immune Patrols** | Nonviolent guardians that slow stunned players. | Describes immune interactions in uterus. |
| **Power-ups** | Buffs like alkaline buffer, navigation ping, mucus slip. | Reinforces scientific countermeasures. |

## Regions & Progression
1. **Vagina** – Acidic baseline (pH ~4); tutorial flows; stamina management.
2. **Cervix** – Fertile microchannels; RNG bias for morphological selectivity.
3. **Uterus** – Wide lumen; contraction pulses pushing players forward.
4. **Utero-Tubal Junction** – Narrow gate; capacitation threshold + velocity window.
5. **Isthmus Reservoir** – Binding/unbinding cycles; power-up-driven release.
6. **Ampulla** – Cumulus matrix drag; chemotactic guidance; acrosome timing.

## Systems
* **ECS** – bitecs-based architecture for components and systems.
* **Networking** – Socket.IO with msgpackr binary payloads; zod validation.
* **Physics** – Deterministic flows and collisions using seeded RNG per room.
* **Content** – JSON-driven region data for quick iteration.

## Accessibility
* Adjustable font scale and contrast modes.
* Reduced motion option disables intense camera shakes.
* Optional tooltip narration via Web Speech API.
* Controller remapping and single-button assist.

## Telemetry & Privacy
* Telemetry disabled by default. Optional anonymized metrics: level completion, dropout points, accessibility toggle usage.
* GDPR-compliant data handling with clear opt-in prompts.

## Live Ops Considerations
* Daily rotating challenges with educational facts.
* Seasonal events themed around reproductive science milestones.
* Classroom mode for synchronized lessons.
