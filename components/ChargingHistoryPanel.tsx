"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ChargingSession, ChargingSessionDetail } from "@/lib/types"
import { BatteryCharging, ChevronDown, ChevronUp, Clock, Zap } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

function fmtKwh(wh: number): string {
  return `${(wh / 1000).toFixed(2)} kWh`
}

function fmtDuration(s: number | null | undefined): string {
  if (s == null) return "—"
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function fmtCost(cents: number | null): string {
  if (cents == null) return "—"
  return `$${(cents / 100).toFixed(2)}`
}

function maskVin(vin: string | null): string {
  if (!vin) return "Unknown VIN"
  return vin.length >= 8 ? `${vin.slice(0, 5)}···${vin.slice(-4)}` : vin
}

function PowerCurve({ sessionId }: { sessionId: string }) {
  const [detail, setDetail] = useState<ChargingSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/charging/${sessionId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="h-full w-full rounded-lg bg-slate-100 dark:bg-neutral-800 animate-pulse" />
      </div>
    )
  }

  if (!detail?.telemetry?.length) {
    return (
      <p className="text-xs text-slate-400 dark:text-neutral-500 text-center py-6">
        No telemetry recorded
      </p>
    )
  }

  const chartData = detail.telemetry.map((p) => ({
    ts: p.ts,
    kw: +(p.power_w / 1000).toFixed(2),
  }))

  const maxKw = Math.max(...chartData.map((d) => d.kw))

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="chargingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="ts"
          hide
          scale="time"
          type="number"
          domain={["dataMin", "dataMax"]}
        />
        <YAxis
          domain={[0, Math.ceil(maxKw * 1.1)]}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}kW`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as { ts: number; kw: number }
            return (
              <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs shadow">
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {d.kw} kW
                </p>
                <p className="text-slate-400 dark:text-neutral-500">
                  {new Date(d.ts).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="kw"
          stroke="#34d399"
          strokeWidth={1.5}
          fill="url(#chargingGrad)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function SessionRow({ session }: { session: ChargingSession }) {
  const [expanded, setExpanded] = useState(false)
  const isActive = session.ended_at == null

  return (
    <div className={`rounded-xl border transition-colors ${
      isActive
        ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20"
        : "border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
    }`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <div className="mt-0.5 shrink-0">
          <BatteryCharging
            className={`w-4 h-4 ${isActive ? "text-emerald-500" : "text-slate-400 dark:text-neutral-500"}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-white truncate">
              {maskVin(session.vin)}
              {isActive && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-500 text-xs font-medium">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Live
                </span>
              )}
            </span>
            <span className="text-xs text-slate-400 dark:text-neutral-500 shrink-0 tabular-nums">
              {fmtDuration(session.duration_s)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {fmtKwh(session.total_energy_wh)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {fmtTime(session.started_at)}
            </span>
            {session.estimated_cost_cents != null && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {fmtCost(session.estimated_cost_cents)}
              </span>
            )}
          </div>
          {session.peak_power_w > 0 && (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-500">
              Peak {(session.peak_power_w / 1000).toFixed(1)} kW
              {session.source === "telemetry" && (
                <span className="ml-2 text-sky-500">• Fleet Telemetry</span>
              )}
            </p>
          )}
        </div>
        <div className="shrink-0 text-slate-300 dark:text-neutral-600">
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <PowerCurve sessionId={session.id} />
        </div>
      )}
    </div>
  )
}

export function ChargingHistoryPanel() {
  const [sessions, setSessions] = useState<ChargingSession[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 10

  const load = useCallback(async (off: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/charging/sessions?limit=${limit}&offset=${off}`)
      const json = await res.json()
      setSessions(json.sessions ?? [])
      setTotal(json.total ?? 0)
      setOffset(off)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(0)
    // Refresh every 30s to pick up new sessions while active
    const iv = setInterval(() => load(offset), 30_000)
    return () => clearInterval(iv)
  }, [load, offset])

  const totalKwh = sessions.reduce((s, c) => s + c.total_energy_wh, 0) / 1000
  const activeSessions = sessions.filter((s) => s.ended_at == null)

  return (
    <Card className="border border-gray-100 dark:border-neutral-800 shadow-sm rounded-2xl h-full flex flex-col">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
            Charging Sessions
          </CardTitle>
          {!loading && sessions.length > 0 && (
            <div className="text-xs text-slate-400 dark:text-neutral-500 tabular-nums">
              {totalKwh.toFixed(1)} kWh shown
            </div>
          )}
        </div>
        {!loading && activeSessions.length > 0 && (
          <p className="text-xs text-emerald-500 font-medium mt-0.5">
            {activeSessions.length} active session{activeSessions.length > 1 ? "s" : ""}
          </p>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse"
                style={{ opacity: 1 - i * 0.25 }}
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <BatteryCharging className="w-6 h-6 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-neutral-500">
              No charging sessions yet
            </p>
            <p className="text-xs text-slate-300 dark:text-slate-600">
              Sessions are recorded automatically when the Wall Connector is active
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}

            {total > limit && (
              <div className="flex items-center justify-between pt-2 text-xs text-slate-400 dark:text-neutral-500">
                <span>
                  {offset + 1}–{Math.min(offset + limit, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={offset === 0}
                    onClick={() => load(Math.max(0, offset - limit))}
                    className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors"
                  >
                    Prev
                  </button>
                  <button
                    disabled={offset + limit >= total}
                    onClick={() => load(offset + limit)}
                    className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
