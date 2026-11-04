interface ImportMetaEnv {
  /** Read-only GitHub token for the private releases feed, injected at build time. */
  readonly MAIN_VITE_UPDATE_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
