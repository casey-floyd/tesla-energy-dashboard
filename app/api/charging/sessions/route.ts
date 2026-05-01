import { getDb } from "@/lib/db"
import type { ChargingSession } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100)
  const offset = Number(searchParams.get("offset") ?? "0")
  const vin = searchParams.get("vin")

  try {
    const db = getDb()

    const where = vin ? "WHERE vin = ?" : ""
    const args = vin ? [vin, limit, offset] : [limit, offset]

    const rows = db
      .prepare<unknown[], ChargingSession>(
        `SELECT
           id, vin, wall_connector_id, started_at, ended_at,
           peak_power_w, total_energy_wh, estimated_cost_cents, rate_plan, source,
           CASE WHEN ended_at IS NOT NULL THEN (ended_at - started_at) / 1000 ELSE NULL END AS duration_s
         FROM charging_sessions
         ${where}
         ORDER BY started_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...args)

    const total = (
      db
        .prepare<unknown[], { count: number }>(
          `SELECT COUNT(*) AS count FROM charging_sessions ${where}`,
        )
        .get(...(vin ? [vin] : [])) ?? { count: 0 }
    ).count

    return Response.json({ sessions: rows, total, limit, offset })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    )
  }
}
