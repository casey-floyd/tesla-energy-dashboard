import { getDb } from "@/lib/db"
import type { ChargingSession, ChargingSessionDetail, ChargingTelemetryPoint } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const db = getDb()

    const session = db
      .prepare<[string], ChargingSession>(
        `SELECT
           id, vin, wall_connector_id, started_at, ended_at,
           peak_power_w, total_energy_wh, estimated_cost_cents, rate_plan, source,
           CASE WHEN ended_at IS NOT NULL THEN (ended_at - started_at) / 1000 ELSE NULL END AS duration_s
         FROM charging_sessions WHERE id = ?`,
      )
      .get(id)

    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 })
    }

    const telemetry = db
      .prepare<[string], ChargingTelemetryPoint>(
        `SELECT ts, power_w, state, battery_level_pct, energy_wh_cumulative
         FROM charging_telemetry WHERE session_id = ? ORDER BY ts ASC`,
      )
      .all(id)

    const detail: ChargingSessionDetail = { ...session, telemetry }
    return Response.json(detail)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    )
  }
}
