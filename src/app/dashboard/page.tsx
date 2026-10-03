"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight, BedDouble, Bell, Building2, IndianRupee, Plus, Users } from '@/components/Icons'
import { EmptyState, ErrorNotice, LoadingState, Money, Page, formatDate, initials } from '@/components/Ui'
import { getDashboardData, formatMoney } from '@/lib/app-data'

export default function Dashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardData>> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getDashboardData().then((result) => { if (alive) setData(result) }).catch((err: unknown) => { if (alive) setError(err instanceof Error ? err.message : 'Unable to load dashboard.') })
    return () => { alive = false }
  }, [])

  if (!data && !error) return <Page eyebrow="Owner dashboard" title="Your PG at a glance" desc="Tenants, occupancy and rent collection in one place."><LoadingState text="Loading your workspace..." /></Page>
  if (error) return <Page eyebrow="Owner dashboard" title="Your PG at a glance" desc="Tenants, occupancy and rent collection in one place."><ErrorNotice message={error} /></Page>
  if (!data) return null

  const { properties, tenants, charges, expected, collected, pending, currentMonth, propertiesWithStats } = data
  const occupied = tenants.filter((tenant) => tenant.status === 'active').length
  const totalBeds = properties.reduce((sum, property) => sum + Number(property.total_beds || 0), 0)
  const pendingTenants = pending.map((charge) => {
    const tenant = tenants.find((item) => item.id === charge.tenant_id)
    const property = properties.find((item) => item.id === charge.property_id)
    return { charge, tenant, property }
  }).filter((item) => item.tenant)
  const paidPct = expected ? Math.round((collected / expected) * 100) : 0

  return <Page eyebrow="Owner dashboard" title="Your PG at a glance" desc={`Current rent cycle: ${currentMonth}.`} actions={<Link className="btn btn-primary" href="/dashboard/tenants?new=1"><Plus size={15} /> Add tenant</Link>}>
    <div className="grid grid-4">
      <Kpi label="Active tenants" value={String(occupied)} foot={`${properties.length} PG${properties.length === 1 ? '' : 's'}`} icon={<Users size={17} />} />
      <Kpi label="Occupied beds" value={`${occupied}/${totalBeds}`} foot={`${totalBeds ? Math.round((occupied / totalBeds) * 100) : 0}% occupancy`} icon={<BedDouble size={17} />} />
      <Kpi label="Rent collected" value={formatMoney(collected)} foot={`${paidPct}% of expected`} icon={<IndianRupee size={17} />} />
      <Kpi label="Rent pending" value={formatMoney(pending.reduce((sum, charge) => sum + Number(charge.amount), 0))} foot={`${pending.length} unpaid charge${pending.length === 1 ? '' : 's'}`} icon={<Bell size={17} />} />
    </div>

    <div className="grid grid-2" style={{ marginTop: 16 }}>
      <section className="card section-card">
        <div className="section-head"><div><div className="section-title">Pending rent</div><div className="section-note">Only unpaid {currentMonth} charges</div></div><Link href="/dashboard/payments" className="btn btn-secondary">View all <ArrowUpRight size={14} /></Link></div>
        {charges.length === 0
          ? <EmptyState title="No rent generated yet" text={`Generate ${currentMonth}'s rent from Payments to start tracking it.`} />
          : pendingTenants.length
            ? <div className="table-wrap"><table className="table"><thead><tr><th>Tenant</th><th>PG / Room</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>{pendingTenants.slice(0, 7).map(({ charge, tenant, property }) => <tr key={charge.id}><td><div className="person"><div className="person-avatar">{initials(tenant!.full_name)}</div><div><div className="person-name">{tenant!.full_name}</div><div className="person-sub">+91 {tenant!.whatsapp}</div></div></div></td><td>{property?.name || '—'}</td><td><strong><Money value={charge.amount} /></strong></td><td>{formatDate(charge.due_date)}</td><td><span className="pill pill-yellow">Pending</span></td></tr>)}</tbody></table></div>
            : <EmptyState title="No pending rent" text="Everyone with a charge for this month is paid." />}
      </section>

      <section className="card section-card">
        <div className="section-head"><div><div className="section-title">Your PGs</div><div className="section-note">Each property keeps its own QR and UPI details.</div></div><Link href="/dashboard/properties" className="btn btn-secondary">Manage <ArrowUpRight size={14} /></Link></div>
        {propertiesWithStats.length ? <div style={{ display: 'grid', gap: 10 }}>{propertiesWithStats.map(({ property, occupied: propertyOccupied, pending: propertyPending }) => <div key={property.id} style={{ padding: 13, border: '1px solid var(--line)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}><div className="avatar" style={{ background: '#edf5f1', color: '#27654f' }}><Building2 size={16} /></div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 12 }}>{property.name}</div><div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{property.address} · {propertyOccupied}/{property.total_beds} occupied</div></div></div><span className={`pill ${propertyPending ? 'pill-yellow' : 'pill-green'}`}>{formatMoney(propertyPending)} pending</span></div>)}</div> : <EmptyState title="No PGs yet" text="Create your first property from My PGs." />}
      </section>
    </div>

    <section className="card section-card" style={{ marginTop: 16 }}>
      <div className="section-head"><div><div className="section-title">Rent workflow</div><div className="section-note">Nothing is created automatically — the owner stays in control of every charge.</div></div></div>
      <div className="grid grid-3"><Workflow day="1" title="Pick a month" text="Open Payments and choose the month you want to collect rent for." /><Workflow day="2" title="Generate rent" text="One click creates a charge for every eligible active tenant, using their stored monthly rent." /><Workflow day="3" title="Record payments" text="Mark each charge paid as money comes in — a receipt is created automatically." /></div>
    </section>
  </Page>
}

function Kpi({ label, value, foot, icon }: { label: string; value: string; foot: string; icon: React.ReactNode }) {
  return <div className="card kpi"><div className="kpi-top"><div className="kpi-label">{label}</div><div className="kpi-icon">{icon}</div></div><div className="kpi-value">{value}</div><div className="kpi-foot"><span className="trend">●</span> {foot}</div></div>
}

function Workflow({ day, title, text }: { day: string; title: string; text: string }) {
  return <div style={{ padding: 15, border: '1px solid var(--line)', borderRadius: 12, background: '#fbfcfb' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="pill pill-green">{day}</span><strong style={{ fontSize: 12 }}>{title}</strong></div><p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>{text}</p></div>
}
