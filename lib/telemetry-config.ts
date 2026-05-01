const FLEET_BASE =
  process.env.TESLA_FLEET_BASE_URL ?? "https://fleet-api.prd.na.vn.cloud.tesla.com"

const TELEMETRY_HOST =
  process.env.TELEMETRY_HOST ?? process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, "")

const TELEMETRY_PORT = process.env.TELEMETRY_PORT ?? "4443"

export interface TelemetryConfigResult {
  vin: string
  success: boolean
  response?: unknown
  error?: string
}

// Fields we want Tesla to stream for wall connector power monitoring
const CHARGING_FIELDS = [
  { name: "DetailedChargeState",     interval_seconds: 10 },
  { name: "ACChargingPower",         interval_seconds: 5  },
  { name: "ACChargingEnergyIn",      interval_seconds: 10 },
  { name: "ChargeAmps",              interval_seconds: 10 },
  { name: "ChargerVoltage",          interval_seconds: 10 },
  { name: "ChargeLimitSoc",          interval_seconds: 30 },
  { name: "BatteryLevel",            interval_seconds: 30 },
  { name: "EstBatteryRange",         interval_seconds: 30 },
  { name: "ChargeCurrentRequest",    interval_seconds: 10 },
  { name: "ChargeCurrentRequestMax", interval_seconds: 30 },
]

export async function registerVehicleForTelemetry(
  accessToken: string,
  vin: string,
): Promise<TelemetryConfigResult> {
  if (!TELEMETRY_HOST) {
    return { vin, success: false, error: "TELEMETRY_HOST env var not set" }
  }

  const config = {
    hostname: TELEMETRY_HOST,
    port: Number(TELEMETRY_PORT),
    ca: null as string | null, // Set to your TLS CA cert PEM if using a self-signed cert
    fields: Object.fromEntries(
      CHARGING_FIELDS.map(({ name, interval_seconds }) => [name, { interval_seconds }]),
    ),
  }

  // Optionally load the CA cert if available
  try {
    const { readFileSync } = await import("fs")
    const { join } = await import("path")
    config.ca = readFileSync(join(process.cwd(), "server.crt"), "utf-8")
  } catch {
    // No CA cert — use system roots (only works if the cert is signed by a known CA)
  }

  const res = await fetch(`${FLEET_BASE}/api/1/vehicles/${vin}/fleet_telemetry_config`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ config }),
  })

  const json = await res.json()

  if (!res.ok) {
    return {
      vin,
      success: false,
      error: `Tesla API ${res.status}: ${JSON.stringify(json)}`,
      response: json,
    }
  }

  return { vin, success: true, response: json }
}

export async function getVehicleList(accessToken: string): Promise<{ vin: string; display_name: string }[]> {
  const res = await fetch(`${FLEET_BASE}/api/1/vehicles`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return []
  const json = await res.json()
  return (json.response ?? []) as { vin: string; display_name: string }[]
}
