import type { EnergyHistoryEntry, HistoryPeriod } from "./types"

export type RatePlanKey =
  | "aps-saver-choice"
  | "aps-saver-choice-plus"
  | "aps-saver-choice-max"
  | "aps-nem"
  | "custom"

interface TouSchedule {
  summerMonths: number[]
  summerOnPeakStart: number
  summerOnPeakEnd: number
  summerOnPeakRate: number
  summerOffPeakRate: number
  winterOnPeakStart: number
  winterOnPeakEnd: number
  winterOnPeakRate: number
  winterOffPeakRate: number
  superOffPeakStart?: number
  superOffPeakEnd?: number
  superOffPeakRate?: number
}

export interface RatePlan {
  key: RatePlanKey
  label: string
  description: string
  importRateFlat: number
  exportRate: number
  tou?: TouSchedule
}

export interface CustomRates {
  importRate: number
  exportRate: number
}

export interface CostBreakdown {
  gridSpendDollars: number
  exportEarningsDollars: number
  netCostDollars: number
  gridImportKwh: number
  gridExportKwh: number
  isTouBlended: boolean
}

export interface CostSeriesPoint {
  label: string
  timestamp: string
  gridSpend: number
  exportEarnings: number
}

export interface RcpTranche {
  id: string
  label: string
  installPeriod: string
  exportRate: number
}

export const RCP_TRANCHES: RcpTranche[] = [
  { id: "2017", label: "Tranche 2017", installPeriod: "Sep 1, 2017 – Sep 30, 2018", exportRate: 0.12900 },
  { id: "2018", label: "Tranche 2018", installPeriod: "Oct 1, 2018 – Sep 30, 2019", exportRate: 0.11610 },
  { id: "2019", label: "Tranche 2019 & 2020", installPeriod: "Oct 1, 2019 – Sep 30, 2021", exportRate: 0.10450 },
  { id: "2021", label: "Tranche 2021", installPeriod: "Oct 1, 2021 – Aug 31, 2022", exportRate: 0.09405 },
  { id: "2022", label: "Tranche 2022", installPeriod: "Sep 1, 2022 – Aug 31, 2023", exportRate: 0.08465 },
  { id: "2023", label: "Tranche 2023", installPeriod: "Sep 1, 2023 – Aug 31, 2024", exportRate: 0.07619 },
  { id: "2024", label: "Tranche 2024", installPeriod: "Sep 1, 2024 – Aug 31, 2025", exportRate: 0.06857 },
  { id: "2025", label: "Tranche 2025", installPeriod: "Sep 1, 2025 – Aug 31, 2026", exportRate: 0.06171 },
]

export type RatePeriodLabel = "on-peak" | "super-off-peak" | "off-peak"

export interface CurrentRatePeriod {
  label: RatePeriodLabel
  displayName: string
  rate: number
  season: "summer" | "winter"
}

export function getCurrentRatePeriod(plan: RatePlan, now = new Date()): CurrentRatePeriod | null {
  if (!plan.tou) return null

  const month = now.getMonth() + 1
  const hour = now.getHours()
  const dayOfWeek = now.getDay()
  const isSummer = plan.tou.summerMonths.includes(month)
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const season = isSummer ? "summer" : "winter"

  const onPeakStart = isSummer ? plan.tou.summerOnPeakStart : plan.tou.winterOnPeakStart
  const onPeakEnd = isSummer ? plan.tou.summerOnPeakEnd : plan.tou.winterOnPeakEnd
  const onPeakRate = isSummer ? plan.tou.summerOnPeakRate : plan.tou.winterOnPeakRate
  const offPeakRate = isSummer ? plan.tou.summerOffPeakRate : plan.tou.winterOffPeakRate

  if (isWeekday && hour >= onPeakStart && hour < onPeakEnd) {
    return { label: "on-peak", displayName: "On-Peak", rate: onPeakRate, season }
  }

  if (
    !isSummer &&
    plan.tou.superOffPeakRate !== undefined &&
    plan.tou.superOffPeakStart !== undefined &&
    plan.tou.superOffPeakEnd !== undefined &&
    isWeekday &&
    hour >= plan.tou.superOffPeakStart &&
    hour < plan.tou.superOffPeakEnd
  ) {
    return { label: "super-off-peak", displayName: "Super Off-Peak", rate: plan.tou.superOffPeakRate, season }
  }

  return { label: "off-peak", displayName: "Off-Peak", rate: offPeakRate, season }
}

// Approximate APS rates — energy charges only, excludes fixed distribution/demand charges.
// Update importRateFlat / tou rates to match your actual bill.
export const APS_RATE_PLANS: RatePlan[] = [
  {
    key: "aps-saver-choice",
    label: "APS Saver Choice",
    description: "Flat rate",
    importRateFlat: 0.115,
    exportRate: 0.0753,
  },
  {
    key: "aps-saver-choice-plus",
    label: "APS Saver Choice Plus",
    description: "Time-of-use — cheaper overnight, pricier 3–8 PM",
    importRateFlat: 0.1191,
    exportRate: 0.0753,
    tou: {
      summerMonths: [5, 6, 7, 8, 9, 10],
      summerOnPeakStart: 15,
      summerOnPeakEnd: 20,
      summerOnPeakRate: 0.2321,
      summerOffPeakRate: 0.0994,
      winterOnPeakStart: 17,
      winterOnPeakEnd: 21,
      winterOnPeakRate: 0.1589,
      winterOffPeakRate: 0.0866,
    },
  },
  {
    key: "aps-saver-choice-max",
    label: "APS Saver Choice Max (R-3)",
    description: "TOU 4–7 PM weekdays + demand charge (energy only)",
    importRateFlat: 0.1191,
    exportRate: 0.0753,
    tou: {
      summerMonths: [5, 6, 7, 8, 9, 10],
      summerOnPeakStart: 16,
      summerOnPeakEnd: 19,
      summerOnPeakRate: 0.14227,
      summerOffPeakRate: 0.05943,
      winterOnPeakStart: 16,
      winterOnPeakEnd: 19,
      winterOnPeakRate: 0.09932,
      winterOffPeakRate: 0.05938,
      superOffPeakStart: 10,
      superOffPeakEnd: 15,
      superOffPeakRate: 0.03495,
    },
  },
  {
    key: "aps-nem",
    label: "APS Grandfathered NEM",
    description: "Net metering — exports credited at retail rate",
    importRateFlat: 0.115,
    exportRate: 0.115,
  },
]

function getImportRate(
  plan: RatePlan,
  entry: EnergyHistoryEntry,
  period: HistoryPeriod,
): { rate: number; isBlended: boolean } {
  if (!plan.tou) return { rate: plan.importRateFlat, isBlended: false }

  const date = new Date(entry.timestamp)
  const month = date.getMonth() + 1
  const hour = date.getHours()
  const dayOfWeek = date.getDay()
  const isSummer = plan.tou.summerMonths.includes(month)
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

  if (period === "day") {
    // Sub-hourly data available — apply exact TOU
    const onPeakStart = isSummer ? plan.tou.summerOnPeakStart : plan.tou.winterOnPeakStart
    const onPeakEnd = isSummer ? plan.tou.summerOnPeakEnd : plan.tou.winterOnPeakEnd
    const onPeakRate = isSummer ? plan.tou.summerOnPeakRate : plan.tou.winterOnPeakRate
    const offPeakRate = isSummer ? plan.tou.summerOffPeakRate : plan.tou.winterOffPeakRate

    if (isWeekday && hour >= onPeakStart && hour < onPeakEnd) {
      return { rate: onPeakRate, isBlended: false }
    }

    if (
      !isSummer &&
      plan.tou.superOffPeakRate !== undefined &&
      plan.tou.superOffPeakStart !== undefined &&
      plan.tou.superOffPeakEnd !== undefined &&
      isWeekday &&
      hour >= plan.tou.superOffPeakStart &&
      hour < plan.tou.superOffPeakEnd
    ) {
      return { rate: plan.tou.superOffPeakRate, isBlended: false }
    }

    return { rate: offPeakRate, isBlended: false }
  }

  // Daily/monthly aggregates: weight TOU hours against total week hours
  const onPeakHoursPerWeek = isSummer
    ? (plan.tou.summerOnPeakEnd - plan.tou.summerOnPeakStart) * 5
    : (plan.tou.winterOnPeakEnd - plan.tou.winterOnPeakStart) * 5
  const onPeakRate = isSummer ? plan.tou.summerOnPeakRate : plan.tou.winterOnPeakRate
  const offPeakRate = isSummer ? plan.tou.summerOffPeakRate : plan.tou.winterOffPeakRate

  if (
    !isSummer &&
    plan.tou.superOffPeakRate !== undefined &&
    plan.tou.superOffPeakStart !== undefined &&
    plan.tou.superOffPeakEnd !== undefined
  ) {
    const superHoursPerWeek = (plan.tou.superOffPeakEnd - plan.tou.superOffPeakStart) * 5
    const regularOffPeakHoursPerWeek = 168 - onPeakHoursPerWeek - superHoursPerWeek
    return {
      rate:
        (onPeakHoursPerWeek * onPeakRate +
          superHoursPerWeek * plan.tou.superOffPeakRate +
          regularOffPeakHoursPerWeek * offPeakRate) /
        168,
      isBlended: true,
    }
  }

  return {
    rate: (onPeakHoursPerWeek * onPeakRate + (168 - onPeakHoursPerWeek) * offPeakRate) / 168,
    isBlended: true,
  }
}

function formatLabel(timestamp: string, period: HistoryPeriod): string {
  const d = new Date(timestamp)
  if (period === "day") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (period === "week") return d.toLocaleDateString([], { weekday: "short" })
  if (period === "month") return d.toLocaleDateString([], { day: "numeric" })
  if (period === "year") return d.toLocaleDateString([], { month: "short" })
  return d.toLocaleDateString([], { year: "numeric" })
}

export function calculateCosts(
  entries: EnergyHistoryEntry[],
  period: HistoryPeriod,
  plan: RatePlan | null,
  customRates: CustomRates | null,
): { summary: CostBreakdown; series: CostSeriesPoint[] } {
  const empty = {
    summary: {
      gridSpendDollars: 0,
      exportEarningsDollars: 0,
      netCostDollars: 0,
      gridImportKwh: 0,
      gridExportKwh: 0,
      isTouBlended: false,
    },
    series: [] as CostSeriesPoint[],
  }

  if (!entries.length || (!plan && !customRates)) return empty

  let totalGridSpend = 0
  let totalExportEarnings = 0
  let totalGridImportKwh = 0
  let totalGridExportKwh = 0
  let anyBlended = false

  const series: CostSeriesPoint[] = entries.map((entry) => {
    const importKwh = entry.grid_energy_imported / 1000
    const exportKwh =
      (entry.grid_energy_exported_from_solar +
        entry.grid_energy_exported_from_battery +
        entry.grid_energy_exported_from_generator) /
      1000

    let importRate: number
    let exportRate: number
    let isBlended = false

    if (customRates) {
      importRate = customRates.importRate
      exportRate = customRates.exportRate
    } else {
      const r = getImportRate(plan!, entry, period)
      importRate = r.rate
      exportRate = plan!.exportRate
      isBlended = r.isBlended
    }

    if (isBlended) anyBlended = true

    const gridSpend = importKwh * importRate
    const exportEarnings = exportKwh * exportRate

    totalGridSpend += gridSpend
    totalExportEarnings += exportEarnings
    totalGridImportKwh += importKwh
    totalGridExportKwh += exportKwh

    return {
      label: formatLabel(entry.timestamp, period),
      timestamp: entry.timestamp,
      gridSpend: Number(gridSpend.toFixed(4)),
      exportEarnings: Number(exportEarnings.toFixed(4)),
    }
  })

  return {
    summary: {
      gridSpendDollars: Number(totalGridSpend.toFixed(2)),
      exportEarningsDollars: Number(totalExportEarnings.toFixed(2)),
      netCostDollars: Number((totalGridSpend - totalExportEarnings).toFixed(2)),
      gridImportKwh: Number(totalGridImportKwh.toFixed(2)),
      gridExportKwh: Number(totalGridExportKwh.toFixed(2)),
      isTouBlended: anyBlended,
    },
    series,
  }
}
