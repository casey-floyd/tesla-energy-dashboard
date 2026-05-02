"use client"

import type { LiveStatus } from "@/lib/types"
import { Battery, Home, Sun, Zap } from "lucide-react"

const W = 300
const H = 270

// Node positions
const SOLAR   = { x: 150, y: 48  }
const GRID    = { x: 42,  y: 152 }
const HOME    = { x: 258, y: 152 }
const BATT    = { x: 150, y: 230 }
const HUB     = { x: 150, y: 152 }

// Junction dots sit between hub and each side node
const JUNC_L  = { x: 96,  y: 152 }
const JUNC_R  = { x: 204, y: 152 }

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

// ─── Animated flow line ────────────────────────────────────────────────────

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
  const src = reversed ? to   : from
  const dst = reversed ? from : to

  if (!active) {
    return (
      <line
        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke="#1e293b" strokeWidth={2}
      />
    )
  }

  return (
    <g>
      {/* glow halo */}
      <line
        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke={color} strokeWidth={8} strokeOpacity={0.12}
      />
      {/* base line */}
      <line
        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke={color} strokeWidth={1.5} strokeOpacity={0.45}
      />
      {/* hidden path for animateMotion */}
      <path id={id} d={`M${src.x} ${src.y} L${dst.x} ${dst.y}`} fill="none" />
      {/* 3 staggered particles */}
      {([0, 0.4, 0.8] as const).map((offset) => (
        <circle key={offset} r={3.5} fill={color} fillOpacity={0.95}>
          <animateMotion
            dur="1.1s"
            repeatCount="indefinite"
            begin={`${offset * -1.1}s`}
          >
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      ))}
    </g>
  )
}

// ─── Circular node ─────────────────────────────────────────────────────────

function Node({
  pos, r = NODE_R, color, icon, value, sublabel, active = true,
}: {
  pos: { x: number; y: number }
  r?: number
  color: string
  icon: React.ReactNode
  value: string
  sublabel?: string
  active?: boolean
}) {
  const ringColor = active ? color : "#334155"
  const iconColor = active ? color : "#475569"

  return (
    <g>
      {/* dashed outer ring */}
      <circle
        cx={pos.x} cy={pos.y} r={GLOW_R}
        fill="none"
        stroke={ringColor}
        strokeWidth={1}
        strokeOpacity={active ? 0.35 : 0.15}
        strokeDasharray="3.5 3"
      />
      {/* filled circle */}
      <circle
        cx={pos.x} cy={pos.y} r={r}
        fill="#0f172a"
        stroke={ringColor}
        strokeWidth={active ? 2 : 1.5}
      />
      {/* icon */}
      <foreignObject
        x={pos.x - 12} y={pos.y - 12} width={24} height={24}
      >
        <div
          style={{
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
          }}
        >
          {icon}
        </div>
      </foreignObject>
      {/* value below node */}
      <text
        x={pos.x} y={pos.y + GLOW_R + 12}
        textAnchor="middle"
        fill={active ? "white" : "#64748b"}
        fontSize={11}
        fontWeight={700}
        fontFamily="system-ui, sans-serif"
      >
        {value}
      </text>
      {/* sublabel above node */}
      {sublabel && (
        <text
          x={pos.x} y={pos.y - GLOW_R - 5}
          textAnchor="middle"
          fill={active ? color : "#475569"}
          fontSize={9}
          fontWeight={500}
          fontFamily="system-ui, sans-serif"
        >
          {sublabel}
        </text>
      )}
    </g>
  )
}

// ─── Junction dot ──────────────────────────────────────────────────────────

function Junction({ pos, active }: { pos: { x: number; y: number }; active: boolean }) {
  return (
    <circle
      cx={pos.x} cy={pos.y} r={4}
      fill={active ? "#1e293b" : "#0f172a"}
      stroke={active ? "#475569" : "#334155"}
      strokeWidth={1.5}
    />
  )
}

// ─── Main component ────────────────────────────────────────────────────────

interface Props {
  data: LiveStatus | null
  loading?: boolean
}

export function PowerFlowDiagram({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="w-full h-full bg-slate-800/40 animate-pulse rounded-2xl" />
      </div>
    )
  }

  const solar   = data.solar_power
  const battery = data.battery_power      // + = charging, - = discharging
  const grid    = data.grid_power         // + = importing, - = exporting
  const home    = data.load_power

  const solarOn      = solar > 50
  const battCharging = battery > 50
  const battDisch    = battery < -50
  const gridImport   = grid > 50
  const gridExport   = grid < -50

  // Which hub lines are active (particle direction tracks energy flow)
  const leftActive  = gridImport || gridExport || solarOn || battDisch
  const rightActive = solarOn || battDisch || gridImport
  const topActive   = solarOn
  const bottomActive = battCharging || battDisch

  // Particle direction on horizontal segments
  // Left segment (Grid ↔ Hub): left→hub when grid imports or solar/batt flows leftward; hub→left when exporting
  const leftReversed  = gridExport
  const rightReversed = false  // energy always flows toward home
  const bottomReversed = battDisch // when discharging, energy flows upward (batt → hub)

  // Edge start/end for lines (trim to circle boundaries)
  const solarEdge = edgePt(SOLAR, HUB,   NODE_R)
  const gridEdge  = edgePt(GRID,  JUNC_L, NODE_R)
  const homeEdge  = edgePt(HOME,  JUNC_R, NODE_R)
  const battEdge  = edgePt(BATT,  HUB,   NODE_R)

  const battLabel = battCharging
    ? `+${fmt(battery)}`
    : battDisch
      ? fmt(Math.abs(battery))
      : "Idle"

  const gridLabel = gridImport
    ? `↓ ${fmt(grid)}`
    : gridExport
      ? `↑ ${fmt(Math.abs(grid))}`
      : "Idle"

  return (
    <div className="w-full rounded-xl overflow-hidden bg-[#060e1a] p-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-xs mx-auto"
        style={{ minWidth: 240, background: "transparent" }}
      >
        {/* ── Horizontal line: Grid junction → Home junction ── */}
        <FlowLine
          id="fl-left"
          from={gridEdge}
          to={JUNC_L}
          active={leftActive}
          color={gridExport ? "#6366f1" : "#64748b"}
          reversed={leftReversed}
        />
        <FlowLine
          id="fl-right"
          from={JUNC_R}
          to={homeEdge}
          active={rightActive}
          color="#38bdf8"
          reversed={rightReversed}
        />
        {/* Hub to junctions */}
        <FlowLine
          id="fl-hub-l"
          from={HUB}
          to={JUNC_L}
          active={leftActive}
          color={gridExport ? "#6366f1" : "#64748b"}
          reversed={leftReversed}
        />
        <FlowLine
          id="fl-hub-r"
          from={HUB}
          to={JUNC_R}
          active={rightActive}
          color="#38bdf8"
          reversed={false}
        />

        {/* ── Vertical lines: Solar ↕ Hub ↕ Battery ── */}
        <FlowLine
          id="fl-solar"
          from={solarEdge}
          to={HUB}
          active={topActive}
          color="#f59e0b"
          reversed={false}
        />
        <FlowLine
          id="fl-batt"
          from={battEdge}
          to={HUB}
          active={bottomActive}
          color="#10b981"
          reversed={bottomReversed}
        />

        {/* ── Junction dots ── */}
        <Junction pos={JUNC_L} active={leftActive} />
        <Junction pos={JUNC_R} active={rightActive} />

        {/* ── Nodes (drawn on top of lines) ── */}
        <Node
          pos={SOLAR}
          color="#f59e0b"
          icon={<Sun size={18} strokeWidth={2} />}
          value={fmt(solar)}
          sublabel={solarOn ? "Solar" : undefined}
          active={solarOn}
        />
        <Node
          pos={GRID}
          color={gridExport ? "#6366f1" : "#64748b"}
          icon={<Zap size={16} strokeWidth={2} />}
          value={gridLabel}
          active={gridImport || gridExport}
        />
        <Node
          pos={HOME}
          color="#38bdf8"
          icon={<Home size={16} strokeWidth={2} />}
          value={fmt(home)}
          active={home > 50}
        />
        <Node
          pos={BATT}
          color="#10b981"
          icon={<Battery size={16} strokeWidth={2} />}
          value={battLabel}
          sublabel={`${Math.round(data.battery_percentage ?? 0)}%`}
          active={battCharging || battDisch}
        />

        {/* ── Center hub dot ── */}
        <circle cx={HUB.x} cy={HUB.y} r={5} fill="#0f172a" stroke="#334155" strokeWidth={1.5} />
      </svg>
    </div>
  )
}
