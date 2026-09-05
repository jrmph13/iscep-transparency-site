import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { StatGrid } from './components/StatGrid'
import { FundStatus } from './components/FundStatus'
import { SectionBreakdown } from './components/SectionBreakdown'
import { Members } from './components/Members'
import { AnnouncementsFeed } from './components/AnnouncementsFeed'
import { RecordsTable } from './components/RecordsTable'
import { FAQ } from './components/FAQ'
import { About } from './components/About'
import { SiteFooter } from './components/SiteFooter'
import { PaymentLookup } from './components/PaymentLookup'
import { Reveal } from './components/Reveal'
import { BackToTop } from './components/BackToTop'
import { useSiteData } from './lib/useSiteData'
import { useRoute } from './lib/router'
import { firebaseEnabled } from './lib/firebase'
import { lazy, Suspense } from 'react'

const AdminDashboard = lazy(() =>
  import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
)

export default function App() {
  const { data, status, error, reload } = useSiteData()
  const route = useRoute()

  if (route.name === 'admin') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
        <AdminDashboard />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-canvas text-muted">
      <Nav />

      {route.name === 'home' && status === 'loading' && !data && <Skeleton />}
      {route.name === 'home' && status === 'error' && !data && (
        <ErrorState message={error} onRetry={reload} />
      )}

      {route.name === 'lookup' && <PaymentLookup id={route.id} />}

      {data && route.name === 'home' && (
        <>
          <main className="space-y-16 pb-6 sm:space-y-20">
            <Hero summary={data.summary} meta={data.meta} />
            <Reveal><StatGrid summary={data.summary} /></Reveal>
            <Reveal><FundStatus summary={data.summary} usage={data.usage} /></Reveal>
            <Reveal><SectionBreakdown sections={data.summary.bySection} /></Reveal>
            {firebaseEnabled && (
              <Reveal><Members /></Reveal>
            )}
            <Reveal><AnnouncementsFeed feed={data.announcements} /></Reveal>
            <Reveal><RecordsTable total={data.summary.totalMembers} /></Reveal>
            <Reveal><FAQ /></Reveal>
            <Reveal><About meta={data.meta} summary={data.summary} /></Reveal>
          </main>
          <SiteFooter meta={data.meta} />
          <BackToTop />
        </>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="skeleton h-6 w-40" />
      <div className="skeleton mt-4 h-12 w-3/4" />
      <div className="skeleton mt-3 h-4 w-full max-w-xl" />
      <div className="mt-8 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="skeleton h-44" />
        <div className="skeleton h-44" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-32">
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Couldn&rsquo;t load the data</h2>
        <p className="mt-1 text-sm text-muted">
          {message ?? 'The data files under /data are missing or unreadable.'}
        </p>
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface2"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
