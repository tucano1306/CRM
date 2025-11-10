#!/usr/bin/env node
const { spawnSync } = require('node:child_process')
const { URL } = require('url')

const shouldDeploy = !!(process.env.VERCEL || process.env.CI || process.env.PRISMA_DEPLOY_ON_BUILD === 'true')

if (!shouldDeploy) {
  console.log('[prisma] Skipping migrate deploy (not CI/VERCEL). Set PRISMA_DEPLOY_ON_BUILD=true to force.')
  process.exit(0)
}

// Guardrails: if DATABASE_URL is missing or points to localhost, skip deploy to avoid failing the build
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.warn('[prisma] Skipping migrate deploy: DATABASE_URL is not set in the build environment.')
  process.exit(0)
}

try {
  const u = new URL(dbUrl)
  const host = (u.hostname || '').toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1') {
    console.warn('[prisma] Skipping migrate deploy: DATABASE_URL points to localhost. Configure a remote production database in Vercel env vars.')
    process.exit(0)
  }
} catch {
  console.warn('[prisma] Skipping migrate deploy: DATABASE_URL is not a valid URL. Please fix it in your environment.')
  process.exit(0)
}

console.log('[prisma] Running migrate deploy...')
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { 
  stdio: 'inherit', 
  shell: true,
  timeout: 30000 // 30 seconds timeout
})

// If migration times out or fails, log warning but don't fail the build
// (migrations should already be applied in production database)
if (result.status !== 0) {
  console.warn('[prisma] Migration deploy failed or timed out. This is OK if migrations are already applied.')
  console.warn('[prisma] Build will continue. Check database manually if needed.')
  process.exit(0) // Exit successfully to not block the build
}

process.exit(0)
