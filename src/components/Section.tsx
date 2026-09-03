import type { ReactNode } from 'react'

export function Section({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id: string
  /** kept for call-site compatibility; not rendered */
  no?: string
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line pb-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-faint">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}
