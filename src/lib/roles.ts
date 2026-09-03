/**
 * ISCEP organization roles — the single source of truth for the app side.
 * Order here is the hierarchy used to sort the Officers list.
 *
 * IMPORTANT: `firestore.rules` has a copy of this list in its `members.role`
 * whitelist — keep the two in sync when you edit this.
 */
export const ROLES = [
  'President',
  'Vice President - Internal',
  'Vice President - External',
  'Secretary',
  'Treasurer',
  'Auditor',
  'P.R.O. - Internal',
  'P.R.O. - External',
  'Pubmat Head',
  'Committee Head',
  'Committee Member',
  '1st Year Representative',
  '2nd Year Representative',
  '3rd Year Representative',
  '4th Year Representative',
  'Officer',
  'Member',
] as const

export type Role = (typeof ROLES)[number]

/** Everyone except a plain member is shown as an officer. */
export function isOfficer(role: string | undefined): boolean {
  return !!role && role !== 'Member'
}

/** Hierarchy index for sorting; unknown/blank roles sort last. */
export function roleRank(role: string | undefined): number {
  const i = ROLES.indexOf((role || '') as Role)
  return i === -1 ? ROLES.length : i
}
