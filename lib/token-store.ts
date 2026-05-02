import { readPersistedToken, writePersistedToken } from "@/lib/token-file"

const FLEET_BASE_URL =
  process.env.TESLA_FLEET_BASE_URL ?? "https://fleet-api.prd.na.vn.cloud.tesla.com"

interface TokenCache {
  accessToken: string
  expiresAt: number
}

let cache: TokenCache | null = null

export function clearTokenCache(): void {
  cache = null
}

export function hasPreStoredToken(): boolean {
  return !!(process.env.TESLA_REFRESH_TOKEN ?? readPersistedToken())
}

export async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.TESLA_REFRESH_TOKEN ?? readPersistedToken()
  if (!refreshToken) throw new Error("No Tesla refresh token configured")

  if (cache && Date.now() < cache.expiresAt - 60_000) {
    return cache.accessToken
  }

  const res = await fetch("https://auth.tesla.com/oauth2/v3/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.TESLA_CLIENT_ID!,
      client_secret: process.env.TESLA_CLIENT_SECRET!,
      refresh_token: refreshToken,
      audience: FLEET_BASE_URL,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token refresh failed (${res.status}): ${text}`)
  }

  const data = await res.json()

  if (data.refresh_token && data.refresh_token !== refreshToken) {
    writePersistedToken(data.refresh_token)
  }

  cache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return cache.accessToken
}
