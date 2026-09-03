import { useEffect, useRef, useState } from 'react'
import { useInView } from '../lib/useInView'

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Counts up to `value` once it scrolls into view. `format` turns the running
 * number into the displayed string (e.g. peso()).
 */
export function CountUp({
  value,
  format = (n) => String(Math.round(n)),
  duration = 900,
  className,
}: {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}) {
  const { ref, inView } = useInView<HTMLSpanElement>()
  const [display, setDisplay] = useState(prefersReduced ? value : 0)
  const raf = useRef(0)

  useEffect(() => {
    if (!inView) return
    if (prefersReduced) {
      setDisplay(value)
      return
    }
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(t < 1 ? Math.round(from + (value - from) * eased) : value)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [inView, value, duration])

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  )
}
