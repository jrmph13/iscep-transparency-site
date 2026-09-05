import { FAQS } from '../data/site'
import { Section } from './Section'
import { Reveal } from './Reveal'

/**
 * Native <details>/<summary> accordion — free keyboard support and screen
 * reader semantics, no open/close state to manage. The chevron rotates via
 * the `group-open:` variant instead of JS.
 */
export function FAQ() {
  return (
    <Section
      id="faq"
      title="Frequently asked"
      subtitle="Quick answers before you message the auditor."
    >
      <Reveal stagger className="mx-auto flex max-w-3xl flex-col gap-2">
        {FAQS.map((item) => (
          <details key={item.q} className="group card overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-medium text-ink marker:content-none">
              {item.q}
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-faint transition-transform duration-200 group-open:rotate-180"
                fill="none"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <p className="px-4 pb-4 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </Reveal>
    </Section>
  )
}
