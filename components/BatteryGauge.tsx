"use client"

import type { LiveStatus, SiteInfo } from "@/lib/types"

interface Props {
  data: LiveStatus | null
  siteInfo: SiteInfo | null
  loading?: boolean
}

function formatWatts(w: number): string {
  const abs = Math.abs(w)
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)} kW`
  return `${Math.round(abs)} W`
}

export function BatteryGauge({ data, siteInfo, loading }: Props) {
  if (loading || !data) {
    return <div className="w-full h-full min-h-40 bg-slate-50 dark:bg-slate-800 animate-pulse rounded-2xl" />
  }

  const pct = data.battery_percentage
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeDash = (pct / 100) * circumference * 0.75
  const rotation = -225

  const capacityKwh = siteInfo ? siteInfo.nameplate_energy / 1000 : null
  const storedKwh = capacityKwh ? (pct / 100) * capacityKwh : null

  const batteryPower = data.battery_power
  const isCharging = batteryPower > 50
  const isDischarging = batteryPower < -50

  let timeRemaining: string | null = null
  if (storedKwh && isDischarging && batteryPower !== 0) {
    const hours = storedKwh / (Math.abs(batteryPower) / 1000)
    if (hours < 1) timeRemaining = `${Math.round(hours * 60)}m left`
    else timeRemaining = `${hours.toFixed(1)}h left`
  } else if (capacityKwh && isCharging && batteryPower !== 0) {
    const remaining = capacityKwh - (storedKwh ?? 0)
    const hours = remaining / (batteryPower / 1000)
    if (hours < 1) timeRemaining = `Full in ${Math.round(hours * 60)}m`
    else timeRemaining = `Full in ${hours.toFixed(1)}h`
  }

  const gaugeColor =
    pct > 60 ? "#10B981" : pct > 25 ? "#F59E0B" : "#EF4444"

  const statusColor =
    pct > 60 ? "text-emerald-500" : pct > 25 ? "text-amber-500" : "text-red-500"

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-2">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-0">
          <circle
            cx={70}
            cy={70}
            r={radius}
            fill="none"
            className="stroke-slate-200 dark:stroke-slate-700"
            strokeWidth={12}
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${rotation} 70 70)`}
          />
          <circle
            cx={70}
            cy={70}
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={12}
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${rotation} 70 70)`}
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${statusColor}`}>{Math.round(pct)}%</span>
          {storedKwh && (
            <span className="text-[11px] text-slate-400 dark:text-slate-300 font-medium">
              {storedKwh.toFixed(1)} kWh
            </span>
          )}
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-slate-400 dark:text-slate-300 font-medium uppercase tracking-wide">
          {isCharging ? "Charging" : isDischarging ? "Discharging" : "Standby"}
        </p>
        {(isCharging || isDischarging) && (
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-100">
            {formatWatts(Math.abs(batteryPower))}
          </p>
        )}
        {timeRemaining && (
          <p className="text-xs text-slate-400 dark:text-slate-300 mt-0.5">{timeRemaining}</p>
        )}
        {siteInfo && (
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">
            Reserve: {siteInfo.backup_reserve_percent}%
          </p>
        )}
      </div>
    </div>
  )
}
