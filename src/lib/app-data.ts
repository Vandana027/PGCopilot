import { createClient } from '@/lib/supabase/client'
import type { Profile, Property, ReceiptDetail, ReceiptWithCharge, RentChargeWithReceipt, Room, Tenant } from '@/lib/types'

const supabase = createClient()

export const monthStart = (date = new Date()) => {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export const toLocalIsoDate = (date = new Date()) => {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const monthLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

export const formatMoney = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`

// Translates known Postgres constraint violations into owner-friendly messages instead
// of leaking raw SQL/Postgres error text (e.g. "duplicate key value violates unique
// constraint ..."). Falls back to a generic message for anything not specifically handled.
function friendlyDbError(error: unknown, fallback: string): Error {
  const err = error as { code?: string; message?: string } | null
  const code = err?.code
  const message = err?.message || ''
  // Our own trigger/RPC functions raise plain `RAISE EXCEPTION '...'` with no explicit
  // SQLSTATE, which Postgres reports as P0001. Those messages are already written to
  // be owner-friendly (e.g. "This room is full", "This room cannot be deleted while it
  // has active tenants.") — surface them as-is instead of replacing them with `fallback`.
  if (code === 'P0001' && message) return new Error(message)
  if (code === '23505') {
    if (message.includes('rooms_property_id_room_number_key')) return new Error('A room with this number already exists in this PG.')
    if (message.includes('tenants_active_room_slot_unique')) return new Error('That room slot was just taken by another tenant. Please try again.')
    return new Error(fallback)
  }
  if (code === '23514' && message.includes('move_out_date')) {
    return new Error('Move-out date cannot be before the move-in date.')
  }
  return new Error(fallback)
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You are not signed in.')
  return data.user
}

export async function getProfile() {
  const { data, error } = await supabase.from('profiles').select('id,full_name,phone').maybeSingle<Profile>()
  if (error) throw error
  return data
}

export async function saveProfile(values: { full_name: string; phone: string | null }) {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, full_name: values.full_name.trim(), phone: values.phone?.trim() || null })
    .select('id,full_name,phone')
    .single<Profile>()
  if (error) throw error
  return data
}

export async function getProperties() {
  const { data, error } = await supabase.from('properties').select('*').eq('is_active', true).order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as Property[]
}

export async function createProperty(values: { name: string; address: string; city: string; upi_id?: string }) {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('properties')
    .insert({
      owner_id: user.id,
      name: values.name.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      upi_id: values.upi_id?.trim() || null,
    })
    .select('*')
    .single<Property>()
  if (error) throw error
  return data
}

export async function updateProperty(id: string, values: { name: string; address: string; city: string; upi_id?: string }) {
  const { data, error } = await supabase
    .from('properties')
    .update({
      name: values.name.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      upi_id: values.upi_id?.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single<Property>()
  if (error) throw error
  return data
}

export async function uploadPropertyQr(
  propertyId: string,
  file: File,
) {
  const user = await getCurrentUser()

  if (!file) {
    throw new Error("Please select a QR image.")
  }

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
  ]

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      "QR code must be a PNG, JPG, or WebP image.",
    )
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error(
      "QR code image must be smaller than 2 MB.",
    )
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg"

  const path = `${user.id}/${propertyId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } =
    await supabase.storage
      .from("pg-qr")
      .upload(path, file, {
        upsert: false,
        contentType: file.type,
      })

  if (uploadError) {
    throw friendlyDbError(
      uploadError,
      "Unable to upload QR code. Please try again.",
    )
  }

  const {
    data: publicData,
  } = supabase.storage
    .from("pg-qr")
    .getPublicUrl(path)

  const { data, error } = await supabase
    .from("properties")
    .update({
      qr_image_url: publicData.publicUrl,
    })
    .eq("id", propertyId)
    .select("*")
    .single<Property>()

  if (error) {
    throw friendlyDbError(
      error,
      "Unable to save QR code.",
    )
  }

  return data
}

export async function getRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('floor_number', { ascending: true })
    .order('room_number', { ascending: true })

  if (error) throw error

  return (data || []) as Room[]
}

export async function createRoom(values: {
  property_id: string
  floor_number: number
  room_number: string
  sharing: number
  rent_per_tenant: number
}) {
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      property_id: values.property_id,
      floor_number: values.floor_number,
      room_number: values.room_number.trim(),
      sharing: values.sharing,
      rent_per_tenant: values.rent_per_tenant,
    })
    .select('*')
    .single<Room>()

  if (error) throw error

  return data
}

export async function updateRoom(
  id: string,
  values: {
    property_id: string
    floor_number: number
    room_number: string
    sharing: number
    rent_per_tenant: number
  },
) {
  if (
    !values.property_id ||
    !values.room_number.trim()
  ) {
    throw new Error('PG and room number are required.')
  }

  const { count: occupantCount, error: occupantError } =
    await supabase
      .from('tenants')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('room_id', id)
      .eq('status', 'active')

  if (occupantError) throw occupantError

  if ((occupantCount || 0) > values.sharing) {
    throw new Error(
      `This room has ${occupantCount} active tenant(s); reduce sharing to at least ${occupantCount} or move tenants first.`,
    )
  }

  const { data, error } = await supabase
    .from('rooms')
    .update({
      floor_number: values.floor_number,
      room_number: values.room_number.trim(),
      sharing: values.sharing,
      rent_per_tenant: values.rent_per_tenant,
    })
    .eq('id', id)
    .select('*')
    .single<Room>()

  if (error) throw friendlyDbError(error, 'Unable to update room.')

  return data
}

// A room's PG assignment is permanent after creation (see the
// rooms_prevent_property_change trigger) — property_id is intentionally left out of
// this update so an edit can never attempt to move a room between PGs.
export async function deleteRoom(id: string) {
  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) throw friendlyDbError(error, 'Unable to delete room.')
}

export async function getTenants() {
  const { data, error } = await supabase.from('tenants').select('*').order('status', { ascending: false }).order('full_name', { ascending: true })
  if (error) throw error
  return (data || []) as Tenant[]
}

export async function createTenant(values: {
  property_id: string
  room_id: string
  full_name: string
  whatsapp: string
  monthly_rent: number
  move_in_date: string
  move_out_date?: string
  emergency_contact?: string
  id_type?: string
}) {
  const { data, error } = await supabase
    .from('tenants')
    .insert({
      property_id: values.property_id,
      room_id: values.room_id,
      full_name: values.full_name.trim(),
      whatsapp: values.whatsapp.replace(/\D/g, ''),
      monthly_rent: values.monthly_rent,
      move_in_date: values.move_in_date,
      move_out_date: values.move_out_date || null,
      emergency_contact: values.emergency_contact?.replace(/\D/g, '') || null,
      id_type: values.id_type || 'Aadhaar',
      status: 'active',
    })
    .select('*')
    .single<Tenant>()
  if (error) throw friendlyDbError(error, 'Unable to add tenant.')
  return data
}

export async function updateTenant(id: string, values: {
  property_id: string
  room_id: string | null
  full_name: string
  whatsapp: string
  monthly_rent: number
  move_in_date: string
  move_out_date?: string
  emergency_contact?: string
  id_type?: string
  status?: 'active' | 'inactive'
}) {
  const { data, error } = await supabase
    .from('tenants')
    .update({
      property_id: values.property_id,
      room_id: values.room_id || null,
      full_name: values.full_name.trim(),
      whatsapp: values.whatsapp.replace(/\D/g, ''),
      monthly_rent: values.monthly_rent,
      move_in_date: values.move_in_date,
      move_out_date: values.move_out_date || null,
      emergency_contact: values.emergency_contact?.replace(/\D/g, '') || null,
      id_type: values.id_type || 'Aadhaar',
      status: values.status || 'active',
    })
    .eq('id', id)
    .select('*')
    .single<Tenant>()
  if (error) throw friendlyDbError(error, 'Unable to update tenant.')
  return data
}

export async function uploadTenantDocument(tenant: Tenant, file: File) {
  const user = await getCurrentUser()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${user.id}/${tenant.property_id}/${tenant.id}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabase.storage.from('tenant-documents').upload(path, file, { upsert: false, contentType: file.type })
  if (uploadError) throw friendlyDbError(uploadError, 'Unable to upload ID proof. Please try again.')
  const { error: updateError } = await supabase.from('tenants').update({ id_document_path: path }).eq('id', tenant.id)
  if (updateError) throw friendlyDbError(updateError, 'Unable to save ID proof.')
  return path
}

export async function getSignedTenantDocument(path: string) {
  const { data, error } = await supabase.storage.from('tenant-documents').createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}

// Embeds a flag for whether a receipt already exists for each charge, so the
// Payments page can link straight to "View Receipt" for anything paid without a
// second round trip.
export async function getRentCharges(date = monthStart()) {
  const month = toLocalIsoDate(date)
  const { data, error } = await supabase
    .from('rent_charges')
    .select('*, receipts(id)')
    .eq('rent_month', month)
    .order('due_date', { ascending: true })
  if (error) throw error
  return (data || []) as unknown as RentChargeWithReceipt[]
}

// Explicit "Generate Rent" action for a given month (see supabase/schema.sql's
// generate_monthly_rent_charges RPC). The month is computed here from the owner's
// local device time and passed explicitly, rather than relying on the database's
// default current_date, which is UTC on Supabase and would roll over up to 5.5
// hours late relative to Asia/Kolkata around midnight. Idempotent: calling this
// again for a month that already has charges simply creates 0 new ones.
export async function generateRentForMonth(date = new Date()) {
  const month = toLocalIsoDate(monthStart(date))
  const { data, error } = await supabase.rpc('generate_monthly_rent_charges', { p_month: month })
  if (error) throw friendlyDbError(error, 'Unable to generate rent for this month.')
  return (data as number) || 0
}

// Edits a single month's charge amount (e.g. a one-time discount) without touching
// the tenant's permanent monthly_rent. Only pending charges are editable this way —
// once paid, the amount is locked by the rent_charges_prevent_paid_amount_edit
// trigger so the issued invoice/receipt can never drift from what was recorded.
export async function updateRentChargeAmount(id: string, amount: number) {
  const { data, error } = await supabase.from('rent_charges').update({ amount }).eq('id', id).select('*').single()
  if (error) throw friendlyDbError(error, 'Unable to update this charge.')
  return data
}

export async function markRentPaid(
  rentChargeId: string,
  values: { amount: number; paymentMethod: string; utr?: string; paidAt: string },
) {
  const { error } = await supabase.rpc('mark_rent_paid', {
    p_rent_charge_id: rentChargeId,
    p_amount: values.amount,
    p_payment_method: values.paymentMethod,
    p_utr: values.utr?.trim() || null,
    p_paid_at: values.paidAt,
  })
  if (error) throw friendlyDbError(error, 'Unable to record this payment.')
}

export async function getReceipts() {
  const { data, error } = await supabase
    .from('receipts')
    .select(`
      id, rent_charge_id, receipt_number, amount, issued_at, created_at,
      rent_charges (rent_month, paid_at, utr, tenant_id, property_id, tenants (full_name, rooms (room_number)), properties (name))
    `)
    .order('issued_at', { ascending: false })
  if (error) throw error
  return (data || []) as unknown as ReceiptWithCharge[]
}

export async function getReceipt(id: string) {
  const { data, error } = await supabase
    .from('receipts')
    .select(`
      id, rent_charge_id, receipt_number, amount, issued_at, created_at,
      rent_charges (rent_month, paid_at, utr, tenant_id, property_id, tenants (full_name, whatsapp, rooms (room_number)), properties (name, address, city))
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as ReceiptDetail
}

// Read-only: does NOT generate rent charges as a side effect of viewing the
// dashboard. Generating a month's rent is an explicit owner action (the
// "Generate Rent" button on the Payments page) — a page view should never
// silently create database rows.
export async function getDashboardData(date = new Date()) {
  const [properties, tenants, charges] = await Promise.all([
    getProperties(),
    getTenants(),
    getRentCharges(date),
  ])

  const activeTenants = tenants.filter((tenant) => tenant.status === 'active')
  const currentMonth = monthLabel(toLocalIsoDate(monthStart(date)))
  const expected = charges.reduce((sum, charge) => sum + Number(charge.amount), 0)
  const collected = charges.filter((charge) => charge.status === 'paid').reduce((sum, charge) => sum + Number(charge.amount), 0)
  const pending = charges.filter((charge) => charge.status !== 'paid')

  const propertiesWithStats = properties.map((property) => {
    const propertyTenants = activeTenants.filter((tenant) => tenant.property_id === property.id)
    const propertyCharges = charges.filter((charge) => charge.property_id === property.id)
    return {
      property,
      occupied: propertyTenants.length,
      expected: propertyCharges.reduce((sum, charge) => sum + Number(charge.amount), 0),
      pending: propertyCharges.filter((charge) => charge.status !== 'paid').reduce((sum, charge) => sum + Number(charge.amount), 0),
    }
  })

  return { properties, tenants, charges, activeTenants, expected, collected, pending, currentMonth, propertiesWithStats }
}
