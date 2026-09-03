import { useEffect, useRef, useState } from 'react'

/** Fires once when the element first scrolls into view. */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  opts: IntersectionObserverInit = { rootMargin: '0px 0px -10% 0px' }
) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setInView(true)
        obs.disconnect()
      }
    }, opts)
    obs.observe(el)
    return () => obs.disconnect()
  }, [inView, opts])

  return { ref, inView }
}
