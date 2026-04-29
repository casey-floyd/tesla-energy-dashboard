import { auth } from "@/lib/auth"
import { getEnergySiteId, getSiteInfo } from "@/lib/tesla-api"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  let siteId = searchParams.get("siteId") ? Number(searchParams.get("siteId")) : null

  try {
    if (!siteId) {
      siteId = await getEnergySiteId(session.accessToken)
      if (!siteId) {
        return NextResponse.json({ error: "No energy site found" }, { status: 404 })
      }
    }
    const info = await getSiteInfo(session.accessToken, siteId)
    return NextResponse.json({ siteId, info })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch site info" },
      { status: 500 },
    )
  }
}
