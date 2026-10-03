-- 003_tenant_slot_preservation.sql
-- Bug fix: generate_tenant_slot() previously recomputed slot_number on EVERY
-- update to a tenant row, including edits that had nothing to do with the room
-- (name, rent, phone, ID document, etc.). If a lower-numbered slot in the same
-- room happened to be free, the tenant would be silently moved to it.
--
-- Fixed rule: a slot is only (re)assigned on INSERT, when room_id actually
-- changes, or when a tenant is reactivated from inactive. A normal edit with the
-- same room and the tenant already active keeps its existing slot_number.
-- Safe to re-run: CREATE OR REPLACE.

create or replace function public.generate_tenant_slot()
returns trigger language plpgsql as $$
declare room_capacity integer; available_slot integer;
begin
  if new.room_id is null or new.status <> 'active' then
    new.slot_number := null;
    return new;
  end if;

  if TG_OP = 'UPDATE' and old.status = 'active' and old.room_id = new.room_id then
    new.slot_number := old.slot_number;
    return new;
  end if;

  select sharing into room_capacity from public.rooms where id = new.room_id and property_id = new.property_id;
  if room_capacity is null then raise exception 'Selected room does not belong to this PG'; end if;

  select s into available_slot
  from generate_series(1, room_capacity) as s
  where not exists (
    select 1 from public.tenants t
    where t.room_id = new.room_id and t.slot_number = s and t.status = 'active'
      and t.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  order by s limit 1;

  if available_slot is null then raise exception 'This room is full'; end if;
  new.slot_number := available_slot;
  return new;
end;
$$;
