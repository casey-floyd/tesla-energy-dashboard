"use client"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

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
import { ChevronDown, GripHorizontal, LogOut, RefreshCw, Zap } from "lucide-react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import ReactGridLayout from "react-grid-layout"

type Layout = ReactGridLayout.Layout
const RGL = ReactGridLayout.WidthProvider(ReactGridLayout)

const PERIODS: { label: string; value: HistoryPeriod }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
]

const LAYOUT_KEY = "dashboard-grid-layout-v2"

// rowHeight=60, margin=[12,12]
// h:6 = 6*60+5*12 = 420px   h:7 = 480px   h:8 = 540px   h:9 = 600px   h:10 = 660px
const DEFAULT_LAYOUT: Layout[] = [
  { i: "live-status",      x: 0, y: 0,  w: 4, h: 8,  minW: 2, minH: 5 },
  { i: "power-flow",       x: 4, y: 0,  w: 4, h: 8,  minW: 2, minH: 5 },
  { i: "battery",          x: 8, y: 0,  w: 4, h: 8,  minW: 2, minH: 5 },
  { i: "energy-history",   x: 0, y: 8,  w: 8, h: 9,  minW: 3, minH: 5 },
  { i: "energy-mix",       x: 8, y: 8,  w: 4, h: 9,  minW: 2, minH: 5 },
  { i: "solar-production", x: 0, y: 17, w: 8, h: 8,  minW: 3, minH: 5 },
  { i: "weather",          x: 8, y: 17, w: 4, h: 8,  minW: 2, minH: 5 },
  { i: "battery-flow",     x: 0, y: 25, w: 4, h: 8,  minW: 2, minH: 5 },
  { i: "grid-interaction", x: 4, y: 25, w: 4, h: 8,  minW: 2, minH: 5 },
  { i: "home-sources",     x: 8, y: 25, w: 4, h: 8,  minW: 2, minH: 5 },
  { i: "energy-costs",     x: 0, y: 33, w: 8, h: 10, minW: 3, minH: 6 },
  { i: "wall-connector",   x: 8, y: 33, w: 4, h: 5,  minW: 2, minH: 4 },
  { i: "site-details",     x: 8, y: 38, w: 4, h: 5,  minW: 2, minH: 3 },
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
  const [layout, setLayout] = useState<Layout[]>(DEFAULT_LAYOUT)

  const { data: liveData, loading: liveLoading, error: liveError, lastUpdated, refresh } =
    useLiveData(siteId)

  useEffect(() => {
    const stored = localStorage.getItem(LAYOUT_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Layout[]
        // Merge stored positions with any new panels from DEFAULT_LAYOUT
        const merged = DEFAULT_LAYOUT.map((def) => {
          const saved = parsed.find((p) => p.i === def.i)
          return saved ? { ...def, ...saved } : def
        })
        setLayout(merged)
      } catch { /* use defaults */ }
    }
  }, [])

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

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout)
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(newLayout))
  }

  const siteName = siteInfo?.site_name ?? "My Site"

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Sticky nav — auth + live status */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-black/90 backdrop-blur-sm border-b border-gray-100 dark:border-neutral-800">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-500 dark:text-neutral-400">Tesla Energy</span>
            </div>
            {/* Grid status chip in the nav — compact (badge only) */}
            <div className="hidden sm:block">
              <GridStatusBanner
                data={liveData}
                loading={liveLoading}
                lastUpdated={lastUpdated}
                onRefresh={refresh}
                compact
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <Link
              href="/reauth"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reauthorize</span>
            </Link>
            {!preConfigured && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Page title + filter bar */}
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Live Data
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-7 text-sm">
          <div className="flex items-center gap-1 cursor-default select-none">
            <span className="font-medium text-gray-400 dark:text-neutral-500">Sites</span>
            <span className="font-medium text-gray-700 dark:text-neutral-200">{siteName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-400 dark:text-neutral-500">Period</span>
            <div className="flex gap-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    period === p.value
                      ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                      : "text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/10"
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

        {/* Draggable / resizable grid */}
        <RGL
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={60}
          margin={[12, 12]}
          isDraggable
          isResizable={false}
          draggableHandle=".drag-handle"
          onLayoutChange={handleLayoutChange}
        >
          <div key="live-status">
            <DashCard title="Live Status">
              <LiveMetricsCards data={liveData} loading={liveLoading || siteLoading} />
            </DashCard>
          </div>

          <div key="power-flow">
            <DashCard title="Power Flow">
              <PowerFlowDiagram data={liveData} loading={liveLoading || siteLoading} />
            </DashCard>
          </div>

          <div key="battery">
            <DashCard title="Battery">
              <BatteryGauge data={liveData} siteInfo={siteInfo} loading={liveLoading || siteLoading} />
            </DashCard>
          </div>

          <div key="energy-history">
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

          <div key="energy-mix">
            <DashCard title="Energy Mix" subtitle="Home energy sources">
              <EnergyMixDonut entries={history?.time_series ?? []} loading={historyLoading} />
            </DashCard>
          </div>

          <div key="solar-production">
            <DashCard title="Solar Production">
              <ProductionChart
                entries={history?.time_series ?? []}
                loading={historyLoading || siteLoading}
              />
            </DashCard>
          </div>

          <div key="weather">
            <DashCard title="Current Weather" subtitle="Solar generation forecast">
              <WeatherPanel siteInfo={siteInfo} />
            </DashCard>
          </div>

          <div key="battery-flow">
            <DashCard title="Battery Flow" subtitle="Charged from solar/grid · Discharged to home/grid">
              <BatteryFlowChart
                entries={history?.time_series ?? []}
                period={period}
                loading={historyLoading}
              />
            </DashCard>
          </div>

          <div key="grid-interaction">
            <DashCard title="Grid Interaction" subtitle="Energy bought · Sold back to grid">
              <GridBalanceChart
                entries={history?.time_series ?? []}
                period={period}
                loading={historyLoading}
              />
            </DashCard>
          </div>

          <div key="home-sources">
            <DashCard title="Home Energy Sources">
              <HomeSourcesChart
                entries={history?.time_series ?? []}
                period={period}
                loading={historyLoading}
              />
            </DashCard>
          </div>

          <div key="energy-costs">
            <EnergyCostPanel
              entries={history?.time_series ?? []}
              period={period}
              loading={historyLoading || siteLoading}
            />
          </div>

          <div key="wall-connector">
            <WallConnectorPanel data={liveData} loading={liveLoading || siteLoading} />
          </div>

          <div key="site-details">
            <DashCard title="Site Details">
              <SiteInfoPanel siteInfo={siteInfo} siteId={siteId} loading={siteLoading} />
            </DashCard>
          </div>
        </RGL>
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
    <Card className="border border-gray-100 dark:border-neutral-800 shadow-sm rounded-2xl bg-white dark:bg-neutral-900 h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-5 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="drag-handle flex-1 min-w-0 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none">
            <GripHorizontal className="w-3.5 h-3.5 text-gray-300 dark:text-neutral-600 shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base font-bold text-gray-900 dark:text-white truncate">
                {title}
              </CardTitle>
              {subtitle && (
                <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          {headerRight}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 flex-1 min-h-0 overflow-hidden">
        {children}
      </CardContent>
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
              : "text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
