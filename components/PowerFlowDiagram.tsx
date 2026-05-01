"use client"

import type { LiveStatus } from "@/lib/types"
import { motion } from "framer-motion"

function formatWatts(w: number): string {
  const abs = Math.abs(w)
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)} kW`
  return `${Math.round(abs)} W`
}

interface NodeProps {
  x: number
  y: number
  icon: string
  label: string
  value: string
  color: string
  bgColor: string
  borderColor: string
}

function Node({ x, y, icon, label, value, bgColor, borderColor }: NodeProps) {
  return (
    <foreignObject x={x - 44} y={y - 44} width={88} height={88}>
      <div
        className={`w-full h-full rounded-2xl border-2 ${bgColor} ${borderColor} flex flex-col items-center justify-center shadow-sm`}
      >
        <span className="text-2xl">{icon}</span>
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-300 mt-0.5">
          {label}
        </span>
        <span className="text-[11px] font-bold text-slate-700 dark:text-white">{value}</span>
      </div>
    </foreignObject>
  )
}

interface FlowArrowProps {
  x1: number
  y1: number
  x2: number
  y2: number
  active: boolean
  color: string
  reversed?: boolean
  label?: string
  inactiveStroke: string
}

function FlowArrow({ x1, y1, x2, y2, active, color, reversed, label, inactiveStroke }: FlowArrowProps) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  if (!active) {
    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={inactiveStroke}
        strokeWidth={2}
        strokeDasharray="4 4"
      />
    )
  }

  // One full dash+gap cycle = 18px; offset direction controls visual flow direction
  const offsetTarget = reversed ? 18 : -18

  return (
    <g>
      {/* Pulsing glow track */}
      <motion.line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        animate={{ strokeOpacity: [0.08, 0.22, 0.08] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Flowing wave dashes */}
      <motion.line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="12 6"
        animate={{ strokeDashoffset: [0, offsetTarget] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      />
      {label && (
        <text
          x={mx}
          y={my - 8}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fill={color}
          className="select-none"
        >
          {label}
        </text>
      )}
    </g>
  )
}

interface Props {
  data: LiveStatus | null
  loading?: boolean
}

export function PowerFlowDiagram({ data, loading }: Props) {
  const inactiveStroke = "#2a2a2a"

  if (loading || !data) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="w-full h-full bg-slate-50 dark:bg-slate-800 animate-pulse rounded-2xl" />
      </div>
    )
  }

  const solarActive = data.solar_power > 50
  const batteryCharging = data.battery_power > 50
  const batteryDischarging = data.battery_power < -50
  const gridImporting = data.grid_power > 50
  const gridExporting = data.grid_power < -50

  const W = 340
  const H = 240

  const sunX = 70, sunY = 60
  const homeX = 270, homeY = 60
  const battX = 70, battY = 180
  const gridX = 270, gridY = 180

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" style={{ minWidth: 280 }}>
        <FlowArrow
          x1={sunX + 44}
          y1={sunY}
          x2={homeX - 44}
          y2={homeY}
          active={solarActive}
          color="#F59E0B"
          label={solarActive ? formatWatts(data.solar_power) : undefined}
          inactiveStroke={inactiveStroke}
        />
        <FlowArrow
          x1={sunX}
          y1={sunY + 44}
          x2={battX}
          y2={battY - 44}
          active={batteryCharging && solarActive}
          color="#10B981"
          label={batteryCharging ? formatWatts(Math.abs(data.battery_power)) : undefined}
          inactiveStroke={inactiveStroke}
        />
        <FlowArrow
          x1={battX + 44}
          y1={battY}
          x2={homeX - 44}
          y2={homeY + 44}
          active={batteryDischarging}
          color="#10B981"
          label={batteryDischarging ? formatWatts(Math.abs(data.battery_power)) : undefined}
          reversed={false}
          inactiveStroke={inactiveStroke}
        />
        <FlowArrow
          x1={homeX}
          y1={homeY + 44}
          x2={gridX}
          y2={gridY - 44}
          active={gridImporting || gridExporting}
          color={gridExporting ? "#6366F1" : "#64748B"}
          reversed={gridExporting}
          label={
            gridImporting || gridExporting
              ? formatWatts(Math.abs(data.grid_power))
              : undefined
          }
          inactiveStroke={inactiveStroke}
        />

        <Node
          x={sunX}
          y={sunY}
          icon="☀️"
          label="Solar"
          value={formatWatts(data.solar_power)}
          color="#F59E0B"
          bgColor="bg-amber-50 dark:bg-amber-900/20"
          borderColor="border-amber-200 dark:border-amber-800"
        />
        <Node
          x={homeX}
          y={homeY}
          icon="🏠"
          label="Home"
          value={formatWatts(data.load_power)}
          color="#0EA5E9"
          bgColor="bg-sky-50 dark:bg-sky-900/20"
          borderColor="border-sky-200 dark:border-sky-800"
        />
        <Node
          x={battX}
          y={battY}
          icon="🔋"
          label={`${Math.round(data.battery_percentage ?? 0)}%`}
          value={
            batteryCharging
              ? `+${formatWatts(data.battery_power)}`
              : batteryDischarging
                ? formatWatts(data.battery_power)
                : "Idle"
          }
          color="#10B981"
          bgColor="bg-emerald-50 dark:bg-emerald-900/20"
          borderColor="border-emerald-200 dark:border-emerald-800"
        />
        <Node
          x={gridX}
          y={gridY}
          icon="⚡"
          label="Grid"
          value={
            gridImporting
              ? `↓ ${formatWatts(data.grid_power)}`
              : gridExporting
                ? `↑ ${formatWatts(Math.abs(data.grid_power))}`
                : "Idle"
          }
          color={gridExporting ? "#6366F1" : "#64748B"}
          bgColor={
            gridExporting
              ? "bg-indigo-50 dark:bg-indigo-900/20"
              : "bg-slate-50 dark:bg-slate-800"
          }
          borderColor={
            gridExporting
              ? "border-indigo-200 dark:border-indigo-800"
              : "border-slate-200 dark:border-slate-700"
          }
        />
      </svg>
    </div>
  )
}
