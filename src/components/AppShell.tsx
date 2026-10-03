/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BarChart3, BedDouble, Building2, FileText, IndianRupee, LayoutDashboard, Menu, Settings, Users, X, LogOut } from './Icons'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Property } from '@/lib/types'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/properties', label: 'My PGs', icon: Building2 },
  { href: '/dashboard/tenants', label: 'Tenants', icon: Users },
  { href: '/dashboard/rooms', label: 'Rooms & Beds', icon: BedDouble },
  { href: '/dashboard/payments', label: 'Payments', icon: IndianRupee },
  { href: '/dashboard/receipts', label: 'Receipts', icon: FileText },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    const supabase = createClient()
    let active = true
    Promise.all([
      supabase.from('profiles').select('id,full_name,phone').maybeSingle(),
      supabase.from('properties').select('*').eq('is_active', true).order('created_at', { ascending: true }),
    ]).then(([profileResult, propertiesResult]) => {
      if (!active) return
      if (!profileResult.error) setProfile((profileResult.data as Profile | null) || null)
      if (!propertiesResult.error) setProperties((propertiesResult.data as Property[]) || [])
    })
    return () => { active = false }
  }, [pathname])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const propertyLabel = properties.length === 1 ? properties[0].name : `${properties.length || 'No'} PGs`
  const ownerName = profile?.full_name || 'PG Owner'
  const ownerInitials = ownerName.split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="logo">P</div>
          <div><div className="brand-name">PGCopilot</div><div className="brand-sub">Simple PG management</div></div>
        </div>
        <div className="nav-section">Workspace</div>
        <nav className="nav">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
            return <Link className={`nav-link ${active ? 'active' : ''}`} href={href} key={href}><span className="nav-icon"><Icon size={16} /></span>{label}</Link>
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">{ownerInitials || 'O'}</div>
            <div style={{ minWidth: 0 }}><div className="user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ownerName}</div><div className="user-role">Owner account</div></div>
          </div>
          <button className="nav-link signout" type="button" onClick={signOut}><span className="nav-icon"><LogOut size={15} /></span>Sign out</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn mobile-toggle" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">{open ? <X size={17} /> : <Menu size={17} />}</button>
          <div className="breadcrumb">Owner workspace <span style={{ margin: '0 6px', color: '#a1ada7' }}>/</span> {titleFromPath(pathname)}</div>
          <div className="topbar-right">
            <Link href="/dashboard/properties" className="property-switch" title="Manage your PGs"><span className="dot" /> {propertyLabel} <span style={{ color: '#9aa6a1' }}>↗</span></Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}

function titleFromPath(path: string) {
  if (path === '/dashboard') return 'Dashboard'
  const val = path.split('/').filter(Boolean).slice(-1)[0] || 'Dashboard'
  return val.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
