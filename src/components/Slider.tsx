import { useEffect, useRef, useState, type ReactNode } from 'react'

const reduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Minimal auto-advancing slider. Fade transitions, dot controls, swipe on
 * touch, pauses on hover/focus, respects reduced-motion.
 */
export function Slider({
  slides,
  interval = 5000,
  className = '',
}: {
  slides: ReactNode[]
  interval?: number
  className?: string
}) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = slides.length
  const touch = useRef<number | null>(null)

  useEffect(() => {
    if (reduced || paused || n < 2) return
    const id = setInterval(() => setI((v) => (v + 1) % n), interval)
    return () => clearInterval(id)
  }, [paused, n, interval])

  if (!n) return null

  return (
    <div
      className={'relative ' + className}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return
        const dx = e.changedTouches[0].clientX - touch.current
        if (Math.abs(dx) > 40) setI((v) => (v + (dx < 0 ? 1 : n - 1)) % n)
        touch.current = null
      }}
      aria-roledescription="carousel"
    >
      <div className="relative">
        {slides.map((s, idx) => (
          <div
            key={idx}
            aria-hidden={idx !== i}
            className={
              'transition-opacity duration-500 ' +
              (idx === i ? 'relative opacity-100' : 'pointer-events-none absolute inset-0 opacity-0')
            }
          >
            {s}
          </div>
        ))}
      </div>

      {n > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Slide ${idx + 1}`}
              aria-current={idx === i}
              className={
                'h-1.5 rounded-full transition-all ' +
                (idx === i ? 'w-6 bg-brand-500' : 'w-1.5 bg-white/25 hover:bg-white/40')
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
