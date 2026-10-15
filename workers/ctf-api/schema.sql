-- Mini-CTF leaderboard (Cloudflare D1). Run once in the D1 console.
CREATE TABLE IF NOT EXISTS sessions (
  id       TEXT PRIMARY KEY,           -- random UUID kept in the player's browser
  created  INTEGER NOT NULL,           -- unix time of the first valid flag
  found    TEXT NOT NULL DEFAULT '[]', -- JSON [{n, t}] : flag number + server time
  attempts INTEGER NOT NULL DEFAULT 0,
  finished INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS scores (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  sid     TEXT NOT NULL UNIQUE,
  pseudo  TEXT NOT NULL UNIQUE COLLATE NOCASE,
  score   INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS scores_rank ON scores (score DESC, seconds ASC);
