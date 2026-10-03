-- 002_rooms_floor_number.sql
-- Adds floor-level support to rooms so the Rooms page can group by floor
-- (Basement 2 = -2, Basement = -1, Ground = 0, First = 1, ...).
-- Safe to re-run: ADD COLUMN IF NOT EXISTS is idempotent.

alter table public.rooms
  add column if not exists floor_number integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rooms_floor_number_check'
  ) then
    alter table public.rooms
      add constraint rooms_floor_number_check check (floor_number between -5 and 50);
  end if;
end $$;
