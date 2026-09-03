# ISCEP Fund Transparency Board

A **read-only** board showing ISCEP collections, the remaining balance,
per-section breakdown, what the funds were spent on, and Facebook updates.
React + TypeScript + Vite + Tailwind. Light theme with a dark toggle.

## How data flows

**The spreadsheet stays private.** Two paths feed the site:

1. **Live — Apps Script (recommended).** A Web App bound to the receipt sheet
   ([`apps-script/Code.gs`](apps-script/Code.gs)) answers:
   - `?route=summary` → aggregates only (totals, per section, per cashier,
     status counts, anonymised recent activity, and the *Budget and Funds
     Records* spend list). **No names, no student numbers.**
   - `?route=record&sid=<student no.>` → that one student's record, for the
     "check your own record" page.
   Paste the deployed `…/exec` URL into `APPS_SCRIPT_URL` in
   [`src/data/site.ts`](src/data/site.ts). Sheet can be fully private
   (`Execute as: Me`).

2. **Fallback — committed aggregates.** [`scripts/fetch-sheet.mjs`](scripts/fetch-sheet.mjs)
   writes de-identified `public/data/summary.json` / `funds.json` / `meta.json`
   (never a per-student file). Used when `APPS_SCRIPT_URL` is blank or the Web
   App is unreachable. It needs the sheet id — kept **out of the repo**:
   - **CI:** repo secret `SHEET_ID`
   - **Local:** `sheet.config.json` (gitignored): `{ "SHEET_ID": "…", "SHEET_FUNDS_GID": "…" }`

Nothing links to or exposes the spreadsheet URL, and no e-mail or per-student
JSON is ever shipped.

## Apps Script setup

[`apps-script/Code.gs`](apps-script/Code.gs) is the **full** script — your
existing `doPost` / `sendReceiptEmail` plus the read-only `doGet` the site uses.

1. Open the receipt spreadsheet → **Extensions ▸ Apps Script**.
2. Replace the file contents with `apps-script/Code.gs`.
3. **Set a shared key.** Change `TX_API_KEY` at the top of `Code.gs` to a random
   string, and put the **same** value in `APPS_SCRIPT_KEY` in `src/data/site.ts`.
4. **Deploy ▸ New deployment ▸ type "Web app"**
   — *Execute as:* **Me** — *Who has access:* **Anyone** (exactly "Anyone").
   Authorise if prompted (Advanced ▸ Go to project ▸ Allow).
5. Copy the `…/exec` URL into `APPS_SCRIPT_URL` in `src/data/site.ts`; commit; push.
6. Verify in incognito: `<URL>?route=summary&key=<your key>` must return JSON.
7. If tab names differ, edit `TX_RECORDS_SHEET` / `TX_FUNDS_SHEET` /
   `TX_BUDGET_SHEET` at the top of `Code.gs`.

Re-deploy with **"New version"** whenever you change the script.

## Members roster (realtime, optional)

The **Members** section is a live ISCEP roster backed by Firestore. It only
appears when the `VITE_FIREBASE_*` vars are set (see `.env.example`); otherwise
it and its nav link are hidden.

Only **name / section / optional role** are stored — no ID numbers, no e-mail,
no payment data. [`firestore.rules`](firestore.rules) enforces this: `members`
is publicly readable, writes are admin-only and field-validated.

Setup:

1. Firebase console → create/pick a project → **Firestore Database** (Native mode).
2. Project settings → Your apps → Web → copy the SDK config into `.env`
   (`VITE_FIREBASE_API_KEY`, `_PROJECT_ID`, `_APP_ID`, …) and into your host's
   env vars.
3. Deploy the rules:
   ```bash
   npm i -g firebase-tools && firebase login
   firebase use <project-id>
   firebase deploy --only firestore:rules
   ```
4. Add members — either from the console (collection `members`, docs like
   `{ name: "Juan Dela Cruz", section: "2A", role: "Treasurer", order: 1 }`,
   `role` / `order` optional) or from the admin dashboard below.
   The site updates in realtime as you add/edit/remove them.

Realtime note: the roster streams over a Firestore connection you can see in the
Network tab — member names are visible there because the roster is meant to be
public. Don't enable this if the org doesn't want names listed.

## Admin dashboard

A hidden console for editing the roster, the live totals mirror, and the admin
whitelist. Obscure URL (soft gate only — real protection is Firebase Auth + the
rules):

```
<site>/#/iscep/org/admin/user/admin/login/gn8febivdfds
```

- Sign-in is **Google popup**. Enable **Authentication → Google** in the Firebase
  console, and add the site's domain under **Authentication → Settings →
  Authorized domains**.
- The **super owner** (`jhamesediting@gmail.com`, hard-coded in
  [`firestore.rules`](firestore.rules) and `src/lib/useAdmin.ts`) always has
  access and is the only account that can edit the whitelist. Change the address
  in both files to hand the project to someone else.
- Everyone else must be added by the owner: dashboard → **Dashboard access** →
  enter their Gmail. That writes `admins/<email>`; the rules only let the owner
  create/delete those, and the owner's own row can never be created or removed.
- Non-owner admins can edit `members` and `summary` but not the whitelist.
- The Firestore auth iframe needs the extra `connect-src` / `frame-src` entries
  already in [`vercel.json`](vercel.json), plus
  `Cross-Origin-Opener-Policy: same-origin-allow-popups` for the sign-in popup.
  (GitHub Pages sends no such headers, so it just works there.)

## Security notes

### The record lookup has two back-ends

1. **Apps Script (preferred).** The sheet stays private; only the script
   (`Execute as: Me`) reads it and returns exactly one row. A shared `key` and a
   global rate limit (`TX_RECORD_CAP_PER_MIN`) apply. Use this whenever you can
   deploy the web app as **"Anyone"**.

2. **Public-CSV fallback (`src/lib/sheetLookup.ts`).** When the Apps Script isn't
   reachable, the browser queries the sheet's own `gviz` endpoint with a
   server-side filter (`select … where B = '<sid>'`) so **only the matching row
   crosses the wire** — never the whole sheet — and the e-mail column is never
   requested. This requires `LOOKUP_SHEET_ID` in `src/data/site.ts`, which means:
   - the sheet id becomes visible in the site JS;
   - the sheet must stay **"Anyone with the link can view"** (not "published to
     the web"), and must contain **nothing you wouldn't give any student who
     asks** (no home addresses, no full birthdates, etc.);
   - a determined visitor **can** change the filter and pull other rows. The
     filter only removes casual, one-click scraping. If that is not acceptable,
     you must get back-end #1 working (or move records to a private store).

### Friction on the lookup UI (`src/lib/lookupGuard.ts`)

- **Honeypot field** — a hidden input; any submission that fills it is dropped.
- **Throttle** — min gap between lookups, plus a per-tab count that triggers a
  cooldown. Slows enumeration through the form.
- These are **not** a security boundary (a script can call the endpoint
  directly); they cut noise, nothing more.

### Other hardening

- `dist/data/*.json` is **aggregates only** — no per-student rows are committed.
- **Strict CSP** (meta for GitHub Pages, headers in `vercel.json`).
- HSTS, COOP, CORP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
  in `vercel.json`; JS frame-buster for GitHub Pages.
- Minified build, **no source maps**, no `.tsx` shipped.
- `robots.txt` disallows `/data/`, `/assets/`, `/payments/`.

### What is **not** possible (don't ask for these)

- **"Un-scrapeable" public data** — anything the browser renders or fetches, a
  script can read. The Network tab always shows the real request.
- **Client-side encryption** of the request or response — the key ships in the
  same JS, so it protects nothing.
- **Blocking DevTools / right-click** — bypassed in seconds, only hurts real
  users. Intentionally not done.
- **Real-time push** — there is no server. The record view re-pulls when the tab
  regains focus and on a manual *Refresh*, bounded by the throttle. That is the
  ceiling for a static site + sheet.

## Local development

```bash
npm install
npm run dev      # scrapes the sheet, then starts Vite on http://localhost:5173
npm run sync     # re-scrape only
npm run build    # scrape + typecheck + build into dist/
```

## Editing the written content

Everything a person needs to update lives in
[`src/data/site.ts`](src/data/site.ts):

- `ANNOUNCEMENTS` — **fallback** posts, shown only when the Facebook auto-sync
  below is not configured. Newest first; put the permalink in `link`.
- `OFFICERS` — the people accountable for the funds.
- `ORG` — org name, Facebook URL / page id, contact email.

Commit and push; the site redeploys automatically.

## Announcements

Announcements render as **cards on the site itself** — full post text + photo,
no redirect. To post an update:

1. Save the Facebook post's photo into [`public/announcements/`](public/announcements/).
2. Add an entry to `ANNOUNCEMENTS` in [`src/data/site.ts`](src/data/site.ts):
   `date`, `title`, `body` (paste the caption), `image: "announcements/your.jpg"`,
   and optionally `link` (the post URL, shown as a small "See on Facebook").
3. Commit & push.

Other ways to fill the same cards, in order of reliability:

- **Graph API (optional, needs a Page token).** Auto-fills
  `public/data/announcements.json` on every deploy — see below. Used instead of
  the hand-written list when it has items.
- **Live Facebook embed.** Set `FEATURES.facebookEmbed = true` in `site.ts` to
  also show the official Page Plugin iframe beside the cards. It needs no token
  but clicking a post leaves the site.
- **Token-free scrape (`FB_SCRAPE=1`).** Facebook returns HTTP 400 to server
  requests, so this almost always yields nothing. Not dependable.

### Graph API setup

You must be an admin of the Page. Facebook **cannot be scraped** server-side
(login wall, JS, bot-blocking) — the Graph API with a Page access token is the
only reliable structured source.

[`scripts/fetch-facebook.mjs`](scripts/fetch-facebook.mjs) calls the Graph API
during every build/sync and writes `public/data/announcements.json`. With **no
token set it does nothing** and the fallback list in `site.ts` is used.

To turn it on:

1. Make sure `https://www.facebook.com/100090751490057` is a **Page**, not a
   personal profile (profiles have no readable feed API).
2. [developers.facebook.com](https://developers.facebook.com) → create an App
   (type *Business*).
3. **Graph API Explorer** → pick your App → *Get Page Access Token* → grant
   `pages_read_engagement` (and `pages_read_user_content`).
4. Exchange the short-lived token for a long-lived one:
   ```
   GET https://graph.facebook.com/v21.0/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id=<APP_ID>&client_secret=<APP_SECRET>
     &fb_exchange_token=<SHORT_LIVED_TOKEN>
   ```
   then call `GET /me/accounts` with it to get the **never-expiring Page token**.
5. GitHub repo → **Settings → Secrets and variables → Actions**:
   - Secret `FB_PAGE_TOKEN` = that Page token
   - (optional) Variable `FB_PAGE_ID` if the page id changes

The 30-minute deploy workflow then refreshes the announcements automatically.
Locally: `FB_PAGE_TOKEN=xxxx npm run sync`.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
   builds and deploys on every push and every 30 minutes.

Because `vite.config.ts` uses `base: './'`, the same build also works from the
domain root on Vercel or any static host (`npm run build`, serve `dist/`).

## Notes

- The site has no login and cannot write anything.
- With the Apps Script live, figures are current on each page load. On the
  committed fallback they can be up to ~30 min behind.
- `public/data/*.json` holds **aggregates only** — safe to commit. There is no
  per-student file anywhere in the build.
