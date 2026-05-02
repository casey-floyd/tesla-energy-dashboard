"use client"

import type { LiveStatus } from "@/lib/types"
import { Battery, Home, Sun, Zap } from "lucide-react"

const W = 300
const H = 270

const SOLAR  = { x: 150, y: 48  }
const GRID   = { x: 42,  y: 152 }
const HOME   = { x: 258, y: 152 }
const BATT   = { x: 150, y: 230 }
const HUB    = { x: 150, y: 152 }
const JUNC_L = { x: 96,  y: 152 }
const JUNC_R = { x: 204, y: 152 }

const NODE_R = 28
const GLOW_R = 36

function fmt(w: number) {
  const a = Math.abs(w)
  return a >= 1000 ? `${(a / 1000).toFixed(1)} kW` : `${Math.round(a)} W`
}

function edgePt(from: { x: number; y: number }, to: { x: number; y: number }, r: number) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const d = Math.sqrt(dx * dx + dy * dy)
  return { x: from.x + (dx / d) * r, y: from.y + (dy / d) * r }
}

function FlowLine({
  from, to, active, color, reversed = false, id,
}: {
  from: { x: number; y: number }
  to:   { x: number; y: number }
  active: boolean
  color: string
  reversed?: boolean
  id: string
}) {
  if (!active) {
    return (
      <line
        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        strokeWidth={2}
        className="stroke-slate-200 dark:stroke-neutral-800"
      />
    )
  }

  const src = reversed ? to : from
  const dst = reversed ? from : to

  return (
    <g>
      <line
        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke={color} strokeWidth={8} strokeOpacity={0.1}
      />
      <line
        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke={color} strokeWidth={1.5} strokeOpacity={0.5}
      />
      <path id={id} d={`M${src.x} ${src.y} L${dst.x} ${dst.y}`} fill="none" />
      {([0, 0.4, 0.8] as const).map((offset) => (
        <circle key={offset} r={3.5} fill={color} fillOpacity={0.95}>
          <animateMotion dur="1.1s" repeatCount="indefinite" begin={`${offset * -1.1}s`}>
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      ))}
    </g>
  )
}

function Node({
  pos, color, icon, value, sublabel, active = true,
}: {
  pos: { x: number; y: number }
  color: string
  icon: React.ReactNode
  value: string
  sublabel?: string
  active?: boolean
}) {
  return (
    <g>
      {/* dashed outer ring */}
      <circle
        cx={pos.x} cy={pos.y} r={GLOW_R}
        fill="none"
        strokeWidth={1}
        strokeDasharray="3.5 3"
        stroke={active ? color : undefined}
        strokeOpacity={active ? 0.35 : undefined}
        className={!active ? "stroke-slate-200 dark:stroke-neutral-800" : undefined}
      />
      {/* main circle */}
      <circle
        cx={pos.x} cy={pos.y} r={NODE_R}
        strokeWidth={active ? 2 : 1.5}
        stroke={active ? color : undefined}
        className={`fill-white dark:fill-neutral-900 ${!active ? "stroke-slate-200 dark:stroke-neutral-700" : ""}`}
      />
      {/* icon */}
      <foreignObject x={pos.x - 12} y={pos.y - 12} width={24} height={24}>
        <div
          style={{
            color: active ? color : undefined,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
          }}
          className={!active ? "text-slate-300 dark:text-neutral-600" : undefined}
        >
          {icon}
        </div>
      </foreignObject>
      {/* value below */}
      <text
        x={pos.x} y={pos.y + GLOW_R + 12}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fontFamily="system-ui, sans-serif"
        fill={active ? color : undefined}
        className={!active ? "fill-slate-400 dark:fill-neutral-500" : undefined}
      >
        {value}
      </text>
      {/* sublabel above */}
      {sublabel && (
        <text
          x={pos.x} y={pos.y - GLOW_R - 5}
          textAnchor="middle"
          fontSize={9}
          fontWeight={500}
          fontFamily="system-ui, sans-serif"
          fill={active ? color : undefined}
          className={!active ? "fill-slate-400 dark:fill-neutral-500" : undefined}
        >
          {sublabel}
        </text>
      )}
    </g>
  )
}

function Junction({ pos, active }: { pos: { x: number; y: number }; active: boolean }) {
  return (
    <circle
      cx={pos.x} cy={pos.y} r={4}
      strokeWidth={1.5}
      className={
        active
          ? "fill-slate-100 dark:fill-neutral-800 stroke-slate-400 dark:stroke-neutral-500"
          : "fill-white dark:fill-neutral-900 stroke-slate-200 dark:stroke-neutral-800"
      }
    />
  )
}

interface Props {
  data: LiveStatus | null
  loading?: boolean
}

export function PowerFlowDiagram({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="w-full h-full bg-slate-100 dark:bg-neutral-800 animate-pulse rounded-2xl" />
      </div>
    )
  }

  const solar   = data.solar_power
  const battery = data.battery_power
  const grid    = data.grid_power
  const home    = data.load_power

  const solarOn      = solar > 50
  const battCharging = battery > 50
  const battDisch    = battery < -50
  const gridImport   = grid > 50
  const gridExport   = grid < -50

  const leftActive   = gridImport || gridExport || solarOn || battDisch
  const rightActive  = solarOn || battDisch || gridImport
  const topActive    = solarOn
  const bottomActive = battCharging || battDisch

  const leftReversed   = gridExport
  const bottomReversed = battDisch

  const solarEdge = edgePt(SOLAR, HUB,    NODE_R)
  const gridEdge  = edgePt(GRID,  JUNC_L, NODE_R)
  const homeEdge  = edgePt(HOME,  JUNC_R, NODE_R)
  const battEdge  = edgePt(BATT,  HUB,    NODE_R)

  const battLabel = battCharging
    ? `+${fmt(battery)}`
    : battDisch ? fmt(Math.abs(battery)) : "Idle"

  const gridLabel = gridImport
    ? `↓ ${fmt(grid)}`
    : gridExport ? `↑ ${fmt(Math.abs(grid))}` : "Idle"

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-xs mx-auto"
        style={{ minWidth: 240 }}
      >
        {/* horizontal segments */}
        <FlowLine id="fl-left"  from={gridEdge} to={JUNC_L} active={leftActive}  color={gridExport ? "#6366f1" : "#64748b"} reversed={leftReversed} />
        <FlowLine id="fl-hub-l" from={HUB}      to={JUNC_L} active={leftActive}  color={gridExport ? "#6366f1" : "#64748b"} reversed={leftReversed} />
        <FlowLine id="fl-hub-r" from={HUB}      to={JUNC_R} active={rightActive} color="#38bdf8" />
        <FlowLine id="fl-right" from={JUNC_R}   to={homeEdge} active={rightActive} color="#38bdf8" />

        {/* vertical segments */}
        <FlowLine id="fl-solar" from={solarEdge} to={HUB} active={topActive}    color="#f59e0b" />
        <FlowLine id="fl-batt"  from={battEdge}  to={HUB} active={bottomActive} color="#10b981" reversed={bottomReversed} />

        {/* junction dots */}
        <Junction pos={JUNC_L} active={leftActive} />
        <Junction pos={JUNC_R} active={rightActive} />

        {/* nodes */}
        <Node pos={SOLAR} color="#f59e0b" icon={<Sun  size={18} strokeWidth={2} />} value={fmt(solar)}  sublabel={solarOn ? "Solar" : undefined} active={solarOn} />
        <Node pos={GRID}  color={gridExport ? "#6366f1" : "#64748b"} icon={<Zap  size={16} strokeWidth={2} />} value={gridLabel} active={gridImport || gridExport} />
        <Node pos={HOME}  color="#38bdf8" icon={<Home  size={16} strokeWidth={2} />} value={fmt(home)}  active={home > 50} />
        <Node pos={BATT}  color="#10b981" icon={<Battery size={16} strokeWidth={2} />} value={battLabel} sublabel={`${Math.round(data.battery_percentage ?? 0)}%`} active={battCharging || battDisch} />

        {/* center hub */}
        <circle cx={HUB.x} cy={HUB.y} r={5} strokeWidth={1.5} className="fill-slate-100 dark:fill-neutral-800 stroke-slate-400 dark:stroke-neutral-600" />
      </svg>
    </div>
  )
}
