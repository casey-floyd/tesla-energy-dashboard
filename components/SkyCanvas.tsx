"use client"

import { useEffect, useRef } from "react"

export function SkyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const maybeCtx = canvas.getContext("2d")
    if (!maybeCtx) return
    const ctx: CanvasRenderingContext2D = maybeCtx

    let W = 0, H = 0
    let animId = 0
    let running = true
    let weatherInterval: ReturnType<typeof setInterval> | null = null

    function resize() {
      W = canvas!.width = window.innerWidth
      H = canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const state = {
      lat: null as number | null, lon: null as number | null,
      cloudCover: 0.3,
      isRaining: false, isSnowing: false, isFoggy: false, isThunder: false,
      sunAngle: 0, moonAngle: 0, isSunUp: false, isMoonVisible: false,
      twilight: 0, moonPhase: 0,
    }

    // Stars
    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random(), y: Math.random() * 0.7,
      r: Math.random() * 1.5 + 0.2,
      phase: Math.random() * Math.PI * 2,
      blinkSpeed: 0.4 + Math.random() * 1.2,
    }))

    // Clouds
    const clouds = Array.from({ length: 16 }, () => ({
      x: Math.random(), y: 0.05 + Math.random() * 0.45,
      scale: 0.6 + Math.random() * 1.8,
      speed: 0.00002 + Math.random() * 0.00006,
      alpha: 0.5 + Math.random() * 0.5,
      type: Math.floor(Math.random() * 3) as 0 | 1 | 2,
    }))

    // Rain
    const drops = Array.from({ length: 220 }, () => ({
      x: Math.random(), y: Math.random(),
      speed: 0.004 + Math.random() * 0.006,
      len: 8 + Math.random() * 14,
    }))

    // Snow
    const flakes = Array.from({ length: 180 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 1 + Math.random() * 2.5,
      speed: 0.001 + Math.random() * 0.003,
      drift: (Math.random() - 0.5) * 0.001,
      alpha: 0.5 + Math.random() * 0.5,
    }))

    let lightningAlpha = 0
    let lightningTimer = 0
    let auroraTime = 0

    // ─── Sun / Moon math ────────────────────────────────────────────────────────
    function getDayOfYear(d: Date): number {
      return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000)
    }

    function getEOT(doy: number): number {
      const B = (360 / 365) * (doy - 81) * (Math.PI / 180)
      return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
    }

    function getSunTimes(lat: number, lon: number, date: Date) {
      const doy = getDayOfYear(date)
      const decl = 23.45 * Math.sin(((360 / 365) * (doy - 81)) * Math.PI / 180) * Math.PI / 180
      const latRad = lat * Math.PI / 180
      const cosHa = -Math.tan(latRad) * Math.tan(decl)
      const ha = Math.acos(Math.max(-1, Math.min(1, cosHa))) * 180 / Math.PI
      const noon = 12 - lon / 15 - getEOT(doy) / 60
      return { sunrise: noon - ha / 15, sunset: noon + ha / 15 }
    }

    function getMoonPhase(date: Date): number {
      const known = new Date(2000, 0, 6, 18, 14, 0)
      const days = (date.getTime() - known.getTime()) / 86400000
      const cycle = 29.53058867
      return (((days % cycle) + cycle) % cycle) / cycle
    }

    function updateSkyTimes() {
      const now = new Date()
      const lat = state.lat ?? 37.7749
      const lon = state.lon ?? -122.4194
      const hourUTC = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600
      const { sunrise, sunset } = getSunTimes(lat, lon, now)
      const t = hourUTC

      if (t >= sunrise && t <= sunset) {
        state.sunAngle = ((t - sunrise) / (sunset - sunrise)) * Math.PI
        state.isSunUp = true
      } else {
        state.isSunUp = false
        state.sunAngle = t < sunrise
          ? -(sunrise - t) / 4 * Math.PI
          : Math.PI + (t - sunset) / 4 * Math.PI
      }

      const tw = 0.75
      if (t < sunrise - tw || t > sunset + tw) state.twilight = 0
      else if (t >= sunrise && t <= sunset) state.twilight = 1
      else if (t < sunrise) state.twilight = (t - (sunrise - tw)) / tw
      else state.twilight = 1 - (t - sunset) / tw
      state.twilight = Math.max(0, Math.min(1, state.twilight))

      state.moonAngle = (((t - sunset + 12) % 24) / 12) * Math.PI
      state.isMoonVisible = !state.isSunUp || state.twilight < 0.3
      state.moonPhase = getMoonPhase(now)
    }

    // ─── Sky gradient ────────────────────────────────────────────────────────────
    function skyGradient(tw: number) {
      const cc = state.cloudCover
      const lerp3 = (a: number[], b: number[], t: number) =>
        a.map((v, i) => Math.round(v + (b[i] - v) * t))

      const nightZ = [6, 8, 22], nightH = [10, 14, 35]
      const dawnZ = [15, 25, 70], dawnH = [200, 100, 60]
      const dayZ = cc > 0.7 ? [90, 110, 140] : [30, 100, 200]
      const dayH = cc > 0.7 ? [140, 155, 175] : [100, 175, 240]

      const [zenith, horizon] = tw <= 0.5
        ? [lerp3(nightZ, dawnZ, tw * 2), lerp3(nightH, dawnH, tw * 2)]
        : [lerp3(dawnZ, dayZ, (tw - 0.5) * 2), lerp3(dawnH, dayH, (tw - 0.5) * 2)]

      const mid = lerp3(zenith, horizon, 0.5)
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, `rgb(${zenith.join(",")})`)
      g.addColorStop(0.5, `rgb(${mid.join(",")})`)
      g.addColorStop(1, `rgb(${horizon.join(",")})`)
      return g
    }

    // ─── Positions ───────────────────────────────────────────────────────────────
    function sunPos() {
      return {
        x: W / 2 - Math.cos(state.sunAngle) * (W * 0.4),
        y: H * 0.9 - Math.sin(state.sunAngle) * (H * 0.7),
      }
    }

    function moonPos() {
      return {
        x: W / 2 - Math.cos(state.moonAngle) * (W * 0.4),
        y: H * 0.9 - Math.sin(state.moonAngle) * (H * 0.65),
      }
    }

    // ─── Draw functions ───────────────────────────────────────────────────────────
    function drawSun() {
      const pos = sunPos()
      if (pos.y > H + 80) return
      const alpha = Math.max(0, Math.min(1, (H - pos.y - 10) / 100))

      const glowR = 120 + Math.sin(Date.now() / 2000) * 8
      const g1 = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR)
      g1.addColorStop(0, `rgba(255,230,100,${0.25 * alpha})`)
      g1.addColorStop(0.4, `rgba(255,180,60,${0.12 * alpha})`)
      g1.addColorStop(1, "rgba(255,140,0,0)")
      ctx.beginPath(); ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2)
      ctx.fillStyle = g1; ctx.fill()

      const diskR = 28 + Math.sin(Date.now() / 3000) * 1.5
      const g2 = ctx.createRadialGradient(pos.x - 6, pos.y - 6, 2, pos.x, pos.y, diskR)
      g2.addColorStop(0, `rgba(255,255,200,${alpha})`)
      g2.addColorStop(0.7, `rgba(255,210,60,${alpha})`)
      g2.addColorStop(1, `rgba(255,170,20,${alpha * 0.8})`)
      ctx.beginPath(); ctx.arc(pos.x, pos.y, diskR, 0, Math.PI * 2)
      ctx.fillStyle = g2; ctx.fill()
    }

    function drawMoon() {
      if (!state.isMoonVisible) return
      const pos = moonPos()
      if (pos.y > H + 60) return
      const alpha = Math.max(0, Math.min(1, (H - pos.y) / 100))

      const g1 = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 80)
      g1.addColorStop(0, `rgba(200,215,255,${0.15 * alpha})`)
      g1.addColorStop(1, "rgba(180,200,255,0)")
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 80, 0, Math.PI * 2)
      ctx.fillStyle = g1; ctx.fill()

      ctx.save()
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(220,228,255,${alpha})`; ctx.fill()

      const sx = Math.cos(state.moonPhase * Math.PI * 2) * 22
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 22, -Math.PI / 2, Math.PI / 2)
      ctx.bezierCurveTo(pos.x + sx, pos.y + 22, pos.x + sx, pos.y - 22, pos.x, pos.y - 22)
      ctx.fillStyle = `rgba(10,15,35,${alpha * 0.88})`; ctx.fill()
      ctx.restore()
    }

    function drawStars(tw: number) {
      const a = Math.max(0, 1 - tw * 2)
      if (a <= 0) return
      const t = Date.now() / 1000
      stars.forEach(s => {
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a * (0.6 + 0.4 * Math.sin(t * s.blinkSpeed + s.phase))})`
        ctx.fill()
      })
    }

    const puffSets: { x: number; y: number; r: number }[][] = [
      [{ x: 0, y: 0, r: 40 }, { x: -45, y: 15, r: 28 }, { x: 50, y: 12, r: 32 }],
      [{ x: 0, y: 0, r: 55 }, { x: -65, y: 18, r: 38 }, { x: 68, y: 14, r: 40 }, { x: -25, y: -12, r: 30 }, { x: 30, y: -8, r: 28 }],
      [{ x: 0, y: 0, r: 30 }, { x: -30, y: 8, r: 20 }, { x: 35, y: 8, r: 22 }],
    ]

    function drawCloud(c: typeof clouds[0], tw: number, t: number) {
      const alpha = state.cloudCover * c.alpha * (0.35 + tw * 0.35)
      if (alpha < 0.02) return
      const x = ((c.x + t * c.speed * 60) % 1.4) - 0.2
      const br = Math.round(200 + tw * 55)
      const dk = Math.round(30 + tw * 30)

      ctx.save()
      ctx.translate(x * W, c.y * H)
      ctx.scale(c.scale, c.scale * 0.6)

      for (const p of puffSets[c.type]) {
        const g = ctx.createRadialGradient(p.x - 5, p.y - 5, 0, p.x, p.y, p.r)
        g.addColorStop(0, `rgba(${br},${br},${br + 8},${alpha})`)
        g.addColorStop(0.7, `rgba(${br - 10},${br - 10},${br},${alpha * 0.8})`)
        g.addColorStop(1, `rgba(${dk},${dk + 10},${dk + 20},0)`)
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = g; ctx.fill()
      }
      ctx.restore()
    }

    function drawRain() {
      if (!state.isRaining) return
      ctx.save()
      ctx.strokeStyle = "rgba(180,210,255,0.35)"
      ctx.lineWidth = 1
      drops.forEach(d => {
        d.y = (d.y + d.speed) % 1
        d.x = (d.x + d.speed * 0.045) % 1
        ctx.beginPath()
        ctx.moveTo(d.x * W, d.y * H)
        ctx.lineTo(d.x * W + d.len * 0.15, d.y * H + d.len)
        ctx.stroke()
      })
      ctx.restore()
    }

    function drawSnow() {
      if (!state.isSnowing) return
      const t = Date.now() / 1000
      flakes.forEach((f, i) => {
        f.y = (f.y + f.speed) % 1
        f.x = ((f.x + f.drift + Math.sin(t * 0.5 + i) * 0.0003) + 1) % 1
        ctx.beginPath()
        ctx.arc(f.x * W, f.y * H, f.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${f.alpha})`
        ctx.fill()
      })
    }

    function drawFog(tw: number) {
      if (!state.isFoggy) return
      const g = ctx.createLinearGradient(0, H * 0.4, 0, H)
      g.addColorStop(0, "rgba(180,190,210,0)")
      g.addColorStop(0.5, `rgba(180,190,210,${0.15 + tw * 0.1})`)
      g.addColorStop(1, `rgba(200,210,220,${0.35 + tw * 0.1})`)
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }

    function drawLightning() {
      if (!state.isThunder) return
      lightningTimer += 16
      if (lightningTimer > 4000 + Math.random() * 8000) {
        lightningAlpha = 0.8; lightningTimer = 0
      }
      if (lightningAlpha > 0) {
        ctx.fillStyle = `rgba(220,230,255,${lightningAlpha})`
        ctx.fillRect(0, 0, W, H)
        lightningAlpha *= 0.75
        if (lightningAlpha < 0.01) lightningAlpha = 0
      }
    }

    function drawAurora(tw: number) {
      if (tw > 0.1 || state.cloudCover > 0.5) return
      auroraTime += 0.003
      const bands = ["rgba(40,180,120,", "rgba(60,100,200,", "rgba(160,60,200,"]
      for (let b = 0; b < 3; b++) {
        const yBase = H * (0.15 + b * 0.12), amp = H * 0.04
        ctx.beginPath()
        for (let x = 0; x <= W; x += 8) {
          const wave = Math.sin(x * 0.005 + auroraTime + b * 1.2) * amp
            + Math.sin(x * 0.008 + auroraTime * 0.7 + b) * amp * 0.5
          x === 0 ? ctx.moveTo(x, yBase + wave) : ctx.lineTo(x, yBase + wave)
        }
        ctx.lineTo(W, yBase + amp * 2); ctx.lineTo(0, yBase + amp * 2); ctx.closePath()
        const g = ctx.createLinearGradient(0, yBase - amp, 0, yBase + amp * 2)
        g.addColorStop(0, `${bands[b]}0)`)
        g.addColorStop(0.5, `${bands[b]}0.04)`)
        g.addColorStop(1, `${bands[b]}0)`)
        ctx.fillStyle = g; ctx.fill()
      }
    }

    // ─── Main render loop ────────────────────────────────────────────────────────
    function render(ts: number) {
      if (!running) return
      updateSkyTimes()
      const tw = state.twilight, t = ts / 1000
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = skyGradient(tw); ctx.fillRect(0, 0, W, H)
      drawAurora(tw)
      drawStars(tw)
      drawSun()
      drawMoon()
      clouds.forEach(c => drawCloud(c, tw, t))
      drawRain(); drawSnow(); drawFog(tw); drawLightning()
      animId = requestAnimationFrame(render)
    }
    animId = requestAnimationFrame(render)

    // ─── Weather fetch ────────────────────────────────────────────────────────────
    async function fetchWeather(lat: number, lon: number) {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=cloud_cover,weather_code&timezone=auto`
        )
        const d = await res.json()
        const code: number = d.current?.weather_code ?? 0
        state.cloudCover = (d.current?.cloud_cover ?? 0) / 100
        state.isRaining = (code >= 51 && code <= 67) || (code >= 80 && code <= 82)
        state.isSnowing = (code >= 71 && code <= 77) || (code >= 85 && code <= 86)
        state.isFoggy = code === 45 || code === 48
        state.isThunder = code >= 95
      } catch { /* silent fallback */ }
    }

    // ─── Geolocation ─────────────────────────────────────────────────────────────
    function startWeatherPolling(lat: number, lon: number) {
      state.lat = lat; state.lon = lon
      fetchWeather(lat, lon)
      weatherInterval = setInterval(() => fetchWeather(lat, lon), 10 * 60 * 1000)
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => startWeatherPolling(pos.coords.latitude, pos.coords.longitude),
        () => startWeatherPolling(37.7749, -122.4194),
        { timeout: 6000 }
      )
    } else {
      startWeatherPolling(37.7749, -122.4194)
    }

    return () => {
      running = false
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
      if (weatherInterval) clearInterval(weatherInterval)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
