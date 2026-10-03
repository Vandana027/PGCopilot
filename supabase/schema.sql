-- PGCopilot database schema
-- Fresh Supabase project only.
-- Owner-only SaaS: one owner can manage multiple PG properties.

create extension if not exists pgcrypto;

create sequence if not exists public.invoice_number_seq start 1001;
create sequence if not exists public.receipt_number_seq start 1001;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  address text not null,
  city text not null,
  total_beds integer not null default 0,
  qr_image_url text,
  upi_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  floor_number integer not null default 0 check (floor_number between -5 and 50),
  room_number text not null,
  sharing integer not null check (sharing between 1 and 8),
  rent_per_tenant numeric(12,2) not null check (rent_per_tenant >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, room_number)
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  slot_number integer,
  full_name text not null,
  whatsapp text not null,
  monthly_rent numeric(12,2) not null check (monthly_rent >= 0),
  move_in_date date not null,
  move_out_date date,
  emergency_contact text,
  id_type text,
  id_document_path text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (move_out_date is null or move_out_date >= move_in_date)
);

create unique index if not exists tenants_active_room_slot_unique
  on public.tenants(room_id, slot_number)
  where status = 'active';

create table if not exists public.rent_charges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  rent_month date not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending','paid','overdue')),
  paid_at timestamptz,
  utr text,
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, rent_month)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  rent_charge_id uuid not null unique references public.rent_charges(id) on delete cascade,
  invoice_number text not null unique,
  amount numeric(12,2) not null check (amount >= 0),
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  rent_charge_id uuid not null unique references public.rent_charges(id) on delete cascade,
  receipt_number text not null unique,
  amount numeric(12,2) not null check (amount >= 0),
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_properties_owner on public.properties(owner_id);
create index if not exists idx_rooms_property on public.rooms(property_id);
create index if not exists idx_tenants_property on public.tenants(property_id);
create index if not exists idx_tenants_room on public.tenants(room_id);
create index if not exists idx_rent_charges_tenant on public.rent_charges(tenant_id);
create index if not exists idx_rent_charges_property on public.rent_charges(property_id);
create index if not exists idx_rent_charges_month on public.rent_charges(rent_month);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at before update on public.properties for each row execute function public.set_updated_at();
drop trigger if exists rooms_updated_at on public.rooms;
create trigger rooms_updated_at before update on public.rooms for each row execute function public.set_updated_at();
drop trigger if exists tenants_updated_at on public.tenants;
create trigger tenants_updated_at before update on public.tenants for each row execute function public.set_updated_at();
drop trigger if exists rent_charges_updated_at on public.rent_charges;
create trigger rent_charges_updated_at before update on public.rent_charges for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'owner'), '@', 1)),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.update_property_total_beds()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_property_id uuid;
begin
  target_property_id := coalesce(new.property_id, old.property_id);
  update public.properties
  set total_beds = (select coalesce(sum(sharing),0) from public.rooms where property_id = target_property_id), updated_at = now()
  where id = target_property_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists rooms_update_total_beds on public.rooms;
create trigger rooms_update_total_beds after insert or update or delete on public.rooms for each row execute function public.update_property_total_beds();

create or replace function public.prevent_room_overshrink()
returns trigger language plpgsql as $$
declare occupied integer;
begin
  if new.sharing < old.sharing then
    select count(*) into occupied from public.tenants where room_id = new.id and status = 'active';
    if occupied > new.sharing then
      raise exception 'This room has % active tenant(s); reduce sharing to at least % or move tenants first.', occupied, occupied;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists rooms_prevent_overshrink on public.rooms;
create trigger rooms_prevent_overshrink before update on public.rooms for each row execute function public.prevent_room_overshrink();

-- Moving an existing room to a different PG would leave the old PG's total_beds
-- stale (the after-trigger below only recalculates the new property_id) and could
-- desync a tenant's property_id from their room's property_id. Rather than take on
-- that transactional complexity, room-to-PG assignment is permanent after creation;
-- create a new room in the target PG instead.
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

-- A room with active tenants must not be deletable: the tenants.room_id FK is
-- ON DELETE SET NULL, which would silently orphan active tenants (no room, no slot)
-- rather than surface a clear error.
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

create or replace function public.generate_tenant_slot()
returns trigger language plpgsql as $$
declare room_capacity integer; available_slot integer;
begin
  if new.room_id is null or new.status <> 'active' then new.slot_number := null; return new; end if;

  -- A normal edit (name, rent, phone, documents, status staying active, etc.) with
  -- the room unchanged must not reshuffle the tenant's existing slot. Only (re)assign
  -- a slot on insert, when the room actually changes, or when reactivating from
  -- inactive.
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

drop trigger if exists tenants_auto_slot on public.tenants;
create trigger tenants_auto_slot before insert or update on public.tenants for each row execute function public.generate_tenant_slot();

-- A paid charge's amount must stay fixed so the issued invoice/receipt amount can
-- never drift from what the charge record says was actually paid.
create or replace function public.prevent_paid_charge_amount_edit()
returns trigger language plpgsql as $$
begin
  if old.status = 'paid' and new.amount is distinct from old.amount then
    raise exception 'Cannot change the amount of a rent charge that has already been paid.';
  end if;
  return new;
end;
$$;

drop trigger if exists rent_charges_prevent_paid_amount_edit on public.rent_charges;
create trigger rent_charges_prevent_paid_amount_edit before update on public.rent_charges for each row execute function public.prevent_paid_charge_amount_edit();

create or replace function public.mark_rent_paid(
  p_rent_charge_id uuid,
  p_amount numeric default null,
  p_payment_method text default 'UPI QR',
  p_utr text default null,
  p_paid_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_rent public.rent_charges; v_invoice_number text; v_receipt_number text; v_final_amount numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select rc.* into v_rent
  from public.rent_charges rc
  join public.properties p on p.id = rc.property_id
  where rc.id = p_rent_charge_id and p.owner_id = auth.uid()
  for update;

  if not found then raise exception 'Rent charge not found or access denied'; end if;

  -- Idempotent: a charge that is already paid is left untouched and no duplicate
  -- invoice/receipt is created, so accidentally submitting "Mark paid" twice (a
  -- double-click, a retried request) is always safe.
  if v_rent.status = 'paid' then
    return p_rent_charge_id;
  end if;

  v_final_amount := coalesce(p_amount, v_rent.amount);
  if v_final_amount < 0 then raise exception 'Amount cannot be negative.'; end if;

  update public.rent_charges
  set status = 'paid',
      amount = v_final_amount,
      paid_at = coalesce(p_paid_at, now()),
      utr = nullif(trim(p_utr), ''),
      payment_method = coalesce(nullif(trim(p_payment_method), ''), 'UPI QR'),
      updated_at = now()
  where id = p_rent_charge_id;

  v_invoice_number := 'INV-' || to_char(v_rent.rent_month, 'YYYYMM') || '-' || lpad(nextval('public.invoice_number_seq')::text,6,'0');
  insert into public.invoices(rent_charge_id, invoice_number, amount)
  values(p_rent_charge_id, v_invoice_number, v_final_amount)
  on conflict (rent_charge_id) do nothing;

  v_receipt_number := 'RCT-' || to_char(coalesce(p_paid_at, now()), 'YYYYMM') || '-' || lpad(nextval('public.receipt_number_seq')::text,6,'0');
  insert into public.receipts(rent_charge_id, receipt_number, amount)
  values(p_rent_charge_id, v_receipt_number, v_final_amount)
  on conflict (rent_charge_id) do nothing;

  return p_rent_charge_id;
end;
$$;

grant execute on function public.mark_rent_paid(uuid,numeric,text,text,timestamptz) to authenticated;

create or replace function public.generate_monthly_rent_charges(p_month date default date_trunc('month', current_date)::date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_first_day date; v_last_day date; v_tenant record; v_charge_id uuid; v_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_first_day := date_trunc('month', p_month)::date;
  v_last_day := (v_first_day + interval '1 month' - interval '1 day')::date;

  for v_tenant in
    select t.id, t.property_id, t.monthly_rent
    from public.tenants t
    join public.properties p on p.id = t.property_id
    where t.status = 'active' and p.is_active = true and p.owner_id = auth.uid()
      and t.move_in_date <= v_last_day
      and (t.move_out_date is null or t.move_out_date >= v_first_day)
  loop
    insert into public.rent_charges(tenant_id,property_id,rent_month,amount,due_date,status)
    values(v_tenant.id,v_tenant.property_id,v_first_day,v_tenant.monthly_rent,v_first_day,'pending')
    on conflict(tenant_id,rent_month) do nothing
    returning id into v_charge_id;

    if v_charge_id is not null then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

grant execute on function public.generate_monthly_rent_charges(date) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.rooms enable row level security;
alter table public.tenants enable row level security;
alter table public.rent_charges enable row level security;
alter table public.invoices enable row level security;
alter table public.receipts enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists properties_owner_all on public.properties;
create policy properties_owner_all on public.properties for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists rooms_owner_all on public.rooms;
create policy rooms_owner_all on public.rooms for all to authenticated using (exists(select 1 from public.properties p where p.id = rooms.property_id and p.owner_id = auth.uid())) with check (exists(select 1 from public.properties p where p.id = rooms.property_id and p.owner_id = auth.uid()));

drop policy if exists tenants_owner_all on public.tenants;
create policy tenants_owner_all on public.tenants for all to authenticated using (exists(select 1 from public.properties p where p.id = tenants.property_id and p.owner_id = auth.uid())) with check (exists(select 1 from public.properties p where p.id = tenants.property_id and p.owner_id = auth.uid()));

drop policy if exists rent_charges_owner_all on public.rent_charges;
create policy rent_charges_owner_all on public.rent_charges for all to authenticated using (exists(select 1 from public.properties p where p.id = rent_charges.property_id and p.owner_id = auth.uid())) with check (exists(select 1 from public.properties p where p.id = rent_charges.property_id and p.owner_id = auth.uid()));

drop policy if exists invoices_owner_all on public.invoices;
create policy invoices_owner_all on public.invoices for all to authenticated using (exists(select 1 from public.rent_charges rc join public.properties p on p.id = rc.property_id where rc.id = invoices.rent_charge_id and p.owner_id = auth.uid())) with check (exists(select 1 from public.rent_charges rc join public.properties p on p.id = rc.property_id where rc.id = invoices.rent_charge_id and p.owner_id = auth.uid()));

drop policy if exists receipts_owner_all on public.receipts;
create policy receipts_owner_all on public.receipts for all to authenticated using (exists(select 1 from public.rent_charges rc join public.properties p on p.id = rc.property_id where rc.id = receipts.rent_charge_id and p.owner_id = auth.uid())) with check (exists(select 1 from public.rent_charges rc join public.properties p on p.id = rc.property_id where rc.id = receipts.rent_charge_id and p.owner_id = auth.uid()));

-- Storage
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pg-qr','pg-qr',true,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tenant-documents','tenant-documents',false,5242880,array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.safe_uuid(value text)
returns uuid language plpgsql immutable as $$
begin return value::uuid; exception when others then return null; end;
$$;

-- QR path: owner_id/property_id/file.ext
-- Document path: owner_id/property_id/tenant_id/file.ext

drop policy if exists qr_upload_owner on storage.objects;
create policy qr_upload_owner on storage.objects for insert to authenticated with check (
  bucket_id='pg-qr' and public.safe_uuid(split_part(name,'/',1)) = auth.uid()
  and exists(select 1 from public.properties p where p.id=public.safe_uuid(split_part(objects.name,'/',2)) and p.owner_id=auth.uid())
);
drop policy if exists qr_update_owner on storage.objects;
create policy qr_update_owner on storage.objects for update to authenticated using(bucket_id='pg-qr' and public.safe_uuid(split_part(name,'/',1))=auth.uid()) with check(bucket_id='pg-qr' and public.safe_uuid(split_part(name,'/',1))=auth.uid());
drop policy if exists qr_delete_owner on storage.objects;
create policy qr_delete_owner on storage.objects for delete to authenticated using(bucket_id='pg-qr' and public.safe_uuid(split_part(name,'/',1))=auth.uid());
drop policy if exists qr_select_owner on storage.objects;
create policy qr_select_owner on storage.objects for select to authenticated using(bucket_id='pg-qr' and public.safe_uuid(split_part(name,'/',1))=auth.uid());

drop policy if exists tenant_document_upload_owner on storage.objects;
create policy tenant_document_upload_owner on storage.objects for insert to authenticated with check(
  bucket_id='tenant-documents' and public.safe_uuid(split_part(name,'/',1))=auth.uid()
  and exists(select 1 from public.tenants t join public.properties p on p.id=t.property_id where t.id=public.safe_uuid(split_part(objects.name,'/',3)) and p.id=public.safe_uuid(split_part(objects.name,'/',2)) and p.owner_id=auth.uid())
);
drop policy if exists tenant_document_select_owner on storage.objects;
create policy tenant_document_select_owner on storage.objects for select to authenticated using(bucket_id='tenant-documents' and public.safe_uuid(split_part(name,'/',1))=auth.uid());
drop policy if exists tenant_document_update_owner on storage.objects;
create policy tenant_document_update_owner on storage.objects for update to authenticated using(bucket_id='tenant-documents' and public.safe_uuid(split_part(name,'/',1))=auth.uid()) with check(bucket_id='tenant-documents' and public.safe_uuid(split_part(name,'/',1))=auth.uid());
drop policy if exists tenant_document_delete_owner on storage.objects;
create policy tenant_document_delete_owner on storage.objects for delete to authenticated using(bucket_id='tenant-documents' and public.safe_uuid(split_part(name,'/',1))=auth.uid());

select 'PGCopilot schema ready.' as message;
