import { useEffect, useState } from 'react'
import { BrandLoader } from './BrandLoader'

const MIN_VISIBLE_MS = 650
const EXIT_MS = 550

/**
 * One-time boot splash: the ISCEP logo slides/fades in, holds briefly, then
 * the whole panel wipes up off-screen — with a brand-coloured accent bar
 * sweeping up behind it — to reveal the app underneath. Purely decorative;
 * it does not gate data loading.
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
        'fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-canvas ' +
        'transition-transform duration-[550ms] ease-[cubic-bezier(.76,0,.24,1)] motion-reduce:transition-none ' +
        (phase === 'out' ? '-translate-y-full' : 'translate-y-0')
      }
    >
      {/* accent bar that sweeps up the screen just behind the panel edge */}
      <span
        className={
          'pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-brand-500 transition-transform duration-[550ms] ease-[cubic-bezier(.76,0,.24,1)] motion-reduce:hidden ' +
          (phase === 'out' ? '-translate-y-[100vh]' : 'translate-y-0')
        }
      />
      <div className="animate-[splashIn_.5s_cubic-bezier(.22,1,.36,1)_both]">
        <BrandLoader className="h-52 w-52" />
      </div>
    </div>
  )
}
