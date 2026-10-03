"use client"

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FileText, IndianRupee } from '@/components/Icons'
import { createClient } from '@/lib/supabase/client'

const features = [
  ['Rooms & beds', Building2],
  ['Rent tracking', IndianRupee],
  ['Receipts & reports', FileText],
] as const

export default function Login() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <main className="login-shell">
      <section className="login-hero" style={{ padding: '56px 7vw', background: 'linear-gradient(135deg,#102b23,#1f6b55 66%,#2e7a62)', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div className="brand" style={{ padding: 0 }}><div className="logo">P</div><div><div className="brand-name">PGCopilot</div><div className="brand-sub">Simple PG management</div></div></div>
          <div style={{ maxWidth: 560, marginTop: 82 }}>
            <div className="eyebrow" style={{ color: '#a6d6c2' }}>OWNER-FIRST WORKSPACE</div>
            <h1 style={{ fontFamily: 'Manrope', fontSize: 'clamp(42px,5vw,68px)', lineHeight: 1.03, letterSpacing: '-.05em', margin: '10px 0 18px' }}>Run your PG.<br /><span style={{ color: '#bfe3d6' }}>Without the chaos.</span></h1>
            <p style={{ color: '#cadbd5', fontSize: 15, lineHeight: 1.8, maxWidth: 510 }}>Tenants, rooms, rent and receipts — all in one calm dashboard built for PG owners.</p>
          </div>
        </div>
        <div className="grid grid-3" style={{ marginTop: 52 }}>
          {features.map(([label, Icon]) => <div key={label} style={{ border: '1px solid rgba(255,255,255,.13)', background: 'rgba(255,255,255,.06)', borderRadius: 16, padding: 16 }}><Icon size={19} /><div style={{ marginTop: 9, fontSize: 12, fontWeight: 700 }}>{label}</div><div style={{ marginTop: 3, fontSize: 10, color: '#a7c2b7' }}>Made simple</div></div>)}
        </div>
      </section>

      <section className="login-panel" style={{ display: 'grid', placeItems: 'center', padding: 28, background: '#f6f8f7' }}>
        <div style={{ width: 'min(430px,100%)' }}>
          <div style={{ marginBottom: 24 }}><div className="eyebrow">Owner login</div><h2 className="page-title" style={{ fontSize: 32 }}>Welcome back</h2><p className="page-desc">Sign in with the owner account</p></div>
          <form className="card" style={{ padding: 24 }} onSubmit={submit}>
            <div className="field"><label>Email</label><input className="input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></div>
            <div className="field" style={{ marginTop: 13 }}><label>Password</label><input className="input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></div>
            {error && <div className="notice warning-box" style={{ marginTop: 14 }}>{error}</div>}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 18 }} disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'var(--muted)' }}>New owner? <Link href="/signup" style={{ color: 'var(--green)', fontWeight: 800 }}>Create an account</Link></div>
          </form>
          <div style={{ textAlign: 'center', fontSize: 10, color: '#94a09b', marginTop: 14 }}>PGCopilot • Owner workspace</div>
        </div>
      </section>
    </main>
  )
}
