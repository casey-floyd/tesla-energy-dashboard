import { auth } from "@/lib/auth"
import { getAccessToken, hasPreStoredToken } from "@/lib/token-store"

export async function resolveAccessToken(): Promise<string | null> {
  if (hasPreStoredToken()) {
    return getAccessToken()
  }
  const session = await auth()
  return session?.accessToken ?? null
}
