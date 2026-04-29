"use client"

import { Badge } from "@/components/ui/badge"
import type { LiveStatus } from "@/lib/types"
import { CloudOff, RefreshCw, Wifi, WifiOff } from "lucide-react"

interface Props {
  data: LiveStatus | null
  loading?: boolean
  lastUpdated: Date | null
  onRefresh: () => void
}

export function GridStatusBanner({ data, loading, lastUpdated, onRefresh }: Props) {
  if (!data) return null

  const islandStatus = data.island_status
  const gridExporting = data.grid_power < -50
  const gridImporting = data.grid_power > 50

  let statusLabel = "Grid Connected"
  let statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200"
  let Icon = Wifi

  if (islandStatus === "off_grid" || islandStatus === "island") {
    statusLabel = "Off Grid / Island Mode"
    statusColor = "bg-amber-50 text-amber-700 border-amber-200"
    Icon = WifiOff
  } else if (islandStatus === "island_wait") {
    statusLabel = "Transitioning to Island"
    statusColor = "bg-amber-50 text-amber-700 border-amber-200"
    Icon = CloudOff
  } else if (gridExporting) {
    statusLabel = "Exporting to Grid"
    statusColor = "bg-indigo-50 text-indigo-700 border-indigo-200"
    Icon = Wifi
  } else if (gridImporting) {
    statusLabel = "Importing from Grid"
    statusColor = "bg-slate-50 text-slate-600 border-slate-200"
    Icon = Wifi
  }

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={`text-xs font-medium px-2.5 py-1 ${statusColor} border`}
        >
          <Icon className="w-3 h-3 mr-1.5" />
          {statusLabel}
        </Badge>
        {data.storm_mode_active && (
          <Badge
            variant="outline"
            className="text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-700 border-blue-200 border"
          >
            ⛈ Storm Mode Active
          </Badge>
        )}
        {data.operation === "backup" && (
          <Badge
            variant="outline"
            className="text-xs font-medium px-2.5 py-1 bg-orange-50 text-orange-700 border-orange-200 border"
          >
            🛡 Backup Mode
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {timeStr && <span>Updated {timeStr}</span>}
        <button
          onClick={onRefresh}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  )
}
