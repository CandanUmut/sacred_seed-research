# Replays & Ghost Racing

This document describes how deterministic replays are recorded, stored, and played back within *Sperm Odyssey*.

## Determinism contract

The simulation is authoritative on the server. Every race room is initialised with a seed derived from the room id. All random number generation for the physics world goes through the shared `Rng` helper which is seeded with this value. The ECS and world step never access `Date.now()` or other non-deterministic sources; instead the fixed tick rate (`TICK_RATE`) dictates the flow of time. Any code that needs a timestamp must rely on the tick counter.

When adding new systems or gameplay elements:

- Accept the current tick as an argument instead of reading the wall clock.
- Avoid floating point drift by limiting math to deterministic functions (no `Math.random`).
- Ensure network inputs are pure data; do not mutate them before recording.

## Replay blob format

Replays are stored as a packed msgpack structure that matches the schema in `shared/src/replay.ts`:

```ts
{
  header: {
    version: 1,
    seed: number,
    worldHash: string,
    startedAt: number
  },
  inputs: Array<{ t, id, u, d, l, r, ha }>
}
```

The header captures all configuration necessary to reconstruct the original world. The `inputs` array is an ordered sequence of per-player inputs, one entry per client message. Inputs are recorded as the server consumes them to ensure the authoritative tick ordering is kept.

## Recording

`server/src/replay/Recorder.ts` owns the input buffer for a race. A recorder is attached to each `RaceRoom` once the countdown finishes. On every `handleInputs` call the frames are appended to the buffer alongside the current authoritative tick. When the race ends the recorder serialises the blob with `msgpackr` and persists it via the `ReplayStore` (filesystem in development, database blob in production).

## Playback & Ghosts

`server/src/replay/Player.ts` offers a headless replayer. Given the binary blob and a factory for a fresh `SimWorld`, the player applies the recorded inputs tick-by-tick and samples entity positions at 10 Hz. These samples become ghost paths which the client renders using the `Ghost` system (`client/src/game/replay/Ghost.ts`). The player is also used server-side to derive leaderboards and export data for analytics.

## Import / export

The REST API exposes:

- `GET /api/replays/:id` → downloads the msgpack blob (sends `application/msgpack`).
- `POST /api/replays` → uploads a blob for analysis or community sharing; the payload is validated against the shared schema and capped to 2 MiB.

Replays are stored under `./replays` in development (gitignored) and inside the SQL database in production. The `ReplayStore` automatically chooses the correct backend.

## Ghost racing UX

The client fetches the latest personal best replay when loading a track. Ghosts are rendered as translucent sprites with colour-coded trails. The path renderer is decoupled from the live ECS so it has no impact on determinism. Multiple ghosts can be layered (e.g. world record + personal best).

## Testing determinism

`server/tests/e2e/replay.spec.ts` records a short race with scripted inputs, replays it, and asserts that the sampled ghost path matches the live run. Any new gameplay features must maintain this invariant. Run `npm run test --workspace=server` before opening a pull request.

