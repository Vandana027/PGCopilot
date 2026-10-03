# PGCopilot

A simple, owner-only management SaaS for PG (paying-guest) / co-living
property owners in India. One owner account can run multiple PGs — rooms,
tenants, monthly rent, and payments — from a single dashboard.

PGCopilot is deliberately narrow in scope: there is no tenant login, no
tenant app, and no automated messaging. The owner stays in control of every
action.

## 1. What it is

- **Owner-only.** Tenants never log in. The owner manages everything.
- **Multi-property.** One owner account can manage several PGs, each with
  its own rooms, tenants, rent, and UPI QR — fully isolated from each other
  and from other owners.
- **Manual payments.** Rent is collected via the owner's own UPI QR. The
  owner records each payment manually; there is no payment gateway.

## 2. Features

- Email/password auth (Supabase Auth), protected dashboard, session refresh
- Multiple PGs per owner, each with its own UPI QR
- Rooms grouped by floor (basement through any floor you add), with sharing
  capacity and automatic slot assignment when a tenant is added
- Tenant records with ID document upload (private, signed-URL access)
- **Explicit "Generate Rent"** workflow: pick a month, click Generate Rent,
  and a charge is created for every eligible active tenant from their
  stored monthly rent — safe to click more than once (idempotent)
- A single month's charge amount can be edited (e.g. a one-time discount)
  without touching the tenant's permanent monthly rent
- **Mark Paid** records amount, payment method, UTR/reference, and payment
  date, and issues a receipt automatically — also idempotent
- Receipts page and per-receipt detail view
- Reports: monthly collected/pending totals and per-property breakdown

## 3. Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Auth, Postgres (with Row Level Security), Storage

## 4. Architecture overview

- `src/app/dashboard/*` — one route per feature (properties, rooms,
  tenants, payments, receipts, reports, settings)
- `src/lib/app-data.ts` — the only place that talks to Supabase; every page
  calls through this module rather than using the Supabase client directly
- `src/lib/supabase/{client,server}.ts` — browser/server Supabase client
  factories; `proxy.ts` (Next middleware) refreshes the session on every
  request
- `supabase/schema.sql` — the full database schema: tables, RLS policies,
  storage policies, and RPC/trigger functions. This is what a **new**
  Supabase project should run.
- `supabase/migrations/*.sql` — the upgrade path for an **existing**
  project that predates recent changes (floor numbers, slot-preservation
  fix, room safety triggers, the new payment workflow, WhatsApp-reminder
  removal). See `supabase/migrations/README.md` for the run order.
- `supabase/tests/*.sql` — a local Postgres test harness (not part of the
  app) that seeds two owners and exercises RLS isolation, room capacity,
  slot assignment, and the rent/payment RPCs against real SQL. Useful as
  living documentation of the expected behavior; not wired into CI.

## 5. Why there's no owner-facing Invoices page

Invoices are generated as an internal record whenever a payment is marked
paid (for numbering/audit purposes), but the owner-facing product only
needs **Receipts**, which is what a tenant actually wants evidence of. The
`invoices` table and its creation logic remain in the database; there is
simply no page for it.

## 6. Why there's no WhatsApp automation

WhatsApp reminder automation (the 1st/3rd/5th reminder cycle) was removed
entirely — it is not part of the v1 product. The `reminders` table, the
`mark_reminder_sent` RPC, and `properties.reminders_enabled` have been
dropped. A tenant's WhatsApp number remains a normal contact field, and the
tenant detail page has a plain "message this tenant" link that opens
`wa.me` — that is a manual convenience, not automation.

## 7. Supabase setup

1. Create a new Supabase project.
2. In the SQL editor, run `supabase/schema.sql` once. It creates every
   table, RLS policy, storage bucket/policy, and RPC function, and is safe
   to re-run (every statement is guarded).
3. If you already have an older PGCopilot project, instead run the files
   in `supabase/migrations/` **in numeric order** — see
   `supabase/migrations/README.md`.
4. Confirm two storage buckets exist: `pg-qr` (public) and
   `tenant-documents` (private). `schema.sql` creates them if missing.

## 8. Environment variables

Copy `.env.example` to `.env.local` and fill in your project's values from
**Project Settings → API** in the Supabase dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Never commit `.env.local` (it's already in `.gitignore`), and never put a
`service_role` key in frontend code.

## 9. Local development

```bash
npm install
npm run dev
```

Then visit `/signup` to create the first owner account.

## 10. Build / test commands

```bash
npm run typecheck    # tsc --noEmit
npm run lint          # eslint
npm run build          # next build (production build)
npm run check           # all three, in order
```

There is no automated JS test suite. `supabase/tests/*.sql` is a manual SQL
test harness for the database layer (run against a local Postgres instance
with the shim in `00_supabase_shim.sql`, not against production).

## 11. Deployment

1. Push the repo to your Git provider (or deploy directly from this
   folder).
2. Deploy to Vercel (or any Node host) with the two env vars from section 8
   set in the project's environment settings.
3. `npm run build && npm run start`, or let the platform build it.
4. Make sure `supabase/schema.sql` (or the migrations) have already been
   run against your Supabase project before the app goes live.
5. Optional: schedule `generate_monthly_rent_charges()` via a Supabase cron
   job/Edge Function if you want rent to exist even on days nobody opens
   Payments. By default, generation only happens when the owner clicks
   **Generate Rent**.

## 12. Security / RLS approach

- Every table (`properties`, `rooms`, `tenants`, `rent_charges`,
  `invoices`, `receipts`) has RLS enabled, scoped to
  `properties.owner_id = auth.uid()` (directly or via a join) — one owner
  can never read or write another owner's data, enforced at the database
  level, not just in the UI.
- All RPC functions (`generate_monthly_rent_charges`, `mark_rent_paid`) are
  `SECURITY DEFINER` but explicitly re-check `owner_id = auth.uid()`
  themselves before touching any row.
- Storage: `pg-qr` (public bucket, so tenants can be shown a QR without
  logging in) and `tenant-documents` (private, signed URLs only) both have
  owner-scoped RLS policies on `storage.objects`, keyed by the first path
  segment (`{owner_id}/...`).
- A room's PG assignment is permanent after creation, and a room can't be
  deleted while it has active tenants — both enforced by database
  triggers, not just UI checks.
- Editing a tenant's name, rent, or documents never reassigns their room
  slot — only creating a tenant, changing their room, or reactivating them
  does (this was a real bug, fixed at the trigger level; see
  `supabase/migrations/003_tenant_slot_preservation.sql`).

## 13. Rent-generation workflow

Rent is never created silently. On the Payments page:

1. Pick a month (current month is selected by default; past months remain
   selectable).
2. Click **Generate Rent**. This calls the `generate_monthly_rent_charges`
   RPC, which creates one `pending` charge per active tenant whose
   occupancy overlaps that month, using their stored `monthly_rent`.
   Running it again for the same month creates zero additional charges
   (enforced by a unique constraint on `(tenant_id, rent_month)`).
3. A charge's amount can be edited for that month only (e.g. a one-time
   discount) via the pencil icon next to the amount — this does **not**
   change the tenant's permanent `monthly_rent`. Once a charge is marked
   paid, its amount becomes immutable (enforced by a trigger) so the
   issued receipt can never drift from what was actually paid.

**Move-in/move-out billing rule:** a tenant is eligible for a given
month's rent if their `move_in_date` is on or before the last day of that
month, and (if set) their `move_out_date` is on or after the first day of
that month. There is no proration — a tenant who moves in or out partway
through a month is still charged the full stored `monthly_rent` for that
month. This is a deliberate simplification, not an oversight.

## 14. Payment / receipt workflow

Clicking **Mark Paid** opens a form for amount (pre-filled, editable),
payment method (UPI QR / Cash / Bank Transfer / Other), an optional
UTR/reference, and the payment date. Submitting it calls the `mark_rent_paid`
RPC, which:

- Updates the charge to `paid` with everything you entered
- Creates one invoice and one receipt record (uniquely numbered)
- Is idempotent: calling it again on an already-paid charge does nothing
  and creates no duplicates — so an accidental double-click is harmless

Paid charges show a **View Receipt** link to `/dashboard/receipts/[id]`.

## 15. Known limitations

- No automated WhatsApp/SMS messaging of any kind (by design — see
  section 6).
- No proration for partial-month occupancy (see section 13).
- Replacing a PG's QR code uploads a new file but does not delete the old
  one from storage — harmless, but it means old QR images accumulate in
  the `pg-qr` bucket over time.
- Rent generation is a manual, explicit action (the Generate Rent button);
  there is no built-in scheduler. If you want it to run automatically,
  pair the RPC with a Supabase cron job (see section 11).
- No automated test suite beyond the manual SQL harness in
  `supabase/tests/`.
