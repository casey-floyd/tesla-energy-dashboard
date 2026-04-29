"use client"

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
    return <div className="w-full h-48 bg-slate-50 animate-pulse rounded-xl" />
  }

  if (!data.length) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-sm text-slate-400">
        No production data available
      </div>
    )
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
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "#94A3B8" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94A3B8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #F1F5F9",
            borderRadius: 12,
            fontSize: 12,
          }}
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
