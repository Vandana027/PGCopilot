\pset pager off
set client_min_messages to warning;

-- Two owners
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','owner-a@example.com'),
  ('22222222-2222-2222-2222-222222222222','owner-b@example.com');
-- profiles rows are auto-created by the on_auth_user_created trigger

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', false);

insert into public.properties(owner_id, name, address, city, upi_id) values
  ('11111111-1111-1111-1111-111111111111','Green Residency','1 MG Road','Bengaluru','a@upi') returning id \gset a_
insert into public.rooms(property_id, room_number, sharing, rent_per_tenant) values
  (:'a_id', '101', 2, 7500) returning id \gset room_a1_
insert into public.tenants(property_id, room_id, full_name, whatsapp, monthly_rent, move_in_date) values
  (:'a_id', :'room_a1_id', 'Rahul Sharma', '9876543210', 7500, '2026-01-01') returning id, slot_number \gset tenant_a1_

select 'Owner A slot for first tenant (expect 1):' as check, slot_number from public.tenants where id = :'tenant_a1_id';

insert into public.tenants(property_id, room_id, full_name, whatsapp, monthly_rent, move_in_date) values
  (:'a_id', :'room_a1_id', 'Second Tenant', '9876500000', 7500, '2026-01-01') returning id, slot_number \gset tenant_a2_
select 'Owner A slot for second tenant (expect 2):' as check, slot_number from public.tenants where id = :'tenant_a2_id';

-- Room is full: third tenant into same room should fail
\set ON_ERROR_STOP off
insert into public.tenants(property_id, room_id, full_name, whatsapp, monthly_rent, move_in_date) values
  (:'a_id', :'room_a1_id', 'Third Tenant', '9876511111', 7500, '2026-01-01');
\set ON_ERROR_STOP on

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', false);

insert into public.properties(owner_id, name, address, city, upi_id) values
  ('22222222-2222-2222-2222-222222222222','Sunrise Homes','9 Park St','Pune','b@upi') returning id \gset b_
insert into public.rooms(property_id, room_number, sharing, rent_per_tenant) values
  (:'b_id', '201', 3, 7000) returning id \gset room_b1_
insert into public.tenants(property_id, room_id, full_name, whatsapp, monthly_rent, move_in_date) values
  (:'b_id', :'room_b1_id', 'Owner B Tenant', '9999999999', 7000, '2026-01-01') returning id \gset tenant_b1_

-- Owner B must NOT see Owner A's data
select 'Owner B sees these properties (expect only Sunrise Homes):' as check, name from public.properties;
select 'Owner B sees these tenants (expect only Owner B Tenant):' as check, full_name from public.tenants;

-- Owner B tries to update Owner A's property directly by id (should affect 0 rows)
update public.properties set name='HACKED' where id = :'a_id';
select 'Rows visibly changed by owner B on owner A property (expect 0):' as check, count(*) from public.properties where id=:'a_id' and name='HACKED';

reset role;
select 'Owner A property name unaffected (expect Green Residency):' as check, name from public.properties where id=:'a_id';
