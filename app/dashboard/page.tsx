"use client"

import { BatteryGauge } from "@/components/BatteryGauge"
import { EnergyHistoryChart } from "@/components/EnergyHistoryChart"
import { EnergyMixDonut } from "@/components/EnergyMixDonut"
import { GridStatusBanner } from "@/components/GridStatusBanner"
import { LiveMetricsCards } from "@/components/LiveMetricsCards"
import { PowerFlowDiagram } from "@/components/PowerFlowDiagram"
import { ProductionChart } from "@/components/ProductionChart"
import { SiteInfoPanel } from "@/components/SiteInfoPanel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLiveData } from "@/hooks/useLiveData"
import type { CalendarHistory, HistoryPeriod, SiteInfo } from "@/lib/types"
import { LogOut, Zap } from "lucide-react"
import { signOut } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"

const PERIODS: { label: string; value: HistoryPeriod }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
]

export default function DashboardPage() {
  const [siteId, setSiteId] = useState<number | null>(null)
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null)
  const [siteLoading, setSiteLoading] = useState(true)
  const [siteError, setSiteError] = useState<string | null>(null)

  const [period, setPeriod] = useState<HistoryPeriod>("day")
  const [history, setHistory] = useState<CalendarHistory | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const { data: liveData, loading: liveLoading, error: liveError, lastUpdated, refresh } = useLiveData(siteId)

  useEffect(() => {
    async function loadSite() {
      try {
        const res = await fetch("/api/tesla/site-info")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setSiteId(json.siteId)
        setSiteInfo(json.info)
      } catch (e) {
        setSiteError(e instanceof Error ? e.message : "Failed to load site info")
      } finally {
        setSiteLoading(false)
      }
    }
    loadSite()
  }, [])

  const loadHistory = useCallback(
    async (p: HistoryPeriod) => {
      if (!siteId) return
      setHistoryLoading(true)
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const res = await fetch(
          `/api/tesla/history?siteId=${siteId}&period=${p}&timezone=${encodeURIComponent(tz)}`,
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setHistory(json)
      } catch {
        setHistory(null)
      } finally {
        setHistoryLoading(false)
      }
    },
    [siteId],
  )

  useEffect(() => {
    if (siteId) loadHistory(period)
  }, [siteId, period, loadHistory])

  const siteName = siteInfo?.site_name ?? "Energy Dashboard"

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 rounded-lg">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-800">{siteName}</h1>
              <p className="text-[10px] text-slate-400">Tesla Energy</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {siteError && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {siteError} — check your Tesla API credentials.
          </div>
        )}

        {liveError && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
            Live data unavailable: {liveError}
          </div>
        )}

        <GridStatusBanner
          data={liveData}
          loading={liveLoading}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
        />

        <LiveMetricsCards data={liveData} loading={liveLoading || siteLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3 border border-slate-100 shadow-sm rounded-2xl">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-700">Power Flow</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <PowerFlowDiagram data={liveData} loading={liveLoading || siteLoading} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border border-slate-100 shadow-sm rounded-2xl">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-700">Battery</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <BatteryGauge
                data={liveData}
                siteInfo={siteInfo}
                loading={liveLoading || siteLoading}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="border border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Solar Production Today
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ProductionChart
              entries={history?.time_series ?? []}
              loading={historyLoading || siteLoading}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border border-slate-100 shadow-sm rounded-2xl">
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Energy History
                </CardTitle>
                <div className="flex gap-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPeriod(p.value)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        period === p.value
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <EnergyHistoryChart
                entries={history?.time_series ?? []}
                period={period}
                loading={historyLoading}
              />
            </CardContent>
          </Card>

          <Card className="border border-slate-100 shadow-sm rounded-2xl">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-700">Energy Mix</CardTitle>
              <p className="text-xs text-slate-400">Home energy sources</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <EnergyMixDonut
                entries={history?.time_series ?? []}
                loading={historyLoading}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="border border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-slate-700">Site Details</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <SiteInfoPanel siteInfo={siteInfo} siteId={siteId} loading={siteLoading} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
