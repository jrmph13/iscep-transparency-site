/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional — enables the realtime Members roster (Firestore).
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string

  // Apps Script read key (kept equal to the TX_READ_KEY script property).
  readonly VITE_APPS_SCRIPT_KEY?: string

  // Opt-in ONLY: enables the browser-side CSV lookup fallback and publishes
  // the spreadsheet id in the bundle. Leave unset to keep the sheet private.
  readonly VITE_LOOKUP_SHEET_ID?: string
  readonly VITE_LOOKUP_SHEET_GID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
