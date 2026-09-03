import { useEffect, useState } from 'react'

export function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 640)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={
        'fixed bottom-5 right-5 z-40 grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-ink shadow-lg shadow-navy-900/20 transition-all duration-300 hover:border-brand-500/40 hover:text-brand-600 dark:hover:text-brand-400 ' +
        (show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0')
      }
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
