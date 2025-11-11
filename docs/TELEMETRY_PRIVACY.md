# Telemetry & Privacy

Telemetry is disabled by default. The project favors classroom and self-directed learning environments with clear consent.

## Guiding Principles
* **Opt-in only** – Players must actively enable telemetry.
* **Minimal collection** – Aggregate metrics only; no personal data or identifiers.
* **Transparency** – Settings panel describes what is tracked and why.
* **Revocable** – Players can opt-out at any time, wiping cached metrics.

## Potential Metrics (Disabled by Default)
* Level completion times and dropout points.
* Accessibility toggles usage (anonymous counts).
* Average room size and race duration for performance tuning.

## Data Handling
* Metrics stored locally and batched to the server only when opted in.
* Server stores anonymized data in memory or a configured analytics sink.
* Logs exclude IP addresses and socket identifiers beyond transient runtime IDs.

## Compliance
* GDPR-friendly: explicit consent, right to deletion, and clear privacy notice.
* FERPA-ready: no personal student data collected; instructors can export local-only CSVs.

## Developer Checklist
1. Default telemetry toggle to **off**.
2. Display privacy policy link before opt-in.
3. Provide “Erase Local Metrics” button.
4. Guard analytics endpoints on the server to respect opt-out states.
