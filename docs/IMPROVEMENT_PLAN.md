# CSYFinproj — Improvement / Re-development Plan

Based on full code analysis (2026-07-18). The system is functionally rich but has
security gaps, duplicated code, and several screens that need real-world
requirements before rework. This plan is "refactor in place", not a rewrite —
the data model and API structure are fundamentally sound.

## Phase 0 — Security & correctness hotfixes (do first, no requirements needed)

| # | Item | Where |
|---|------|-------|
| 0.1 | Protect public LINE-link endpoints (`GET /customers/:id/link-status`, `POST /customers/:id/link-line`) — add short-lived signed link tokens instead of raw customer UUIDs | `apps/api/src/modules/customers` |
| 0.2 | Enforce page permissions server-side: wire the existing (unused) `requirePermission` middleware onto every router | `apps/api/src/middleware/auth.ts` + all routers |
| 0.3 | Fail hard if `LINE_CHANNEL_SECRET` unset in production (webhook signature bypass) | `webhooks/line-webhook.router.ts` |
| 0.4 | Wrap `createContract` (contract + parties + sales links + installments) in a `$transaction` | `contracts.service.ts` |
| 0.5 | Fix `finance/page.tsx` `finally { setLoading(true) }` loading-state bug | `apps/web/src/app/finance/page.tsx` |
| 0.6 | Add a scheduled job (cron) that transitions installments to `overdue`; unify the overdue definition (status vs. dueDate<now) across payments/finance/notifications | new `apps/api/src/jobs/` |
| 0.7 | Stop LINE link-status polling after N attempts / add backoff on customer detail page | `customers/[id]/page.tsx` |

## Phase 1 — Backend foundation (no requirements needed)

1. **Central error handling**: `asyncHandler` wrapper + global error middleware +
   404 handler; delete ~40 copy-pasted try/catch blocks.
2. **Response casing**: standardize on one casing (recommend snake_case to match
   the API contract), remove dual snake+camel emission in formatters, and align
   delivery-notes with the rest.
3. **Schema cleanups** (each = one Prisma migration):
   - `TaxInvoice.type` varchar → enum
   - Collapse `CustomerType` `personal`/`individual` into one value
   - Drop `Sale.financeCompanyName` string (keep FK to FinancialInstitution)
   - DB-level or app-level check that `Payment` references at least one of
     installment/contract/sale/addon, and `Installment` exactly one of sale/contract
4. **Financial-institutions CRUD** (admin) — currently seed-only.
5. **Dashboard stats endpoint** (`GET /api/v1/stats/dashboard`) to replace the
   6-request count hack on the web dashboard.
6. **Tests for untested core logic**: contracts (EMI schedule), payment
   verify→invoice-type inference, delivery-note auto-motorcycle creation,
   permissions, LINE webhook.

## Phase 2 — Frontend re-architecture (no requirements needed)

1. **Data layer**: adopt TanStack Query (react-query) — kills the ~10 duplicated
   fetch/loading/pagination state machines and gives caching + refetch.
2. **Shared UI kit** in `apps/web/src/components/ui/`:
   - Generic `Badge` (replaces 8+ inline status-color maps)
   - `Input`/`Select`/`Field` form primitives + react-hook-form + zod resolvers
     (shares zod schemas with the API via `packages/shared`)
   - Generic `Stepper` (sales + contracts wizards are near-identical)
   - Shared `Pagination` component
3. **`lib/format.ts`**: single `formatPrice` / `formatDate` (currently duplicated in ~10 files).
4. **Upload helper**: multipart-aware `apiFetch` so payments stops re-implementing fetch.
5. **Split monolith pages** (sales 1,609 lines, inventory 1,249, contracts 1,110,
   payments 825, users 824) into per-feature component folders.
6. **Shared types**: complete `packages/shared` types for nested API responses
   (linkedContract, payments, taxInvoices) and remove `(x as any)` casts.
7. **PermissionGuard on every page**, not just settings.
8. **i18n decision**: either commit to Thai-only UI or add next-intl; stop mixed
   hardcoded bilingual labels.

## Phase 3 — Screen rework (REQUIRES owner requirements — use docs/REQUIREMENTS_TEMPLATE.md)

Order of interviews, then rework each screen on the Phase-2 foundation:

1. `/sales` — sale wizard (payment methods, dual customer, commission)
2. `/payments` — record/verify flow (roles, channels, partial payment, invoicing)
3. `/finance` — collections (overdue definition, late fees, reminder policy)
4. `/contracts` — contract terms (interest rule flat vs. EMI!, early payoff, guarantor)
5. `/receiving` — GRN (supplier master, pricing rule, correction flow)
6. `/` dashboard — owner KPIs
7. `/settings/line` — final Thai message wording; decide SMS/email scope

## Phase 4 — Docs, ops & polish

- Regenerate `docs/02_DATABASE.yml` from the real schema (currently documents 9 of
  20 tables and references PostgreSQL — the DB is MySQL).
- Update `06_CODE_GRAPH.md` (missing contracts module) and `07_DOCUMENTATION.md`.
- Structured logging (pino) + request logging.
- Backup strategy for `uploads/` (payment slips) — move to S3-compatible storage.
- CI: run vitest + `tsc --noEmit` + lint on push.

## What NOT to rewrite

- Prisma schema core structure (Sale/Contract/Installment/Payment) — sound design.
- Zod validation approach — already consistent, just share schemas with the frontend.
- The sale-creation transaction logic — complex but correct; add tests before touching.
- Auth (JWT + HttpOnly cookie + bcrypt) — solid; only wire up `requirePermission`.
