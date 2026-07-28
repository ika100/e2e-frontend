/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GREETING_SERVICE_URL: string
  readonly VITE_COUNTER_SERVICE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
