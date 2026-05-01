"use client"

import { BatteryFlowChart } from "@/components/BatteryFlowChart"
import { BatteryGauge } from "@/components/BatteryGauge"
import { EnergyCostPanel } from "@/components/EnergyCostPanel"
import { EnergyHistoryChart } from "@/components/EnergyHistoryChart"
import { EnergyMixDonut } from "@/components/EnergyMixDonut"
import { GridBalanceChart } from "@/components/GridBalanceChart"
import { GridStatusBanner } from "@/components/GridStatusBanner"
import { HomeSourcesChart } from "@/components/HomeSourcesChart"
import { LiveMetricsCards } from "@/components/LiveMetricsCards"
import { PowerFlowDiagram } from "@/components/PowerFlowDiagram"
import { ProductionChart } from "@/components/ProductionChart"
import { SiteInfoPanel } from "@/components/SiteInfoPanel"
import { ThemeToggle } from "@/components/ThemeToggle"
import { WallConnectorPanel } from "@/components/WallConnectorPanel"
import { WeatherPanel } from "@/components/WeatherPanel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLiveData } from "@/hooks/useLiveData"
import type { CalendarHistory, HistoryPeriod, SiteInfo } from "@/lib/types"
import { Activity, ChevronDown, LayoutList, LogOut, Map, RefreshCw, Zap } from "lucide-react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

const PERIODS: { label: string; value: HistoryPeriod }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
]

interface Props {
  preConfigured: boolean
  skyEnabled?: boolean
}

export function DashboardClient({ preConfigured }: Props) {
  const [siteId, setSiteId] = useState<number | null>(null)
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null)
  const [siteLoading, setSiteLoading] = useState(true)
  const [siteError, setSiteError] = useState<string | null>(null)
  const [period, setPeriod] = useState<HistoryPeriod>("day")
  const [history, setHistory] = useState<CalendarHistory | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [activeView, setActiveView] = useState<"chart" | "list" | "map">("chart")

  const { data: liveData, loading: liveLoading, error: liveError, lastUpdated, refresh } =
    useLiveData(siteId)

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

  const siteName = siteInfo?.site_name ?? "My Site"

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Minimal sticky nav — auth controls only */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Tesla Energy</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/reauth"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reauthorize</span>
            </Link>
            {!preConfigured && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page title + view toggles */}
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Live Data
          </h1>
          <div className="flex gap-1.5">
            {(
              [
                { view: "chart", Icon: Activity },
                { view: "list", Icon: LayoutList },
                { view: "map", Icon: Map },
              ] as const
            ).map(({ view, Icon }) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`p-2 rounded-lg border transition-colors ${
                  activeView === view
                    ? "border-gray-300 bg-gray-100 text-gray-700 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 dark:border-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Filter / status bar */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-7 text-sm">
          <div className="flex items-center gap-1 cursor-default select-none">
            <span className="font-medium text-gray-400 dark:text-slate-500">Sites</span>
            <span className="font-medium text-gray-700 dark:text-slate-200">{siteName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-400 dark:text-slate-500">Period</span>
            <div className="flex gap-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    period === p.value
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {liveData && !liveLoading && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Live</span>
            </div>
          )}

          {(siteError || liveError) && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <span>⚠</span>
              <span className="underline">
                {siteError ? "API Error" : "Live data unavailable"}
              </span>
            </div>
          )}
        </div>

        {/* Grid status badge row */}
        <GridStatusBanner
          data={liveData}
          loading={liveLoading}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
        />

        {/* ── Main 3-column card grid ── */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* Row 1: Live Status · Power Flow · Battery */}
          <DashCard title="Live Status">
            <LiveMetricsCards data={liveData} loading={liveLoading || siteLoading} />
          </DashCard>

          <DashCard title="Power Flow">
            <PowerFlowDiagram data={liveData} loading={liveLoading || siteLoading} />
          </DashCard>

          <DashCard title="Battery">
            <BatteryGauge data={liveData} siteInfo={siteInfo} loading={liveLoading || siteLoading} />
          </DashCard>

          {/* Row 2: Energy History (span 2) · Energy Mix */}
          <div className="lg:col-span-2">
            <DashCard
              title="Energy History"
              headerRight={<PeriodToggle period={period} onChange={setPeriod} />}
            >
              <EnergyHistoryChart
                entries={history?.time_series ?? []}
                period={period}
                loading={historyLoading}
              />
            </DashCard>
          </div>

          <DashCard title="Energy Mix" subtitle="Home energy sources">
            <EnergyMixDonut entries={history?.time_series ?? []} loading={historyLoading} />
          </DashCard>

          {/* Row 3: Solar Production (span 2) · Weather */}
          <div className="lg:col-span-2">
            <DashCard title="Solar Production">
              <ProductionChart
                entries={history?.time_series ?? []}
                loading={historyLoading || siteLoading}
              />
            </DashCard>
          </div>

          <DashCard title="Current Weather" subtitle="Solar generation forecast">
            <WeatherPanel siteInfo={siteInfo} />
          </DashCard>

          {/* Row 4: Battery Flow · Grid Interaction · Home Sources */}
          <DashCard
            title="Battery Flow"
            subtitle="Charged from solar/grid · Discharged to home/grid"
          >
            <BatteryFlowChart
              entries={history?.time_series ?? []}
              period={period}
              loading={historyLoading}
            />
          </DashCard>

          <DashCard title="Grid Interaction" subtitle="Energy bought · Sold back to grid">
            <GridBalanceChart
              entries={history?.time_series ?? []}
              period={period}
              loading={historyLoading}
            />
          </DashCard>

          <DashCard title="Home Energy Sources">
            <HomeSourcesChart
              entries={history?.time_series ?? []}
              period={period}
              loading={historyLoading}
            />
          </DashCard>

          {/* Row 5: Energy Costs (span 2) · Wall Connector + Site Details */}
          <div className="lg:col-span-2">
            <EnergyCostPanel
              entries={history?.time_series ?? []}
              period={period}
              loading={historyLoading || siteLoading}
            />
          </div>

          <div className="space-y-5">
            <WallConnectorPanel data={liveData} loading={liveLoading || siteLoading} />
            <DashCard title="Site Details">
              <SiteInfoPanel siteInfo={siteInfo} siteId={siteId} loading={siteLoading} />
            </DashCard>
          </div>
        </div>
      </main>
    </div>
  )
}

function DashCard({
  title,
  subtitle,
  headerRight,
  children,
}: {
  title: string
  subtitle?: string
  headerRight?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="border border-gray-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 h-full flex flex-col">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerRight}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 flex-1">{children}</CardContent>
    </Card>
  )
}

function PeriodToggle({
  period,
  onChange,
}: {
  period: HistoryPeriod
  onChange: (p: HistoryPeriod) => void
}) {
  return (
    <div className="flex gap-0.5 shrink-0">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
            period === p.value
              ? "bg-gray-800 text-white dark:bg-white/20 dark:text-white"
              : "text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
