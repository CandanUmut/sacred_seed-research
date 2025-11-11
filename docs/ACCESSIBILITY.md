# Accessibility Guidelines

Sperm Odyssey aims to be inclusive and comfortable for learners of all ages. Accessibility features are available in-game via the Settings panel.

## Visuals
* Adjustable UI scale from 80% to 160%.
* High-contrast color palette toggle and three colorblind-friendly themes.
* Reduced motion mode removes intense camera shake and dampens flow particle speed.

## Audio
* Master volume, music, and effects sliders with numerical readouts.
* Optional tooltip narration using the Web Speech API when supported.

## Input
* Keyboard (WASD / arrow keys) and gamepad support with remapping.
* Single-button assist mode converts hyperactivation to a hold-to-charge mechanic.
* Sticky key detection to prevent accidental continuous input.

## Cognitive
* Tooltips provide plain-language descriptions of biological terms.
* Compendium entries summarize each region and mechanic with context.
* Session summaries reinforce learning goals and highlight optional further reading.

## Settings Persistence
* Preferences stored locally via `localStorage` and rehydrated on boot.
* Profiles allow quick switching between default, classroom, and accessibility-focused presets.

## Testing Checklist
* Verify UI readability at minimum and maximum scaling.
* Confirm colorblind palettes maintain contrast for key HUD elements.
* Ensure narration gracefully degrades when the Web Speech API is unavailable.
