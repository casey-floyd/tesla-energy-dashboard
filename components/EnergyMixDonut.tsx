"use client"

import { useTheme } from "@/components/ThemeProvider"
import type { EnergyHistoryEntry } from "@/lib/types"
import { useMemo } from "react"
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

interface Props {
  entries: EnergyHistoryEntry[]
  loading?: boolean
}

function formatKwh(wh: number): string {
  return `${(wh / 1000).toFixed(1)} kWh`
}

const COLORS = {
  Solar: "#F59E0B",
  Battery: "#10B981",
  Grid: "#94A3B8",
}

export function EnergyMixDonut({ entries, loading }: Props) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const totals = useMemo(() => {
    const fromSolar = entries.reduce((s, e) => s + (e.consumer_energy_imported_from_solar ?? 0), 0)
    const fromBattery = entries.reduce(
      (s, e) => s + (e.consumer_energy_imported_from_battery ?? 0),
      0,
    )
    const fromGrid = entries.reduce((s, e) => s + (e.consumer_energy_imported_from_grid ?? 0), 0)
    return { fromSolar, fromBattery, fromGrid }
  }, [entries])

  const total = totals.fromSolar + totals.fromBattery + totals.fromGrid

  const data = [
    { name: "Solar", value: totals.fromSolar },
    { name: "Battery", value: totals.fromBattery },
    { name: "Grid", value: totals.fromGrid },
  ].filter((d) => d.value > 0)

  const selfPowered =
    total > 0 ? (((totals.fromSolar + totals.fromBattery) / total) * 100).toFixed(0) : "0"

  if (loading) {
    return <div className="w-full h-52 bg-slate-50 dark:bg-slate-800 animate-pulse rounded-xl" />
  }

  if (!data.length) {
    return (
      <div className="w-full h-52 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        No energy mix data available
      </div>
    )
  }

  const tooltipStyle = {
    backgroundColor: isDark ? "#1e293b" : "#fff",
    border: `1px solid ${isDark ? "#334155" : "#F1F5F9"}`,
    borderRadius: 12,
    fontSize: 12,
    color: isDark ? "#e2e8f0" : "#1e293b",
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={COLORS[entry.name as keyof typeof COLORS] ?? "#CBD5E1"}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [
              formatKwh(typeof value === "number" ? value : 0),
              String(name),
            ]}
          />
          <Legend
            iconSize={8}
            iconType="circle"
            wrapperStyle={{ fontSize: 11, color: isDark ? "#94a3b8" : undefined }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-bold text-slate-700 dark:text-slate-200">{selfPowered}%</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          Self-Powered
        </span>
      </div>
    </div>
  )
}
