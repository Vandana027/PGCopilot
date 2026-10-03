-- 005_rent_charge_payment_workflow.sql
-- Supports the explicit "Generate Rent" + editable-per-month-charge workflow:
--
-- 1. A pending rent charge's amount can be edited directly (e.g. a one-time
--    discount for one month) without touching the tenant's permanent
--    monthly_rent. Once a charge is marked paid, its amount becomes immutable
--    so the issued invoice/receipt can never drift from what was recorded as
--    paid.
--
-- 2. mark_rent_paid gains amount / payment_method / utr / paid_at parameters so
--    the owner can confirm all of those at the moment of recording payment.
--    Calling it on an already-paid charge is a no-op (idempotent): no duplicate
--    invoice/receipt, no mutation of the recorded payment.
--
-- Safe to re-run: CREATE OR REPLACE. Re-grants to authenticated for the new
-- function signature.

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

-- Drop the old 3-argument signature so PostgREST does not expose two
-- overloaded versions of the same RPC name.
drop function if exists public.mark_rent_paid(uuid, text, timestamptz);

grant execute on function public.mark_rent_paid(uuid,numeric,text,text,timestamptz) to authenticated;
