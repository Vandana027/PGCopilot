"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, MessageCircle, Download } from '@/components/Icons'
import { ErrorNotice, LoadingState, Money, Page, formatDate, initials } from '@/components/Ui'
import { createClient } from '@/lib/supabase/client'
import { getProperties, getRooms, getSignedTenantDocument, getTenants } from '@/lib/app-data'
import type { Property, RentCharge, Room, Tenant } from '@/lib/types'

export default function TenantDetail({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('')
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [history, setHistory] = useState<RentCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { params.then((value) => setId(value.id)) }, [params])
  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const [tenants, properties, rooms] = await Promise.all([getTenants(), getProperties(), getRooms()])
        const found = tenants.find((item) => item.id === id) || null
        if (!found) { setTenant(null); setLoading(false); return }
        setTenant(found)
        setProperty(properties.find((item) => item.id === found.property_id) || null)
        setRoom(rooms.find((item) => item.id === found.room_id) || null)
        const { data, error: allChargesError } = await createClient().from('rent_charges').select('*').eq('tenant_id', found.id).order('rent_month', { ascending: false })
        if (allChargesError) throw allChargesError
        setHistory((data || []) as RentCharge[])
        setError('')
      } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load tenant.') } finally { setLoading(false) }
    })()
  }, [id])

  const openDocument = async () => {
    if (!tenant?.id_document_path) return
    try { const url = await getSignedTenantDocument(tenant.id_document_path); window.open(url, '_blank', 'noopener,noreferrer') } catch (err) { setError(err instanceof Error ? err.message : 'Unable to open document.') }
  }

  if (loading) return <Page eyebrow="Tenant" title="Tenant profile" desc="Loading tenant details..."><LoadingState /></Page>
  if (error) return <Page eyebrow="Tenant" title="Tenant profile" desc="Something needs attention."><ErrorNotice message={error} /><Link className="btn btn-secondary" href="/dashboard/tenants"><ArrowLeft size={14} /> Back</Link></Page>
  if (!tenant) return <Page eyebrow="Tenant" title="Tenant not found" desc="This tenant no longer exists."><Link className="btn btn-secondary" href="/dashboard/tenants"><ArrowLeft size={14} /> Back</Link></Page>

  return <Page eyebrow="Tenant profile" title={tenant.full_name} desc={`${property?.name || 'PG'} · Room ${room?.room_number || '—'}${tenant.slot_number ? ` · Slot ${tenant.slot_number}` : ''}`} actions={<a className="btn btn-secondary" href={`https://wa.me/91${tenant.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}>
    <div className="detail"><section className="card profile-hero"><div className="profile-top"><div className="profile-avatar">{initials(tenant.full_name)}</div><div><div className="profile-name">{tenant.full_name}</div><div className="profile-sub">+91 {tenant.whatsapp}</div></div><span className={`pill ${tenant.status === 'active' ? 'pill-green' : 'pill-gray'}`} style={{ marginLeft: 'auto' }}>{tenant.status}</span></div><div className="detail-list"><Detail l="PG" v={property?.name || '—'} /><Detail l="Room" v={room?.room_number || '—'} /><Detail l="Monthly rent" v={`₹${Number(tenant.monthly_rent).toLocaleString('en-IN')}`} /><Detail l="Move in" v={formatDate(tenant.move_in_date)} /><Detail l="Move out" v={formatDate(tenant.move_out_date)} /><Detail l="Emergency" v={tenant.emergency_contact || '—'} /><Detail l="ID proof" v={tenant.id_type || '—'} /><Detail l="ID file" v={tenant.id_document_path ? 'Stored privately' : 'Not uploaded'} /></div>{tenant.id_document_path && <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={openDocument}><Download size={14} /> Open ID document</button>}</section><section className="card section-card"><div className="section-head"><div><div className="section-title">Payment history</div><div className="section-note">Monthly rent charges for this tenant</div></div></div><div className="table-wrap"><table className="table"><thead><tr><th>Month</th><th>Amount</th><th>Status</th><th>Paid date</th><th>UTR</th></tr></thead><tbody>{history.length ? history.map((charge) => <tr key={charge.id}><td>{new Date(`${charge.rent_month}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</td><td><Money value={charge.amount} /></td><td><span className={`pill ${charge.status === 'paid' ? 'pill-green' : 'pill-yellow'}`}>{charge.status}</span></td><td>{formatDate(charge.paid_at)}</td><td>{charge.utr || '—'}</td></tr>) : <tr><td colSpan={5} className="empty">No rent charges yet.</td></tr>}</tbody></table></div></section></div>
    <div className="notice" style={{ marginTop: 16 }}><strong>Owner workflow:</strong> change tenant details from the Tenants page, and generate/record rent from Payments.</div>
  </Page>
}

function Detail({ l, v }: { l: string; v: string }) { return <div className="detail-item"><div className="detail-label">{l}</div><div className="detail-value">{v}</div></div> }
