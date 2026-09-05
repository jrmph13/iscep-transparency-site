import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscator from 'vite-plugin-javascript-obfuscator'

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

export default defineConfig(({ mode }) => ({
  base: './',
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
        // Isolate admin-only code into its own chunk so obfuscation (below)
        // can target just that chunk instead of bloating the public bundle.
        manualChunks(id) {
          if (
            id.includes('src/components/admin') ||
            id.includes('src/lib/adminWrites') ||
            id.includes('src/lib/useAdmin')
          ) {
            return 'admin'
          }
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
    // Obfuscate only the admin chunk (see manualChunks above) — hitting the
    // sensitive code hardest without bloating/slowing the public bundle.
    // NOT a security boundary (it's still client-side JS), just raises the
    // bar above "read the pretty-printed source".
    mode === 'production' &&
      obfuscator({
        // Matched against each module's absolute source path pre-bundle —
        // keep these in sync with the manualChunks admin matcher above.
        include: [
          'src/components/admin/**',
          'src/lib/adminWrites.ts',
          'src/lib/useAdmin.ts',
        ],
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
  ].filter(Boolean),
}))
