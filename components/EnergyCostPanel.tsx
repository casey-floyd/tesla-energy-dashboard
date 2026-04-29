"use client"

import { useTheme } from "@/components/ThemeProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  APS_RATE_PLANS,
  type CustomRates,
  type RatePlanKey,
  calculateCosts,
} from "@/lib/rates"
import type { EnergyHistoryEntry, HistoryPeriod } from "@/lib/types"
import { useEffect, useMemo, useState } from "react"
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

const PLAN_KEY = "aps-rate-plan-key"
const CUSTOM_IMPORT_KEY = "aps-custom-import-rate"
const CUSTOM_EXPORT_KEY = "aps-custom-export-rate"

interface Props {
  entries: EnergyHistoryEntry[]
  period: HistoryPeriod
  loading?: boolean
}

function StatCard({
  label,
  value,
  subLabel,
  positive,
}: {
  label: string
  value: string
  subLabel?: string
  positive?: boolean
}) {
  return (
    <div className="flex-1 min-w-0 px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
      <p
        className={`text-base font-semibold tabular-nums leading-tight ${
          positive === true
            ? "text-emerald-600 dark:text-emerald-400"
            : positive === false
              ? "text-rose-600 dark:text-rose-400"
              : "text-slate-800 dark:text-slate-100"
        }`}
      >
        {value}
      </p>
      {subLabel && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{subLabel}</p>
      )}
    </div>
  )
}

export function EnergyCostPanel({ entries, period, loading }: Props) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const [selectedPlanKey, setSelectedPlanKey] = useState<RatePlanKey>("aps-saver-choice")
  const [customImport, setCustomImport] = useState("0.115")
  const [customExport, setCustomExport] = useState("0.075")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const storedPlan = localStorage.getItem(PLAN_KEY) as RatePlanKey | null
    if (storedPlan) setSelectedPlanKey(storedPlan)
    const storedImport = localStorage.getItem(CUSTOM_IMPORT_KEY)
    if (storedImport) setCustomImport(storedImport)
    const storedExport = localStorage.getItem(CUSTOM_EXPORT_KEY)
    if (storedExport) setCustomExport(storedExport)
    setMounted(true)
  }, [])

  const handlePlanChange = (key: RatePlanKey) => {
    setSelectedPlanKey(key)
    localStorage.setItem(PLAN_KEY, key)
  }

  const isCustom = selectedPlanKey === "custom"

  const { summary, series } = useMemo(() => {
    const plan = isCustom ? null : (APS_RATE_PLANS.find((p) => p.key === selectedPlanKey) ?? null)
    const custom: CustomRates | null = isCustom
      ? { importRate: parseFloat(customImport) || 0, exportRate: parseFloat(customExport) || 0 }
      : null
    return calculateCosts(entries, period, plan, custom)
  }, [entries, period, selectedPlanKey, isCustom, customImport, customExport])

  const chartData = series.map((p) => ({
    label: p.label,
    gridSpend: Number(p.gridSpend.toFixed(4)),
    exportEarnings: -Number(p.exportEarnings.toFixed(4)),
  }))

  const hasData = chartData.some((d) => d.gridSpend > 0 || d.exportEarnings < 0)
  const netIsCredit = summary.netCostDollars <= 0

  const selectedPlan = APS_RATE_PLANS.find((p) => p.key === selectedPlanKey)

  const gridStroke = isDark ? "#1e293b" : "#F1F5F9"
  const tickFill = isDark ? "#64748b" : "#94A3B8"
  const refLineStroke = isDark ? "#334155" : "#CBD5E1"
  const tooltipStyle = {
    backgroundColor: isDark ? "#1e293b" : "#fff",
    border: `1px solid ${isDark ? "#334155" : "#F1F5F9"}`,
    borderRadius: 12,
    fontSize: 12,
    color: isDark ? "#e2e8f0" : "#1e293b",
  }
  const legendStyle = isDark
    ? { fontSize: 11, paddingTop: 8, color: "#94a3b8" }
    : { fontSize: 11, paddingTop: 8 }

  return (
    <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Energy Costs
            </CardTitle>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {isCustom ? "Custom rates" : (selectedPlan?.description ?? "")}
            </p>
          </div>
          <select
            value={mounted ? selectedPlanKey : "aps-saver-choice"}
            onChange={(e) => handlePlanChange(e.target.value as RatePlanKey)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 cursor-pointer max-w-[200px]"
          >
            {APS_RATE_PLANS.map((plan) => (
              <option key={plan.key} value={plan.key}>
                {plan.label}
              </option>
            ))}
            <option value="custom">Custom Rates</option>
          </select>
        </div>

        {isCustom && (
          <div className="flex flex-wrap gap-3 mt-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              Import $/kWh
              <input
                type="number"
                step="0.001"
                min="0"
                value={customImport}
                onChange={(e) => {
                  setCustomImport(e.target.value)
                  localStorage.setItem(CUSTOM_IMPORT_KEY, e.target.value)
                }}
                className="w-20 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 tabular-nums"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              Export $/kWh
              <input
                type="number"
                step="0.001"
                min="0"
                value={customExport}
                onChange={(e) => {
                  setCustomExport(e.target.value)
                  localStorage.setItem(CUSTOM_EXPORT_KEY, e.target.value)
                }}
                className="w-20 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 tabular-nums"
              />
            </label>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {loading ? (
          <div className="w-full h-52 bg-slate-50 dark:bg-slate-800 animate-pulse rounded-xl" />
        ) : (
          <>
            <div className="flex gap-2">
              <StatCard
                label="Grid Cost"
                value={`$${summary.gridSpendDollars.toFixed(2)}`}
                subLabel={`${summary.gridImportKwh.toFixed(1)} kWh bought`}
                positive={false}
              />
              <StatCard
                label="Export Earnings"
                value={`$${summary.exportEarningsDollars.toFixed(2)}`}
                subLabel={`${summary.gridExportKwh.toFixed(1)} kWh sold`}
                positive={true}
              />
              <StatCard
                label="Net Cost"
                value={`$${Math.abs(summary.netCostDollars).toFixed(2)}`}
                subLabel={netIsCredit ? "Net credit" : "Net spend"}
                positive={netIsCredit}
              />
            </div>

            {!hasData ? (
              <div className="w-full h-44 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                No grid data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={196}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
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
                    tickFormatter={(v) => `$${Math.abs(v).toFixed(2)}`}
                  />
                  <ReferenceLine y={0} stroke={refLineStroke} strokeWidth={1} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => {
                      const v = typeof value === "number" ? Math.abs(value) : 0
                      const label = name === "gridSpend" ? "Grid Cost" : "Export Earnings"
                      return [`$${v.toFixed(3)}`, label]
                    }}
                  />
                  <Legend
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={legendStyle}
                    formatter={(v) => (v === "gridSpend" ? "Grid Cost" : "Export Earnings")}
                  />
                  <Bar dataKey="gridSpend" fill="#fb7185" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
                  <Bar
                    dataKey="exportEarnings"
                    fill="#10B981"
                    fillOpacity={0.85}
                    radius={[0, 0, 3, 3]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            <div className="space-y-1">
              {summary.isTouBlended && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  * TOU rates estimated for this period — switch to Day view for exact on-peak/off-peak pricing.
                </p>
              )}
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Energy charges only — excludes fixed customer, distribution, and demand charges.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
