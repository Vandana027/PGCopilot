"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Download } from '@/components/Icons'
import { ErrorNotice, LoadingState, Money, Page, formatDate } from '@/components/Ui'
import { getReceipt } from '@/lib/app-data'
import type { ReceiptDetail } from '@/lib/types'

export default function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('')
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { params.then((value) => setId(value.id)) }, [params])
  useEffect(() => { if (!id) return; getReceipt(id).then(setReceipt).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load receipt.')).finally(() => setLoading(false)) }, [id])
  if (loading) return <Page eyebrow="Receipt" title="Payment receipt" desc="Loading receipt..."><LoadingState /></Page>
  if (error) return <Page eyebrow="Receipt" title="Receipt not found" desc="The payment record is not available."><ErrorNotice message={error} /><Link className="btn btn-secondary" href="/dashboard/receipts"><ArrowLeft size={14} /> Back</Link></Page>
  if (!receipt) return <Page eyebrow="Receipt" title="Receipt not found" desc="The payment record is not available."><Link className="btn btn-secondary" href="/dashboard/receipts"><ArrowLeft size={14} /> Back</Link></Page>

  const charge = receipt.rent_charges
  const tenant = charge?.tenants
  const property = charge?.properties
  return <Page eyebrow="Receipt" title={`Receipt · ${tenant?.full_name || 'Tenant'}`} desc="Clean, printable proof of payment." actions={<button className="btn btn-primary" onClick={() => window.print()}><Download size={14} /> Print / save PDF</button>}>
    <div className="card" style={{ maxWidth: 720, margin: '0 auto', padding: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 18 }}><div><div className="brand-name" style={{ color: 'var(--green)' }}>PGCopilot</div><div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{property?.name || 'PG property'}</div></div><div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>Receipt</div><div style={{ fontWeight: 800, marginTop: 4 }}>{receipt.receipt_number}</div></div></div>
      <div className="detail-list" style={{ marginTop: 20 }}><Detail l="Tenant" v={tenant?.full_name || '—'} /><Detail l="Room" v={tenant?.rooms?.room_number || '—'} /><Detail l="Rent month" v={charge ? new Date(`${charge.rent_month}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'} /><Detail l="Paid on" v={formatDate(charge?.paid_at)} /><Detail l="UTR" v={charge?.utr || '—'} /><Detail l="Payment method" v="UPI QR" /></div>
      <div style={{ marginTop: 20, padding: 18, borderRadius: 14, background: '#f7faf8', display: 'flex', justifyContent: 'space-between' }}><div><div style={{ fontSize: 10, color: 'var(--muted)' }}>Amount received</div><div className="kpi-value" style={{ marginTop: 4 }}><Money value={receipt.amount} /></div></div><span className="pill pill-green">Paid</span></div>
    </div>
  </Page>
}
function Detail({ l, v }: { l: string; v: string }) { return <div className="detail-item"><div className="detail-label">{l}</div><div className="detail-value">{v}</div></div> }
