import { createPublicKey } from "crypto"
import { readFileSync } from "fs"
import path from "path"

// Tesla verifies domain ownership by fetching GET /api/public_key.
// Priority: TESLA_PUBLIC_KEY env var (set this in Vercel) → public-key.pem file → derived from private key.
export async function GET() {
  try {
    // 1. Env var — preferred for Vercel/serverless where the filesystem is read-only
    if (process.env.TESLA_PUBLIC_KEY) {
      return new Response(process.env.TESLA_PUBLIC_KEY, {
        headers: { "Content-Type": "application/x-pem-file" },
      })
    }

    // 2. Pre-generated public key file
    try {
      const pem = readFileSync(path.join(process.cwd(), "public-key.pem"), "utf-8")
      return new Response(pem, { headers: { "Content-Type": "application/x-pem-file" } })
    } catch { /* file not present */ }

    // 3. Derive from private key on the fly
    const privPem = readFileSync(path.join(process.cwd(), "private-key.pem"), "utf-8")
    const pubPem = createPublicKey(privPem).export({ type: "spki", format: "pem" }) as string
    return new Response(pubPem, { headers: { "Content-Type": "application/x-pem-file" } })
  } catch (err) {
    return new Response(
      `Public key unavailable. Set the TESLA_PUBLIC_KEY env var.\n${err instanceof Error ? err.message : ""}`,
      { status: 500 },
    )
  }
}
