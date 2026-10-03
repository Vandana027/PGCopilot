set client_min_messages to warning;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', false);

select id from public.rooms where room_number='101' \gset room_
select 'Owner A selects own QR (expect 1):' as check, count(*) from storage.objects where bucket_id='pg-qr';

-- Room 101 has 2 active tenants (sharing=2). Shrinking to 1 must fail.
\set ON_ERROR_STOP off
update public.rooms set sharing=1 where id=:'room_id';
\set ON_ERROR_STOP on
select 'Room sharing unchanged after failed shrink (expect 2):' as check, sharing from public.rooms where id=:'room_id';

-- Increasing capacity is fine
update public.rooms set sharing=3 where id=:'room_id';
select 'Room sharing increased ok (expect 3):' as check, sharing from public.rooms where id=:'room_id';

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', false);
select 'Owner B selects pg-qr objects (expect 0, RLS-scoped):' as check, count(*) from storage.objects where bucket_id='pg-qr';
