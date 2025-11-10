<#
.SYNOPSIS
  Runs Prisma migrations against a remote DATABASE_URL (Neon, Supabase, etc.) safely.
.DESCRIPTION
  - Reads connection string from param -DatabaseUrl or existing $env:DATABASE_URL.
  - Verifies it's not localhost.
  - Runs `prisma migrate deploy` then `prisma generate`.
  - Optional --Seed flag runs a seed script if package.json has it.
.PARAMETER DatabaseUrl
  Remote Postgres connection string (postgresql://...). If omitted, uses $env:DATABASE_URL.
.PARAMETER Seed
  Switch to also run `npm run seed` if defined.
.EXAMPLE
  ./scripts/migrate-remote.ps1 -DatabaseUrl "postgresql://user:pass@host.neon.tech/db?sslmode=require"
.EXAMPLE
  $env:DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"; ./scripts/migrate-remote.ps1 -Seed
#>
param(
  [string]$DatabaseUrl,
  [switch]$Seed
)

Write-Host "[migrate-remote] Starting remote migration..." -ForegroundColor Cyan

if (-not $DatabaseUrl) {
  $DatabaseUrl = $env:DATABASE_URL
  Write-Host "[migrate-remote] Using DATABASE_URL from environment." -ForegroundColor Yellow
}

if (-not $DatabaseUrl) {
  Write-Error "DATABASE_URL not provided or set. Provide -DatabaseUrl or set environment variable."
  exit 1
}

try {
  $u = [System.Uri]$DatabaseUrl
  if ($u.Host -eq 'localhost' -or $u.Host -eq '127.0.0.1') {
    Write-Error "Refusing to run: provided URL points to localhost. Use a remote Postgres host."
    exit 1
  }
} catch {
  Write-Error "Invalid DATABASE_URL format. $_"
  exit 1
}

# Temporarily set env var for subprocesses
$prev = $env:DATABASE_URL
$env:DATABASE_URL = $DatabaseUrl

Write-Host "[migrate-remote] Host: $((([System.Uri]$DatabaseUrl).Host))" -ForegroundColor Green
Write-Host "[migrate-remote] Running prisma migrate deploy..." -ForegroundColor Cyan

# Ensure prisma CLI available via npx
$npx = (Get-Command npx -ErrorAction SilentlyContinue)
if (-not $npx) {
  Write-Error "npx not found. Ensure Node.js + npm are installed."
  exit 1
}

# Run migrations
npm exec prisma migrate deploy 2>&1 | Tee-Object -Variable migrateOutput

if ($LASTEXITCODE -ne 0) {
  Write-Error "Migration failed. See output above."; $env:DATABASE_URL = $prev; exit 1
}

Write-Host "[migrate-remote] Migrations applied successfully." -ForegroundColor Green

Write-Host "[migrate-remote] Generating Prisma client..." -ForegroundColor Cyan
npm exec prisma generate 2>&1 | Tee-Object -Variable generateOutput
if ($LASTEXITCODE -ne 0) {
  Write-Error "Prisma generate failed."; $env:DATABASE_URL = $prev; exit 1
}
Write-Host "[migrate-remote] Prisma client generated." -ForegroundColor Green

if ($Seed) {
  Write-Host "[migrate-remote] Seed flag detected. Attempting npm run seed..." -ForegroundColor Cyan
  npm run seed 2>&1 | Tee-Object -Variable seedOutput
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Seed script failed (non-fatal)."
  } else {
    Write-Host "[migrate-remote] Seed completed." -ForegroundColor Green
  }
}

# Restore previous env var (for local dev continuity)
$env:DATABASE_URL = $prev
Write-Host "[migrate-remote] Done." -ForegroundColor Cyan
