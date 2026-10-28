import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  format: (n: number) => string
  durationMs?: number
}

/** Tweens between numeric values (skipped when the user prefers reduced motion). */
export function AnimatedNumber({ value, format, durationMs = 450 }: AnimatedNumberProps) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    if (reduced || !Number.isFinite(value)) {
      fromRef.current = value
      setDisplay(value)
      return
    }
    const from = fromRef.current
    const start = performance.now()
    const run = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (value - from) * eased)
      if (t < 1) frame.current = requestAnimationFrame(run)
      else fromRef.current = value
    }
    frame.current = requestAnimationFrame(run)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
      fromRef.current = value
    }
  }, [value, durationMs, reduced])

  return <span aria-live="polite">{format(display)}</span>
}
