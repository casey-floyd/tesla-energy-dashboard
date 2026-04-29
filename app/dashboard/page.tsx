import { DashboardClient } from "@/components/DashboardClient"
import { hasPreStoredToken } from "@/lib/token-store"

export default function DashboardPage() {
  return <DashboardClient preConfigured={hasPreStoredToken()} />
}
