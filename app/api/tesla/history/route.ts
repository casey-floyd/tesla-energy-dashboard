import { auth } from "@/lib/auth"
import { getCalendarHistory } from "@/lib/tesla-api"
import type { HistoryPeriod } from "@/lib/types"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const siteId = searchParams.get("siteId")
  const period = (searchParams.get("period") ?? "day") as HistoryPeriod
  const timezone = searchParams.get("timezone") ?? "America/Los_Angeles"

  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 })
  }

  try {
    const data = await getCalendarHistory(session.accessToken, Number(siteId), period, timezone)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch history" },
      { status: 500 },
    )
  }
}
