# PGCopilot build notes

## Product rules locked for v1
- Owner-only SaaS; tenants do not log in, and there is no tenant app.
- One owner can manage multiple PG properties, fully isolated from each other.
- Tenant fields: full name, WhatsApp (plain contact field only), room, monthly rent, move-in, move-out, emergency contact, ID proof.
- Rooms use automatic sharing slots; owners do not enter Bed A/Bed B manually. Rooms also have a floor number and are grouped by floor in the UI.
- Each property has its own owner-selected UPI QR.
- Rent workflow: the owner explicitly clicks "Generate Rent" for a chosen month on the Payments page — nothing is created automatically or silently on page load. A single month's charge amount can be edited without touching the tenant's permanent monthly rent.
- A static UPI QR does not verify payment automatically; the owner marks payment paid manually, recording amount, method, UTR, and date.
- **WhatsApp reminder automation does not exist and should not be reintroduced** — it was deliberately removed (see "Removed features" below). The tenant's WhatsApp number may remain as a plain contact field with a manual `wa.me` link; do not build any scheduled/automatic messaging on top of it without being explicitly asked again.
- UI should stay simple, premium, responsive, and owner-friendly.

## Removed features (do not re-add without being asked)
- WhatsApp reminder automation: the `reminders` table, `mark_reminder_sent` RPC, `properties.reminders_enabled` column, the Reminders page, and the 1st/3rd/5th reminder cycle. All removed via `supabase/migrations/006_remove_whatsapp_reminders.sql`.
- Owner-facing Invoices page. The `invoices` table and its creation logic (inside `mark_rent_paid`) remain — only the page is gone, since Receipts is what owners/tenants actually need.

## Current app architecture
- Supabase Auth with cookie-based SSR session refresh (`src/lib/supabase/proxy.ts` middleware).
- Supabase Postgres is the only source of truth; there is no demo/localStorage data path.
- Row Level Security scopes every owner to their own properties, rooms, tenants, rent charges, invoices, and receipts — enforced at the database level via `properties.owner_id = auth.uid()`.
- Supabase Storage: public `pg-qr` bucket and private `tenant-documents` bucket, both with owner-scoped RLS policies on `storage.objects`.
- Monthly rent charges are **only** created when the owner clicks "Generate Rent" on the Payments page (`generateRentForMonth` in `app-data.ts` → `generate_monthly_rent_charges` RPC). Dashboard and Reports are read-only and never create charges as a side effect of being viewed.
- Marking a rent charge paid uses the `mark_rent_paid` RPC (amount, payment method, UTR, paid date), is idempotent, and creates the invoice + receipt. A paid charge's amount is immutable (DB trigger).
- A tenant's room slot is only (re)assigned on insert, an actual room change, or reactivation from inactive — never on an unrelated edit (fixed bug, see `supabase/migrations/003_tenant_slot_preservation.sql`).
- A room can't be deleted while it has active tenants, and a room's PG assignment can't be changed after creation — both enforced by DB triggers with friendly error messages.
- WhatsApp: the tenant detail page has a plain `wa.me` link as a manual contact convenience only. There is no automated outbound messaging anywhere in the app.

## Database changes
- `supabase/schema.sql` is the authoritative, idempotent fresh-install script — always keep it in sync with the actual target schema.
- `supabase/migrations/*.sql` is the upgrade path for an existing project; see `supabase/migrations/README.md` for run order. Add a new numbered migration (rather than editing an old one) for any future schema change, and update `schema.sql` to match.

## Validation
Run:
```bash
npm install
npm run check
```
This runs typecheck, lint and the production build. All three must pass before calling anything "production-ready."

## Important secrets
Only public Supabase browser keys belong in `.env.local` (see `.env.example` for the exact variable names). Never expose a Supabase service-role key in client code.
