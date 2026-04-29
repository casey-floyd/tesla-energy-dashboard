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

function formatKwh(v: number): string {
  return `${(v / 1000).toFixed(2)} kWh`
}

export function EnergyHistoryChart({ entries, period, loading }: Props) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const data = useMemo(
    () =>
      entries.map((e) => ({
        label: formatAxisLabel(e.timestamp, period),
        solar: Number((e.total_solar_generation / 1000).toFixed(3)),
        home: Number((e.total_home_usage / 1000).toFixed(3)),
        gridImport: Number((e.grid_energy_imported / 1000).toFixed(3)),
        gridExport: Number(
          ((e.grid_energy_exported_from_solar +
            e.grid_energy_exported_from_battery) /
            1000).toFixed(3),
        ),
      })),
    [entries],
  )

  if (loading) {
    return <div className="w-full h-52 bg-slate-50 dark:bg-slate-800 animate-pulse rounded-xl" />
  }

  if (!data.length) {
    return (
      <div className="w-full h-52 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        No history data available
      </div>
    )
  }

  const gridStroke = isDark ? "#1e293b" : "#F1F5F9"
  const tickFill = isDark ? "#64748b" : "#94A3B8"
  const legendStyle = isDark ? { fontSize: 11, paddingTop: 8, color: "#94a3b8" } : { fontSize: 11, paddingTop: 8 }
  const tooltipStyle = {
    backgroundColor: isDark ? "#1e293b" : "#fff",
    border: `1px solid ${isDark ? "#334155" : "#F1F5F9"}`,
    borderRadius: 12,
    fontSize: 12,
    color: isDark ? "#e2e8f0" : "#1e293b",
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
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
            const labels: Record<string, string> = {
              solar: "Solar Generated",
              home: "Home Used",
              gridImport: "Grid Import",
              gridExport: "Grid Export",
            }
            const numVal = typeof value === "number" ? value : 0
            return [formatKwh(numVal * 1000), labels[String(name)] ?? String(name)]
          }}
        />
        <Legend
          iconSize={8}
          iconType="circle"
          wrapperStyle={legendStyle}
          formatter={(value) => {
            const labels: Record<string, string> = {
              solar: "Solar",
              home: "Home",
              gridImport: "Grid Import",
              gridExport: "Grid Export",
            }
            return labels[value] ?? value
          }}
        />
        <Bar dataKey="solar" fill="#F59E0B" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
        <Bar dataKey="home" fill="#0EA5E9" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
        <Bar dataKey="gridImport" fill="#94A3B8" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
        <Bar dataKey="gridExport" fill="#6366F1" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
