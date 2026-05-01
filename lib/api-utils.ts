import { getAccessToken } from "@/lib/token-store"

export async function resolveAccessToken(): Promise<string | null> {
  try {
    return await getAccessToken()
  } catch {
    return null
  }
}
