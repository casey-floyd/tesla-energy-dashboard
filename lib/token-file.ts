import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"

const TOKEN_PATH = join(process.cwd(), ".tesla-token")

export function readPersistedToken(): string | null {
  try {
    if (existsSync(TOKEN_PATH)) {
      return readFileSync(TOKEN_PATH, "utf-8").trim() || null
    }
  } catch { /* non-fatal */ }
  return null
}

export function writePersistedToken(token: string): void {
  try {
    writeFileSync(TOKEN_PATH, token, "utf-8")
  } catch { /* non-fatal */ }
}
