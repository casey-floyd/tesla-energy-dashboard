import { readFileSync, writeFileSync } from "fs"
import path from "path"

const TOKEN_PATH = path.join(process.cwd(), ".tesla-token")

export function readPersistedToken(): string | null {
  try {
    const t = readFileSync(TOKEN_PATH, "utf-8").trim()
    return t || null
  } catch {
    return null
  }
}

export function writePersistedToken(refreshToken: string): void {
  try {
    writeFileSync(TOKEN_PATH, refreshToken, "utf-8")
  } catch { /* non-fatal — read-only filesystem (e.g. Vercel) */ }
}
