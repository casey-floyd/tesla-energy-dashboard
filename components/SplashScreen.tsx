"use client"

import { useEffect, useState } from "react"

interface Props {
  onDone: () => void
}

export function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<"ignite" | "glow" | "fade">("ignite")

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("glow"), 600)
    const t2 = setTimeout(() => setPhase("fade"), 2200)
    const t3 = setTimeout(onDone, 2900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080808]"
      style={{
        opacity: phase === "fade" ? 0 : 1,
        transition: phase === "fade" ? "opacity 0.7s ease-out" : undefined,
      }}
    >
      <div
        style={{
          filter: phase === "ignite"
            ? "drop-shadow(0 0 4px #3B82F6)"
            : "drop-shadow(0 0 18px #3B82F6) drop-shadow(0 0 40px #3B82F6) drop-shadow(0 0 80px #60a5fa)",
          transition: "filter 0.6s ease-in",
          animation: phase === "glow" ? "neonPulse 1.6s ease-in-out infinite" : undefined,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="160"
          height="160"
        >
          <polygon
            points="17.5,4 7,17 15.5,17 14.5,28 25,15 16.5,15 17.5,4"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* inner fill for brightness */}
          <polygon
            points="17.5,4 7,17 15.5,17 14.5,28 25,15 16.5,15 17.5,4"
            fill="#3B82F6"
            fillOpacity={phase === "ignite" ? 0 : 0.15}
            style={{ transition: "fill-opacity 0.6s ease-in" }}
          />
        </svg>
      </div>

      <p
        className="mt-6 text-sm font-semibold tracking-[0.25em] uppercase"
        style={{
          color: "#3B82F6",
          opacity: phase === "ignite" ? 0 : 1,
          transition: "opacity 0.8s ease-in 0.3s",
          textShadow: "0 0 8px #3B82F6, 0 0 20px #3B82F6",
          letterSpacing: "0.3em",
        }}
      >
        Tesla Energy
      </p>

      <style>{`
        @keyframes neonPulse {
          0%, 100% {
            filter: drop-shadow(0 0 14px #3B82F6) drop-shadow(0 0 35px #3B82F6) drop-shadow(0 0 70px #60a5fa);
          }
          50% {
            filter: drop-shadow(0 0 22px #60a5fa) drop-shadow(0 0 55px #3B82F6) drop-shadow(0 0 100px #93c5fd);
          }
        }
      `}</style>
    </div>
  )
}
