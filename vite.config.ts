import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Content-Security-Policy for the built site (GitHub Pages can't set headers,
// so it goes in a <meta>). Only applied on `vite build` — dev needs a looser
// policy for HMR, so it is left alone there.
// Keep in sync with the header version in vercel.json. `frame-ancestors` is
// omitted here because browsers ignore it in a <meta> tag (the frame-buster in
// public/theme-init.js covers clickjacking on GitHub Pages).
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' https://apis.google.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https://*.fbcdn.net https://*.xx.fbcdn.net https://*.googleusercontent.com",
  "connect-src 'self' https://docs.google.com https://script.google.com https://script.googleusercontent.com https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://iscep-department.firebaseapp.com",
  'frame-src https://www.facebook.com https://web.facebook.com https://staticxx.facebook.com https://iscep-department.firebaseapp.com https://accounts.google.com https://apis.google.com',
  'upgrade-insecure-requests',
].join('; ')

function cspOnBuild(): Plugin {
  return {
    name: 'csp-meta-on-build',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`
      )
    },
  }
}

export default defineConfig({
  base: './',
  build: {
    // No source maps in production — nothing to un-minify the bundle with.
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      // drop_debugger is OFF so the anti-inspection trap in clientHardening.ts
      // survives minification. drop_console stays ON for bundle hygiene.
      compress: { drop_console: true, drop_debugger: false, passes: 3 },
      // toplevel: true also renames top-level names — makes view-source of the
      // bundle close to unreadable without changing behaviour.
      mangle: { toplevel: true },
      format: { comments: false },
    },
    // Fold small chunks together so there are fewer readable entry points.
    chunkSizeWarningLimit: 900,
  },
  plugins: [react(), cspOnBuild()],
})
