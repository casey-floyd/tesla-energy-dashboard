"use client"

import { Battery, Sun, Zap } from "lucide-react"
import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    setLoading(true)
    await signIn("tesla", { callbackUrl: "/dashboard" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 mb-5 shadow-sm">
            <Zap className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Tesla Energy</h1>
          <p className="mt-2 text-sm text-slate-500">
            Monitor your solar production and Powerwall
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mx-auto">
                <Sun className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Solar</p>
            </div>
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto">
                <Battery className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Powerwall</p>
            </div>
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto">
                <Zap className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Grid</p>
            </div>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Connecting…
              </>
            ) : (
              "Connect Tesla Account"
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            You&apos;ll be redirected to Tesla to authorize access to your energy data. No vehicle
            access is requested.
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-300">
          Requires Tesla Fleet API credentials configured on this server.
        </p>
      </div>
    </div>
  )
}
