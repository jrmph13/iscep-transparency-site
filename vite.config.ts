import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscator from 'vite-plugin-javascript-obfuscator'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// Content-Security-Policy for the built site (GitHub Pages can't set headers,
// so it goes in a <meta>). Only applied on `vite build` — dev needs a looser
// policy for HMR, so it is left alone there.
// Keep in sync with the header version in vercel.json. `frame-ancestors` is
// omitted here because browsers ignore it in a <meta> tag (the frame-buster in
// public/z9.js covers clickjacking on GitHub Pages).
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' https://apis.google.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https://*.fbcdn.net https://*.xx.fbcdn.net https://*.googleusercontent.com",
  "connect-src 'self' https://docs.google.com https://script.google.com https://script.googleusercontent.com https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://iscep-department.firebaseapp.com https://challenges.cloudflare.com",
  'frame-src https://www.facebook.com https://web.facebook.com https://staticxx.facebook.com https://iscep-department.firebaseapp.com https://accounts.google.com https://apis.google.com https://challenges.cloudflare.com',
  'upgrade-insecure-requests',
].join('; ')

// Source modules treated as "sensitive" — the admin surface plus the
// anti-abuse / lookup / endpoint client code. They are (a) folded out of the
// readable main bundle into isolated chunks (`admin`, `core`) so the deploy
// has fewer readable entry points, and (b) run through the obfuscator below.
// Still NOT a security boundary — client JS is always inspectable — this only
// raises the bar above "read the pretty-printed source".
//
// `paths` are substrings of a rollup module id (used by manualChunks).
// `match` are RegExps tested against the absolute module id at transform time
// (used by the obfuscator plugin — it matches on the id via anymatch, and a
// bare string there would need to be byte-for-byte equal, which is brittle
// across platforms; a RegExp substring test is reliable).
const SENSITIVE_ADMIN = ['src/components/admin', 'src/lib/adminWrites', 'src/lib/useAdmin']
const SENSITIVE_CORE = [
  'src/lib/api',
  'src/lib/sheetLookup',
  'src/lib/lookupGuard',
  'src/lib/backendGuard',
  'src/lib/deterrence',
]
const SENSITIVE = {
  paths: [...SENSITIVE_ADMIN, ...SENSITIVE_CORE],
  match: [...SENSITIVE_ADMIN, ...SENSITIVE_CORE].map(
    (p) => new RegExp(p.replace(/\//g, '[\\\\/]') + '(?:[\\\\/]|\\.[cm]?[jt]sx?)')
  ),
}

function cspOnBuild(): Plugin {
  return {
    name: 'csp-meta-on-build',
    apply: 'build',
    transformIndexHtml(html) {
      return html
        .replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`
        )
        // Strip HTML comments from the shipped index.html.
        .replace(/<!--[\s\S]*?-->/g, '')
        // Collapse the blank lines the strip leaves behind.
        .replace(/\n\s*\n\s*\n/g, '\n')
    },
  }
}

/**
 * Rename every CSS class in the built bundle to an opaque hash, so the shipped
 * markup reads `class="a8f3k2b c1x9"` instead of legible Tailwind utilities.
 *
 * NOT a security boundary — the DOM a browser renders is always inspectable —
 * this only removes the class names as a source of information/convenience.
 *
 * Runs last (`closeBundle`), fully in memory, and only commits once every
 * rewrite has succeeded — any failure leaves `dist/` byte-for-byte untouched.
 * Disable with NO_CLASS_OBF=1 if a build ever needs the plain classes back.
 *
 * Scope guards, in order of importance:
 *   • Only "complex" tokens are renamed — a class must contain a digit or one
 *     of - : / [ ] . % ! before it is eligible. Bare words (`block`, `grid`,
 *     `card`, `label`…) are left alone: they collide with ordinary strings,
 *     ARIA values and prose, and they are not what makes the markup noisy.
 *   • `classIgnore` keeps the structural/theme markers literal on BOTH sides
 *     (CSS + JS) so nothing that toggles them at runtime can drift.
 *   • In JS/HTML a token is only swapped when it is delimited by whitespace or
 *     a quote/backtick on both sides — i.e. it sits inside a string literal as
 *     its own word, exactly how a className list is written.
 */
function obfuscateClasses(): Plugin {
  const KEEP = ['dark', 'light', 'group', 'peer', 'rtl', 'ltr', 'sr-only', 'not-sr-only']
  const COMPLEX = /[0-9:/[\].%!-]/
  const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return {
    name: 'obfuscate-classes',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      if (process.env.NO_CLASS_OBF === '1') return
      if (process.env.VERCEL) return

      const distDir = path.resolve(process.cwd(), 'dist')
      if (!fs.existsSync(distDir)) return

      const walk = (dir: string, out: string[] = []): string[] => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name)
          if (e.isDirectory()) walk(p, out)
          else out.push(p)
        }
        return out
      }

      try {
        const pcMod = require('postcss')
        const postcss = (pcMod.default ?? pcMod) as (
          plugins: unknown[]
        ) => { process: (css: string, o: unknown) => Promise<{ css: string }> }
        const obfPlugin = require('postcss-obfuscator') as (o: unknown) => unknown

        const cacheDir = path.resolve(process.cwd(), 'node_modules/.cache/clsobf')
        fs.rmSync(cacheDir, { recursive: true, force: true })
        const emptyDir = path.join(cacheDir, 'empty')
        const mapDir = path.join(cacheDir, 'map')
        fs.mkdirSync(emptyDir, { recursive: true })

        const files = walk(distDir)
        const cssFiles = files.filter((f) => f.endsWith('.css'))
        const jsFiles = files.filter((f) => f.endsWith('.js'))
        if (!cssFiles.length) return

        // 1. Hash classes in each stylesheet (in memory). `srcPath` points at an
        //    empty dir so the plugin's own file-copy/replace pass counts zero
        //    CSS files and never fires — we only want its walker + JSON map.
        const nextCss = new Map<string, string>()
        const origLog = console.log
        const origInfo = console.info
        const origWarn = console.warn
        console.log = console.info = console.warn = () => {}
        try {
          for (const f of cssFiles) {
            const res = await postcss([
              obfPlugin({
                enable: true,
                classMethod: 'random',
                length: 8,
                classIgnore: KEEP,
                ids: false,
                keepData: true,
                fresh: false,
                jsonsPath: mapDir.replace(/\\/g, '/'),
                srcPath: emptyDir.replace(/\\/g, '/'),
                desPath: emptyDir.replace(/\\/g, '/'),
              }),
            ]).process(fs.readFileSync(f, 'utf8'), { from: f, to: f })
            nextCss.set(f, res.css)
          }
        } finally {
          console.log = origLog
          console.info = origInfo
          console.warn = origWarn
        }

        // 2. Load the merged { ".orig": ".hashed" } map, keep only complex,
        //    non-ignored tokens.
        const rawMap: Record<string, string> = JSON.parse(
          fs.readFileSync(path.join(mapDir, 'main.json'), 'utf8')
        )
        const plain = (s: string) => s.replace(/^\./, '').replace(/\\/g, '')
        const pairs = Object.entries(rawMap)
          .map(([k, v]) => [plain(k), plain(v)] as [string, string])
          .filter(([k]) => COMPLEX.test(k) && !KEEP.includes(k))
        if (!pairs.length) {
          console.warn('[obfuscate-classes] no eligible classes — skipped')
          return
        }

        // 3. One alternation regex, longest key first so `bg-x/20` wins over
        //    `bg-x`. A token is swapped only inside a string-literal word.
        pairs.sort((a, b) => b[0].length - a[0].length)
        const lookup = new Map(pairs)
        const re = new RegExp(
          `([\\s"'\\\`])(${pairs.map(([k]) => reEsc(k)).join('|')})(?=[\\s"'\\\`])`,
          'g'
        )
        const nextJs = new Map<string, string>()
        for (const f of jsFiles) {
          const src = fs.readFileSync(f, 'utf8')
          const out = src.replace(re, (_m, d: string, tok: string) => d + (lookup.get(tok) ?? tok))
          if (out !== src) nextJs.set(f, out)
        }

        // 4. Commit — CSS first, then JS. Nothing above wrote to disk.
        for (const [f, css] of nextCss) fs.writeFileSync(f, css)
        for (const [f, js] of nextJs) fs.writeFileSync(f, js)
        fs.rmSync(cacheDir, { recursive: true, force: true })
        console.log(
          `[obfuscate-classes] renamed ${pairs.length} classes across ` +
            `${nextCss.size} css + ${nextJs.size} js files`
        )
      } catch (err) {
        console.warn(
          '[obfuscate-classes] skipped (dist left unchanged): ' +
            (err instanceof Error ? err.message : String(err))
        )
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/' : './',
  build: {
    // No source maps in production — nothing to un-minify the bundle with.
    sourcemap: false,
    // esbuild minifier is faster AND lets us strip console/debugger call sites
    // at compile time (drop / pure). Keep errors so genuine runtime issues are
    // still visible in the console.
    minify: 'esbuild',
    // Fold small chunks together so there are fewer readable entry points.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Opaque output names — no `AdminDashboard`, `clientHardening`,
        // `index`, `Logo1`, `inter-latin`… in the deploy. Just hashes.
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash][extname]',
        // Fold the sensitive modules (see SENSITIVE above) out of the readable
        // main bundle: admin-only code into `admin`, the shared anti-abuse /
        // lookup / endpoint code into `core`. Both chunks are obfuscated below.
        manualChunks(id) {
          const norm = id.replace(/\\/g, '/')
          if (!SENSITIVE.paths.some((m) => norm.includes(m))) return
          return SENSITIVE_ADMIN.some((m) => norm.includes(m)) ? 'admin' : 'core'
        },
      },
    },
  },
  esbuild: {
    // Strip `debugger` statements in prod. (No `debugger` trap any more — see
    // src/lib/deterrence.ts for the non-blocking Tier B approach.)
    drop: mode === 'production' ? ['debugger'] : [],
    // Pure-mark noisy console calls so esbuild removes them entirely. Keep
    // `console.error` so genuine failures are still surfaced.
    pure:
      mode === 'production'
        ? ['console.log', 'console.info', 'console.debug', 'console.warn']
        : [],
    legalComments: 'none',
  },
  plugins: [
    react(),
    cspOnBuild(),
    // Obfuscate the sensitive modules (admin + the anti-abuse / lookup /
    // endpoint code — see SENSITIVE above). NOT a security boundary (it's
    // still client-side JS), just raises the bar above "read the
    // pretty-printed source".
    mode === 'production' &&
      obfuscator({
        // RegExps tested against each module's id at transform time.
        include: SENSITIVE.match,
        apply: 'build',
        options: {
          compact: true,
          identifierNamesGenerator: 'hexadecimal',
          stringArray: true,
          stringArrayEncoding: ['base64'],
          stringArrayThreshold: 0.75,
          // Keep off — big perf/size cost for little real benefit:
          selfDefending: false,
          debugProtection: false,
          deadCodeInjection: false,
          controlFlowFlattening: false,
        },
      }),
    // Last: rename every CSS class in dist/ to an opaque hash (CSS + JS).
    // Runs only for a production build; NO_CLASS_OBF=1 turns it off.
    mode === 'production' && obfuscateClasses(),
  ].filter(Boolean),
}))
