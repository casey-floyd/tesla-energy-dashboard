"use client"

import { CheckCircle, Copy, RefreshCw, Zap } from "lucide-react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface CaptureResult {
  refresh_token: string
  expires_at: number
  instructions: string[]
}

export default function ReauthPage() {
  const [status, setStatus] = useState<"loading" | "needs-auth" | "captured">("loading")
  const [capture, setCapture] = useState<CaptureResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    fetch("/api/tesla/capture-token")
      .then(async (res) => {
        if (res.ok) {
          setCapture(await res.json())
          setStatus("captured")
        } else {
          setStatus("needs-auth")
        }
      })
      .catch(() => setStatus("needs-auth"))
  }, [])

  async function handleConnect() {
    setConnecting(true)
    // Clear server cache first so we don't get a stale token on return
    await fetch("/api/tesla/reauth", { method: "POST" })
    await signIn("tesla", { callbackUrl: "/reauth" })
  }

  async function handleCopy() {
    if (!capture) return
    await navigator.clipboard.writeText(capture.refresh_token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleClearAndReconnect() {
    setClearing(true)
    await fetch("/api/tesla/reauth", { method: "POST" })
    setClearing(false)
    setStatus("needs-auth")
    setCapture(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 mb-5 shadow-sm">
            <Zap className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Tesla Account</h1>
          <p className="mt-2 text-sm text-slate-500">Authorize or reauthorize your Tesla account</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          {status === "loading" && (
            <div className="flex items-center justify-center py-8 gap-3 text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Checking authorization…</span>
            </div>
          )}

          {status === "needs-auth" && (
            <>
              <p className="text-sm text-slate-600 leading-relaxed">
                Click below to sign in with Tesla. You&apos;ll be redirected to Tesla to authorize
                access, then brought back here to capture your token.
              </p>
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 leading-relaxed">
                <strong>Tip:</strong> If your Wall Connector isn&apos;t showing up, reauthorizing
                with fresh credentials often fixes it — especially if the previous token predates
                Wall Connector support.
              </div>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Connecting…
                  </>
                ) : (
                  "Connect Tesla Account"
                )}
              </button>
            </>
          )}

          {status === "captured" && capture && (
            <>
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold">Authorization successful</span>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  New Refresh Token
                </p>
                <div className="relative rounded-xl border border-slate-100 bg-slate-50 dark:bg-slate-900 p-3 pr-12 font-mono text-xs text-slate-600 break-all leading-relaxed">
                  {capture.refresh_token}
                  <button
                    onClick={handleCopy}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                    title="Copy token"
                  >
                    {copied ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-600">Next steps</p>
                <ol className="space-y-1">
                  {capture.instructions.map((step, i) => (
                    <li key={i} className="text-xs text-slate-500 leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <button
                onClick={handleClearAndReconnect}
                disabled={clearing}
                className="w-full py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${clearing ? "animate-spin" : ""}`} />
                Reconnect with a different account
              </button>
            </>
          )}
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/dashboard"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
