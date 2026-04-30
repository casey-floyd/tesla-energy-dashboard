"use client"

import type { SiteInfo, WeatherData } from "@/lib/types"
import { Cloud, Droplets, MapPin, Search, Wind } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

interface Props {
  siteInfo: SiteInfo | null
}

type LocationStatus = "detecting" | "needs-zip" | "ready" | "error"

function wmoLabel(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: "Clear Sky", emoji: "☀️" }
  if (code === 1) return { label: "Mainly Clear", emoji: "🌤️" }
  if (code === 2) return { label: "Partly Cloudy", emoji: "⛅" }
  if (code === 3) return { label: "Overcast", emoji: "☁️" }
  if (code <= 48) return { label: "Foggy", emoji: "🌫️" }
  if (code <= 55) return { label: "Drizzle", emoji: "🌦️" }
  if (code <= 65) return { label: "Rain", emoji: "🌧️" }
  if (code <= 77) return { label: "Snow", emoji: "❄️" }
  if (code <= 82) return { label: "Rain Showers", emoji: "🌦️" }
  if (code <= 86) return { label: "Snow Showers", emoji: "🌨️" }
  if (code === 95) return { label: "Thunderstorm", emoji: "⛈️" }
  return { label: "Severe Storm", emoji: "🌩️" }
}

function solarImpact(cloudCover: number): { label: string; color: string } {
  if (cloudCover < 20) return { label: "Excellent solar conditions", color: "text-emerald-500 dark:text-emerald-400" }
  if (cloudCover < 50) return { label: "Good solar conditions", color: "text-amber-500 dark:text-amber-400" }
  if (cloudCover < 80) return { label: "Reduced solar output", color: "text-orange-500 dark:text-orange-400" }
  return { label: "Poor solar conditions", color: "text-slate-500 dark:text-slate-400" }
}

const WEATHER_ZIP_KEY = "weather-zip"
const WEATHER_LOCATION_KEY = "weather-location-source"

export function WeatherPanel({ siteInfo }: Props) {
  const [status, setStatus] = useState<LocationStatus>("detecting")
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [zipInput, setZipInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchWeather = useCallback(async (params: string) => {
    setWeatherLoading(true)
    setWeatherError(null)
    try {
      const res = await fetch(`/api/weather?${params}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }
      const data: WeatherData = await res.json()
      setWeather(data)
      setStatus("ready")
    } catch (e) {
      setWeatherError(e instanceof Error ? e.message : "Failed to load weather")
      setStatus("error")
    } finally {
      setWeatherLoading(false)
    }
  }, [])

  useEffect(() => {
    // 1. Try Tesla site coordinates
    if (siteInfo?.latitude && siteInfo?.longitude) {
      fetchWeather(`lat=${siteInfo.latitude}&lon=${siteInfo.longitude}`)
      return
    }

    // 2. Try saved location preference
    const savedSource = localStorage.getItem(WEATHER_LOCATION_KEY)
    const savedZip = localStorage.getItem(WEATHER_ZIP_KEY)
    if (savedSource === "zip" && savedZip) {
      setZipInput(savedZip)
      fetchWeather(`zip=${encodeURIComponent(savedZip)}`)
      return
    }

    // 3. Try browser geolocation
    if (!navigator.geolocation) {
      setStatus("needs-zip")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        localStorage.setItem(WEATHER_LOCATION_KEY, "geo")
        fetchWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
      },
      () => {
        // Geolocation denied or unavailable
        setStatus("needs-zip")
      },
      { timeout: 8000 },
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteInfo])

  function handleZipSubmit(e: React.FormEvent) {
    e.preventDefault()
    const zip = zipInput.trim()
    if (!zip) return
    localStorage.setItem(WEATHER_ZIP_KEY, zip)
    localStorage.setItem(WEATHER_LOCATION_KEY, "zip")
    fetchWeather(`zip=${encodeURIComponent(zip)}`)
  }

  function handleChangeLocation() {
    localStorage.removeItem(WEATHER_LOCATION_KEY)
    localStorage.removeItem(WEATHER_ZIP_KEY)
    setWeather(null)
    setWeatherError(null)
    setZipInput("")
    setStatus("needs-zip")
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  if (status === "detecting" || (weatherLoading && !weather)) {
    return (
      <div className="flex items-center gap-3 px-1 py-2">
        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
          <div className="h-2.5 w-36 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
        </div>
      </div>
    )
  }

  if (status === "needs-zip" || (status === "error" && !weather)) {
    return (
      <form onSubmit={handleZipSubmit} className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]{5}"
          maxLength={5}
          placeholder="Enter ZIP code"
          value={zipInput}
          onChange={(e) => setZipInput(e.target.value)}
          className="flex-1 text-sm bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-amber-400 dark:focus:border-amber-500 outline-none py-1 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 transition-colors"
        />
        <button
          type="submit"
          disabled={zipInput.trim().length !== 5}
          className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-40 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-amber-500" />
        </button>
        {weatherError && (
          <span className="text-xs text-red-400 ml-1">{weatherError}</span>
        )}
      </form>
    )
  }

  if (!weather) return null

  const { label, emoji } = wmoLabel(weather.weather_code)
  const solar = solarImpact(weather.cloud_cover)

  return (
    <div className="flex items-start gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-3xl leading-none" role="img" aria-label={label}>{emoji}</span>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {Math.round(weather.temperature_2m)}°F
            </span>
            <span className="text-sm text-slate-400 dark:text-slate-300">
              feels {Math.round(weather.apparent_temperature)}°
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300">{label}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-300 flex-wrap">
        <span className="flex items-center gap-1">
          <Droplets className="w-3.5 h-3.5" />
          {weather.relative_humidity_2m}% humidity
        </span>
        <span className="flex items-center gap-1">
          <Wind className="w-3.5 h-3.5" />
          {Math.round(weather.wind_speed_10m)} mph
        </span>
        <span className="flex items-center gap-1">
          <Cloud className="w-3.5 h-3.5" />
          {weather.cloud_cover}% cloud cover
        </span>
        <span className={`font-medium ${solar.color}`}>{solar.label}</span>
      </div>

      <button
        onClick={handleChangeLocation}
        className="ml-auto text-[10px] text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center gap-0.5 transition-colors shrink-0"
        title="Change location"
      >
        <MapPin className="w-3 h-3" />
        Change
      </button>
    </div>
  )
}
