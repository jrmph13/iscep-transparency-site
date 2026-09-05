import { useEffect, useState } from 'react'
import { BrandLoader } from './BrandLoader'

const MIN_VISIBLE_MS = 900
const EXIT_MS = 650

/**
 * One-time boot splash: the ISCEP logo slides/fades in, holds briefly, then
 * the whole panel wipes up off-screen to reveal the app underneath. Purely
 * decorative — doesn't gate data loading (the home page has its own skeleton
 * for that), so it never blocks the app from actually being usable.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in')

  useEffect(() => {
    const t = setTimeout(() => setPhase('out'), MIN_VISIBLE_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (phase !== 'out') return
    const t = setTimeout(() => setPhase('gone'), EXIT_MS)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === 'gone') return null

  return (
    <div
      aria-hidden
      className={
        'fixed inset-0 z-[100] flex items-center justify-center bg-canvas ' +
        'transition-transform duration-[650ms] ease-[cubic-bezier(.76,0,.24,1)] motion-reduce:transition-none ' +
        (phase === 'out' ? '-translate-y-full' : 'translate-y-0')
      }
    >
      <div className="animate-[splashIn_1.8s_cubic-bezier(.22,1,.36,1)_both]">
        <BrandLoader className="h-40 w-40" />
      </div>
    </div>
  )
}
