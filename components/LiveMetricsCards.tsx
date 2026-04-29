"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber"
import type { LiveStatus } from "@/lib/types"
import { Battery, Home, Sun, Zap } from "lucide-react"

function formatWatts(w: number): string {
  const abs = Math.abs(w)
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)} kW`
  return `${Math.round(abs)} W`
}

interface AnimatedWattsProps {
  watts: number
  color: string
}

function AnimatedWatts({ watts, color }: AnimatedWattsProps) {
  const animated = useAnimatedNumber(Math.abs(watts))
  return (
    <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${color}`}>
      {formatWatts(animated)}
    </p>
  )
}

function AnimatedPercent({ value, color }: { value: number; color: string }) {
  const animated = useAnimatedNumber(value)
  return (
    <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${color}`}>
      {Math.round(animated)}%
    </p>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  subtext?: string
  color: string
  bgColor: string
  loading?: boolean
  children: React.ReactNode
}

function MetricCard({ icon, label, subtext, color, bgColor, loading, children }: MetricCardProps) {
  return (
    <Card className="border border-slate-100 shadow-sm rounded-2xl">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-xl ${bgColor}`}>
            <div className={`w-5 h-5 ${color}`}>{icon}</div>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
          {loading ? (
            <div className="mt-1 h-7 w-24 bg-slate-100 animate-pulse rounded-md" />
          ) : (
            children
          )}
          {subtext && !loading && (
            <p className="mt-0.5 text-xs text-slate-400">{subtext}</p>
          )}
        </div>
      </CardContent>
    </Card>
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <MetricCard
        icon={<Sun className="w-5 h-5" />}
        label="Solar"
        subtext="Production"
        color="text-amber-500"
        bgColor="bg-amber-50"
        loading={loading}
      >
        {data ? (
          <AnimatedWatts watts={data.solar_power} color="text-amber-500" />
        ) : (
          <p className="mt-0.5 text-2xl font-semibold text-amber-500">—</p>
        )}
      </MetricCard>

      <MetricCard
        icon={<Battery className="w-5 h-5" />}
        label="Battery"
        subtext={batteryDirection}
        color="text-emerald-500"
        bgColor="bg-emerald-50"
        loading={loading}
      >
        {data ? (
          <AnimatedPercent value={data.battery_percentage} color="text-emerald-500" />
        ) : (
          <p className="mt-0.5 text-2xl font-semibold text-emerald-500">—</p>
        )}
      </MetricCard>

      <MetricCard
        icon={<Home className="w-5 h-5" />}
        label="Home"
        subtext="Consumption"
        color="text-sky-500"
        bgColor="bg-sky-50"
        loading={loading}
      >
        {data ? (
          <AnimatedWatts watts={data.load_power} color="text-sky-500" />
        ) : (
          <p className="mt-0.5 text-2xl font-semibold text-sky-500">—</p>
        )}
      </MetricCard>

      <MetricCard
        icon={<Zap className="w-5 h-5" />}
        label="Grid"
        subtext={gridDirection}
        color={data && data.grid_power < 0 ? "text-indigo-500" : "text-slate-500"}
        bgColor={data && data.grid_power < 0 ? "bg-indigo-50" : "bg-slate-50"}
        loading={loading}
      >
        {data ? (
          <AnimatedWatts
            watts={data.grid_power}
            color={data.grid_power < 0 ? "text-indigo-500" : "text-slate-500"}
          />
        ) : (
          <p className="mt-0.5 text-2xl font-semibold text-slate-500">—</p>
        )}
      </MetricCard>
    </div>
  )
}
