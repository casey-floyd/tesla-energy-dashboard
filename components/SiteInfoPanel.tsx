"use client"

import type { SiteInfo } from "@/lib/types"
import { Battery, Calendar, Cpu, Shield, Sun, Zap } from "lucide-react"

interface Props {
  siteInfo: SiteInfo | null
  siteId: number | null
  loading?: boolean
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
      <div className="text-slate-400 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
      </div>
    </div>
  )
}

export function SiteInfoPanel({ siteInfo, siteId, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (!siteInfo) {
    return <p className="text-sm text-slate-400">No site information available.</p>
  }

  const capacityKwh = siteInfo.nameplate_energy ? (siteInfo.nameplate_energy / 1000).toFixed(1) : "—"
  const powerKw = siteInfo.nameplate_power ? (siteInfo.nameplate_power / 1000).toFixed(1) : "—"

  const modeLabels: Record<string, string> = {
    autonomous: "Time-Based Control",
    backup: "Backup-Only",
    self_consumption: "Self-Powered",
    savings: "Savings Mode",
  }
  const modeLabel = modeLabels[siteInfo.default_real_mode] ?? siteInfo.default_real_mode

  const installDate = siteInfo.installation_date
    ? new Date(siteInfo.installation_date).toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—"

  return (
    <div>
      <InfoRow
        icon={<Battery className="w-4 h-4" />}
        label="Battery Capacity"
        value={`${capacityKwh} kWh (${siteInfo.battery_count} unit${siteInfo.battery_count !== 1 ? "s" : ""})`}
      />
      <InfoRow
        icon={<Zap className="w-4 h-4" />}
        label="Max Power Output"
        value={`${powerKw} kW`}
      />
      {siteInfo.components?.solar && (
        <InfoRow
          icon={<Sun className="w-4 h-4" />}
          label="Solar"
          value={`Connected (${siteInfo.components.solar_type ?? "standard"})`}
        />
      )}
      <InfoRow
        icon={<Cpu className="w-4 h-4" />}
        label="Operating Mode"
        value={modeLabel}
      />
      <InfoRow
        icon={<Shield className="w-4 h-4" />}
        label="Backup Reserve"
        value={`${siteInfo.backup_reserve_percent}%`}
      />
      <InfoRow
        icon={<Calendar className="w-4 h-4" />}
        label="Installed"
        value={installDate}
      />
      {siteId && (
        <InfoRow
          icon={<span className="text-[10px] font-mono text-slate-300">#</span>}
          label="Site ID"
          value={String(siteId)}
        />
      )}
    </div>
  )
}
