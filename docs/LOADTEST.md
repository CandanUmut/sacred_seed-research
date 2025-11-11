# Load & Soak Testing

This guide explains how to stress the multiplayer stack and interpret the telemetry it produces.

## Tooling

- `tools/dev/swarm.ts` — spawns multiple headless bot processes that join rooms and drive scripted inputs.
- `tools/dev/bot.ts` — single bot implementation used by the swarm.
- `tools/load/artillery.yml` — optional Socket.IO Artillery scenario for HTTP-based load.

All scripts rely on the same environment variables:

- `SERVER_URL` — websocket URL, e.g. `ws://localhost:8787`.
- `BOTS` — number of concurrent bots (default 8).
- `DURATION` — duration in seconds (swarm only).

## Running a soak locally

```bash
npm run build --workspaces
npm -w server run dev &
SERVER_URL=ws://localhost:8787 BOTS=60 DURATION=300 node tools/dev/swarm.js
curl http://localhost:8787/metrics
```

Expect the following Prometheus metrics after a healthy run:

| Metric | Target |
| --- | --- |
| `server_tick_ms{quantile="0.95"}` | ≤ 6 ms |
| `snapshot_bytes_avg` | ≤ 600 |
| `clients_connected` | 60 |
| `rooms_active` | Depends on sharding |

## CI integration

The GitHub Actions workflow (`.github/workflows/ci.yml`) executes a 5 minute soak with 60 bots. Metrics are scraped at the end and summarised into `test-summary.md`. Failing to meet the targets causes the CI job to mark the run as unstable.

## Debugging poor performance

- Check `server.log` for warnings about slow clients or resyncs.
- Look at `room_bytes_out_total` to understand bandwidth spikes.
- If Redis is enabled, inspect Pub/Sub latency (`redis-cli monitor`).
- Use the `--inspect` flag on a single shard to profile GC pauses.

