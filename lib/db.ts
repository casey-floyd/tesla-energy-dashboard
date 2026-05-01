import type { Database } from "better-sqlite3"
import path from "path"

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "charging.db")

let _db: Database | null = null
let _unavailable = false

export function getDb(): Database {
  if (_unavailable) throw new Error("SQLite unavailable in this environment")
  if (_db) return _db

  try {
    // Dynamic require so module load doesn't crash on Vercel (native binary absent).
    // All callers already wrap getDb() in try/catch so failures are non-fatal.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SqliteDB = require("better-sqlite3") as { new(p: string): Database }
    _db = new SqliteDB(DB_PATH)
    _db.pragma("journal_mode = WAL")
    _db.pragma("foreign_keys = ON")
    initSchema(_db)
    return _db
  } catch (err) {
    _unavailable = true
    throw err
  }
}

function initSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS charging_sessions (
      id            TEXT    PRIMARY KEY,
      vin           TEXT,
      wall_connector_id TEXT,
      started_at    INTEGER NOT NULL,
      ended_at      INTEGER,
      last_ts       INTEGER,
      peak_power_w  INTEGER NOT NULL DEFAULT 0,
      total_energy_wh REAL  NOT NULL DEFAULT 0,
      estimated_cost_cents REAL,
      rate_plan     TEXT,
      source        TEXT    NOT NULL DEFAULT 'polling'
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_started
      ON charging_sessions(started_at DESC);

    CREATE INDEX IF NOT EXISTS idx_sessions_vin
      ON charging_sessions(vin);

    CREATE INDEX IF NOT EXISTS idx_sessions_open
      ON charging_sessions(wall_connector_id, ended_at)
      WHERE ended_at IS NULL;

    CREATE TABLE IF NOT EXISTS charging_telemetry (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id            TEXT    NOT NULL REFERENCES charging_sessions(id),
      ts                    INTEGER NOT NULL,
      power_w               INTEGER NOT NULL,
      state                 INTEGER,
      battery_level_pct     REAL,
      energy_wh_cumulative  REAL
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_session
      ON charging_telemetry(session_id, ts);
  `)
}
