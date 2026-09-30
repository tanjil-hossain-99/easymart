/// <reference types="vite/client" />

// Types for import.meta.env — only VITE_* vars are exposed to the browser
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
