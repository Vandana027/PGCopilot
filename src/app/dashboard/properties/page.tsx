/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { ChangeEvent, useEffect, useState } from 'react'
import { Edit2, Plus, Upload } from '@/components/Icons'
import { ErrorNotice, LoadingState, Modal, Money, Page } from '@/components/Ui'
import { createProperty, getProperties, updateProperty, uploadPropertyQr } from '@/lib/app-data'
import type { Property } from '@/lib/types'

export default function Properties() {
  const [items, setItems] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState<Property | null>(null)

  const load = async () => {
    setLoading(true)
    try { setItems(await getProperties()); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load PGs.') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async (values: { name: string; address: string; city: string; upi_id: string }) => {
    try {
      if (editing) await updateProperty(editing.id, values)
      else await createProperty(values)
      setShow(false); setEditing(null); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save property.') }
  }

  return <Page eyebrow="Workspace" title="My PGs" desc="Manage multiple properties without mixing tenants or payment details." actions={<button className="btn btn-primary" onClick={() => { setEditing(null); setShow(true) }}><Plus size={15} /> Add PG</button>}>
    {error && <ErrorNotice message={error} />}
    {loading ? <LoadingState text="Loading your properties..." /> : items.length ? <div className="grid grid-2">{items.map((property) => <PropertyCard key={property.id} property={property} onEdit={() => { setEditing(property); setShow(true) }} onUpdated={load} />)}</div> : <div className="card section-card"><div className="empty"><strong style={{ color: 'var(--ink)' }}>Add your first PG</strong><div style={{ marginTop: 7 }}>Your properties are the top-level containers for rooms, tenants, rent and payment QR settings.</div><button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setShow(true)}><Plus size={14} /> Add PG</button></div></div>}
    {show && <PropertyModal initial={editing} onClose={() => { setShow(false); setEditing(null) }} onSave={save} />}
  </Page>
}

function PropertyCard({ property, onEdit, onUpdated }: { property: Property; onEdit: () => void; onUpdated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setLocalError('QR image must be smaller than 2 MB.'); return }
    setBusy(true); setLocalError('')
    try { await uploadPropertyQr(property.id, file); await onUpdated() } catch (err) { setLocalError(err instanceof Error ? err.message : 'Unable to upload QR.') } finally { setBusy(false); event.target.value = '' }
  }

  return <div className="card pg-card">
    <div className="pg-accent" />
    <div className="pg-meta"><div><div className="pg-name">{property.name}</div><div className="pg-address">{property.address}, {property.city}</div></div><button className="icon-btn" onClick={onEdit} aria-label="Edit PG"><Edit2 size={15} /></button></div>
    <div className="property-stats"><div className="mini-stat"><div className="mini-stat-label">Capacity</div><div className="mini-stat-value">{property.total_beds || 0}</div></div><div className="mini-stat"><div className="mini-stat-label">UPI</div><div className="mini-stat-value" style={{ fontSize: 11 }}>{property.upi_id || 'Not set'}</div></div><div className="mini-stat"><div className="mini-stat-label">Status</div><div className="mini-stat-value" style={{ color: property.is_active ? 'var(--green)' : 'var(--muted)' }}>{property.is_active ? 'Active' : 'Inactive'}</div></div></div>
    <div className="qr-preview"><div className="qr-box">{property.qr_image_url ? (<> <img src={property.qr_image_url} alt={`${property.name} UPI QR`} /></>) : <div className="qr-placeholder">No QR<br />added</div>}</div><div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 11 }}>Payment QR</div><div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>This exact QR belongs to this PG.</div><label className="btn btn-secondary" style={{ marginTop: 9, padding: '7px 9px', opacity: busy ? .65 : 1 }}><Upload size={13} /> {busy ? 'Uploading...' : property.qr_image_url ? 'Replace QR' : 'Upload QR'}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={busy} /></label></div></div>
    {localError && <div className="notice warning-box" style={{ marginTop: 10 }}>{localError}</div>}
  </div>
}

function PropertyModal({ initial, onClose, onSave }: { initial: Property | null; onClose: () => void; onSave: (values: { name: string; address: string; city: string; upi_id: string }) => Promise<void> }) {
  const [name, setName] = useState(initial?.name || '')
  const [address, setAddress] = useState(initial?.address || '')
  const [city, setCity] = useState(initial?.city || 'Bengaluru')
  const [upi, setUpi] = useState(initial?.upi_id || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim() || !address.trim() || !city.trim()) { setError('PG name, address and city are required.'); return }
    setSaving(true); setError('')
    try { await onSave({ name, address, city, upi_id: upi }); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save.') } finally { setSaving(false) }
  }

  return <Modal title={initial ? 'Edit PG' : 'Add a new PG'} onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving...' : initial ? 'Save changes' : 'Create PG'}</button></>}>
    <div className="form-grid"><div className="field full"><label>PG name</label><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Green Residency" /></div><div className="field"><label>Address</label><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Yelahanka New Town" /></div><div className="field"><label>City</label><input value={city} onChange={(event) => setCity(event.target.value)} /></div><div className="field full"><label>Owner UPI ID (optional)</label><input value={upi} onChange={(event) => setUpi(event.target.value)} placeholder="yourname@upi" /></div></div>
    {error && <div className="notice warning-box" style={{ marginTop: 14 }}>{error}</div>}
    <div className="notice" style={{ marginTop: 14 }}><strong>Payment QR:</strong> save the PG first, then upload its own UPI QR on the property card.</div>
  </Modal>
}
