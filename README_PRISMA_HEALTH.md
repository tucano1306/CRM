# Food Orders CRM – DB Health & Prisma Guide

This supplemental README documents the database health endpoint, Prisma singleton pattern, and retry utilities recently added/refactored.

## Prisma Singleton
Use the shared client everywhere:
```ts
import { prisma } from '@/lib/prisma'
```
Avoid `new PrismaClient()` outside `lib/prisma.ts` to prevent connection storming.

## Health Check Endpoint
`GET /api/health/db` returns JSON with DB status & latency.
Example success:
```json
{"status":"ok","db":"up","latencyMs": 12.34, "timestamp":"2025-11-09T12:34:56.789Z"}
```
Failure sets HTTP 500 and `status: error`.

## Retry Utilities (`lib/db-retry.ts`)
Functions:
- `withDbRetry(fn)` – Retries transient/init errors (P1000–P1003, P1008, P1017, ECONNRESET, ETIMEDOUT) with exponential backoff.
- `isPrismaInitError(err)`
- `isTransientPrismaError(err)`

Usage:
```ts
import { withDbRetry } from '@/lib/db-retry'
const rows = await withDbRetry(() => prisma.product.findMany())
```
Combine with timeouts:
```ts
const data = await withDbRetry(() => withPrismaTimeout(() => prisma.order.findMany()))
```

## Updating DATABASE_URL
Format:
```
postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public&connection_limit=5&pool_timeout=20
```
After updating:
1. Redeploy.
2. Call `/api/health/db` (expect `status: ok`).
3. Hit `/api/buyer/products` for functional sanity.
4. Inspect logs (no repeated PrismaClient creation warnings).

## Common Prisma Error Codes
| Code | Meaning | Suggested Action |
|------|---------|------------------|
| P1000 | Auth failed | Verify credentials, host ACL |
| P1001 | Cannot reach server | Check network/VPC/security group |
| P1008 | Query timed out | Optimize query or raise timeout |
| P1017 | Connection closed | Safe to retry (handled) |

## Local Dev Quickstart
```
DATABASE_URL="postgresql://postgres:admin123@localhost:5432/food_orders_crm?schema=public&connection_limit=5&pool_timeout=20"
npm run prisma:migrate
npm run prisma:generate
```

## Roadmap Ideas
- Structured error logger wrapper.
- Query latency histogram / metrics export.
- Migration drift check in health endpoint.

---
For further improvements, integrate retry wrapper in other high-traffic endpoints (orders, notifications) and add circuit breaker logic if needed.
