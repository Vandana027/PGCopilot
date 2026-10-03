set client_min_messages to warning;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', false);

select public.generate_monthly_rent_charges('2026-02-01') as created_count_run1;
select public.generate_monthly_rent_charges('2026-02-01') as created_count_run2_expect_0;

select 'charges for Feb (expect 2, one per active tenant):' as check, count(*) from public.rent_charges where rent_month='2026-02-01';
-- mark one charge paid (with amount/method/date now), then rerun mark_rent_paid to
-- confirm no duplicate invoice/receipt and no mutation of the recorded payment
select id, amount from public.rent_charges where rent_month='2026-02-01' limit 1 \gset paid_
select public.mark_rent_paid(p_rent_charge_id := :'paid_id', p_amount := :'paid_amount', p_payment_method := 'UPI QR', p_utr := 'UTR123', p_paid_at := '2026-02-03T10:00:00+05:30');
select public.mark_rent_paid(p_rent_charge_id := :'paid_id', p_amount := 999999, p_payment_method := 'Cash', p_utr := 'SHOULD-NOT-APPLY');
select 'invoices for that charge (expect 1):' as check, count(*) from public.invoices where rent_charge_id=:'paid_id';
select 'receipts for that charge (expect 1):' as check, count(*) from public.receipts where rent_charge_id=:'paid_id';
select 'status (expect paid):' as check, status from public.rent_charges where id=:'paid_id';
select 'amount unchanged by 2nd mark-paid call (expect original amount, not 999999):' as check, amount from public.rent_charges where id=:'paid_id';
select 'payment method from 1st call preserved (expect UPI QR):' as check, payment_method from public.rent_charges where id=:'paid_id';

-- A paid charge's amount cannot be edited directly either
\set ON_ERROR_STOP off
update public.rent_charges set amount = 1 where id = :'paid_id';
\set ON_ERROR_STOP on
select 'amount still unchanged after direct update attempt:' as check, amount from public.rent_charges where id=:'paid_id';

-- Owner B must not be able to mark Owner A's rent charge as paid
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', false);
\set ON_ERROR_STOP off
select public.mark_rent_paid(p_rent_charge_id := :'paid_id', p_utr := 'HACK');
\set ON_ERROR_STOP on
reset role;
select 'charge still shows original UTR (expect UTR123):' as check, utr from public.rent_charges where id=:'paid_id';

-- Storage: Owner A uploads a QR object under its own real property id + a tenant document
reset role;
insert into storage.buckets(id,name,public) values ('pg-qr','pg-qr',true),('tenant-documents','tenant-documents',false) on conflict do nothing;

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', false);
select id from public.properties where owner_id='11111111-1111-1111-1111-111111111111' limit 1 \gset aprop_
select id from public.tenants where property_id=:'aprop_id' limit 1 \gset atenant_

insert into storage.objects(bucket_id, name) values
  ('pg-qr', '11111111-1111-1111-1111-111111111111/' || :'aprop_id' || '/qr.png');
insert into storage.objects(bucket_id, name) values
  ('tenant-documents', '11111111-1111-1111-1111-111111111111/' || :'aprop_id' || '/' || :'atenant_id' || '/aadhaar.png');

select 'Owner A can select its own QR object (expect 1):' as check, count(*) from storage.objects where bucket_id='pg-qr';
select 'Owner A can select its own tenant doc (expect 1):' as check, count(*) from storage.objects where bucket_id='tenant-documents';

-- Owner B tries to upload into Owner A's property/tenant folder — must be rejected by WITH CHECK
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', false);
\set ON_ERROR_STOP off
insert into storage.objects(bucket_id, name) values
  ('pg-qr', '11111111-1111-1111-1111-111111111111/' || :'aprop_id' || '/hacked.png');
insert into storage.objects(bucket_id, name) values
  ('tenant-documents', '11111111-1111-1111-1111-111111111111/' || :'aprop_id' || '/' || :'atenant_id' || '/hacked.png');
\set ON_ERROR_STOP on

select 'Owner B sees this many pg-qr objects total (expect 0 -- select policy scopes by owner prefix):' as check, count(*) from storage.objects where bucket_id='pg-qr';
select 'Owner B sees this many tenant-documents objects total (expect 0):' as check, count(*) from storage.objects where bucket_id='tenant-documents';

reset role;
select 'Objects in pg-qr bucket after attack attempts (expect still just 1, no hacked.png):' as check, name from storage.objects where bucket_id='pg-qr';
