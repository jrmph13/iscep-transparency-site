import { useEffect, useMemo, useRef, useState } from 'react'
import { OWNER_EMAIL, useAdmin } from '../../lib/useAdmin'
import { useMembers } from '../../lib/useMembers'
import { useAnnouncements } from '../../lib/useAnnouncements'
import { roleRank } from '../../lib/roles'
import {
  ROLES,
  addAdmin,
  createAnnouncement,
  createMember,
  deleteAnnouncement,
  deleteMember,
  friendlyError,
  removeAdmin,
  saveSummary,
  toInput,
  updateAnnouncement,
  updateMember,
  updateMemberOrder,
  uploadAnnouncementImage,
  uploadMemberPhoto,
  type AnnouncementInput,
  type MemberInput,
} from '../../lib/adminWrites'
import { getDb } from '../../lib/firebase'
import type { Member } from '../../types'
import { Logo } from '../Logo'
import { BrandLoader } from '../BrandLoader'

type Tab = 'overview' | 'members' | 'announcements' | 'totals' | 'access'

export function AdminDashboard() {
  const admin = useAdmin()

  return (
    <div className="min-h-screen bg-canvas text-muted">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="#/" className="flex items-center gap-2 text-ink">
            <Logo className="h-7 w-7" />
            <span className="font-display text-sm font-bold">ISCEP admin</span>
          </a>
          {admin.status === 'ready' && (
            <div className="flex items-center gap-3 text-xs text-faint">
              <span className="hidden sm:inline">
                {admin.user?.email}
                {admin.isOwner && (
                  <span className="ml-1 rounded bg-brand-600/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                    owner
                  </span>
                )}
              </span>
              <button
                onClick={admin.signOut}
                className="rounded-lg border border-line px-2.5 py-1 text-ink hover:bg-surface2"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {admin.status === 'init' && <BrandLoader label="Loading…" />}

        {(admin.status === 'anon' || admin.status === 'error') && (
          <LoginCard onSignIn={admin.signIn} error={admin.error} disabled={admin.status === 'error'} />
        )}

        {admin.status === 'checking' && <BrandLoader label="Verifying admin access…" />}

        {admin.status === 'denied' && (
          <div className="card mx-auto max-w-md p-6 text-center">
            <h1 className="font-display text-lg font-bold text-ink">Not an admin</h1>
            <p className="mt-2 text-sm text-faint">
              Signed in as <span className="text-ink">{admin.user?.email}</span>, but this account
              isn&rsquo;t on the whitelist. Ask the owner to add{' '}
              <span className="figure">{admin.user?.email}</span> from their dashboard.
            </p>
            <button
              onClick={admin.signOut}
              className="mt-4 rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface2"
            >
              Sign out
            </button>
          </div>
        )}

        {admin.status === 'ready' && (
          <ReadyDashboard
            isOwner={admin.isOwner}
            addedBy={(admin.user?.email || OWNER_EMAIL).toLowerCase()}
          />
        )}
      </main>
    </div>
  )
}

function LoginCard({
  onSignIn,
  error,
  disabled,
}: {
  onSignIn: () => void
  error: string | null
  disabled: boolean
}) {
  return (
    <div className="card mx-auto max-w-md p-6 text-center">
      <h1 className="font-display text-lg font-bold text-ink">Admin sign-in</h1>
      <p className="mt-2 text-sm text-faint">
        Use the Google account that was added to the <span className="figure">admins</span>{' '}
        collection.
      </p>
      <button
        onClick={onSignIn}
        disabled={disabled}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        Continue with Google
      </button>
      {error && <p className="mt-3 text-xs text-rose-500">{error}</p>}
    </div>
  )
}

/* ---------------- Ready shell: tabs + overview ---------------- */

const TAB_LABEL: Record<Tab, string> = {
  overview: 'Overview',
  members: 'Members',
  announcements: 'Announcements',
  totals: 'Live totals',
  access: 'Access',
}

function ReadyDashboard({ isOwner, addedBy }: { isOwner: boolean; addedBy: string }) {
  const [tab, setTab] = useState<Tab>('overview')
  const membersState = useMembers()
  const annState = useAnnouncements()
  const tabs: Tab[] = ['overview', 'members', 'announcements', 'totals', ...(isOwner ? (['access'] as Tab[]) : [])]

  return (
    <div>
      <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors ' +
              (tab === t ? 'text-ink' : 'text-faint hover:text-ink')
            }
          >
            {TAB_LABEL[t]}
            {tab === t && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
            )}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <Overview members={membersState} announcements={annState} onNavigate={setTab} />
      )}
      {tab === 'members' && <MembersManager members={membersState} />}
      {tab === 'announcements' && <AnnouncementsManager announcements={annState} />}
      {tab === 'totals' && <SummaryEditor />}
      {tab === 'access' && isOwner && <AdminsManager addedBy={addedBy} />}
    </div>
  )
}

function Overview({
  members,
  announcements,
  onNavigate,
}: {
  members: ReturnType<typeof useMembers>
  announcements: ReturnType<typeof useAnnouncements>
  onNavigate: (t: Tab) => void
}) {
  const officers = members.members.filter((m) => m.role && m.role !== 'Member').length
  const pinned = announcements.items.filter((a) => a.important).length

  const cards: { label: string; value: string; sub: string; onClick: () => void }[] = [
    {
      label: 'Members on record',
      value: members.status === 'live' ? String(members.members.length) : '—',
      sub: `${officers} with an officer role`,
      onClick: () => onNavigate('members'),
    },
    {
      label: 'Manual announcements',
      value: announcements.status === 'live' ? String(announcements.items.length) : '—',
      sub: `${pinned} pinned to top`,
      onClick: () => onNavigate('announcements'),
    },
  ]

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={c.onClick}
            className="card card-hover p-4 text-left"
          >
            <div className="label">{c.label}</div>
            <div className="stat mt-0.5 text-3xl text-ink">{c.value}</div>
            <div className="mt-1 text-xs text-faint">{c.sub}</div>
          </button>
        ))}
      </div>

      <div className="card mt-3 p-4">
        <div className="kicker">Quick actions</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('members')}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface2"
          >
            + Add a member
          </button>
          <button
            onClick={() => onNavigate('announcements')}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface2"
          >
            + Post an announcement
          </button>
          <button
            onClick={() => onNavigate('totals')}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface2"
          >
            Push live totals
          </button>
          <a
            href="#/"
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface2"
          >
            View public site ↗
          </a>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Members ---------------- */

const BLANK: MemberInput = {
  name: '',
  section: '',
  role: 'Member',
  order: undefined,
  photoUrl: '',
  email: '',
  link: '',
}

function MembersManager({ members: membersState }: { members: ReturnType<typeof useMembers> }) {
  const { members, status } = membersState
  const [draft, setDraft] = useState<MemberInput>(BLANK)
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState<MemberInput>(BLANK)
  const [editFile, setEditFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const draftFileRef = useRef<HTMLInputElement | null>(null)
  const editFileRef = useRef<HTMLInputElement | null>(null)

  const sorted = useMemo(
    () =>
      [...members].sort(
        (a, b) =>
          (a.section || '').localeCompare(b.section || '') ||
          (a.order ?? 999) - (b.order ?? 999) ||
          (a.name || '').localeCompare(b.name || '')
      ),
    [members]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return sorted
    return sorted.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(needle) ||
        (m.section || '').toLowerCase().includes(needle) ||
        (m.role || '').toLowerCase().includes(needle)
    )
  }, [sorted, q])

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setErr(null)
    try {
      await fn()
    } catch (e) {
      setErr(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  /** Renumber every member so the visible order is exactly 0..n-1. */
  async function persistReorder(next: typeof sorted) {
    let i = 0
    for (const m of next) {
      const desired = i++
      if ((m.order ?? -1) !== desired) {
        try {
          await updateMemberOrder(m.id, desired)
        } catch (e) {
          setErr(friendlyError(e))
          return
        }
      }
    }
  }

  function move(id: string, dir: -1 | 1) {
    const idx = sorted.findIndex((m) => m.id === id)
    if (idx < 0) return
    const j = idx + dir
    if (j < 0 || j >= sorted.length) return
    const next = [...sorted]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    void persistReorder(next)
  }

  function onDragStart(id: string) {
    return (e: React.DragEvent) => {
      setDragId(id)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
    }
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  function onDrop(targetId: string) {
    return (e: React.DragEvent) => {
      e.preventDefault()
      const src = dragId || e.dataTransfer.getData('text/plain')
      setDragId(null)
      if (!src || src === targetId) return
      const next = [...sorted]
      const sIdx = next.findIndex((m) => m.id === src)
      const tIdx = next.findIndex((m) => m.id === targetId)
      if (sIdx < 0 || tIdx < 0) return
      ;[next[sIdx], next[tIdx]] = [next[tIdx], next[sIdx]]
      void persistReorder(next)
    }
  }

  function resetDraft() {
    setDraft(BLANK)
    setDraftFile(null)
    if (draftFileRef.current) draftFileRef.current.value = ''
  }

  const canAdd = draft.name.trim() && draft.section.trim()

  return (
    <section>
      <div className="mb-4 border-b border-line pb-3">
        <h2 className="font-display text-xl font-bold text-ink">Members / organization</h2>
        <p className="mt-1 text-sm text-faint">
          Name and section only — no ID numbers, no e-mail. Changes appear on the public site
          instantly. {status === 'live' ? `${members.length} on record.` : status}
        </p>
      </div>

      {/* add row */}
      <div className="card grid gap-2 p-3 sm:grid-cols-[1fr_120px_150px_90px_auto]">
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          placeholder="Full name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          placeholder="Section"
          value={draft.section}
          onChange={(e) => setDraft({ ...draft, section: e.target.value })}
        />
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          value={draft.role}
          onChange={(e) => setDraft({ ...draft, role: e.target.value })}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          placeholder="Order"
          value={draft.order ?? ''}
          onChange={(e) =>
            setDraft({ ...draft, order: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
        <button
          disabled={!canAdd || busy}
          onClick={() =>
            run(async () => {
              const payload: MemberInput = { ...draft }
              if (draftFile) {
                payload.photoUrl = await uploadMemberPhoto(draftFile)
              }
              await createMember(payload)
              resetDraft()
            })
          }
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Add
        </button>
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:col-span-2"
          placeholder="Email (optional)"
          value={draft.email ?? ''}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
        />
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:col-span-2"
          placeholder="Link — FB / IG / portfolio (optional)"
          value={draft.link ?? ''}
          onChange={(e) => setDraft({ ...draft, link: e.target.value })}
        />
        <input
          ref={draftFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:col-span-3 file:mr-2 file:rounded file:border-0 file:bg-brand-600 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-700"
          onChange={(e) => setDraftFile(e.target.files?.[0] ?? null)}
        />
        {draftFile && (
          <div className="text-xs text-faint sm:col-span-1">
            Selected: {draftFile.name} ({Math.round(draftFile.size / 1024)} KB)
          </div>
        )}
      </div>

      {err && <p className="mt-2 text-xs text-rose-500">{err}</p>}

      <div className="mt-3 flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, section, or role…"
          className="w-full max-w-xs rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-dim focus:border-brand-500/60 focus:outline-none sm:max-w-sm"
        />
        {q && (
          <span className="text-xs text-dim">
            {filtered.length} of {sorted.length} · reordering disabled while searching
          </span>
        )}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-dim">
            <tr>
              <th className="px-3 py-2">Member</th>
              <th className="px-3 py-2">Section</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const editing = editingId === m.id
              const reorderable = !q.trim()
              return (
                <tr
                  key={m.id}
                  draggable={!editing && reorderable}
                  onDragStart={reorderable ? onDragStart(m.id) : undefined}
                  onDragOver={reorderable ? onDragOver : undefined}
                  onDrop={reorderable ? onDrop(m.id) : undefined}
                  className={'border-t border-line ' + (dragId === m.id ? 'opacity-50' : '')}
                >
                  {editing ? (
                    <>
                      <td className="px-2 py-1.5">
                        <input
                          className="w-full rounded border border-line bg-surface px-2 py-1 text-ink"
                          value={edit.name}
                          onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                        />
                        <input
                          className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
                          placeholder="Email"
                          value={edit.email ?? ''}
                          onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                        />
                        <input
                          className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
                          placeholder="Link"
                          value={edit.link ?? ''}
                          onChange={(e) => setEdit({ ...edit, link: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          className="w-24 rounded border border-line bg-surface px-2 py-1 text-ink"
                          value={edit.section}
                          onChange={(e) => setEdit({ ...edit, section: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          className="rounded border border-line bg-surface px-2 py-1 text-ink"
                          value={edit.role}
                          onChange={(e) => setEdit({ ...edit, role: e.target.value })}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          className="w-16 rounded border border-line bg-surface px-2 py-1 text-ink"
                          value={edit.order ?? ''}
                          onChange={(e) =>
                            setEdit({
                              ...edit,
                              order: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <input
                          ref={editFileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="mt-1 w-full rounded border border-line bg-surface px-1 py-0.5 text-[10px] text-ink file:mr-1 file:rounded file:border-0 file:bg-brand-600 file:px-1 file:py-0.5 file:text-[9px] file:font-semibold file:text-white hover:file:bg-brand-700"
                          onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                        />
                        {editFile && (
                          <div className="mt-1 text-[10px] text-faint">
                            New: {editFile.name}
                          </div>
                        )}
                        {!editFile && edit.photoUrl && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-faint">
                            <img
                              src={edit.photoUrl}
                              alt=""
                              className="h-5 w-5 rounded-full object-cover ring-1 ring-line"
                            />
                            <a
                              href={edit.photoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600 underline"
                            >
                              current
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right">
                        <button
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              const payload: MemberInput = { ...edit }
                              if (editFile) {
                                payload.photoUrl = await uploadMemberPhoto(editFile)
                              }
                              await updateMember(m.id, payload)
                              setEditingId(null)
                              setEditFile(null)
                              if (editFileRef.current) editFileRef.current.value = ''
                            })
                          }
                          className="rounded border border-line px-2 py-1 text-xs text-ink hover:bg-surface2"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditFile(null)
                            if (editFileRef.current) editFileRef.current.value = ''
                          }}
                          className="ml-1 rounded border border-line px-2 py-1 text-xs text-faint hover:bg-surface2"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-ink">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={
                              'select-none text-faint ' +
                              (reorderable ? 'cursor-grab' : 'opacity-30')
                            }
                            title={reorderable ? 'Drag to reorder' : 'Clear search to reorder'}
                          >
                            ⋮⋮
                          </span>
                          {m.photoUrl ? (
                            <img
                              src={m.photoUrl}
                              alt=""
                              className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-line"
                            />
                          ) : (
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface2 text-[10px] text-faint ring-1 ring-line">
                              {(m.name?.[0] || '?').toUpperCase()}
                            </span>
                          )}
                          <div>
                            <div>{m.name}</div>
                            {(m.email || m.link) && (
                              <div className="text-[10px] text-faint">
                                {m.email ? m.email : '—'}
                                {m.link ? ` · ${m.link}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">{m.section}</td>
                      <td className="px-3 py-2">{m.role || 'Member'}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => move(m.id, -1)}
                            disabled={
                              busy || !reorderable || sorted.findIndex((x) => x.id === m.id) === 0
                            }
                            title="Move up"
                            className="rounded border border-line px-1.5 py-0.5 text-xs text-ink hover:bg-surface2 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => move(m.id, 1)}
                            disabled={
                              busy ||
                              !reorderable ||
                              sorted.findIndex((x) => x.id === m.id) === sorted.length - 1
                            }
                            title="Move down"
                            className="rounded border border-line px-1.5 py-0.5 text-xs text-ink hover:bg-surface2 disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <span className="ml-1 text-xs text-faint">{m.order ?? '—'}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right">
                        <button
                          onClick={() => {
                            setEditingId(m.id)
                            setEdit(toInput(m))
                            setEditFile(null)
                            if (editFileRef.current) editFileRef.current.value = ''
                          }}
                          className="rounded border border-line px-2 py-1 text-xs text-ink hover:bg-surface2"
                        >
                          Edit
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => {
                            if (confirm(`Remove ${m.name}?`)) run(() => deleteMember(m.id))
                          }}
                          className="ml-1 rounded border border-line px-2 py-1 text-xs text-rose-500 hover:bg-rose-500/10"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-faint">
                  {sorted.length === 0 ? 'No members yet — add the first above.' : 'No members match that search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* live preview — mirrors the public Members section */}
      <details className="mt-6">
        <summary className="cursor-pointer select-none text-sm font-semibold text-ink">
          Live preview (what the public Members section will look like)
        </summary>
        <div className="mt-3 rounded-2xl border border-line bg-canvas p-4">
          <Preview officers={sorted.filter((m) => m.role && m.role !== 'Member')} />
          <div className="kicker mt-4 mb-2">All members</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((m) => (
              <PreviewCard key={m.id} m={m} />
            ))}
          </div>
          {sorted.length === 0 && (
            <p className="py-6 text-center text-sm text-faint">
              Nothing to preview yet — add a member above.
            </p>
          )}
        </div>
      </details>
    </section>
  )
}

/* ---- Live preview helpers (mirror public Members.tsx) ---- */

function Preview({ officers }: { officers: Member[] }) {
  if (officers.length === 0) return null
  // Sort by ROLES hierarchy (matching the public site exactly) so what you
  // see in the dashboard is what the public Members section will render.
  const sorted = [...officers].sort((a, b) => {
    const r = roleRank(a.role) - roleRank(b.role)
    if (r !== 0) return r
    return (a.order ?? 999) - (b.order ?? 999) || (a.name || '').localeCompare(b.name || '')
  })
  return (
    <div className="mb-2">
      <div className="kicker mb-2">Officers</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((m) => (
          <PreviewCard key={m.id} m={m} highlight />
        ))}
      </div>
    </div>
  )
}

function PreviewCard({ m, highlight }: { m: Member; highlight?: boolean }) {
  const initials = (m.name || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const isOfficer = !!m.role && m.role !== 'Member'
  return (
    <div
      className={
        'flex items-center gap-3 rounded-xl border p-3 ' +
        (highlight ? 'border-brand-500/30 bg-brand-600/[0.06]' : 'border-line bg-surface')
      }
    >
      {m.photoUrl ? (
        <img
          src={m.photoUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-line"
        />
      ) : (
        <span
          className={
            'grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xs font-semibold ring-1 ' +
            (highlight
              ? 'bg-brand-600/15 text-brand-700 ring-brand-500/30 dark:text-brand-300'
              : 'bg-surface2 text-faint ring-line')
          }
        >
          {initials || '—'}
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">{m.name}</div>
        <div className="text-xs text-faint">
          {isOfficer && (
            <span className="text-brand-600 dark:text-brand-400">{m.role}</span>
          )}
          {isOfficer && m.section ? ' · ' : ''}
          {m.section}
        </div>
        {(m.email || m.link) && (
          <div className="mt-0.5 truncate text-[10px] text-faint">
            {m.email && (
              <a href={`mailto:${m.email}`} className="hover:text-ink">
                {m.email}
              </a>
            )}
            {m.email && m.link ? ' · ' : ''}
            {m.link && (
              <a
                href={m.link}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 hover:underline"
              >
                link
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- Announcements (manual) ---------------- */

const ANN_BLANK: AnnouncementInput = {
  title: '',
  body: '',
  date: new Date().toISOString().slice(0, 10),
  tag: undefined,
  important: false,
  link: '',
  image: '',
}

const ANN_TAGS = ['Funds', 'Event', 'Notice', 'Update'] as const

function AnnouncementsManager({
  announcements,
}: {
  announcements: ReturnType<typeof useAnnouncements>
}) {
  const { items, status } = announcements
  const [draft, setDraft] = useState<AnnouncementInput>(ANN_BLANK)
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState<AnnouncementInput>(ANN_BLANK)
  const [editFile, setEditFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const draftFileRef = useRef<HTMLInputElement | null>(null)
  const editFileRef = useRef<HTMLInputElement | null>(null)

  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [items]
  )

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      await fn()
    } catch (e) {
      setErr(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  function resetDraft() {
    setDraft({ ...ANN_BLANK, date: new Date().toISOString().slice(0, 10) })
    setDraftFile(null)
    if (draftFileRef.current) draftFileRef.current.value = ''
  }

  const canAdd = draft.title.trim() && draft.body.trim() && draft.date.trim()

  return (
    <section>
      <div className="mb-4 border-b border-line pb-3">
        <h2 className="font-display text-xl font-bold text-ink">Announcements</h2>
        <p className="mt-1 text-sm text-faint">
          Pin / override the Facebook feed with manual posts. Appear at the top of the public
          Announcements section immediately.{' '}
          {status === 'live' ? `${items.length} manual post${items.length === 1 ? '' : 's'}.` : status}
        </p>
      </div>

      {/* add row */}
      <div className="card grid gap-2 p-3 sm:grid-cols-[1fr_140px_120px_auto]">
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:col-span-1"
          placeholder="Title"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <input
          type="date"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          value={draft.date}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
        />
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          value={draft.tag ?? ''}
          onChange={(e) =>
            setDraft({ ...draft, tag: (e.target.value || undefined) as AnnouncementInput['tag'] })
          }
        >
          <option value="">— Tag —</option>
          {ANN_TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          disabled={!canAdd || busy}
          onClick={() =>
            run(async () => {
              const payload: AnnouncementInput = { ...draft }
              if (draftFile) {
                payload.image = await uploadAnnouncementImage(draftFile)
              }
              await createAnnouncement(payload)
              resetDraft()
              setMsg('Announcement posted.')
            })
          }
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Post
        </button>
        <textarea
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:col-span-3"
          placeholder="Body — what's the announcement?"
          rows={3}
          value={draft.body}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
        />
        <label className="flex items-center gap-2 text-xs text-faint">
          <input
            type="checkbox"
            checked={!!draft.important}
            onChange={(e) => setDraft({ ...draft, important: e.target.checked })}
          />
          Pin to top
        </label>
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:col-span-2"
          placeholder="Link (optional)"
          value={draft.link ?? ''}
          onChange={(e) => setDraft({ ...draft, link: e.target.value })}
        />
        <input
          ref={draftFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:col-span-2 file:mr-2 file:rounded file:border-0 file:bg-brand-600 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-700"
          onChange={(e) => setDraftFile(e.target.files?.[0] ?? null)}
        />
        {draftFile && (
          <div className="text-xs text-faint sm:col-span-1">
            Selected: {draftFile.name} ({Math.round(draftFile.size / 1024)} KB)
          </div>
        )}
      </div>

      {err && <p className="mt-2 text-xs text-rose-500">{err}</p>}
      {msg && <p className="mt-2 text-xs text-emerald-500">{msg}</p>}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-dim">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Tag</th>
              <th className="px-3 py-2">Pin</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const editing = editingId === a.id
              return (
                <tr key={a.id} className="border-t border-line align-top">
                  {editing ? (
                    <>
                      <td className="px-2 py-1.5">
                        <input
                          type="date"
                          className="w-32 rounded border border-line bg-surface px-2 py-1 text-ink"
                          value={edit.date}
                          onChange={(e) => setEdit({ ...edit, date: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          className="w-full rounded border border-line bg-surface px-2 py-1 text-ink"
                          value={edit.title}
                          onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                        />
                        <textarea
                          className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
                          rows={3}
                          value={edit.body}
                          onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                        />
                        <input
                          className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
                          placeholder="Link"
                          value={edit.link ?? ''}
                          onChange={(e) => setEdit({ ...edit, link: e.target.value })}
                        />
                        <input
                          ref={editFileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink file:mr-2 file:rounded file:border-0 file:bg-brand-600 file:px-2 file:py-0.5 file:text-[10px] file:font-semibold file:text-white hover:file:bg-brand-700"
                          onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                        />
                        {editFile && (
                          <div className="mt-1 text-[10px] text-faint">
                            New: {editFile.name} ({Math.round(editFile.size / 1024)} KB)
                          </div>
                        )}
                        {edit.image && !editFile && (
                          <div className="mt-1 text-[10px] text-faint">
                            Current image:{' '}
                            <a
                              href={edit.image}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600 underline"
                            >
                              open
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          className="rounded border border-line bg-surface px-2 py-1 text-ink"
                          value={edit.tag ?? ''}
                          onChange={(e) =>
                            setEdit({
                              ...edit,
                              tag: (e.target.value || undefined) as AnnouncementInput['tag'],
                            })
                          }
                        >
                          <option value="">—</option>
                          {ANN_TAGS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={!!edit.important}
                          onChange={(e) => setEdit({ ...edit, important: e.target.checked })}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right">
                        <button
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              const payload: AnnouncementInput = { ...edit }
                              if (editFile) {
                                payload.image = await uploadAnnouncementImage(editFile)
                              }
                              await updateAnnouncement(a.id, payload)
                              setEditingId(null)
                              setEditFile(null)
                              if (editFileRef.current) editFileRef.current.value = ''
                              setMsg('Announcement updated.')
                            })
                          }
                          className="rounded border border-line px-2 py-1 text-xs text-ink hover:bg-surface2"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditFile(null)
                            if (editFileRef.current) editFileRef.current.value = ''
                          }}
                          className="ml-1 rounded border border-line px-2 py-1 text-xs text-faint hover:bg-surface2"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="whitespace-nowrap px-3 py-2">{a.date}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink">{a.title}</div>
                        <div className="line-clamp-2 text-xs text-faint">{a.body}</div>
                      </td>
                      <td className="px-3 py-2">{a.tag || '—'}</td>
                      <td className="px-3 py-2">{a.important ? '📌' : '—'}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right">
                        <button
                          onClick={() => {
                            setEditingId(a.id)
                            setEdit({
                              title: a.title,
                              body: a.body,
                              date: a.date,
                              tag: a.tag,
                              important: a.important,
                              link: a.link ?? '',
                              image: a.image ?? '',
                            })
                            setEditFile(null)
                            if (editFileRef.current) editFileRef.current.value = ''
                          }}
                          className="rounded border border-line px-2 py-1 text-xs text-ink hover:bg-surface2"
                        >
                          Edit
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => {
                            if (confirm(`Delete "${a.title}"?`))
                              run(() => deleteAnnouncement(a.id))
                          }}
                          className="ml-1 rounded border border-line px-2 py-1 text-xs text-rose-500 hover:bg-rose-500/10"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-faint">
                  No manual announcements yet — post the first above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ---------------- Summary mirror ---------------- */

function SummaryEditor() {
  const [f, setF] = useState({
    totalCollected: '',
    remainingFunds: '',
    spent: '',
    totalMembers: '',
    contributors: '',
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const field = (k: keyof typeof f, label: string) => (
    <label className="block text-xs text-faint">
      {label}
      <input
        type="number"
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
        value={f[k]}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
      />
    </label>
  )

  async function submit() {
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      await saveSummary({
        totalCollected: Number(f.totalCollected) || 0,
        remainingFunds: f.remainingFunds === '' ? undefined : Number(f.remainingFunds),
        spent: f.spent === '' ? undefined : Number(f.spent),
        totalMembers: f.totalMembers === '' ? undefined : Number(f.totalMembers),
        contributors: f.contributors === '' ? undefined : Number(f.contributors),
      })
      setMsg('Saved. Live totals updated.')
    } catch (e) {
      setErr(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="mb-4 border-b border-line pb-3">
        <h2 className="font-display text-xl font-bold text-ink">Live totals (optional)</h2>
        <p className="mt-1 text-sm text-faint">
          Pushes aggregate numbers to <span className="figure">summary/current</span> for realtime
          updates between sheet syncs. No personal data.
        </p>
      </div>
      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        {field('totalCollected', 'Total collected ₱')}
        {field('remainingFunds', 'Remaining funds ₱')}
        {field('spent', 'Spent ₱')}
        {field('totalMembers', 'Total members')}
        {field('contributors', 'Contributors')}
        <div className="flex items-end">
          <button
            disabled={busy}
            onClick={submit}
            className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Save totals
          </button>
        </div>
      </div>
      {msg && <p className="mt-2 text-xs text-emerald-500">{msg}</p>}
      {err && <p className="mt-2 text-xs text-rose-500">{err}</p>}
    </section>
  )
}

/* ---------------- Admin whitelist (owner only) ---------------- */

type AdminRow = { email: string; addedBy?: string }

function AdminsManager({ addedBy }: { addedBy: string }) {
  const [rows, setRows] = useState<AdminRow[]>([])
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      try {
        const db = await getDb()!
        const { collection, onSnapshot, query } = await import('firebase/firestore')
        unsub = onSnapshot(
          query(collection(db, 'admins')),
          (snap) => {
            setRows(
              snap.docs
                .map((d) => ({ email: d.id, ...(d.data() as Omit<AdminRow, 'email'>) }))
                .sort((a, b) => a.email.localeCompare(b.email))
            )
            setReady(true)
          },
          (e) => setErr(friendlyError(e))
        )
      } catch (e) {
        setErr(friendlyError(e))
      }
    })()
    return () => unsub()
  }, [])

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setErr(null)
    try {
      await fn()
    } catch (e) {
      setErr(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="mb-4 border-b border-line pb-3">
        <h2 className="font-display text-xl font-bold text-ink">Dashboard access</h2>
        <p className="mt-1 text-sm text-faint">
          Whitelist of Google accounts that can open this dashboard. Only the owner sees this panel.
        </p>
      </div>

      <div className="card flex flex-col gap-2 p-3 sm:flex-row">
        <input
          type="email"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          placeholder="name@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          disabled={busy || !email.trim()}
          onClick={() => run(async () => (await addAdmin(email, addedBy), setEmail('')))}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Add admin
        </button>
      </div>

      {err && <p className="mt-2 text-xs text-rose-500">{err}</p>}

      <ul className="mt-3 divide-y divide-line">
        <li className="flex items-center justify-between py-2.5 text-sm">
          <span className="text-ink">
            {OWNER_EMAIL}{' '}
            <span className="ml-1 rounded bg-brand-600/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
              owner
            </span>
          </span>
          <span className="text-xs text-dim">permanent</span>
        </li>
        {rows
          .filter((r) => r.email !== OWNER_EMAIL)
          .map((r) => (
            <li key={r.email} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-ink">{r.email}</span>
              <button
                disabled={busy}
                onClick={() => {
                  if (confirm(`Remove ${r.email} from the whitelist?`))
                    run(() => removeAdmin(r.email))
                }}
                className="rounded border border-line px-2 py-1 text-xs text-rose-500 hover:bg-rose-500/10"
              >
                Remove
              </button>
            </li>
          ))}
        {ready && rows.filter((r) => r.email !== OWNER_EMAIL).length === 0 && (
          <li className="py-3 text-sm text-faint">No extra admins — just the owner.</li>
        )}
      </ul>
    </section>
  )
}
