/**
 * Register your Tesla vehicle(s) to stream telemetry to the local telemetry server.
 *
 * Prerequisites:
 *   1. Telemetry server is running: cd ../telemetry-server && npm run dev
 *   2. Port 4443 is open/forwarded to this machine
 *   3. You have a Tesla OAuth refresh token (get it from /api/tesla/capture-token
 *      after logging into the dashboard, or set TESLA_REFRESH_TOKEN in .env.local)
 *
 * Usage:
 *   # Load env first, then run:
 *   node -r dotenv/config scripts/register-telemetry.mjs   # if dotenv installed
 *   # OR manually export the vars:
 *   TESLA_REFRESH_TOKEN=xxx TESLA_CLIENT_ID=yyy TESLA_CLIENT_SECRET=zzz \
 *     node scripts/register-telemetry.mjs
 */

import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

// Load .env.local manually (no dotenv dependency needed)
try {
  const env = readFileSync(join(ROOT, ".env.local"), "utf-8")
  for (const line of env.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] ??= match[2].trim()
  }
} catch { /* .env.local not found, rely on shell env */ }

const REFRESH_TOKEN = process.env.TESLA_REFRESH_TOKEN
const CLIENT_ID     = process.env.TESLA_CLIENT_ID
const CLIENT_SECRET = process.env.TESLA_CLIENT_SECRET
const FLEET_BASE    = process.env.TESLA_FLEET_BASE_URL ?? "https://fleet-api.prd.na.vn.cloud.tesla.com"
const TELEMETRY_HOST = process.env.TELEMETRY_HOST ?? "dev.caseyfloyd.com"
const TELEMETRY_PORT = Number(process.env.TELEMETRY_PORT ?? "4443")
const CERT_PATH     = join(__dirname, "../telemetry-server/server.crt")

if (!REFRESH_TOKEN || !CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Missing required env vars. Need:\n" +
    "  TESLA_REFRESH_TOKEN — get from https://dev.caseyfloyd.com/api/tesla/capture-token\n" +
    "  TESLA_CLIENT_ID\n" +
    "  TESLA_CLIENT_SECRET\n",
  )
  process.exit(1)
}

// Step 1: Exchange refresh token for access token
console.log("Step 1: Exchanging refresh token for access token...")
const tokenRes = await fetch("https://auth.tesla.com/oauth2/v3/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
  }),
})

const tokenData = await tokenRes.json()
if (!tokenRes.ok) {
  console.error("Token exchange failed:", JSON.stringify(tokenData, null, 2))
  process.exit(1)
}
const accessToken = tokenData.access_token
console.log("Access token obtained.\n")

// Step 2: List vehicles
console.log("Step 2: Listing vehicles on this account...")
const vehiclesRes = await fetch(`${FLEET_BASE}/api/1/vehicles`, {
  headers: { Authorization: `Bearer ${accessToken}` },
})
const vehiclesData = await vehiclesRes.json()
const vehicles = vehiclesData.response ?? []

if (vehicles.length === 0) {
  console.log("No vehicles found on this account.")
  process.exit(0)
}

console.log(`Found ${vehicles.length} vehicle(s):`)
for (const v of vehicles) {
  console.log(`  ${v.vin}  ${v.display_name ?? ""}`)
}
console.log()

// Step 3: Load the telemetry server TLS cert (for self-signed cert trust)
let caPem = null
try {
  caPem = readFileSync(CERT_PATH, "utf-8")
  console.log(`Loaded CA cert from ${CERT_PATH}`)
} catch {
  console.log("No CA cert found — Tesla will use system roots. Only works with a CA-signed cert.")
}
console.log()

// Step 4: Register each vehicle
const CHARGING_FIELDS = {
  DetailedChargeState:     { interval_seconds: 10 },
  ACChargingPower:         { interval_seconds: 5  },
  ACChargingEnergyIn:      { interval_seconds: 10 },
  ChargeAmps:              { interval_seconds: 10 },
  ChargerVoltage:          { interval_seconds: 10 },
  ChargeLimitSoc:          { interval_seconds: 30 },
  BatteryLevel:            { interval_seconds: 30 },
  EstBatteryRange:         { interval_seconds: 30 },
  ChargeCurrentRequest:    { interval_seconds: 10 },
  ChargeCurrentRequestMax: { interval_seconds: 30 },
}

for (const vehicle of vehicles) {
  console.log(`Step 3: Registering ${vehicle.vin} (${vehicle.display_name ?? ""})...`)

  const config = {
    hostname: TELEMETRY_HOST,
    port: TELEMETRY_PORT,
    ...(caPem ? { ca: caPem } : {}),
    fields: CHARGING_FIELDS,
  }

  const regRes = await fetch(`${FLEET_BASE}/api/1/vehicles/${vehicle.vin}/fleet_telemetry_config`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ config }),
  })

  const regData = await regRes.json()
  if (!regRes.ok) {
    console.error(`  ✗ Failed: ${JSON.stringify(regData, null, 2)}`)
  } else {
    console.log(`  ✓ Registered — Tesla will stream to wss://${TELEMETRY_HOST}:${TELEMETRY_PORT}`)
    console.log(`    Response:`, JSON.stringify(regData.response ?? regData, null, 4))
  }
  console.log()
}

console.log("Done. Vehicles will begin streaming once they wake and connect.")
console.log("Watch the telemetry server logs for incoming connections.")
