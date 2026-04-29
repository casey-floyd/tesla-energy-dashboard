import { clearTokenCache } from "@/lib/token-store"
import { NextResponse } from "next/server"

export async function POST() {
  clearTokenCache()
  return NextResponse.json({ ok: true })
}
