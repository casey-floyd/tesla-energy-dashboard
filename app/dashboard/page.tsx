import { DashboardClient } from "@/components/DashboardClient"
import { hasPreStoredToken } from "@/lib/token-store"

export default function DashboardPage() {
  const skyEnabled = process.env.SKY_BACKGROUND_ENABLED === "true"
  return <DashboardClient preConfigured={hasPreStoredToken()} skyEnabled={skyEnabled} />
}
