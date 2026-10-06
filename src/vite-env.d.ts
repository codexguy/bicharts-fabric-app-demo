/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the model's CSV files are read from. Defaults to the codexguy/bicharts examples on GitHub. */
  readonly VITE_DATA_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
