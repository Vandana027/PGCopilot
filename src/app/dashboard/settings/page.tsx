"use client"

import { useEffect, useState } from "react"
import { IndianRupee } from "@/components/Icons"
import { ErrorNotice, LoadingState, Page } from "@/components/Ui"
import { getProfile, saveProfile, getCurrentUser } from "@/lib/app-data"

export default function Settings() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([getProfile(), getCurrentUser()])
      .then(([profile, user]) => {
        setName(profile?.full_name || "")
        setPhone(profile?.phone || "")
        setEmail(user.email || "")
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load settings."
        )
      })
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setError("")

    try {
      await saveProfile({
        full_name: name,
        phone,
      })

      setSaved(true)

      setTimeout(() => {
        setSaved(false)
      }, 1500)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save profile."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page
      eyebrow="Owner controls"
      title="Settings"
      desc="Keep the system simple. Change owner details here."
    >
      {error && <ErrorNotice message={error} />}

      {loading ? (
        <LoadingState text="Loading settings..." />
      ) : (
        <>
          <div className="grid grid-2">
            {/* OWNER PROFILE */}
            <section className="card section-card">
              <div className="section-head">
                <div>
                  <div className="section-title">
                    Owner profile
                  </div>

                  <div className="section-note">
                    Used in your workspace and future receipts.
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label>Owner name</label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>WhatsApp / phone</label>

                  <input
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                  />
                </div>

                <div className="field full">
                  <label>Email</label>

                  <input
                    value={email}
                    readOnly
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ marginTop: 15 }}
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save profile"}
              </button>

              {saved && (
                <div
                  className="notice"
                  style={{ marginTop: 12 }}
                >
                  <strong>Saved.</strong>
                </div>
              )}
            </section>

            {/* RENT WORKFLOW */}
            <section className="card section-card">
              <div className="section-head">
                <div>
                  <div className="section-title">
                    Rent workflow
                  </div>

                  <div className="section-note">
                    Nothing happens automatically — every step is
                    an explicit action on the Payments page.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                }}
              >
                <Setting
                  t="Generate Rent"
                  x="Creates a charge for each eligible active tenant from their stored monthly rent."
                />

                <Setting
                  t="Editable per month"
                  x="A single month's amount can be adjusted without changing the tenant's permanent rent."
                />

                <Setting
                  t="Mark Paid"
                  x="Records amount, method, date and UTR, and issues a receipt. Safe to click twice."
                />
              </div>

              <span
                className="pill pill-green"
                style={{ marginTop: 14 }}
              >
                Workflow ready
              </span>
            </section>
          </div>
        </>
      )}
    </Page>
  )
}

function Setting({
  t,
  x,
}: {
  t: string
  x: string
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: 12,
        border: "1px solid var(--line)",
        borderRadius: 11,
      }}
    >
      <div className="kpi-icon">
        <IndianRupee size={15} />
      </div>

      <div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 11,
          }}
        >
          {t}
        </div>

        <div
          style={{
            fontSize: 10,
            color: "var(--muted)",
            marginTop: 3,
          }}
        >
          {x}
        </div>
      </div>
    </div>
  )
}