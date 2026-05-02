"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber"
import type { LiveStatus, WallConnector } from "@/lib/types"
import { Plug, Zap } from "lucide-react"

function formatWatts(w: number): string {
  if (w >= 1000) return `${(w / 1000).toFixed(1)} kW`
  return `${Math.round(w)} W`
}

function maskVin(vin: string): string {
  return vin.length >= 8 ? `${vin.slice(0, 5)}···${vin.slice(-4)}` : vin
}

const STATE_LABELS: Record<number, string> = {
  0: "Disconnected",
  1: "Available",
  2: "Waiting",
  3: "Charging",
  4: "Complete",
}

const STATE_COLORS: Record<number, { dot: string; text: string; bg: string }> = {
  0: { dot: "bg-slate-300 dark:bg-slate-600", text: "text-slate-400 dark:text-neutral-500", bg: "bg-slate-50 dark:bg-neutral-800" },
  1: { dot: "bg-slate-400 dark:bg-slate-500", text: "text-slate-500 dark:text-neutral-400", bg: "bg-slate-50 dark:bg-neutral-800" },
  2: { dot: "bg-amber-400", text: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
  3: { dot: "bg-emerald-400", text: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  4: { dot: "bg-sky-400", text: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-900/20" },
}

function AnimatedWatts({ watts, className }: { watts: number; className: string }) {
  const animated = useAnimatedNumber(watts)
  return <span className={className}>{formatWatts(animated)}</span>
}

function ConnectorCard({ wc }: { wc: WallConnector }) {
  const state = wc.wall_connector_state
  const colors = STATE_COLORS[state] ?? STATE_COLORS[0]
  const isCharging = state === 3

  return (
    <div className={`rounded-xl p-4 ${colors.bg} flex items-start gap-3`}>
      <div className="mt-0.5 shrink-0">
        <Plug className={`w-4 h-4 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            {isCharging ? (
              <>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.dot} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.dot}`} />
              </>
            ) : (
              <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.dot}`} />
            )}
          </span>
          <span className={`text-sm font-semibold ${colors.text}`}>
            {STATE_LABELS[state] ?? "Unknown"}
          </span>
        </div>

        {wc.vin && (
          <p className="mt-1 text-xs text-slate-400 dark:text-neutral-500 font-mono truncate">
            {maskVin(wc.vin)}
          </p>
        )}

        {isCharging && wc.wall_connector_power > 0 && (
          <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            <AnimatedWatts watts={wc.wall_connector_power} className="" />
          </p>
        )}
      </div>
    </div>
  )
}

interface Props {
  data: LiveStatus | null
  loading: boolean
}

export function WallConnectorPanel({ data, loading }: Props) {
  const connectors = data?.wall_connectors ?? []
  const totalPower = connectors.reduce(
    (sum, wc) => sum + (wc.wall_connector_state === 3 ? wc.wall_connector_power : 0),
    0,
  )
  const chargingCount = connectors.filter((wc) => wc.wall_connector_state === 3).length

  return (
    <Card className="border border-gray-100 dark:border-neutral-800 shadow-sm rounded-2xl h-full flex flex-col">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
            Wall Connector
          </CardTitle>
          {!loading && chargingCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
              <Zap className="w-3.5 h-3.5" />
              <AnimatedWatts watts={totalPower} className="tabular-nums" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="space-y-2">
            <div className="h-16 rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
            <div className="h-16 rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse opacity-60" />
          </div>
        ) : connectors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <Plug className="w-6 h-6 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-neutral-500">No Wall Connectors detected</p>
            <p className="text-xs text-slate-300 dark:text-slate-600">
              Wall Connectors appear here when reported by your energy site
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {connectors.map((wc) => (
              <ConnectorCard key={wc.wall_connector_id} wc={wc} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
