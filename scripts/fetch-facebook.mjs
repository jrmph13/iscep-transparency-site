/**
 * Fills public/data/announcements.json for the Announcements section.
 *
 * Two ways, tried in this order:
 *
 *   1. Graph API  — set FB_PAGE_TOKEN (you must be a Page admin). Reliable.
 *   2. Best-effort public scrape — NO token. Tries to read the Page's public
 *      HTML (www / m / mbasic) and pull post text + image URLs.
 *      ⚠️  Facebook actively blocks this: most of the time it hits a login
 *      wall and returns nothing. When it works it is still partial (no
 *      reactions, truncated text, image links that expire). Treat it as a
 *      bonus, not a dependable feed. Enable with FB_SCRAPE=1.
 *
 * If both come back empty the existing announcements.json is kept, and the
 * site falls back to the hand-written list in src/data/site.ts.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src', 'data', 'announcements.json')

const PAGE_ID = process.env.FB_PAGE_ID || '107473958961394'
const TOKEN = process.env.FB_PAGE_TOKEN || ''
const LIMIT = Number(process.env.FB_POST_LIMIT || 8)
const API = process.env.FB_API_VERSION || 'v21.0'
const TRY_SCRAPE = process.env.FB_SCRAPE === '1' || process.env.FB_SCRAPE === 'true'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function firstLine(text) {
  const line = (text || '').split('\n').find((l) => l.trim()) || ''
  return line.length <= 80 ? line.trim() || 'Facebook post' : line.slice(0, 77).trim() + '…'
}

function classify(text) {
  const t = (text || '').toLowerCase()
  if (/fund|pondo|collect|₱|contribut|liquidat|expense|budget/.test(t)) return 'Funds'
  if (/event|seminar|webinar|activity|assembly|meeting/.test(t)) return 'Event'
  if (/reminder|please|deadline|paalala|notice/.test(t)) return 'Notice'
  return 'Update'
}

const decode = (s) =>
  (s || '')
    .replace(/\\u([\dA-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()

/* ------------------------------- 1. Graph API ------------------------------ */

async function viaGraph() {
  const url =
    `https://graph.facebook.com/${API}/${PAGE_ID}/posts` +
    `?fields=message,created_time,permalink_url,full_picture&limit=${LIMIT}` +
    `&access_token=${encodeURIComponent(TOKEN)}`
  const json = await (await fetch(url)).json()
  if (json.error) {
    console.warn(`[facebook] Graph API error: ${json.error.message} (code ${json.error.code}).`)
    return []
  }
  return (json.data || [])
    .filter((p) => p.message && p.message.trim())
    .map((p) => ({
      date: (p.created_time || '').slice(0, 10),
      title: firstLine(p.message),
      body: p.message.trim(),
      tag: classify(p.message),
      link: p.permalink_url || '',
      image: p.full_picture || undefined,
      source: 'facebook',
    }))
}

/* --------------------- 2. Best-effort public scrape ---------------------- */

function looksBlocked(html, finalUrl) {
  return (
    /login\.php|\/login\/\?|Log in to Facebook|You must log in|checkpoint/i.test(html) ||
    /login/i.test(finalUrl)
  )
}

function extractFromHtml(html) {
  const out = []
  const seen = new Set()

  // JSON fragments Facebook still ships in <script> tags
  const msgRe = /"message":\{"text":"((?:[^"\\]|\\.)*)"\}/g
  const imgRe = /"(https:\\\/\\\/scontent[^"]+?\.(?:jpg|jpeg|png|webp)[^"]*)"/g
  const permaRe = /"(https:\\\/\\\/www\.facebook\.com\\\/[^"]*?(?:posts|videos|photos)\\\/[^"]+?)"/g

  const images = [...html.matchAll(imgRe)].map((m) => decode(m[1]))
  const links = [...html.matchAll(permaRe)].map((m) => decode(m[1]))

  let i = 0
  for (const m of html.matchAll(msgRe)) {
    const body = decode(m[1])
    if (body.length < 8 || seen.has(body)) continue
    seen.add(body)
    out.push({
      date: new Date().toISOString().slice(0, 10),
      title: firstLine(body),
      body,
      tag: classify(body),
      link: links[i] || '',
      image: images[i] || undefined,
      source: 'scrape',
    })
    if (++i >= LIMIT) break
  }

  // mbasic fallback: plain <p> text inside article blocks
  if (out.length === 0) {
    for (const block of html.split(/<article/).slice(1, LIMIT + 1)) {
      const text = decode(
        (block.match(/<p>([\s\S]*?)<\/p>/g) || []).map((p) => p.replace(/<[^>]+>/g, ' ')).join('\n')
      )
      const img = (block.match(/<img[^>]+src="([^"]+)"/) || [])[1]
      if (text && text.length > 8) {
        out.push({
          date: new Date().toISOString().slice(0, 10),
          title: firstLine(text),
          body: text,
          tag: classify(text),
          link: '',
          image: img ? decode(img) : undefined,
          source: 'scrape',
        })
      }
    }
  }
  return out
}

async function viaScrape() {
  const targets = [
    `https://www.facebook.com/${PAGE_ID}`,
    `https://m.facebook.com/${PAGE_ID}`,
    `https://mbasic.facebook.com/${PAGE_ID}`,
  ]
  for (const url of targets) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
        redirect: 'follow',
      })
      const html = await res.text()
      if (looksBlocked(html, res.url)) {
        console.warn(`[facebook] ${url} → login wall / blocked.`)
        continue
      }
      const items = extractFromHtml(html)
      if (items.length) {
        console.log(`[facebook] scraped ${items.length} post(s) from ${url} (partial data).`)
        return items
      }
      console.warn(`[facebook] ${url} → no posts found in HTML.`)
    } catch (e) {
      console.warn(`[facebook] ${url} → ${e.message}`)
    }
  }
  return []
}

/* --------------------------------- main --------------------------------- */

async function main() {
  let items = []
  let mode = 'none'

  if (TOKEN) {
    items = await viaGraph()
    mode = 'graph'
  } else if (TRY_SCRAPE) {
    console.log('[facebook] no token — attempting best-effort public scrape (unreliable).')
    items = await viaScrape()
    mode = 'scrape'
  } else {
    console.log('[facebook] no FB_PAGE_TOKEN and FB_SCRAPE not set — keeping existing announcements.')
    return
  }

  items = items.filter((x) => x.body && x.body.trim()).slice(0, LIMIT)
  if (items.length === 0) {
    console.warn(`[facebook] ${mode}: nothing usable — keeping existing announcements.json.`)
    return
  }

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(
    OUT,
    JSON.stringify({ fetchedAt: new Date().toISOString(), pageId: PAGE_ID, mode, items }, null, 2) +
      '\n',
    'utf8'
  )
  console.log(`[facebook] wrote ${items.length} post(s) via ${mode}.`)
}

main().catch(async (err) => {
  console.warn(`[facebook] failed: ${err.message}. Keeping existing announcements.`)
  try {
    await readFile(OUT)
  } catch {
    /* no file yet — site falls back to src/data/site.ts */
  }
  process.exit(0)
})
