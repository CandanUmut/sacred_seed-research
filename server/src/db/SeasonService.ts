import { randomUUID } from 'node:crypto';
import { updateRatings } from '@sperm-odyssey/shared';
import { createSqlClient, type SqlClient } from './client.js';

export interface MatchParticipant {
  playerId: string;
  name: string;
  place: number;
  timeMs: number;
}

export interface LeaderboardRow {
  playerId: string;
  name: string;
  rating: number;
  bestTimeMs: number | null;
}

export class SeasonService {
  private readonly sql: SqlClient;
  private ready: Promise<void>;

  constructor() {
    this.sql = createSqlClient();
    this.ready = this.bootstrap();
  }

  async recordMatch(params: {
    seasonId?: string;
    roomId: string;
    seed: string;
    startedAt: Date;
    finishedAt: Date;
    participants: MatchParticipant[];
  }): Promise<void> {
    await this.ready;
    const season = params.seasonId ?? (await this.ensureCurrentSeason());
    const valid = params.participants.filter((p) => p.place > 0);
    if (valid.length < 2) return;
    await this.sql.transaction(async (tx) => {
      for (const participant of valid) {
        await ensurePlayer(tx, participant.playerId, participant.name);
        await ensureRating(tx, participant.playerId, season);
      }
      const matchId = randomUUID();
      await tx.exec(
        `INSERT INTO matches (id, season_id, room_id, seed, started_at, finished_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [matchId, season, params.roomId, params.seed, params.startedAt.toISOString(), params.finishedAt.toISOString()],
      );
      const ratings = await Promise.all(
        valid.map(async (entry) => {
          const row = await tx.get<{ rating: number }>(
            `SELECT rating FROM ratings WHERE player_id=? AND season_id=?`,
            [entry.playerId, season],
          );
          return { playerId: entry.playerId, rating: row?.rating ?? 1000, place: entry.place };
        }),
      );
      const updates = updateRatings(ratings);
      for (const update of updates) {
        await tx.exec(`UPDATE ratings SET rating=? WHERE player_id=? AND season_id=?`, [update.next, update.playerId, season]);
      }
      for (const participant of valid) {
        const delta = updates.find((u) => u.playerId === participant.playerId)?.delta ?? 0;
        await tx.exec(
          `INSERT INTO results (match_id, player_id, place, time_ms, rating_delta)
           VALUES (?, ?, ?, ?, ?)`,
          [matchId, participant.playerId, participant.place, participant.timeMs, delta],
        );
      }
    });
  }

  async ensureCurrentSeason(): Promise<string> {
    await this.ready;
    const season = await this.sql.get<{ id: string }>(
      `SELECT id FROM seasons WHERE starts_at <= CURRENT_TIMESTAMP AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP) ORDER BY starts_at DESC LIMIT 1`,
    );
    if (season?.id) return season.id;
    const id = randomUUID();
    await this.sql.exec(`INSERT INTO seasons (id, label, starts_at) VALUES (?, ?, CURRENT_TIMESTAMP)`, [id, 'Preseason']);
    return id;
  }

  async getLeaderboard(seasonId: string, limit = 20, offset = 0): Promise<LeaderboardRow[]> {
    await this.ready;
    const rows = await this.sql.all<LeaderboardRow & { best: number | null }>(
      `SELECT r.player_id AS "playerId", p.name, r.rating, MIN(res.time_ms) AS "best"
       FROM ratings r
       JOIN players p ON p.id = r.player_id
       LEFT JOIN results res ON res.player_id = r.player_id AND res.match_id IN (
         SELECT id FROM matches WHERE season_id = ?
       )
       WHERE r.season_id = ?
       GROUP BY r.player_id, p.name, r.rating
       ORDER BY r.rating DESC
       LIMIT ? OFFSET ?`,
      [seasonId, seasonId, limit, offset],
    );
    return rows.map((row) => ({ playerId: row.playerId, name: row.name, rating: row.rating, bestTimeMs: row.best ?? null }));
  }

  async startSeason(label: string, startsAt: Date, endsAt?: Date): Promise<string> {
    await this.ready;
    const id = randomUUID();
    await this.sql.transaction(async (tx) => {
      await tx.exec(`UPDATE seasons SET ends_at=? WHERE ends_at IS NULL`, [startsAt.toISOString()]);
      await tx.exec(`INSERT INTO seasons (id, label, starts_at, ends_at) VALUES (?,?,?,?)`, [
        id,
        label,
        startsAt.toISOString(),
        endsAt ? endsAt.toISOString() : null,
      ]);
      const latest = await tx.all<{ player_id: string; rating: number }>(
        `SELECT player_id, rating FROM ratings WHERE season_id = (SELECT id FROM seasons ORDER BY starts_at DESC LIMIT 1 OFFSET 1)`,
      );
      for (const row of latest) {
        await tx.exec(`INSERT INTO ratings (player_id, season_id, rating) VALUES (?,?,?)`, [row.player_id, id, row.rating]);
      }
    });
    return id;
  }

  async getSeason(id: string): Promise<{ id: string; label: string; startsAt: string; endsAt: string | null } | undefined> {
    await this.ready;
    const row = await this.sql.get<{ id: string; label: string; starts_at: string; ends_at: string | null }>(
      `SELECT id, label, starts_at, ends_at FROM seasons WHERE id=?`,
      [id],
    );
    if (!row) return undefined;
    return { id: row.id, label: row.label, startsAt: row.starts_at, endsAt: row.ends_at };
  }

  private async bootstrap(): Promise<void> {
    const schemaPath = new URL('./schema.sql', import.meta.url);
    let sql: string;
    try {
      const { readFileSync } = await import('node:fs');
      sql = readFileSync(schemaPath, 'utf8');
    } catch (error) {
      sql = FALLBACK_SCHEMA;
    }
    await this.sql.exec(sql);
  }
}

async function ensurePlayer(client: SqlClient, id: string, name: string): Promise<void> {
  const existing = await client.get<{ id: string }>(`SELECT id FROM players WHERE id=?`, [id]);
  if (existing?.id) {
    await client.exec(`UPDATE players SET name=? WHERE id=?`, [name, id]);
    return;
  }
  await client.exec(`INSERT INTO players (id, name) VALUES (?,?)`, [id, name]);
}

async function ensureRating(client: SqlClient, playerId: string, seasonId: string): Promise<void> {
  const existing = await client.get<{ rating: number }>(`SELECT rating FROM ratings WHERE player_id=? AND season_id=?`, [playerId, seasonId]);
  if (existing) return;
  await client.exec(`INSERT INTO ratings (player_id, season_id, rating) VALUES (?,?,?)`, [playerId, seasonId, 1000]);
}

const FALLBACK_SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES seasons(id),
  room_id TEXT NOT NULL,
  seed TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS results (
  match_id TEXT NOT NULL REFERENCES matches(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  place INTEGER NOT NULL,
  time_ms INTEGER NOT NULL,
  rating_delta INTEGER NOT NULL,
  PRIMARY KEY (match_id, player_id)
);

CREATE TABLE IF NOT EXISTS ratings (
  player_id TEXT NOT NULL REFERENCES players(id),
  season_id TEXT NOT NULL REFERENCES seasons(id),
  rating INTEGER NOT NULL DEFAULT 1000,
  PRIMARY KEY (player_id, season_id)
);

CREATE TABLE IF NOT EXISTS bans (
  player_id TEXT PRIMARY KEY,
  reason TEXT,
  expires_at TIMESTAMP
);
`;
