set client_min_messages to warning;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', false);

-- New tenant moving in mid-month (March 15), in a fresh room with space
select id from public.properties where owner_id='11111111-1111-1111-1111-111111111111' limit 1 \gset aprop_
insert into public.rooms(property_id, room_number, sharing, rent_per_tenant) values (:'aprop_id', '102', 2, 7500) returning id \gset room2_
insert into public.tenants(property_id, room_id, full_name, whatsapp, monthly_rent, move_in_date)
  values (:'aprop_id', :'room2_id', 'Midmonth Tenant', '9000000000', 7500, '2026-03-15') returning id \gset midtenant_

-- Generate March charges via the RPC (this is what the app now calls)
select public.generate_monthly_rent_charges('2026-03-01') as created_march;

select 'Mid-month tenant has a March charge (expect 1):' as check, count(*) from public.rent_charges where tenant_id=:'midtenant_id' and rent_month='2026-03-01';
