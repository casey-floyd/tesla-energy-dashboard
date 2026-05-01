"use client"

import { useAnimatedNumber } from "@/hooks/useAnimatedNumber"
import type { LiveStatus } from "@/lib/types"
import { Battery, Home, Sun, Zap } from "lucide-react"

function formatWatts(w: number): string {
  const abs = Math.abs(w)
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)} kW`
  return `${Math.round(abs)} W`
}

function AnimatedWatts({ watts, color }: { watts: number; color: string }) {
  const animated = useAnimatedNumber(Math.abs(watts))
  return (
    <p className={`text-xl font-bold tabular-nums ${color}`}>{formatWatts(animated)}</p>
  )
}

function AnimatedPercent({ value, color }: { value: number; color: string }) {
  const animated = useAnimatedNumber(value)
  return (
    <p className={`text-xl font-bold tabular-nums ${color}`}>{Math.round(animated)}%</p>
  )
}

interface MetricTileProps {
  icon: React.ReactNode
  label: string
  subtext?: string
  iconColor: string
  iconBg: string
  loading?: boolean
  children: React.ReactNode
}

function MetricTile({ icon, label, subtext, iconColor, iconBg, loading, children }: MetricTileProps) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-neutral-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${iconBg}`}>
          <div className={`w-4 h-4 ${iconColor}`}>{icon}</div>
        </div>
        <p className="text-xs font-semibold text-gray-400 dark:text-neutral-400 uppercase tracking-wide">
          {label}
        </p>
      </div>
      {loading ? (
        <div className="h-6 w-20 bg-gray-200 dark:bg-neutral-700 animate-pulse rounded-md" />
      ) : (
        children
      )}
      {subtext && !loading && (
        <p className="mt-0.5 text-xs text-gray-400 dark:text-neutral-500">{subtext}</p>
      )}
    </div>
  )
}

interface Props {
  data: LiveStatus | null
  loading: boolean
}

export function LiveMetricsCards({ data, loading }: Props) {
  const gridDirection = data
    ? data.grid_power > 0 ? "Importing" : data.grid_power < 0 ? "Exporting" : "Idle"
    : "—"
  const batteryDirection = data
    ? data.battery_power > 0 ? "Charging" : data.battery_power < 0 ? "Discharging" : "Idle"
    : "—"

  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricTile
        icon={<Sun className="w-4 h-4" />}
        label="Solar"
        subtext="Production"
        iconColor="text-amber-500"
        iconBg="bg-amber-50 dark:bg-amber-900/20"
        loading={loading}
      >
        {data ? (
          <AnimatedWatts watts={data.solar_power} color="text-amber-500" />
        ) : (
          <p className="text-xl font-bold text-amber-500">—</p>
        )}
      </MetricTile>

      <MetricTile
        icon={<Battery className="w-4 h-4" />}
        label="Battery"
        subtext={batteryDirection}
        iconColor="text-emerald-500"
        iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        loading={loading}
      >
        {data ? (
          <AnimatedPercent value={data.battery_percentage} color="text-emerald-500" />
        ) : (
          <p className="text-xl font-bold text-emerald-500">—</p>
        )}
      </MetricTile>

      <MetricTile
        icon={<Home className="w-4 h-4" />}
        label="Home"
        subtext="Consumption"
        iconColor="text-blue-500"
        iconBg="bg-blue-50 dark:bg-blue-900/20"
        loading={loading}
      >
        {data ? (
          <AnimatedWatts watts={data.load_power} color="text-blue-500" />
        ) : (
          <p className="text-xl font-bold text-blue-500">—</p>
        )}
      </MetricTile>

      <MetricTile
        icon={<Zap className="w-4 h-4" />}
        label="Grid"
        subtext={gridDirection}
        iconColor={data && data.grid_power < 0 ? "text-indigo-500" : "text-gray-400"}
        iconBg={
          data && data.grid_power < 0
            ? "bg-indigo-50 dark:bg-indigo-900/20"
            : "bg-gray-100 dark:bg-neutral-700"
        }
        loading={loading}
      >
        {data ? (
          <AnimatedWatts
            watts={data.grid_power}
            color={data.grid_power < 0 ? "text-indigo-500" : "text-gray-500"}
          />
        ) : (
          <p className="text-xl font-bold text-gray-400">—</p>
        )}
      </MetricTile>
    </div>
  )
}
