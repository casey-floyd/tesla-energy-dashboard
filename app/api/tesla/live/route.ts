import { resolveAccessToken } from "@/lib/api-utils"
import { getLiveStatus } from "@/lib/tesla-api"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const accessToken = await resolveAccessToken()
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const siteId = searchParams.get("siteId")
  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 })
  }

  try {
    const data = await getLiveStatus(accessToken, Number(siteId))
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch live status" },
      { status: 500 },
    )
  }
}
