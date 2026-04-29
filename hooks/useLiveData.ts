"use client"

import type { LiveStatus } from "@/lib/types"
import { useCallback, useEffect, useRef, useState } from "react"

const POLL_INTERVAL = 30_000

export function useLiveData(siteId: number | null) {
  const [data, setData] = useState<LiveStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchLive = useCallback(async () => {
    if (!siteId) return
    try {
      const res = await fetch(`/api/tesla/live?siteId=${siteId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load live data")
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => {
    if (!siteId) return
    setLoading(true)
    fetchLive()
    intervalRef.current = setInterval(fetchLive, POLL_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [siteId, fetchLive])

  return { data, loading, error, lastUpdated, refresh: fetchLive }
}
