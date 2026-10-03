# Database migrations

`../schema.sql` is the full, up-to-date schema and is what a **brand new**
Supabase project should run — it already includes everything below.

These numbered migrations are the **upgrade path for an existing project**
that was set up before these changes existed. Run them once, in order, in the
Supabase SQL editor:

1. `002_rooms_floor_number.sql` — adds `rooms.floor_number` for floor grouping.
2. `003_tenant_slot_preservation.sql` — fixes a bug where editing a tenant
   (name, rent, ID document, etc.) could silently move them to a different
   slot in the same room.
3. `004_room_safety_triggers.sql` — prevents deleting a room that still has
   active tenants, and prevents moving an existing room to a different PG.
4. `005_rent_charge_payment_workflow.sql` — makes a paid charge's amount
   immutable, and gives `mark_rent_paid` amount / payment method / date
   parameters.
5. `006_remove_whatsapp_reminders.sql` — drops the `reminders` table, the
   `mark_reminder_sent` RPC, and `properties.reminders_enabled`. WhatsApp
   reminder automation is not part of the v1 product. This does **not** touch
   `tenants.whatsapp`, which remains a normal contact field.

Every migration is written to be safe to re-run (guarded with
`if exists` / `if not exists` / `create or replace`).
