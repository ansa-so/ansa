# Contributing

Patches are welcome. This is a working codebase for a live product, so a few
things are worth knowing before you start.

## The licence, up front

Ansa is **fair source**, not open source, under
[FSL-1.1-Apache-2.0](LICENSE). You may read, run, self-host, modify and
redistribute it. You may not offer it — or something substantially similar — as
a competing commercial product or service. Each release converts to Apache 2.0
two years after publication.

Contributions require a CLA, which the bot will prompt for on your first pull
request. It exists because Ansa is also sold commercially; without it, granting a
customer terms other than FSL would mean tracking down every past contributor.
Signing takes one comment.

## Getting it running

You need Node 20.9+, pnpm 9, and PostgreSQL with pgvector.

```bash
pnpm install
cp .env.example .env
```

`BETTER_AUTH_SECRET` is required and has no default — the API refuses to start
without one:

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -hex 32)" >> .env
```

Then bring up Postgres, push the schema, and start everything:

```bash
docker compose up postgres -d
docker compose exec postgres psql -U ansa -d ansa -c "CREATE EXTENSION IF NOT EXISTS vector;"
pnpm db:push
pnpm dev
```

Dashboard on :3000, API on :3001, widget on :3002.

You do not need an LLM provider key to work on most of the codebase. Set
`OPENAI_API_KEY` or `ANTHROPIC_API_KEY` only when touching chat or embeddings.

## Before opening a pull request

```bash
pnpm lint
pnpm type-check
pnpm --filter @ansa/api test
pnpm build
```

CI runs exactly these. Two notes:

`pnpm lint` is Biome, and it enforces tabs. Run `pnpm lint:fix` rather than
arguing with it.

`pnpm build` matters even when type-check passes — it is the only place
Turbopack and the App Router are exercised, and it has caught things `tsc`
did not.

## Things that will get a patch sent back

**Unscoped queries.** Every record is owned through its agent
(`X.agentId -> agents.userId`). A query filtered only by an id from the request
lets one tenant reach another's data. Use the helpers in
`apps/api/src/lib/ownership.ts`, and see `tenant-isolation.test.ts` for what the
tests expect.

**Fetching a caller-supplied URL with bare `fetch`.** Use `safeFetch` from
`apps/api/src/lib/safe-fetch.ts`. Plain `fetch` on a user-provided URL is a
request-forgery primitive — it can reach cloud metadata and internal services.

**Secrets or environment-specific values in source.** Attacker IPs, payload
signatures, hostnames, keys: all configuration. `.env.example` documents the
variables.

**Widening a public endpoint.** The widget is unauthenticated by design and only
a specific handful of routes may stay open. If you add `requireAuth` broadly,
check `tenant-isolation.test.ts` — it asserts which routes must remain
reachable, precisely so this cannot break silently.

## Layout

```
apps/api          Hono API, Socket.IO, cron jobs
apps/dashboard    Next.js — product UI and the marketing site
apps/widget       Embeddable chat widget (Vite, shadow DOM)
apps/docs         Mintlify documentation
packages/db       Drizzle schema and migrations
packages/types    Shared types
packages/ui       Shared components
```

Schema changes go through Drizzle: edit `packages/db/src/schema.ts`, run
`pnpm db:generate`, read the generated SQL before committing it.

## Reporting a vulnerability

Do not open a public issue. Use
[GitHub Security Advisories](https://github.com/ansa-so/ansa/security/advisories/new).
