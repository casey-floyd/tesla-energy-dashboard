import { getDb } from "@/lib/db"
import type { ChargingSession } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const db = getDb()

    const rows = db
      .prepare<[], ChargingSession>(
        `SELECT
           id, vin, wall_connector_id, started_at, ended_at,
           peak_power_w, total_energy_wh, estimated_cost_cents, rate_plan, source,
           (strftime('%s','now') * 1000 - started_at) / 1000 AS duration_s
         FROM charging_sessions
         WHERE ended_at IS NULL
         ORDER BY started_at DESC`,
      )
      .all()

    return Response.json({ active: rows })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    )
  }
}
