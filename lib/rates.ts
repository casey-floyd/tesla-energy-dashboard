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
    label: "APS Saver Choice Max",
    description: "TOU + demand charge (energy portion only)",
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
    return {
      rate: isWeekday && hour >= onPeakStart && hour < onPeakEnd ? onPeakRate : offPeakRate,
      isBlended: false,
    }
  }

  // Daily/monthly aggregates: weight on-peak hours (weekdays only) against total week hours
  const peakHoursPerWeek = isSummer
    ? (plan.tou.summerOnPeakEnd - plan.tou.summerOnPeakStart) * 5
    : (plan.tou.winterOnPeakEnd - plan.tou.winterOnPeakStart) * 5
  const onPeakRate = isSummer ? plan.tou.summerOnPeakRate : plan.tou.winterOnPeakRate
  const offPeakRate = isSummer ? plan.tou.summerOffPeakRate : plan.tou.winterOffPeakRate
  return {
    rate: (peakHoursPerWeek * onPeakRate + (168 - peakHoursPerWeek) * offPeakRate) / 168,
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
