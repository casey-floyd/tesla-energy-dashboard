"use client"

import { BatteryGauge } from "@/components/BatteryGauge"
import { EnergyHistoryChart } from "@/components/EnergyHistoryChart"
import { EnergyMixDonut } from "@/components/EnergyMixDonut"
import { GridStatusBanner } from "@/components/GridStatusBanner"
import { LiveMetricsCards } from "@/components/LiveMetricsCards"
import { PowerFlowDiagram } from "@/components/PowerFlowDiagram"
import { ProductionChart } from "@/components/ProductionChart"
import { SiteInfoPanel } from "@/components/SiteInfoPanel"
import { ThemeToggle } from "@/components/ThemeToggle"
import { WallConnectorPanel } from "@/components/WallConnectorPanel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLiveData } from "@/hooks/useLiveData"
import type { CalendarHistory, HistoryPeriod, SiteInfo } from "@/lib/types"
import { Reorder, useDragControls } from "framer-motion"
import { GripVertical, LogOut, RefreshCw, Zap } from "lucide-react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

const PERIODS: { label: string; value: HistoryPeriod }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
]

type PanelId = "live-metrics" | "power-battery" | "wall-connector" | "production" | "history-mix" | "site-details"
const DEFAULT_PANELS: PanelId[] = [
  "live-metrics",
  "power-battery",
  "wall-connector",
  "production",
  "history-mix",
  "site-details",
]
const PANEL_ORDER_KEY = "dashboard-panel-order"

function DraggablePanel({
  panelId,
  children,
}: {
  panelId: PanelId
  children: React.ReactNode
}) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={panelId}
      dragControls={controls}
      dragListener={false}
      className="list-none"
    >
      <div className="relative group">
        <div
          className="absolute top-3 right-3 z-20 p-1 rounded opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing touch-none select-none transition-opacity"
          onPointerDown={(e) => controls.start(e)}
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
        </div>
        {children}
      </div>
    </Reorder.Item>
  )
}

interface Props {
  preConfigured: boolean
}

export function DashboardClient({ preConfigured }: Props) {
  const [siteId, setSiteId] = useState<number | null>(null)
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null)
  const [siteLoading, setSiteLoading] = useState(true)
  const [siteError, setSiteError] = useState<string | null>(null)

  const [period, setPeriod] = useState<HistoryPeriod>("day")
  const [history, setHistory] = useState<CalendarHistory | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const [panels, setPanels] = useState<PanelId[]>(DEFAULT_PANELS)

  const { data: liveData, loading: liveLoading, error: liveError, lastUpdated, refresh } =
    useLiveData(siteId)

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_ORDER_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[]
        const validStored = parsed.filter((p): p is PanelId =>
          DEFAULT_PANELS.includes(p as PanelId),
        )
        const newDefaults = DEFAULT_PANELS.filter((p) => !parsed.includes(p))
        setPanels([...validStored, ...newDefaults])
      } catch { /* use defaults */ }
    }
  }, [])

  const handleReorder = (newOrder: PanelId[]) => {
    setPanels(newOrder)
    localStorage.setItem(PANEL_ORDER_KEY, JSON.stringify(newOrder))
  }

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

  function renderPanel(panelId: PanelId) {
    switch (panelId) {
      case "live-metrics":
        return (
          <DraggablePanel key={panelId} panelId={panelId}>
            <LiveMetricsCards data={liveData} loading={liveLoading || siteLoading} />
          </DraggablePanel>
        )

      case "power-battery":
        return (
          <DraggablePanel key={panelId} panelId={panelId}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <Card className="lg:col-span-3 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Power Flow
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <PowerFlowDiagram data={liveData} loading={liveLoading || siteLoading} />
                </CardContent>
              </Card>
              <Card className="lg:col-span-2 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Battery
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <BatteryGauge data={liveData} siteInfo={siteInfo} loading={liveLoading || siteLoading} />
                </CardContent>
              </Card>
            </div>
          </DraggablePanel>
        )

      case "wall-connector":
        return (
          <DraggablePanel key={panelId} panelId={panelId}>
            <WallConnectorPanel data={liveData} loading={liveLoading || siteLoading} />
          </DraggablePanel>
        )

      case "production":
        return (
          <DraggablePanel key={panelId} panelId={panelId}>
            <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
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
          </DraggablePanel>
        )

      case "history-mix":
        return (
          <DraggablePanel key={panelId} panelId={panelId}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
                <CardHeader className="pb-2 pt-4 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Energy History
                    </CardTitle>
                    <div className="flex gap-1">
                      {PERIODS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => setPeriod(p.value)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            period === p.value
                              ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
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
              <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Energy Mix
                  </CardTitle>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Home energy sources</p>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <EnergyMixDonut entries={history?.time_series ?? []} loading={historyLoading} />
                </CardContent>
              </Card>
            </div>
          </DraggablePanel>
        )

      case "site-details":
        return (
          <DraggablePanel key={panelId} panelId={panelId}>
            <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Site Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <SiteInfoPanel siteInfo={siteInfo} siteId={siteId} loading={siteLoading} />
              </CardContent>
            </Card>
          </DraggablePanel>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{siteName}</h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Tesla Energy</p>
            </div>
            {liveData && !liveLoading && (
              <div className="flex items-center gap-1.5 ml-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] text-emerald-500 font-medium">Live</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/reauth"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              title="Reauthorize Tesla account"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reauthorize</span>
            </Link>
            {!preConfigured && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {siteError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {siteError} — check your Tesla API credentials.
          </div>
        )}

        {liveError && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            Live data unavailable: {liveError}
          </div>
        )}

        <GridStatusBanner
          data={liveData}
          loading={liveLoading}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
        />

        <Reorder.Group
          axis="y"
          values={panels}
          onReorder={handleReorder}
          as="div"
          className="space-y-5"
        >
          {panels.map((panelId) => renderPanel(panelId))}
        </Reorder.Group>
      </main>
    </div>
  )
}
