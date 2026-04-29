"use client"

import { useTheme } from "@/components/ThemeProvider"
import type { EnergyHistoryEntry } from "@/lib/types"
import { useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface Props {
  entries: EnergyHistoryEntry[]
  loading?: boolean
}

function formatLabel(timestamp: string): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatKwh(v: number): string {
  return `${(v / 1000).toFixed(2)} kWh`
}

export function ProductionChart({ entries, loading }: Props) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const data = useMemo(
    () =>
      entries.map((e) => ({
        time: formatLabel(e.timestamp),
        solar: Number((e.total_solar_generation / 1000).toFixed(3)),
        home: Number((e.total_home_usage / 1000).toFixed(3)),
      })),
    [entries],
  )

  if (loading) {
    return <div className="w-full h-48 bg-slate-50 dark:bg-slate-800 animate-pulse rounded-xl" />
  }

  if (!data.length) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        No production data available
      </div>
    )
  }

  const gridStroke = isDark ? "#1e293b" : "#F1F5F9"
  const tickFill = isDark ? "#64748b" : "#94A3B8"
  const tooltipStyle = {
    backgroundColor: isDark ? "#1e293b" : "#fff",
    border: `1px solid ${isDark ? "#334155" : "#F1F5F9"}`,
    borderRadius: 12,
    fontSize: 12,
    color: isDark ? "#e2e8f0" : "#1e293b",
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="homeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis
          dataKey="time"
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
            const numVal = typeof value === "number" ? value : 0
            return [formatKwh(numVal * 1000), name === "solar" ? "Solar" : "Home"]
          }}
        />
        <Area
          type="monotone"
          dataKey="solar"
          stroke="#F59E0B"
          strokeWidth={2}
          fill="url(#solarGrad)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="home"
          stroke="#0EA5E9"
          strokeWidth={2}
          fill="url(#homeGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
