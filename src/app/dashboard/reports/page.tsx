"use client"

import { useEffect, useState } from 'react'
import { Download } from '@/components/Icons'
import { ErrorNotice, LoadingState, Money, Page } from '@/components/Ui'
import { getDashboardData } from '@/lib/app-data'

export default function Reports() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardData>> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { getDashboardData().then(setData).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load report.')) }, [])
  if (!data && !error) return <Page eyebrow="Visibility" title="Reports" desc="A clean monthly picture of occupancy and rent collection."><LoadingState /></Page>
  if (error) return <Page eyebrow="Visibility" title="Reports" desc="A clean monthly picture of occupancy and rent collection."><ErrorNotice message={error} /></Page>
  if (!data) return null
  const { expected, collected, pending, propertiesWithStats, activeTenants } = data
  const pendingAmount = pending.reduce((sum, charge) => sum + Number(charge.amount), 0)
  const collectedPct = expected ? Math.round((collected / expected) * 100) : 0
  return <Page eyebrow="Visibility" title="Reports" desc={`Monthly view for ${data.currentMonth}.`} actions={<button className="btn btn-secondary" onClick={() => window.print()}><Download size={14} /> Print report</button>}>
    <div className="grid grid-3"><div className="card kpi"><div className="kpi-label">Expected rent</div><div className="kpi-value"><Money value={expected} /></div><div className="kpi-foot">{data.currentMonth}</div></div><div className="card kpi"><div className="kpi-label">Collected</div><div className="kpi-value"><Money value={collected} /></div><div className="kpi-foot"><span className="trend">{collectedPct}%</span> collected</div></div><div className="card kpi"><div className="kpi-label">Pending</div><div className="kpi-value"><Money value={pendingAmount} /></div><div className="kpi-foot">{pending.length} unpaid charge{pending.length === 1 ? '' : 's'}</div></div></div>
    <div className="grid grid-2" style={{ marginTop: 16 }}><section className="card section-card"><div className="section-head"><div><div className="section-title">Current collection</div><div className="section-note">Paid vs expected for {data.currentMonth}</div></div></div><div className="progress" style={{ height: 12, marginTop: 8 }}><span style={{ width: `${collectedPct}%` }} /></div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--muted)' }}><span>{collectedPct}% collected</span><span>{activeTenants.length} active tenants</span></div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--muted)' }}><span>{data.charges.filter((c) => c.status === 'paid').length} paid</span><span>{pending.length} unpaid</span></div></section><section className="card section-card"><div className="section-head"><div><div className="section-title">Property snapshot</div><div className="section-note">Occupancy and pending rent</div></div></div><div style={{ display: 'grid', gap: 10 }}>{propertiesWithStats.map(({ property, occupied, pending: propertyPending }) => <div key={property.id} style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 11 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong style={{ fontSize: 12 }}>{property.name}</strong><span className={`pill ${property.total_beds && occupied / property.total_beds >= .8 ? 'pill-green' : 'pill-gray'}`}>{property.total_beds ? Math.round((occupied / property.total_beds) * 100) : 0}%</span></div><div className="progress" style={{ marginBottom: 6 }}><span style={{ width: `${property.total_beds ? Math.min(100, (occupied / property.total_beds) * 100) : 0}%` }} /></div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}><span>{occupied}/{property.total_beds || 0} beds</span><span><Money value={propertyPending} /> pending</span></div></div>)}</div></section></div>
  </Page>
}
