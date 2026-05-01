import { randomUUID } from "crypto"
import type { LiveStatus } from "./types"
import { getDb } from "./db"

interface OpenSessionRow {
  id: string
  started_at: number
  last_ts: number
  peak_power_w: number
  total_energy_wh: number
}

const findOpen = () =>
  getDb().prepare<[string], OpenSessionRow>(
    `SELECT id, started_at, last_ts, peak_power_w, total_energy_wh
     FROM charging_sessions
     WHERE wall_connector_id = ? AND ended_at IS NULL
     LIMIT 1`,
  )

const insertSession = () =>
  getDb().prepare(
    `INSERT INTO charging_sessions (id, vin, wall_connector_id, started_at, last_ts, source)
     VALUES (@id, @vin, @wall_connector_id, @started_at, @started_at, 'polling')`,
  )

const updateSession = () =>
  getDb().prepare(
    `UPDATE charging_sessions
     SET peak_power_w = @peak, total_energy_wh = @energy, last_ts = @ts
     WHERE id = @id`,
  )

const closeSession = () =>
  getDb().prepare(
    `UPDATE charging_sessions
     SET ended_at = @ended_at, peak_power_w = @peak, total_energy_wh = @energy
     WHERE id = @id`,
  )

const insertTelemetry = () =>
  getDb().prepare(
    `INSERT INTO charging_telemetry (session_id, ts, power_w, state, battery_level_pct, energy_wh_cumulative)
     VALUES (@session_id, @ts, @power_w, @state, @battery_level_pct, @energy_wh_cumulative)`,
  )

// Lazy-init prepared statements so they're created after the DB schema is set up
let _stmts: ReturnType<typeof prepareStatements> | null = null

function stmts() {
  if (!_stmts) _stmts = prepareStatements()
  return _stmts
}

function prepareStatements() {
  return {
    findOpen: findOpen(),
    insertSession: insertSession(),
    updateSession: updateSession(),
    closeSession: closeSession(),
    insertTelemetry: insertTelemetry(),
  }
}

export function trackLiveStatus(status: LiveStatus): void {
  const wcs = status.wall_connectors
  if (!wcs || wcs.length === 0) return

  const now = Date.now()
  const s = stmts()

  for (const wc of wcs) {
    const wcId = wc.wall_connector_id
    const isCharging = wc.wall_connector_state === 3
    const open = s.findOpen.get(wcId)

    if (isCharging) {
      if (!open) {
        const id = randomUUID()
        s.insertSession.run({
          id,
          vin: wc.vin ?? null,
          wall_connector_id: wcId,
          started_at: now,
        })
        s.insertTelemetry.run({
          session_id: id,
          ts: now,
          power_w: wc.wall_connector_power,
          state: wc.wall_connector_state,
          battery_level_pct: null,
          energy_wh_cumulative: null,
        })
      } else {
        // Trapezoidal integration: ΔE = P × Δt
        const dtHours = (now - (open.last_ts ?? open.started_at)) / 3_600_000
        const deltaWh = wc.wall_connector_power * dtHours
        const newEnergy = open.total_energy_wh + deltaWh
        const newPeak = Math.max(open.peak_power_w, wc.wall_connector_power)

        s.updateSession.run({ peak: newPeak, energy: newEnergy, ts: now, id: open.id })
        s.insertTelemetry.run({
          session_id: open.id,
          ts: now,
          power_w: wc.wall_connector_power,
          state: wc.wall_connector_state,
          battery_level_pct: null,
          energy_wh_cumulative: newEnergy,
        })
      }
    } else if (open) {
      s.closeSession.run({
        ended_at: now,
        peak: open.peak_power_w,
        energy: open.total_energy_wh,
        id: open.id,
      })
    }
  }
}
