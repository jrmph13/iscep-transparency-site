// Data shapes. Aggregates come from the Apps Script `?route=summary` (or the
// committed public/data/*.json fallback). Individual records come only from
// `?route=record` — they are never bundled with the site.

export interface FeeStatus {
  ssg: string
  membership: string
  orgShirt: string
  event: string
  others: string
}

/** One student's record, as returned by the Apps Script lookup. No id / e-mail. */
export interface LookupRecord {
  name: string
  firstName: string
  middleName: string
  lastName: string
  section: string
  datePaid: string
  fees: FeeStatus
  amountLabel: string
  amount: number
  cashier: string
  status: string
  contributor: boolean
  timestamp: string
}

export interface SectionStat {
  section: string
  members: number
  contributors: number
  collected: number
  expected: number
  rate: number
}

export interface StatusCount {
  label: string
  count: number
}

export interface CashierStat {
  cashier: string
  count: number
  collected: number
}

export interface RecentActivity {
  section: string
  amount: number
  date: string
}

export interface Summary {
  totalCollected: number
  remainingFunds: number | null
  spent: number | null
  perMemberFee: number
  expectedMembership: number
  collectionRate: number
  totalMembers: number
  contributors: number
  pending: number
  feeCounts: Record<keyof FeeStatus, number>
  bySection: SectionStat[]
  statusCounts: StatusCount[]
  byCashier: CashierStat[]
  recent: RecentActivity[]
}

export interface FundUsage {
  purpose: string
  project: string
  date: string
  estimated: number
  used: number
  by: string
}

export interface FundsSheet {
  remainingFunds: number | null
}

export interface Meta {
  fetchedAt: string
  recordCount: number
}

export interface Announcement {
  date: string
  title: string
  body: string
  tag?: 'Funds' | 'Event' | 'Notice' | 'Update'
  important?: boolean
  link?: string
  image?: string
  source?: 'facebook' | 'manual'
}

export interface AnnouncementsFile {
  fetchedAt: string | null
  pageId: string
  items: Announcement[]
}

export interface Member {
  id: string
  name: string
  section: string
  role?: string
  order?: number
  photoUrl?: string
  email?: string
  link?: string
}

export interface SiteData {
  summary: Summary
  funds: FundsSheet
  usage: FundUsage[]
  meta: Meta
  announcements: AnnouncementsFile | null
}
