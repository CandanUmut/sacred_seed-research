# Seasons & Leaderboards

The competitive layer runs in discrete seasons. Ratings reset at the start of each season while long-term stats remain available for moderation.

## Schema overview

The SQL schema is shared between SQLite (development) and PostgreSQL (production):

- `players` — registered pilots. `name` is sanitised server-side.
- `seasons` — seasonal metadata including `starts_at`/`ends_at`.
- `matches` — one row per race with `seed`, `room_id`, and duration.
- `results` — placement data for each participant, plus finishing time and rating delta.
- `ratings` — per-season running rating (defaults to 1000 at season start).
- `bans` — optional table to store banned player ids and reasons.

Migrations live under `server/src/db/migrations/`. Run them through the `db:migrate` npm script. Development uses SQLite with the file `./var/data/dev.sqlite`. Production connects to PostgreSQL using `DATABASE_URL`.

## Rating updates

`shared/src/rating.ts` implements an Elo-inspired two-player aggregation that generalises to multiple racers. Race rooms call `SeasonService.recordMatch` once a finish packet is produced. The service:

1. Ensures players exist in the database.
2. Starts a transaction inserting `matches` and `results` rows.
3. Updates the `ratings` table using the shared helper.
4. Emits Prometheus counters for leaderboard updates.

Ratings are clamped to `[500, 3000]` to avoid runaway numbers.

## Resets & archival

The `SeasonService.startSeason(label, startsAt, endsAt)` helper closes the current season and rolls forward ratings. When a new season is opened the latest rating for each player becomes the seed rating for the next season. Historic results remain queryable for audit purposes.

## APIs

- `GET /api/seasons/current` — returns the active season metadata.
- `GET /api/seasons/:id/leaderboard` — paginated top N players with rating & best time.
- `POST /api/seasons` — admin-only season creation.

The client UI consumes the leaderboard endpoint to render the ladder with localised strings.

## Anti-abuse notes

- Anonymous users stay in the “casual” ladder; only authenticated pilots enter ranked queues.
- Matches shorter than 15 seconds or with fewer than 2 finishers are discarded from ranked calculations.
- Detection hooks exist for suspicious rating jumps; see `SeasonService.flagAnomaly`.

