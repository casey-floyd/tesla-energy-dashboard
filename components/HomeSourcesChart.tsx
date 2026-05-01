"use client"

import { useTheme } from "@/components/ThemeProvider"
import type { EnergyHistoryEntry, HistoryPeriod } from "@/lib/types"
import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

export function HomeSourcesChart({ entries, period, loading }: Props) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const data = useMemo(
    () =>
      entries.map((e) => ({
        label: formatAxisLabel(e.timestamp, period),
        solar: Number((e.consumer_energy_imported_from_solar / 1000).toFixed(3)),
        battery: Number((e.consumer_energy_imported_from_battery / 1000).toFixed(3)),
        grid: Number((e.consumer_energy_imported_from_grid / 1000).toFixed(3)),
      })),
    [entries, period],
  )

  if (loading) {
    return <div className="w-full h-52 bg-slate-50 dark:bg-neutral-800 animate-pulse rounded-xl" />
  }

  if (!data.length) {
    return (
      <div className="w-full h-52 flex items-center justify-center text-sm text-slate-400 dark:text-neutral-500">
        No data available
      </div>
    )
  }

  const gridStroke = isDark ? "#1a1a1a" : "#F1F5F9"
  const tickFill = isDark ? "#6b6b6b" : "#94A3B8"
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
    solar: "From Solar",
    battery: "From Battery",
    grid: "From Grid",
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
          tickFormatter={(v) => `${v}k`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => {
            const v = typeof value === "number" ? value : 0
            return [`${v.toFixed(2)} kWh`, labels[String(name)] ?? String(name)]
          }}
        />
        <Legend
          iconSize={8}
          iconType="circle"
          wrapperStyle={legendStyle}
          formatter={(v) => labels[v] ?? v}
        />
        <Bar dataKey="solar" stackId="a" fill="#F59E0B" fillOpacity={0.9} radius={[0, 0, 0, 0]} />
        <Bar dataKey="battery" stackId="a" fill="#10B981" fillOpacity={0.85} radius={[0, 0, 0, 0]} />
        <Bar dataKey="grid" stackId="a" fill="#94A3B8" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}
