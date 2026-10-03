-- 004_room_safety_triggers.sql
-- Two safety nets for rooms:
--
-- 1. Deleting a room with active tenants previously succeeded silently (the
--    tenants.room_id FK is ON DELETE SET NULL), orphaning active tenants with no
--    room and no slot. Now blocked with a friendly error.
--
-- 2. Changing an existing room's property_id is blocked: the total_beds
--    after-trigger only recalculates the new property's total (leaving the old
--    property's total stale), and a tenant's property_id could desync from their
--    room's property_id. Create a new room in the target PG instead.
--
-- Safe to re-run: CREATE OR REPLACE + DROP/CREATE TRIGGER.

create or replace function public.prevent_room_property_change()
returns trigger language plpgsql as $$
begin
  if new.property_id <> old.property_id then
    raise exception 'Moving a room to a different PG is not supported. Create a new room in the target PG instead.';
  end if;
  return new;
end;
$$;

drop trigger if exists rooms_prevent_property_change on public.rooms;
create trigger rooms_prevent_property_change before update on public.rooms for each row execute function public.prevent_room_property_change();

create or replace function public.prevent_occupied_room_delete()
returns trigger language plpgsql as $$
declare occupied integer;
begin
  select count(*) into occupied from public.tenants where room_id = old.id and status = 'active';
  if occupied > 0 then
    raise exception 'This room cannot be deleted while it has active tenants.';
  end if;
  return old;
end;
$$;

drop trigger if exists rooms_prevent_occupied_delete on public.rooms;
create trigger rooms_prevent_occupied_delete before delete on public.rooms for each row execute function public.prevent_occupied_room_delete();
