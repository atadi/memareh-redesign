/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_SUPABASE_URL: string
    readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string
    readonly SUPABASE_URL: string
    readonly SUPABASE_SECRET_KEY: string
    readonly NODE_ENV: 'development' | 'production' | 'test'
  }
}
