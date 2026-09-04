# ISCEP Transparency Portal — Admin Dashboard

Full reference for the admin console: how to reach it, how sign-in works, what
each panel does, the Firestore data it writes, the security model, first-time
setup, and troubleshooting.

---

## 1. How to open it

The dashboard is a hidden client route — **not linked anywhere** on the site.

```
https://<your-site>/#/iscep/org/admin/user/admin/login/gn8febivdfds
```

or, as a plain path (converted to the hash form by `public/404.html` on GitHub
Pages, or the SPA rewrite in `vercel.json`):

```
https://<your-site>/iscep/org/admin/user/admin/login/gn8febivdfds
```

The path string is `ADMIN_PATH` in [`src/lib/router.ts`](src/lib/router.ts).

> ⚠️ The secret URL is **only a soft gate** ("security by obscurity"). The real
> protection is Firebase Auth + the `admins/{email}` check in
> [`firestore.rules`](firestore.rules). Even if someone finds the URL, every
> write still fails unless they are signed in as a whitelisted admin.

The anti-inspection deterrent (`clientHardening.ts`) is **disabled on this
route** so admins can use DevTools.

---

## 2. Sign-in flow

Implemented in [`src/lib/useAdmin.ts`](src/lib/useAdmin.ts) (`useAdmin` hook).

1. **Continue with Google** → `signInWithPopup(auth, new GoogleAuthProvider())`.
2. On success the hook resolves one of these states:

| State      | Meaning                                                        | UI shown                     |
|------------|---------------------------------------------------------------|------------------------------|
| `init`     | still checking the existing session                           | "Loading…"                   |
| `anon`     | signed out                                                   | Google sign-in card          |
| `checking` | signed in, verifying the whitelist                            | "Verifying admin access…"    |
| `ready`    | signed-in **admin** — full dashboard                          | the 3–4 panels               |
| `denied`   | signed in, e-mail **not** on the whitelist                    | "Not an admin" card          |
| `error`    | Firebase not configured / auth SDK failed to load             | disabled sign-in card        |

### Who counts as an admin

- **Owner** — the hard-coded e-mail `OWNER_EMAIL` in `useAdmin.ts`
  (`jhamesediting@gmail.com`). Always an admin. Also hard-coded as
  `ownerEmail()` in `firestore.rules` — **keep the two in sync**.
- **Everyone else** — must have a document at `admins/{their-lowercased-email}`
  **and** a verified e-mail (`email_verified == true`).

The client check is advisory only; `firestore.rules` re-checks on every write and
fails closed.

---

## 3. Panels

Shown only when `status === 'ready'`. Source:
[`src/components/admin/AdminDashboard.tsx`](src/components/admin/AdminDashboard.tsx).
All writes go through [`src/lib/adminWrites.ts`](src/lib/adminWrites.ts)
(client-side cleaning + validation) and are then re-validated by
`firestore.rules` (server-side). **Both must pass.**

### 3.1 Members / organization  → Firestore `members/{autoId}`

CRUD for the public roster. Realtime — changes appear on the public **Members**
section immediately (`useMembers` `onSnapshot`).

| Field      | Type / limit                                   | Notes |
|------------|------------------------------------------------|-------|
| `name`     | string, 1–80                                   | required |
| `section`  | string, 1–16                                   | required, upper-cased on the public site |
| `role`     | one of `ROLES` ([`src/lib/roles.ts`](src/lib/roles.ts)) | optional; omitted when "Member" |
| `order`    | int ≥ 0                                         | optional; sort position within a section |
| `photoUrl` | `data:image/(png\|jpeg\|webp\|gif);base64,…` or `https://…`, ≤ 1 000 000 chars | optional; SVG rejected |
| `email`    | string ≤ 120, must match a basic e-mail regex  | optional |
| `link`     | **http/https URL only**, ≤ 400 chars           | optional (FB / IG / portfolio) |

- **Photos** are compressed in-browser before upload
  (`uploadMemberPhoto` → `imageFileToBase64`, max **512 px**, JPEG q0.82). Source
  file limit **4 MB**; the resulting base64 must be < ~900 KB (Firestore's 1 MB
  document ceiling). Stored **inside the document** — no Cloud Storage / Blaze
  plan needed.
- **Reordering**: drag a row, or use the ↑ / ↓ buttons. `persistReorder()`
  renumbers every member in the section to exactly `0..n-1` via
  `updateMemberOrder` (one small `order`-only write per changed row).
- **Live preview** (`<details>` at the bottom) mirrors the public Members
  section exactly, including the officer hierarchy sort.

### 3.2 Announcements  → Firestore `announcements/{autoId}`

Manual posts that appear **above** the Facebook feed on the public
**Announcements** section (`useAnnouncements` `onSnapshot`, ordered by `date`
desc).

| Field       | Type / limit                                    | Notes |
|-------------|-------------------------------------------------|-------|
| `title`     | string 1–120                                     | required |
| `body`      | string 1–4000                                    | required; rendered as plain text (React-escaped), newlines preserved |
| `date`      | string ≤ 32 (`yyyy-mm-dd` from the date picker)  | required |
| `tag`       | `Funds` \| `Event` \| `Notice` \| `Update`       | optional |
| `important` | bool                                             | optional; "Pin to top" |
| `link`      | **http/https URL only**, ≤ 400                   | optional ("See on Facebook" button) |
| `image`     | raster `data:` URL or `https://…`, ≤ 1 000 000   | optional; compressed to max **1024 px** JPEG q0.82, source ≤ 6 MB |
| `createdAt` | `serverTimestamp()`                              | set automatically on create |

### 3.3 Live totals (optional)  → Firestore `summary/current`

Pushes aggregate numbers for realtime dashboard updates **between** the 30-minute
sheet syncs. **No personal data.** `saveSummary()` writes:

| Field            | Rule                          |
|------------------|-------------------------------|
| `totalCollected` | number (required)             |
| `remainingFunds` | number (optional)             |
| `spent`          | number (optional)             |
| `totalMembers`   | number ≥ 0 (optional)         |
| `contributors`   | number ≥ 0 (optional)         |
| `updatedAt`      | `serverTimestamp()` → timestamp |

Only fields in that exact set are accepted (`hasOnly` in the rules).

> Note: by default the public dashboard renders from the bundled aggregates
> (`src/data/fallback.json`) and does **not** read `summary/current` on load.
> The Firestore mirror is written here for future/optional realtime use.

### 3.4 Dashboard access  → Firestore `admins/{email}`  *(owner only)*

Visible **only to the owner**. Manage the whitelist of Google accounts that can
open the dashboard.

- **Add admin** — enter an e-mail → creates `admins/{lowercased-email}` with
  `{ email, addedBy, addedAt }`.
- **Remove** — deletes that document.
- The **owner row is permanent** — it can never be created, updated, or deleted
  by any client (`firestore.rules` `admins` block; `adminEmail != ownerEmail()`).

---

## 4. Firestore security model

From [`firestore.rules`](firestore.rules):

| Collection      | Read           | Write |
|-----------------|----------------|-------|
| `members`       | public         | `isAdmin()` + field validation |
| `announcements` | public         | `isAdmin()` + field validation |
| `summary`       | public         | `isAdmin()` + numeric-field validation |
| `admins`        | owner (list); a signed-in user may `get` **their own** row | owner only; owner row immutable |
| everything else | denied         | denied |

Helper functions: `isOwner()` (verified e-mail == `ownerEmail()`),
`isAdmin()` (`isOwner()` or `exists(/admins/{authEmail})`),
`isHttpUrl()` (http/https only), `isImageValue()` (raster `data:` or https, no
SVG), `isCount()` (number ≥ 0).

**Deploy rules after any change:**

```bash
firebase deploy --only firestore:rules
```

---

## 5. First-time setup

1. **Firebase project** — the app is wired to project `iscep-department`
   ([`src/lib/firebase.ts`](src/lib/firebase.ts)). Web config values are baked in
   and can be overridden with `VITE_FIREBASE_*` env vars.
2. **Enable Google sign-in**
   Firebase Console ▸ Authentication ▸ Sign-in method ▸ **Google** ▸ Enable.
3. **Authorized domains**
   Firebase Console ▸ Authentication ▸ Settings ▸ Authorized domains ▸ add the
   deploy host, e.g. `jrmph13.github.io` (and `localhost` is there by default for
   `npm run dev`). Add your custom domain too if you have one.
4. **Deploy the Firestore rules** (section 4).
5. **Owner signs in** at the admin URL with `jhamesediting@gmail.com`.
6. Owner opens **Dashboard access** and adds any other admins by e-mail.

To change the owner: edit `OWNER_EMAIL` in `src/lib/useAdmin.ts` **and**
`ownerEmail()` in `firestore.rules`, rebuild, and redeploy the rules.
(Recommended future hardening: switch the rule to `request.auth.uid == '<uid>'`.)

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "Not an admin" after sign-in | Your e-mail isn't whitelisted. Ask the owner to add it in **Dashboard access**. E-mail must be verified. |
| `permission-denied` / "Write denied by Firestore rules" | Rules not deployed, or you added photos/links/announcements before deploying the latest rules → `firebase deploy --only firestore:rules`. |
| `auth/unauthorized-domain` | Add the site's domain under Firebase ▸ Authentication ▸ Settings ▸ Authorized domains. |
| Popup closes immediately / blocked | Allow popups for the site; the hook ignores `popup-closed-by-user` silently. |
| "That document is too big for Firestore (1 MB max)" | Use a smaller image; member photos compress to 512 px, announcements to 1024 px, but very detailed images can still exceed ~900 KB base64. |
| "Session expired — sign out and back in" | `unauthenticated` from Firestore; token expired. |
| Dashboard shows "Firebase is not configured." | `VITE_FIREBASE_*` missing at build time and the built-in fallback was stripped — set the env vars / repo Variables. |
| Changes don't appear on the public site | `members` / `announcements` are realtime; hard-refresh. The number tiles come from `fallback.json` (rebuilt every 30 min), not Firestore. |

---

## 7. File map

| Concern | File |
|---|---|
| Route + secret path | `src/lib/router.ts` (`ADMIN_PATH`) |
| Auth + whitelist check | `src/lib/useAdmin.ts` |
| Dashboard UI + panels | `src/components/admin/AdminDashboard.tsx` |
| All write helpers + validation | `src/lib/adminWrites.ts` |
| Image compression | `src/lib/imageToBase64.ts` |
| Realtime reads | `src/lib/useMembers.ts`, `src/lib/useAnnouncements.ts` |
| Server-side rules | `firestore.rules` |
| Role list (keep in sync with rules) | `src/lib/roles.ts` |
