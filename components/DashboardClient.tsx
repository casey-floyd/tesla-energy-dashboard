"use client"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

import { BatteryFlowChart } from "@/components/BatteryFlowChart"
import { SplashScreen } from "@/components/SplashScreen"
import { BatteryGauge } from "@/components/BatteryGauge"
import { ChargingHistoryPanel } from "@/components/ChargingHistoryPanel"
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
import { ChevronDown, GripHorizontal, Zap } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Responsive, WidthProvider } from "react-grid-layout"
import type { Layout, Layouts } from "react-grid-layout"

const RGL = WidthProvider(Responsive)

const PERIODS: { label: string; value: HistoryPeriod }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
]

const LAYOUT_KEY = "dashboard-grid-layout-v3"

// Desktop layout: 12 columns
// rowHeight=60, margin=[12,12]
const LG_LAYOUT: Layout[] = [
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
  { i: "charging-history", x: 0, y: 43, w: 8, h: 12, minW: 3, minH: 6 },
]

// Mobile layout: 2 columns — single-column stacked cards
const SM_LAYOUT: Layout[] = [
  { i: "live-status",      x: 0, y: 0,   w: 2, h: 9  },
  { i: "power-flow",       x: 0, y: 9,   w: 2, h: 9  },
  { i: "battery",          x: 0, y: 18,  w: 2, h: 9  },
  { i: "wall-connector",   x: 0, y: 27,  w: 2, h: 6  },
  { i: "energy-history",   x: 0, y: 33,  w: 2, h: 10 },
  { i: "energy-mix",       x: 0, y: 43,  w: 2, h: 9  },
  { i: "solar-production", x: 0, y: 52,  w: 2, h: 9  },
  { i: "charging-history", x: 0, y: 61,  w: 2, h: 12 },
  { i: "weather",          x: 0, y: 73,  w: 2, h: 9  },
  { i: "battery-flow",     x: 0, y: 82,  w: 2, h: 9  },
  { i: "grid-interaction", x: 0, y: 91,  w: 2, h: 9  },
  { i: "home-sources",     x: 0, y: 100, w: 2, h: 9  },
  { i: "energy-costs",     x: 0, y: 109, w: 2, h: 11 },
  { i: "site-details",     x: 0, y: 120, w: 2, h: 6  },
]

const DEFAULT_LAYOUTS: Layouts = { lg: LG_LAYOUT, sm: SM_LAYOUT }

interface Props {
  skyEnabled?: boolean
}

export function DashboardClient({ }: Props) {
  const [showSplash, setShowSplash] = useState(true)
  const [siteId, setSiteId] = useState<number | null>(null)
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null)
  const [siteLoading, setSiteLoading] = useState(true)
  const [siteError, setSiteError] = useState<string | null>(null)
  const [period, setPeriod] = useState<HistoryPeriod>("day")
  const [history, setHistory] = useState<CalendarHistory | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [layouts, setLayouts] = useState<Layouts>(DEFAULT_LAYOUTS)
  const [isMobile, setIsMobile] = useState(false)

  const { data: liveData, loading: liveLoading, error: liveError, lastUpdated, refresh } =
    useLiveData(siteId)

  // Detect mobile for disabling drag on touch devices
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem(LAYOUT_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Layouts
        // Merge stored breakpoint layouts with any new panels from defaults
        const merged: Layouts = {}
        for (const [bp, defLayout] of Object.entries(DEFAULT_LAYOUTS)) {
          const savedBp = parsed[bp] ?? []
          merged[bp] = defLayout.map((def) => {
            const saved = savedBp.find((p) => p.i === def.i)
            return saved ? { ...def, ...saved } : def
          })
        }
        setLayouts(merged)
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

  const handleLayoutChange = (_current: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts)
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(allLayouts))
  }

  const siteName = siteInfo?.site_name ?? "My Site"

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Sticky nav */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-black/90 backdrop-blur-sm border-b border-gray-100 dark:border-neutral-800">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-500 dark:text-neutral-400">Tesla Energy</span>
            </div>
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
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page title + filter bar */}
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Live Data
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 text-sm">
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

        {/* Responsive draggable grid */}
        <RGL
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 768, sm: 0 }}
          cols={{ lg: 12, sm: 2 }}
          rowHeight={60}
          margin={[12, 12]}
          isDraggable={!isMobile}
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

          <div key="charging-history">
            <ChargingHistoryPanel />
          </div>
        </RGL>
      </main>
    </div>
    </>
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
