# Science Notes – Sperm Odyssey

Sperm Odyssey emphasizes accurate yet approachable biology. The following notes describe the scientific ranges, simplifications, and references that informed gameplay tuning. All language remains PG and abstract.

## Key Processes

### Capacitation
* Begins shortly after ejaculation and continues for 4–12 hours.
* Modeled as a meter that rises with time in each region; faster gains in the uterus and isthmus.
* Required to pass the utero-tubal junction and to prime the acrosome reaction.

### Hyperactivation
* Triggered near the oviduct as ion channels alter flagellar beating.
* Presented as a stamina-based burst mode with higher angular velocity.
* Cooldown encourages strategic timing while teaching the concept of energy expenditure.

### Chemotaxis
* Chemical cues from the oocyte guide sperm in the ampulla.
* Simulated with a gentle steering bias plus optional HUD guidance for accessibility.

### Acrosome Reaction & Zona Binding
* Enzymes release after capacitation and contact with the zona pellucida.
* Represented by a timed interaction window once players reach the ampulla region.
* First successful binder triggers a polyspermy block (race finish).

## Regional Environment Ranges
| Region | pH (approx.) | Flow Notes | Gameplay Representation |
| --- | --- | --- | --- |
| Vagina | 3.8–4.5 | Acidic; seminal buffer raises temporarily. | Slow stamina regeneration; acidic debuff mitigated by power-ups. |
| Cervix | 6.5–7.5 (fertile window) | Selective mucus channels. | Narrow gates with RNG bias; flow fields along channels. |
| Uterus | ~7.0 | Contractile waves toward UTJ. | Periodic velocity pulses and immune patrol density. |
| UTJ | ~7.2 | Extremely narrow passage. | Biology gate requiring capacitation threshold and velocity alignment. |
| Isthmus | 7.2–7.8 | Gentle cilia flow; reservoir binding. | Temporary hold state with timed release and hyperactivation cues. |
| Ampulla | 7.8–8.0 | Chemotactic gradient near oocyte. | Draggy medium with gradient arrow and acrosome window trigger. |

## Simplifications
* All visuals abstracted as glowing channels, drift particles, and geometric guardians.
* Time compression ensures a full journey lasts minutes, not hours.
* Immune patrols stun rather than destroy to maintain PG tone.
* Morphological selectivity implemented as cosmetic RNG modifiers only.

## Sources & Suggested Reading
* Mortimer, D. “Practical Laboratory Andrology.” (2008)
* Suarez, S. S. “Control of Hyperactivation in Sperm.” Human Reproduction Update (2008)
* Eisenbach, M. “Sperm Chemotaxis.” Annual Review of Physiology (2004)
* World Health Organization. “Laboratory Manual for the Examination of Human Semen.” (2010)

These references informed the numeric ranges in `client/src/science/data/*.json`. Adjustments maintain educational accuracy while supporting engaging gameplay.
