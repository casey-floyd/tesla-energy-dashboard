"use client"

import { useTheme } from "@/components/ThemeProvider"
import type { EnergyHistoryEntry, HistoryPeriod } from "@/lib/types"
import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface Props {
  entries: EnergyHistoryEntry[]
  period: HistoryPeriod
  loading?: boolean
}

function formatAxisLabel(timestamp: string, period: HistoryPeriod): string {
  const d = new Date(timestamp)
  if (period === "day") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (period === "week") return d.toLocaleDateString([], { weekday: "short" })
  if (period === "month") return d.toLocaleDateString([], { day: "numeric" })
  if (period === "year") return d.toLocaleDateString([], { month: "short" })
  return d.toLocaleDateString([], { year: "numeric" })
}

export function BatteryFlowChart({ entries, period, loading }: Props) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const data = useMemo(
    () =>
      entries.map((e) => ({
        label: formatAxisLabel(e.timestamp, period),
        // Positive: charged into battery
        solarCharge: Number((e.battery_energy_imported_from_solar / 1000).toFixed(3)),
        gridCharge: Number((e.battery_energy_imported_from_grid / 1000).toFixed(3)),
        // Negative: discharged from battery
        homeDischarge: -Number((e.consumer_energy_imported_from_battery / 1000).toFixed(3)),
        gridDischarge: -Number((e.grid_energy_exported_from_battery / 1000).toFixed(3)),
      })),
    [entries, period],
  )

  const hasData = data.some(
    (d) => d.solarCharge > 0 || d.gridCharge > 0 || d.homeDischarge < 0 || d.gridDischarge < 0,
  )

  if (loading) {
    return <div className="w-full h-52 bg-slate-50 dark:bg-neutral-800 animate-pulse rounded-xl" />
  }

  if (!hasData) {
    return (
      <div className="w-full h-52 flex items-center justify-center text-sm text-slate-400 dark:text-neutral-500">
        No battery flow data available
      </div>
    )
  }

  const gridStroke = isDark ? "#1a1a1a" : "#F1F5F9"
  const tickFill = isDark ? "#6b6b6b" : "#94A3B8"
  const refLineStroke = isDark ? "#2a2a2a" : "#CBD5E1"
  const legendStyle = isDark
    ? { fontSize: 11, paddingTop: 8, color: "#888888" }
    : { fontSize: 11, paddingTop: 8 }
  const tooltipStyle = {
    backgroundColor: isDark ? "#1a1a1a" : "#fff",
    border: `1px solid ${isDark ? "#2a2a2a" : "#F1F5F9"}`,
    borderRadius: 12,
    fontSize: 12,
    color: isDark ? "#e5e5e5" : "#1a1a1a",
  }

  const labels: Record<string, string> = {
    solarCharge: "Charged from Solar",
    gridCharge: "Charged from Grid",
    homeDischarge: "Discharged to Home",
    gridDischarge: "Exported to Grid",
  }

  return (
    <div className="w-full h-full min-h-[180px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: tickFill }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: tickFill }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${Math.abs(v)}k`}
        />
        <ReferenceLine y={0} stroke={refLineStroke} strokeWidth={1} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => {
            const v = typeof value === "number" ? Math.abs(value) : 0
            return [`${v.toFixed(2)} kWh`, labels[String(name)] ?? String(name)]
          }}
        />
        <Legend
          iconSize={8}
          iconType="circle"
          wrapperStyle={legendStyle}
          formatter={(v) => labels[v] ?? v}
        />
        {/* Charged into battery (positive bars, stacked upward) */}
        <Bar dataKey="solarCharge" stackId="charge" fill="#F59E0B" fillOpacity={0.9} radius={[0, 0, 0, 0]} />
        <Bar dataKey="gridCharge" stackId="charge" fill="#94A3B8" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
        {/* Discharged from battery (negative bars, stacked downward) */}
        <Bar dataKey="homeDischarge" stackId="discharge" fill="#0EA5E9" fillOpacity={0.85} radius={[0, 0, 0, 0]} />
        <Bar dataKey="gridDischarge" stackId="discharge" fill="#6366F1" fillOpacity={0.7} radius={[0, 0, 3, 3]} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}
