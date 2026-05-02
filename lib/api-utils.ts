import { auth } from "@/lib/auth"
import { getAccessToken } from "@/lib/token-store"

export async function resolveAccessToken(): Promise<string | null> {
  // Headless path: TESLA_REFRESH_TOKEN env var is set (Vercel production)
  try {
    return await getAccessToken()
  } catch {
    // Session path: user just completed OAuth — access token lives in NextAuth JWT
    const session = await auth()
    return session?.accessToken ?? null
  }
}
