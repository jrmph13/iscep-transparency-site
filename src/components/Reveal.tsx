import type { ReactNode } from 'react'
import { useInView } from '../lib/useInView'

/** Fade + rise the child in once it scrolls into view. */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '0px 0px -8% 0px' })
  return (
    <div
      ref={ref}
      className={
        className +
        ' transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ' +
        (inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')
      }
    >
      {children}
    </div>
  )
}
