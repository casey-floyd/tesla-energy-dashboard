import type { CalendarHistory, HistoryPeriod, LiveStatus, Product, SiteInfo } from "./types"

const FLEET_BASE =
  process.env.TESLA_FLEET_BASE_URL ?? "https://fleet-api.prd.na.vn.cloud.tesla.com"

async function teslaFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${FLEET_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Tesla API ${res.status}: ${text}`)
  }
  const json = await res.json()
  return json.response ?? json
}

export async function getProducts(accessToken: string): Promise<Product[]> {
  const data = await teslaFetch<{ count: number; response: Product[] }>(
    "/api/1/products",
    accessToken,
  )
  return Array.isArray(data) ? data : []
}

export async function getEnergySiteId(accessToken: string): Promise<number | null> {
  const products = await getProducts(accessToken)
  const energySite = products.find((p) => p.resource_type === "battery")
  return energySite?.energy_site_id ?? null
}

export async function getLiveStatus(accessToken: string, siteId: number): Promise<LiveStatus> {
  return teslaFetch<LiveStatus>(`/api/1/energy_sites/${siteId}/live_status`, accessToken)
}

export async function getSiteInfo(accessToken: string, siteId: number): Promise<SiteInfo> {
  return teslaFetch<SiteInfo>(`/api/1/energy_sites/${siteId}/site_info`, accessToken)
}

export async function getCalendarHistory(
  accessToken: string,
  siteId: number,
  period: HistoryPeriod = "day",
  timezone: string = "America/Los_Angeles",
): Promise<CalendarHistory> {
  const params = new URLSearchParams({
    kind: "energy",
    period,
    time_zone: timezone,
  })
  return teslaFetch<CalendarHistory>(
    `/api/1/energy_sites/${siteId}/calendar_history?${params}`,
    accessToken,
  )
}
