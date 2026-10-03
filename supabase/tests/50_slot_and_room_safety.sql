set client_min_messages to warning;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', false);

select id from public.properties where owner_id='11111111-1111-1111-1111-111111111111' limit 1 \gset aprop_

-- Floor support
insert into public.rooms(property_id, room_number, sharing, rent_per_tenant, floor_number)
  values (:'aprop_id', 'B-1', 3, 6000, -1) returning id \gset broom_
select 'Floor number stored correctly (expect -1):' as check, floor_number from public.rooms where id=:'broom_id';

insert into public.tenants(property_id, room_id, full_name, whatsapp, monthly_rent, move_in_date)
  values (:'aprop_id', :'broom_id', 'Slot One', '9111111111', 6000, '2026-01-01') returning id, slot_number \gset slot1_
insert into public.tenants(property_id, room_id, full_name, whatsapp, monthly_rent, move_in_date)
  values (:'aprop_id', :'broom_id', 'Slot Two', '9222222222', 6000, '2026-01-01') returning id, slot_number \gset slot2_
insert into public.tenants(property_id, room_id, full_name, whatsapp, monthly_rent, move_in_date)
  values (:'aprop_id', :'broom_id', 'Slot Three', '9333333333', 6000, '2026-01-01') returning id, slot_number \gset slot3_
select 'Initial slots (expect 1,2,3):' as check, :slot1_slot_number as t1, :slot2_slot_number as t2, :slot3_slot_number as t3;

-- Slot Two moves out, freeing slot 2
update public.tenants set status='inactive', move_out_date='2026-02-01' where id=:'slot2_id';
select 'Slot Two now has no slot (expect null):' as check, slot_number from public.tenants where id=:'slot2_id';

-- *** THE BUG FIX ***: editing Slot Three's name must NOT move them into the now-free slot 2
update public.tenants set full_name='Slot Three Renamed', emergency_contact='9000000001' where id=:'slot3_id';
select 'Slot Three keeps slot 3 after unrelated edit (expect 3, NOT 2):' as check, slot_number from public.tenants where id=:'slot3_id';

-- Explicitly moving Slot One to a different room SHOULD reassign a slot
insert into public.rooms(property_id, room_number, sharing, rent_per_tenant, floor_number)
  values (:'aprop_id', 'B-2', 2, 6500, -1) returning id \gset broom2_
update public.tenants set room_id=:'broom2_id' where id=:'slot1_id';
select 'Slot One reassigned in new room (expect 1):' as check, slot_number from public.tenants where id=:'slot1_id';

-- Reactivating Slot Two into the (now partly free) original room should get a fresh slot
update public.tenants set status='active', room_id=:'broom_id', move_out_date=null where id=:'slot2_id';
select 'Slot Two reactivated gets a slot (expect not null):' as check, slot_number from public.tenants where id=:'slot2_id';

-- Room deletion safety: cannot delete a room with an active tenant
\set ON_ERROR_STOP off
delete from public.rooms where id=:'broom_id';
\set ON_ERROR_STOP on
select 'Occupied room still exists after failed delete (expect 1):' as check, count(*) from public.rooms where id=:'broom_id';

-- Vacate the room, then deletion should succeed
update public.tenants set status='inactive', move_out_date='2026-02-01' where room_id=:'broom_id' and status='active';
delete from public.rooms where id=:'broom_id';
select 'Vacated room deleted successfully (expect 0):' as check, count(*) from public.rooms where id=:'broom_id';

-- Cannot move an existing room to a different PG
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', false);
select id from public.properties where owner_id='22222222-2222-2222-2222-222222222222' limit 1 \gset bprop_
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', false);
\set ON_ERROR_STOP off
update public.rooms set property_id=:'bprop_id' where id=:'broom2_id';
\set ON_ERROR_STOP on
select 'Room still belongs to original PG after blocked move (expect true):' as check, (property_id = :'aprop_id') from public.rooms where id=:'broom2_id';
