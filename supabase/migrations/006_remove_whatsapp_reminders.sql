-- 006_remove_whatsapp_reminders.sql
-- WhatsApp reminder automation is not part of the v1 product. This removes the
-- backend pieces that existed only to support it:
--   - the reminders table and its RLS policy
--   - the mark_reminder_sent() RPC
--   - the properties.reminders_enabled column
--   - the reminder-row-creation block inside generate_monthly_rent_charges()
--
-- The tenant's WhatsApp number is NOT touched — it remains a normal contact
-- field on tenants.
--
-- This drops real tables/columns. If you have reminder history you want to keep
-- for records, export the `reminders` table before running this migration;
-- there is no application feature that reads it, so it is safe to remove
-- otherwise. Re-running this migration is safe (every statement is guarded).

drop function if exists public.mark_reminder_sent(uuid);

drop policy if exists reminders_owner_all on public.reminders;
drop table if exists public.reminders;

alter table public.properties drop column if exists reminders_enabled;

-- Re-create generate_monthly_rent_charges without the reminder-insertion block.
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
