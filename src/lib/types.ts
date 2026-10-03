export type Property = {
  id: string
  owner_id: string
  name: string
  address: string
  city: string
  total_beds: number
  qr_image_url: string | null
  upi_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Room = {
  id: string
  property_id: string
  floor_number: number
  room_number: string
  sharing: number
  rent_per_tenant: number
  created_at: string
  updated_at: string
}

export type Tenant = {
  id: string
  property_id: string
  room_id: string | null
  slot_number: number | null
  full_name: string
  whatsapp: string
  monthly_rent: number
  move_in_date: string
  move_out_date: string | null
  emergency_contact: string | null
  id_type: string | null
  id_document_path: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export type RentCharge = {
  id: string
  tenant_id: string
  property_id: string
  rent_month: string
  amount: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
  paid_at: string | null
  utr: string | null
  payment_method: string | null
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: string
  rent_charge_id: string
  invoice_number: string
  amount: number
  issued_at: string
  created_at: string
}

export type Receipt = {
  id: string
  rent_charge_id: string
  receipt_number: string
  amount: number
  issued_at: string
  created_at: string
}

export type Profile = {
  id: string
  full_name: string
  phone: string | null
}

type ChargeTenantSummary = Pick<Tenant, 'full_name' | 'whatsapp' | 'room_id'> & {
  rooms: Pick<Room, 'room_number'> | null
}

export type RentChargeWithReceipt = RentCharge & {
  receipts: Pick<Receipt, 'id'> | null
}

export type ReceiptWithCharge = Receipt & {
  rent_charges:
    | (Pick<RentCharge, 'rent_month' | 'paid_at' | 'utr' | 'tenant_id' | 'property_id'> & {
        tenants: ChargeTenantSummary | null
        properties: Pick<Property, 'name'> | null
      })
    | null
}

export type ReceiptDetail = Receipt & {
  rent_charges:
    | (Pick<RentCharge, 'rent_month' | 'paid_at' | 'utr' | 'tenant_id' | 'property_id'> & {
        tenants: (ChargeTenantSummary & Pick<Tenant, 'whatsapp'>) | null
        properties: Pick<Property, 'name' | 'address' | 'city'> | null
      })
    | null
}
