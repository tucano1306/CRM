Project: Food Orders CRM — Copilot instructions

Quick context
- Next.js 15 app using the new App Router (see `app/`) and Clerk for auth (`@clerk/nextjs`).
- PostgreSQL via Prisma (schema in `prisma/schema.prisma`). Local dev uses `DATABASE_URL` env var.
- `lib/prisma.ts` is a singleton Prisma client helper; `lib/db.ts` contains an in-memory mock used by tests/dev helpers.

What to do first
- Use `package.json` scripts for common tasks: `npm run dev`, `npm run build`, `npm run start`.
- For database work: `npm run prisma:generate`, `npm run prisma:migrate` and `npm run prisma:studio`.

Key patterns and conventions
- Auth & roles: Clerk session claims and `public_metadata` determine role (`CLIENT`, `SELLER`, `ADMIN`). See `middleware.ts` for role resolution and route protection.
- Data layer: Prefer using `lib/prisma.ts` (exported `prisma`) for DB access. The file guards a global PrismaClient in dev to avoid connection storms.
- Tests: A small `__tests__` folder exists. Unit tests sometimes use `lib/db.ts` in-memory DB; check for `.bak` files that show prior test fixtures.
- File mappings: Prisma models map to snake_case table names via `@@map(...)`. Respect these names when writing raw SQL.
- Idempotency: Several models use `idempotencyKey` (orders, chat messages, status updates). Preserve idempotency semantics when adding API endpoints.

Integration points
- Clerk: `app/layout.tsx` wraps app with `ClerkProvider`. Middleware uses `@clerk/nextjs/server` with `clerkMiddleware`.
- Webhooks: `app/api/webhooks` exists; deliver webhook handlers idempotently using `idempotencyKey`.
- Svix is in dependencies — used for webhook signing/verification in `app/api/webhooks` (search for handlers).

Practical examples
- Add a seller-protected API route: import `auth` from `@clerk/nextjs/server`, check role like `middleware.ts`, then use `prisma` from `lib/prisma.ts`.
- Creating a migration: update `prisma/schema.prisma`, then run `npm run prisma:migrate` (dev), `npm run prisma:generate` afterwards.

Do not change
- Don't re-create Prisma client — always import the `prisma` singleton from `lib/prisma.ts`.
- Don't assume roles are only in `sessionClaims.role`; `middleware.ts` tries multiple places (session claims and public_metadata).

Helpful file references
- `package.json` — scripts and Prisma seed command.
- `prisma/schema.prisma` — canonical data model and table names.
- `lib/prisma.ts` — Prisma client init and process shutdown handling.
- `lib/db.ts` — in-memory DB mock and fixtures.
- `middleware.ts` — auth, role logic, and route matchers.
- `app/layout.tsx` — Clerk provider wiring.

If unclear, ask
- If you need runtime secrets (DATABASE_URL, Clerk keys), ask for the .env values or instructions for local dev.

Feedback
- Please tell me which areas you want expanded (API patterns, tests, CI, or more code examples) and I will iterate.
