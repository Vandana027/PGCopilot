"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight } from '@/components/Icons'
import { EmptyState, ErrorNotice, LoadingState, Money, Page, formatDate } from '@/components/Ui'
import { getReceipts } from '@/lib/app-data'
import type { ReceiptWithCharge } from '@/lib/types'

export default function Receipts() {
  const [items, setItems] = useState<ReceiptWithCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { getReceipts().then(setItems).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load receipts.')).finally(() => setLoading(false)) }, [])
  return <Page eyebrow="Payment records" title="Receipts" desc="Printable receipts for payments already recorded as paid.">{error && <ErrorNotice message={error} />}<section className="card section-card">{loading ? <LoadingState text="Loading receipts..." /> : items.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Receipt</th><th>Tenant</th><th>Month</th><th>Amount</th><th>Paid on</th><th /></tr></thead><tbody>{items.map((item) => { const charge = item.rent_charges; return <tr key={item.id}><td>{item.receipt_number}</td><td>{charge?.tenants?.full_name || '—'}</td><td>{charge ? new Date(`${charge.rent_month}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}</td><td><strong><Money value={item.amount} /></strong></td><td>{formatDate(charge?.paid_at)}</td><td><Link className="btn btn-secondary" style={{ padding: '7px 9px' }} href={`/dashboard/receipts/${item.id}`}><ArrowUpRight size={13} /> View</Link></td></tr> })}</tbody></table></div> : <EmptyState title="No receipts yet" text="Mark a rent charge as paid to generate the first receipt." />}</section></Page>
}
