# Production Database Runbook

This project uses `Supabase Postgres + Supabase Auth + Prisma`.

The main operational risk is not Supabase itself. It is schema drift:

- local database schema moves forward during development
- production database schema stays behind
- deployed code expects columns or tables that production does not have yet

This runbook is the default operating policy for Kablus going forward.

## Decision

- Keep Supabase.
- Keep Prisma.
- Use the Supabase pooler URL for runtime traffic.
- Use the direct database URL for Prisma migrations.
- Treat migrations as part of deployment, but only after the production database has been baselined.

## Environment Rules

- `DATABASE_URL`: Supabase pooler URL for app runtime.
- `DIRECT_URL`: Supabase direct database URL for `prisma migrate`.
- `NEXT_PUBLIC_SUPABASE_URL`: client auth URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: client anon key.

Never expose:

- service role keys on the frontend
- raw database passwords in the repository

## Immediate Response

When production works locally but fails after deploy:

1. Run `npm run db:migrate:status`
2. Confirm whether production has been baselined
3. Confirm whether the new code expects columns that production does not have
4. Only then enable `RUN_DB_MIGRATIONS=true` for Vercel builds

## Baseline Procedure For Existing Production Databases

Use this only once per environment.

If the production database already contains tables created outside Prisma migration history:

1. Back up the database in Supabase first.
2. Compare the live schema with `prisma/schema.prisma`.
3. Mark the already-applied historical migration as applied with `prisma migrate resolve`.
4. After the migration history is aligned, run `npm run db:migrate:deploy`.

Important:

- Do not turn on automatic deploy-time migrations before this baseline is done.
- A non-empty production database can fail `migrate deploy` if Prisma thinks the history is missing.

## Vercel Deployment Policy

Default safe mode:

- `RUN_DB_MIGRATIONS` is not set
- build runs `prisma generate` and `next build`

After production is baselined:

- set `RUN_DB_MIGRATIONS=true` in Vercel
- builds will run `prisma migrate deploy` before `next build`

## Daily Development Rules

1. Never rely on `db push` for shared environments.
2. Every schema change must land with a migration file.
3. Test migrations against a staging database before production.
4. Keep runtime code resilient to partial API failures.
5. Do not create per-route `new PrismaClient()` instances in API routes.

## Security Checklist

- Enable and review Supabase backups / PITR.
- Keep RLS enabled anywhere the Supabase data API is used directly.
- Keep all privileged DB writes behind server-side route handlers.
- Rotate secrets if any key was ever exposed.
- Audit service role usage before adding Google login or AI features.

## Known Risks In This Repository

- There was a legacy `0_init` migration path and a newer schema path.
- Some runtime code moved faster than the applied migration history.
- Production dashboard failures were consistent with missing columns / tables.

## Current Safeguards Added

- dashboard data fetching now tolerates partial API failures
- runtime and migration URLs are separated in Prisma config
- Vercel builds can run migrations, but only when explicitly enabled
- shared Prisma client usage is enforced in the checked API routes

## Recommended Next Step

1. Create a staging Supabase project
2. baseline staging
3. run `npm run db:migrate:deploy`
4. verify login, dashboard, goals, categories, exchange rates
5. enable `RUN_DB_MIGRATIONS=true` in production only after staging passes
