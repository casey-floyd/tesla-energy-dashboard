import { DashboardClient } from "@/components/DashboardClient"

export default function DashboardPage() {
  const skyEnabled = process.env.SKY_BACKGROUND_ENABLED === "true"
  return <DashboardClient skyEnabled={skyEnabled} />
}
