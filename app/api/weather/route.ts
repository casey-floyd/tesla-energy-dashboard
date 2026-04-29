import { NextResponse } from "next/server"

interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    precipitation: number
    weather_code: number
    cloud_cover: number
    wind_speed_10m: number
  }
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
}

async function geocodeZip(zip: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=US&format=json&limit=1`
  const res = await fetch(url, {
    headers: { "User-Agent": "TeslaDashboard/1.0 (personal energy monitor)" },
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null
  const data: NominatimResult[] = await res.json()
  if (!data.length) return null
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    name: data[0].display_name,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let lat: number | null = null
  let lon: number | null = null
  let locationName: string | null = null

  const zipParam = searchParams.get("zip")
  const latParam = searchParams.get("lat")
  const lonParam = searchParams.get("lon")

  if (latParam && lonParam) {
    lat = parseFloat(latParam)
    lon = parseFloat(lonParam)
  } else if (zipParam) {
    const geo = await geocodeZip(zipParam)
    if (!geo) {
      return NextResponse.json({ error: "ZIP code not found" }, { status: 404 })
    }
    lat = geo.lat
    lon = geo.lon
    locationName = geo.name
  } else {
    return NextResponse.json({ error: "Provide lat/lon or zip" }, { status: 400 })
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", String(lat))
  url.searchParams.set("longitude", String(lon))
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m",
  )
  url.searchParams.set("temperature_unit", "fahrenheit")
  url.searchParams.set("wind_speed_unit", "mph")
  url.searchParams.set("precipitation_unit", "inch")

  const weatherRes = await fetch(url.toString(), { next: { revalidate: 600 } })
  if (!weatherRes.ok) {
    return NextResponse.json({ error: "Weather service unavailable" }, { status: 502 })
  }

  const weather: OpenMeteoResponse = await weatherRes.json()

  return NextResponse.json({
    ...weather.current,
    lat,
    lon,
    locationName,
  })
}
