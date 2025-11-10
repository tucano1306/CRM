// app/api/health/db-url/route.ts
// Diagnostic endpoint: returns effective DB host & whether fallback used (no secrets).
import { NextResponse } from 'next/server'

export async function GET() {
  const raw = process.env.DATABASE_URL
  let host: string | undefined
  let database: string | undefined
  let usingFallback = false
  if (raw) {
    try {
      const u = new URL(raw)
      host = u.hostname
      database = u.pathname.replace('/', '') || undefined
    } catch {
      host = 'invalid-url'
    }
  } else {
    host = 'not-set'
  }
  // heuristic: if raw contains 'localhost' but we also have a remote POSTGRES_* env present
  const remoteCandidate = [
    'POSTGRES_PRISMA_DATABASE_URL','POSTGRES_PRISMA_URL','POSTGRES_DATABASE_URL','POSTGRES_URL',
    'postgres_PRISMA_DATABASE_URL','postgres_PRISMA_URL','postgres_DATABASE_URL','postgres_URL','postgres_POSTGRES_URL',
    'NEON_DATABASE_URL','SUPABASE_DB_URL','SUPABASE_DATABASE_URL'
  ].map(n => process.env[n]).find(v => {
    if (!v) return false
    try { const u = new URL(v); return !['localhost','127.0.0.1'].includes(u.hostname.toLowerCase()) } catch { return false }
  })
  if (raw && /localhost|127\.0\.0\.1/.test(raw) && remoteCandidate) {
    usingFallback = true
  }
  return NextResponse.json({
    status: 'ok',
    databaseHost: host,
    databaseName: database,
    usingFallback,
    hasRemoteCandidate: !!remoteCandidate,
    timestamp: new Date().toISOString()
  })
}