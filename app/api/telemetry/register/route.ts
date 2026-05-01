import { resolveAccessToken } from "@/lib/api-utils"
import { getVehicleList, registerVehicleForTelemetry } from "@/lib/telemetry-config"

export const dynamic = "force-dynamic"

// GET — list vehicles that can be registered
export async function GET() {
  const accessToken = await resolveAccessToken()
  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const vehicles = await getVehicleList(accessToken)
    return Response.json({ vehicles })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to list vehicles" },
      { status: 500 },
    )
  }
}

// POST — register one or all vehicles for telemetry streaming
// Body: { vin?: string }  — omit vin to register all vehicles
export async function POST(req: Request) {
  const accessToken = await resolveAccessToken()
  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { vin?: string } = {}
  try {
    body = await req.json()
  } catch { /* no body */ }

  try {
    let vins: string[]

    if (body.vin) {
      vins = [body.vin]
    } else {
      const vehicles = await getVehicleList(accessToken)
      vins = vehicles.map((v) => v.vin)
    }

    if (vins.length === 0) {
      return Response.json({ error: "No vehicles found on this account" }, { status: 404 })
    }

    const results = await Promise.all(
      vins.map((vin) => registerVehicleForTelemetry(accessToken, vin)),
    )

    return Response.json({ results })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Registration failed" },
      { status: 500 },
    )
  }
}
