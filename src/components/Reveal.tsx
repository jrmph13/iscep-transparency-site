import { Children, type ReactNode } from 'react'
import { useInView } from '../lib/useInView'

/**
 * Fade + rise the child in once it scrolls into view. With `stagger`, each
 * direct child gets its own incremental transition-delay for a cascading
 * entrance instead of the whole block appearing at once — use it on card
 * grids (className stays on the grid wrapper, so layout is unaffected).
 */
export function Reveal({
  children,
  className = '',
  stagger = false,
}: {
  children: ReactNode
  className?: string
  stagger?: boolean
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '0px 0px -8% 0px' })

  if (stagger) {
    const items = Children.toArray(children)
    return (
      <div ref={ref} className={className}>
        {items.map((child, i) => (
          <div
            key={i}
            className={
              'transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ' +
              (inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')
            }
            style={{ transitionDelay: inView ? `${Math.min(i, 8) * 70}ms` : '0ms' }}
          >
            {child}
          </div>
        ))}
      </div>
    )
  }

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
