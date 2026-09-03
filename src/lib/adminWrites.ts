import { getDb } from './firebase'
import type { Member } from '../types'
import { ROLES as ROLES_LIST } from './roles'

/**
 * Turn a raw Firestore/SDK error into something an admin can act on. The most
 * common one after adding photo / email / link / announcement support is a
 * `permission-denied` because the project is still running the OLD rules.
 */
export function friendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  const code = (e as { code?: string })?.code || ''
  if (code === 'permission-denied' || /insufficient permissions|PERMISSION_DENIED/i.test(raw)) {
    return (
      'Write denied by Firestore rules. If you just added photos / links / ' +
      'announcements, deploy the latest rules:  firebase deploy --only firestore:rules'
    )
  }
  if (code === 'invalid-argument' || /longer than .* bytes|exceeds the maximum/i.test(raw)) {
    return 'That document is too big for Firestore (1 MB max). Use a smaller image.'
  }
  if (code === 'unauthenticated') return 'Session expired — sign out and back in.'
  return raw
}

/**
 * Only allow http(s) links to be stored. Everything else — `javascript:`,
 * `data:`, `vbscript:`, protocol-relative `//evil` — is dropped. These strings
 * are later rendered as `href={...}`; the CSP blocks script execution, but a
 * bad scheme could still drive a phishing redirect from a trusted-looking page.
 */
function safeHttpUrl(raw: string | undefined): string | undefined {
  const v = (raw || '').trim()
  if (!v) return undefined
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : undefined
  } catch {
    return undefined
  }
}

/**
 * Accept an inline image only if it is an `https://` URL or a base64
 * `data:image/<type>;base64,` URL (the compressor in imageToBase64.ts emits
 * exactly this). Blocks `data:text/html`, `data:image/svg+xml` (SVG can carry
 * script), and any other scheme.
 */
function safeImageValue(raw: string | undefined): string | undefined {
  const v = (raw || '').trim()
  if (!v) return undefined
  if (/^https:\/\//i.test(v)) return v
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(v)) return v
  return undefined
}

/** Fields the rules accept on a `members` doc. */
export type MemberInput = {
  name: string
  section: string
  role?: string
  order?: number
  photoUrl?: string
  email?: string
  link?: string
}

// Re-export the canonical role list so the dashboard dropdown stays in sync
// with `roles.ts` (the single source of truth used elsewhere in the app).
export const ROLES = ROLES_LIST

/** Strip empty optional fields so `hasOnly([...])` in the rules passes. */
function clean(input: MemberInput) {
  const data: Record<string, unknown> = {
    name: input.name.trim(),
    section: input.section.trim(),
  }
  if (input.role && input.role !== 'Member') data.role = input.role
  if (typeof input.order === 'number' && Number.isFinite(input.order)) {
    data.order = Math.max(0, Math.trunc(input.order))
  }
  const photo = safeImageValue(input.photoUrl)
  if (photo) data.photoUrl = photo
  if (input.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    data.email = input.email.trim()
  const link = safeHttpUrl(input.link)
  if (link) data.link = link
  return data
}

export async function createMember(input: MemberInput, docId?: string) {
  const db = await getDb()!
  const { addDoc, collection, doc, setDoc } = await import('firebase/firestore')
  const data = clean(input)
  if (docId) {
    // Stable id so the Storage photo path can match `members/{docId}/...`.
    await setDoc(doc(db, 'members', docId), data)
  } else {
    await addDoc(collection(db, 'members'), data)
  }
}

export async function updateMember(id: string, input: MemberInput) {
  const db = await getDb()!
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, 'members', id), clean(input))
}

export async function deleteMember(id: string) {
  const db = await getDb()!
  const { deleteDoc, doc } = await import('firebase/firestore')
  await deleteDoc(doc(db, 'members', id))
}

/** Patches just the `order` field so drag-reorder is a single small write. */
export async function updateMemberOrder(id: string, order: number) {
  const db = await getDb()!
  const { doc, updateDoc } = await import('firebase/firestore')
  await updateDoc(doc(db, 'members', id), { order: Math.max(0, Math.trunc(order)) })
}

const MAX_PHOTO_BYTES = 4 * 1024 * 1024 // 4 MB pre-compression
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * Compress a member photo and return a base64 data URL. Stored directly in
 * the Firestore doc, so no Cloud Storage / Blaze plan required.
 */
export async function uploadMemberPhoto(file: File): Promise<string> {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    throw new Error('Photo must be JPG, PNG, WebP, or GIF.')
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error('Photo is too large (max 4 MB).')
  }
  const { imageFileToBase64 } = await import('./imageToBase64')
  // Member photos are tiny on the page; 512px is plenty.
  return await imageFileToBase64(file, { maxDim: 512, quality: 0.82 })
}

/* ---------------- Announcements (manual) ---------------- */

export type AnnouncementInput = {
  title: string
  body: string
  date: string // ISO yyyy-mm-dd or full ISO
  tag?: 'Funds' | 'Event' | 'Notice' | 'Update'
  important?: boolean
  link?: string
  image?: string
}

const ALLOWED_TAGS = ['Funds', 'Event', 'Notice', 'Update'] as const

/** Strip empty optional fields so `hasOnly([...])` in the rules passes. */
function cleanAnnouncement(input: AnnouncementInput) {
  const data: Record<string, unknown> = {
    title: input.title.trim(),
    body: input.body.trim(),
    date: input.date.trim(),
  }
  if (input.tag && (ALLOWED_TAGS as readonly string[]).includes(input.tag)) {
    data.tag = input.tag
  }
  if (input.important) data.important = true
  const link = safeHttpUrl(input.link)
  if (link) data.link = link
  const image = safeImageValue(input.image)
  if (image) data.image = image
  return data
}

export async function createAnnouncement(input: AnnouncementInput) {
  const db = await getDb()!
  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore')
  await addDoc(collection(db, 'announcements'), {
    ...cleanAnnouncement(input),
    createdAt: serverTimestamp(),
  })
}

export async function updateAnnouncement(id: string, input: AnnouncementInput) {
  const db = await getDb()!
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, 'announcements', id), cleanAnnouncement(input))
}

export async function deleteAnnouncement(id: string) {
  const db = await getDb()!
  const { deleteDoc, doc } = await import('firebase/firestore')
  await deleteDoc(doc(db, 'announcements', id))
}

const MAX_IMAGE_BYTES = 6 * 1024 * 1024 // 6 MB pre-compression
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * Compress an image File and return a base64 data URL suitable for storing
 * directly in a Firestore document. Validates type, then resizes to
 * max 1024px on the longest side and re-encodes as JPEG quality 0.82 — this
 * keeps the resulting base64 string well under Firestore's 1 MB / doc limit.
 */
export async function uploadAnnouncementImage(
  file: File
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Image must be JPG, PNG, WebP, or GIF.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large (max 6 MB).')
  }
  const { imageFileToBase64 } = await import('./imageToBase64')
  return await imageFileToBase64(file)
}

export type SummaryInput = {
  totalCollected: number
  remainingFunds?: number
  spent?: number
  totalMembers?: number
  contributors?: number
}

/** Push the live totals mirror to `summary/current`. */
export async function saveSummary(input: SummaryInput) {
  const db = await getDb()!
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
  const data: Record<string, unknown> = { totalCollected: Number(input.totalCollected) || 0 }
  for (const k of ['remainingFunds', 'spent', 'totalMembers', 'contributors'] as const) {
    if (input[k] != null && input[k] !== ('' as unknown)) data[k] = Number(input[k]) || 0
  }
  data.updatedAt = serverTimestamp()
  await setDoc(doc(db, 'summary', 'current'), data)
}

export function toInput(m: Member): MemberInput {
  return {
    name: m.name,
    section: m.section,
    role: m.role || 'Member',
    order: m.order,
    photoUrl: m.photoUrl,
    email: m.email,
    link: m.link,
  }
}

/* ---------------- Admin whitelist (owner only) ---------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function addAdmin(email: string, addedBy: string) {
  const key = email.trim().toLowerCase()
  if (!EMAIL_RE.test(key)) throw new Error('Enter a valid e-mail address.')
  const db = await getDb()!
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
  await setDoc(doc(db, 'admins', key), {
    email: key,
    addedBy: addedBy.trim().toLowerCase(),
    addedAt: serverTimestamp(),
  })
}

export async function removeAdmin(email: string) {
  const db = await getDb()!
  const { deleteDoc, doc } = await import('firebase/firestore')
  await deleteDoc(doc(db, 'admins', email.trim().toLowerCase()))
}
