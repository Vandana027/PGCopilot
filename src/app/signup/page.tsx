"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function SignUp() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")
    setMessage("")

    const cleanName = name.trim()
    const cleanPhone = phone.trim()
    const cleanEmail = email.trim().toLowerCase()

    // -----------------------------
    // Name validation
    // Letters and spaces only
    // -----------------------------
    if (!cleanName) {
      setError("Please enter your full name.")
      return
    }

    if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(cleanName)) {
      setError("Full name can contain letters and spaces only.")
      return
    }

    // -----------------------------
    // Phone validation
    // Indian 10-digit mobile number
    // Must start with 6, 7, 8 or 9
    // -----------------------------
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError(
        "Enter a valid 10-digit WhatsApp number starting with 6, 7, 8, or 9."
      )
      return
    }

    // -----------------------------
    // Email validation
    // -----------------------------
    if (!cleanEmail) {
      setError("Please enter your email address.")
      return
    }

    // -----------------------------
    // Password validation
    // -----------------------------
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      // -----------------------------
      // Supabase signup error
      // -----------------------------
      if (signUpError) {
        const errorMessage = signUpError.message.toLowerCase()

        if (
          errorMessage.includes("already registered") ||
          errorMessage.includes("already exists") ||
          errorMessage.includes("user already registered") ||
          errorMessage.includes("email_exists") ||
          errorMessage.includes("user_already_exists")
        ) {
          setError(
            "An account with this email already exists. Please sign in instead."
          )
        } else {
          setError(signUpError.message)
        }

        return
      }

      // -----------------------------
      // Existing confirmed user
      // Supabase can return a user
      // with no identities
      // -----------------------------
      if (
        data.user &&
        data.user.identities &&
        data.user.identities.length === 0
      ) {
        setError(
          "An account with this email already exists. Please sign in instead."
        )
        return
      }

      // -----------------------------
      // User is immediately logged in
      // -----------------------------
      if (data.session) {
        router.replace("/dashboard")
        router.refresh()
        return
      }

      // -----------------------------
      // Email confirmation required
      // -----------------------------
      setMessage(
        "Account created successfully. Please check your email and verify your account before signing in."
      )
    } catch (err) {
      console.error("Signup error:", err)

      setError(
        "Something went wrong while creating your account. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f6f8f7",
      }}
    >
      <div style={{ width: "min(480px,100%)" }}>
        <div
          className="brand"
          style={{
            padding: "0 0 20px",
          }}
        >
          <div className="logo">P</div>

          <div>
            <div
              className="brand-name"
              style={{
                color: "var(--ink)",
              }}
            >
              PGCopilot
            </div>

            <div className="brand-sub">
              Create your owner workspace
            </div>
          </div>
        </div>

        <form
          className="card"
          style={{
            padding: 24,
          }}
          onSubmit={submit}
          noValidate
        >
          <div className="eyebrow">
            New owner
          </div>

          <h1
            className="page-title"
            style={{
              marginTop: 4,
            }}
          >
            Create your workspace
          </h1>

          <p className="page-desc">
            Start with one account and add as many PG properties as you need.
          </p>

          <div
            className="form-grid"
            style={{
              marginTop: 20,
            }}
          >
            {/* FULL NAME */}
            <div className="field full">
              <label htmlFor="name">
                Full name
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => {
                  const value = event.target.value

                  // Allow letters and spaces only
                  if (/^[A-Za-z ]*$/.test(value)) {
                    setName(value)
                  }
                }}
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </div>

            {/* WHATSAPP / PHONE */}
            <div className="field">
              <label htmlFor="phone">
                WhatsApp / phone
              </label>

              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => {
                  // Keep numbers only
                  const digitsOnly = event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10)

                  setPhone(digitsOnly)
                }}
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit number"
                autoComplete="tel"
                required
              />
            </div>

            {/* EMAIL */}
            <div className="field">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                }}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="field full">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                }}
                minLength={8}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div
              className="notice warning-box"
              style={{
                marginTop: 14,
              }}
            >
              {error}
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {message && (
            <div
              className="notice"
              style={{
                marginTop: 14,
              }}
            >
              {message}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: 18,
            }}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create owner account"}
          </button>

          {/* LOGIN LINK */}
          <div
            style={{
              textAlign: "center",
              marginTop: 14,
              fontSize: 11,
              color: "var(--muted)",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              style={{
                color: "var(--green)",
                fontWeight: 800,
              }}
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}