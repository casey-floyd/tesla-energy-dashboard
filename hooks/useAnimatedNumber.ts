"use client"

import { animate, useMotionValue } from "framer-motion"
import { useEffect, useState } from "react"

export function useAnimatedNumber(target: number, duration = 0.6): number {
  const motionValue = useMotionValue(target)
  const [display, setDisplay] = useState(target)

  useEffect(() => {
    const controls = animate(motionValue, target, {
      duration,
      ease: "easeOut",
      onUpdate: setDisplay,
    })
    return controls.stop
  }, [target, duration, motionValue])

  return display
}
