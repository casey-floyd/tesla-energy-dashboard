import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  })

  if (!token) {
    return NextResponse.json(
      { error: "Not logged in. Complete the Tesla OAuth flow first, then revisit this URL." },
      { status: 401 },
    )
  }

  if (!token.refreshToken) {
    return NextResponse.json(
      { error: "No refresh token found in session. Try signing out and back in." },
      { status: 404 },
    )
  }

  return NextResponse.json({
    refresh_token: token.refreshToken,
    expires_at: token.expiresAt,
    instructions: [
      "1. Copy the refresh_token value above.",
      "2. In Vercel: Settings → Environment Variables → add TESLA_REFRESH_TOKEN = <value>.",
      "3. Redeploy. You will never need to log in again.",
    ],
  })
}
