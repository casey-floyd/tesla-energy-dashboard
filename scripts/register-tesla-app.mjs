/**
 * One-time Tesla Fleet API partner registration.
 * Run this once after setting up your app at developer.tesla.com.
 *
 * Usage:
 *   node scripts/register-tesla-app.mjs
 */

const CLIENT_ID = process.env.TESLA_CLIENT_ID
const CLIENT_SECRET = process.env.TESLA_CLIENT_SECRET
const FLEET_BASE = process.env.TESLA_FLEET_BASE_URL ?? "https://fleet-api.prd.na.vn.cloud.tesla.com"
const DOMAIN = process.env.NEXTAUTH_URL?.replace("https://", "").replace("http://", "").split("/")[0]

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing TESLA_CLIENT_ID or TESLA_CLIENT_SECRET — load your .env.local first.")
  process.exit(1)
}

console.log(`Registering domain: ${DOMAIN}`)
console.log(`Fleet base: ${FLEET_BASE}\n`)

// Step 1: Get a partner (machine-to-machine) token
console.log("Step 1: Getting partner token...")
const tokenRes = await fetch("https://auth.tesla.com/oauth2/v3/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "openid energy_device_data energy_cmds offline_access",
    audience: FLEET_BASE,
  }),
})

const tokenData = await tokenRes.json()
if (!tokenRes.ok) {
  console.error("Failed to get partner token:", tokenData)
  process.exit(1)
}

console.log("Partner token obtained.\n")

// Step 2: Register the partner account / domain
console.log("Step 2: Registering partner account with Tesla Fleet API...")
const regRes = await fetch(`${FLEET_BASE}/api/1/partner_accounts`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${tokenData.access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ domain: DOMAIN }),
})

const regData = await regRes.json()
if (!regRes.ok) {
  console.error("Registration failed:", JSON.stringify(regData, null, 2))
  process.exit(1)
}

console.log("Registration successful!")
console.log(JSON.stringify(regData, null, 2))
