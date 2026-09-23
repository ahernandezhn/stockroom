# Stockroom

A Next.js 16 dashboard for viewing inventory and fulfilling stock requests against Neon Postgres.

## Setup

Requires Node.js 20.9 or newer and a Neon database.

```bash
npm install
cp .env.example .env
```

Configure both URLs in `.env`:

- `DATABASE_URL`: Neon’s pooled connection URL. The app, seed script, and integration tests use it for runtime queries.
- `DATABASE_URL_UNPOOLED`: Neon’s direct connection URL. Prisma CLI uses it for migrations and schema inspection, where a stable direct connection is required.

Never commit `.env`.

```bash
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run dev
```

The dashboard is available at `http://localhost:3000`.

## Development commands

```bash
npm run prisma:migrate:deploy  # apply committed migrations
npm run prisma:seed            # restore deterministic demo records
npm test                       # UI plus real-Neon API/database tests
npm run typecheck
npm run lint
npm run build
```

The seed uses fixed IDs and upserts, so rerunning it restores the same demo state without duplicate records. Tests create uniquely identified records and remove only those records; they never truncate or globally reset the database.

## Architecture

- `src/app/page.tsx` performs server-side inventory and pending-request reads.
- `src/features/dashboard/dashboard-container.tsx` owns client mutation orchestration, the feature-scoped Zustand state, and server refreshes.
- `src/features/dashboard/dashboard-view.tsx` is a presentation component that renders props and emits typed fulfillment events.
- `src/app/api/requests/[id]/fulfill/route.ts` exposes the fulfillment HTTP contract.
- `src/features/requests/server/fulfill-request.ts` contains the transactional domain mutation.
- `src/lib/db.ts` provides one Prisma client configured with the Neon adapter.
- `prisma/migrations` enforces nonnegative stock, positive request quantities, status/timestamp consistency, and restrictive item references.

Server data remains authoritative. The UI disables visibly blocked requests for clarity, but every request is rechecked in the database.

## Fulfillment guarantees

Fulfillment runs in one short transaction. It conditionally claims a `PENDING` request, atomically decrements its item only when enough stock remains, and rolls the claim back if inventory is insufficient.

- Replaying an already fulfilled request returns success with `idempotent: true` and does not decrement stock again.
- Concurrent calls for the same request produce one inventory decrement.
- Different requests competing for limited stock cannot drive stock below zero; only requests covered by available stock commit.
- Database checks protect inventory and request invariants even when writes bypass the application.

## API

`POST /api/requests/:id/fulfill`

Successful response (`200`):

```json
{
  "data": {
    "request": {
      "id": "uuid",
      "itemId": "uuid",
      "quantity": 2,
      "status": "FULFILLED",
      "fulfilledAt": "2026-09-23T12:00:00.000Z"
    },
    "idempotent": false
  }
}
```

Errors use `{ "error": { "code", "message", "details"? } }`:

- `400 INVALID_REQUEST_ID`
- `404 REQUEST_NOT_FOUND`
- `409 INSUFFICIENT_STOCK`
- `409 INVALID_REQUEST_STATE`
- `500 INTERNAL_SERVER_ERROR`

## Deferred request form

Creating a new stock request is intentionally outside this groundwork phase. A future form should select an existing item, validate requester and positive quantity input, persist through a dedicated server mutation/API route, include the same route-and-database integration coverage, and refresh the server-rendered dashboard after success.
