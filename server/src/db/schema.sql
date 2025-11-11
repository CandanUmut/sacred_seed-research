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
