"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  Check,
  Pencil,
  Search,
  Sparkles,
} from "@/components/Icons"

import {
  EmptyState,
  ErrorNotice,
  LoadingState,
  Modal,
  Money,
  Page,
  formatDate,
  initials,
} from "@/components/Ui"

import {
  generateRentForMonth,
  getProperties,
  getRentCharges,
  getRooms,
  getTenants,
  markRentPaid,
  monthLabel,
  monthStart,
  toLocalIsoDate,
  updateRentChargeAmount,
} from "@/lib/app-data"

import type {
  Property,
  RentChargeWithReceipt,
  Room,
  Tenant,
} from "@/lib/types"

const getMonthKey = (date: Date) =>
  toLocalIsoDate(monthStart(date)).slice(0, 7)

const getDateFromMonthKey = (monthKey: string) =>
  new Date(`${monthKey}-01T00:00:00`)

const buildMonthOptions = () => {
  const current = monthStart(new Date())

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(
      current.getFullYear(),
      current.getMonth() - index,
      1,
    )

    return {
      key: getMonthKey(date),
      label: date.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
      isCurrent: index === 0,
    }
  })
}

export default function Payments() {
  const currentMonthKey = getMonthKey(new Date())

  const [charges, setCharges] = useState<
    RentChargeWithReceipt[]
  >([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<
    Property[]
  >([])
  const [rooms, setRooms] = useState<Room[]>([])

  const [month, setMonth] = useState(currentMonthKey)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<
    "all" | "pending" | "paid"
  >("all")

  const [pay, setPay] =
    useState<RentChargeWithReceipt | null>(null)

  const [editAmount, setEditAmount] =
    useState<RentChargeWithReceipt | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generateMessage, setGenerateMessage] =
    useState("")

  const monthOptions = useMemo(
    () => buildMonthOptions(),
    [],
  )

  const load = useCallback(
    async (targetMonth: string) => {
      setLoading(true)

      try {
        const targetDate =
          getDateFromMonthKey(targetMonth)

        const [
          nextCharges,
          nextTenants,
          nextProperties,
          nextRooms,
        ] = await Promise.all([
          getRentCharges(targetDate),
          getTenants(),
          getProperties(),
          getRooms(),
        ])

        setCharges(nextCharges)
        setTenants(nextTenants)
        setProperties(nextProperties)
        setRooms(nextRooms)
        setError("")
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load payments.",
        )
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void load(month)
  }, [load, month])

  const generate = async () => {
    setGenerating(true)
    setGenerateMessage("")
    setError("")

    try {
      const count = await generateRentForMonth(
        getDateFromMonthKey(month),
      )

      setGenerateMessage(
        count > 0
          ? `Created ${count} rent charge${
              count === 1 ? "" : "s"
            } for ${monthLabel(`${month}-01`)}.`
          : `All eligible tenants already have a charge for ${monthLabel(
              `${month}-01`,
            )}.`,
      )

      await load(month)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate rent.",
      )
    } finally {
      setGenerating(false)
    }
  }

  const rows = useMemo(() => {
    const normalizedQuery =
      query.trim().toLowerCase()

    return charges
      .map((charge) => {
        const tenant = tenants.find(
          (tenantItem) =>
            tenantItem.id === charge.tenant_id,
        )

        const property = properties.find(
          (propertyItem) =>
            propertyItem.id === charge.property_id,
        )

        const room = tenant
          ? rooms.find(
              (roomItem) =>
                roomItem.id === tenant.room_id,
            )
          : undefined

        return {
          charge,
          tenant,
          property,
          room,
        }
      })
      .filter(({ tenant, property }) =>
        Boolean(tenant && property),
      )
      .filter(({ charge }) => {
        if (status === "all") {
          return true
        }

        if (status === "paid") {
          return charge.status === "paid"
        }

        return charge.status !== "paid"
      })
      .filter(({ tenant, property }) => {
        if (!normalizedQuery) {
          return true
        }

        return `${tenant!.full_name} ${
          property!.name
        } ${tenant!.whatsapp}`
          .toLowerCase()
          .includes(normalizedQuery)
      })
  }, [
    charges,
    tenants,
    properties,
    rooms,
    query,
    status,
  ])

  const pendingCount = charges.filter(
    (charge) => charge.status !== "paid",
  ).length

  const savePayment = async (values: {
    amount: number
    paymentMethod: string
    utr: string
    paidAt: string
  }) => {
    if (!pay) {
      return
    }

    await markRentPaid(pay.id, {
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      utr: values.utr,
      paidAt: `${values.paidAt}T12:00:00`,
    })

    setPay(null)
    await load(month)
  }

  const saveAmount = async (amount: number) => {
    if (!editAmount) {
      return
    }

    await updateRentChargeAmount(
      editAmount.id,
      amount,
    )

    setEditAmount(null)
    await load(month)
  }

  const selectedMonthLabel = monthLabel(
    `${month}-01`,
  )

  return (
    <Page
      eyebrow="Collections"
      title="Payments"
      desc="Generate a month's rent, then record payments as they come in."
      actions={
        <span
          className={`pill ${
            pendingCount > 0
              ? "pill-yellow"
              : "pill-green"
          }`}
        >
          {pendingCount} pending
        </span>
      }
    >
      {error && <ErrorNotice message={error} />}

      {generateMessage && (
        <div
          className="notice"
          style={{ marginBottom: 14 }}
        >
          {generateMessage}
        </div>
      )}

      <div className="filters">
        <div
          style={{
            position: "relative",
            minWidth: 260,
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 10,
              top: 9,
              color: "#87938d",
            }}
          >
            <Search size={15} />
          </span>

          <input
            className="input search"
            style={{
              paddingLeft: 32,
              width: "100%",
            }}
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search tenant or PG..."
          />
        </div>

        <select
          className="select"
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as
                | "all"
                | "pending"
                | "paid",
            )
          }
        >
          <option value="all">
            All statuses
          </option>
          <option value="pending">
            Pending
          </option>
          <option value="paid">
            Paid
          </option>
        </select>

        <select
          className="select"
          value={month}
          onChange={(event) => {
            setMonth(event.target.value)
            setGenerateMessage("")
          }}
          aria-label="Payment month"
        >
          {monthOptions.map((option) => (
            <option
              key={option.key}
              value={option.key}
            >
              {option.isCurrent
                ? `${option.label} (Current)`
                : option.label}
            </option>
          ))}
        </select>

        <button
          className="btn btn-primary"
          type="button"
          onClick={generate}
          disabled={generating}
        >
          <Sparkles size={14} />
          {generating
            ? "Generating..."
            : "Generate Rent"}
        </button>
      </div>

      <section className="card section-card">
        {loading ? (
          <LoadingState text="Loading payments..." />
        ) : rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>PG / Room</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  ({
                    charge,
                    tenant,
                    property,
                    room,
                  }) => (
                    <tr key={charge.id}>
                      <td>
                        <div className="person">
                          <div className="person-avatar">
                            {initials(
                              tenant!.full_name,
                            )}
                          </div>

                          <div>
                            <div className="person-name">
                              {tenant!.full_name}
                            </div>

                            <div className="person-sub">
                              +91{" "}
                              {tenant!.whatsapp}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        {property!.name} ·{" "}
                        {room?.room_number || "—"}
                      </td>

                      <td>
                        <strong>
                          <Money
                            value={charge.amount}
                          />
                        </strong>

                        {charge.status !==
                          "paid" && (
                          <button
                            className="icon-btn"
                            style={{
                              marginLeft: 6,
                            }}
                            type="button"
                            aria-label="Edit this month's amount"
                            onClick={() =>
                              setEditAmount(
                                charge,
                              )
                            }
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                      </td>

                      <td>
                        {formatDate(
                          charge.due_date,
                        )}
                      </td>

                      <td>
                        <span
                          className={`pill ${
                            charge.status === "paid"
                              ? "pill-green"
                              : "pill-yellow"
                          }`}
                        >
                          {charge.status}
                        </span>
                      </td>

                      <td>
                        {charge.status ===
                        "paid" ? (
                          <div
                            style={{
                              fontSize: 10,
                              color:
                                "var(--muted)",
                            }}
                          >
                            {formatDate(
                              charge.paid_at,
                            )}{" "}
                            ·{" "}
                            {charge.payment_method ||
                              "UPI QR"}
                            {charge.utr
                              ? ` · ${charge.utr}`
                              : ""}
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: 10,
                              color:
                                "var(--muted)",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      <td>
                        {charge.status ===
                        "paid" ? (
                          charge.receipts?.id ? (
                            <Link
                              className="btn btn-secondary"
                              style={{
                                padding:
                                  "7px 10px",
                              }}
                              href={`/dashboard/receipts/${charge.receipts.id}`}
                            >
                              View receipt
                            </Link>
                          ) : null
                        ) : (
                          <button
                            className="btn btn-primary"
                            style={{
                              padding:
                                "7px 10px",
                            }}
                            onClick={() =>
                              setPay(charge)
                            }
                            type="button"
                          >
                            <Check size={13} />
                            Mark paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={`No rent charges for ${selectedMonthLabel}`}
            text={
              month === currentMonthKey
                ? `Click "Generate Rent" above to create this month's charges from each tenant's monthly rent.`
                : `There are no rent charges recorded for ${selectedMonthLabel}.`
            }
          />
        )}
      </section>

      {pay && (
        <PaymentModal
          charge={pay}
          tenant={tenants.find(
            (tenant) =>
              tenant.id === pay.tenant_id,
          )}
          onClose={() => setPay(null)}
          onSave={savePayment}
        />
      )}

      {editAmount && (
        <EditAmountModal
          charge={editAmount}
          tenant={tenants.find(
            (tenant) =>
              tenant.id ===
              editAmount.tenant_id,
          )}
          onClose={() =>
            setEditAmount(null)
          }
          onSave={saveAmount}
        />
      )}
    </Page>
  )
}

function PaymentModal({
  charge,
  tenant,
  onClose,
  onSave,
}: {
  charge: RentChargeWithReceipt
  tenant?: Tenant
  onClose: () => void
  onSave: (values: {
    amount: number
    paymentMethod: string
    utr: string
    paidAt: string
  }) => Promise<void>
}) {
  const [amount, setAmount] = useState(
    String(charge.amount),
  )

  const [paymentMethod, setPaymentMethod] =
    useState("UPI QR")

  const [utr, setUtr] = useState("")

  const [paidAt, setPaidAt] =
    useState(toLocalIsoDate())

  const [saving, setSaving] =
    useState(false)

  const [error, setError] = useState("")

  const submit = async () => {
    const parsedAmount = Number(amount)

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount < 0
    ) {
      setError("Enter a valid amount.")
      return
    }

    setSaving(true)
    setError("")

    try {
      await onSave({
        amount: parsedAmount,
        paymentMethod,
        utr,
        paidAt,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save payment.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Mark ${
        tenant?.full_name || "tenant"
      } as paid`}
      onClose={onClose}
      footer={
        <>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
            type="button"
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving}
            type="button"
          >
            {saving
              ? "Saving..."
              : "Save payment"}
          </button>
        </>
      }
    >
      <div className="notice">
        <strong>
          {tenant?.full_name || "Tenant"}
        </strong>{" "}
        · {monthLabel(charge.rent_month)}.
        Recording this payment creates a
        receipt automatically.
      </div>

      <div
        className="grid grid-2"
        style={{ marginTop: 14 }}
      >
        <div className="field">
          <label>Amount</label>

          <input
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            className="input"
          />
        </div>

        <div className="field">
          <label>Payment method</label>

          <select
            className="select"
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(
                event.target.value,
              )
            }
          >
            <option value="UPI QR">
              UPI QR
            </option>
            <option value="Cash">
              Cash
            </option>
            <option value="Bank Transfer">
              Bank Transfer
            </option>
            <option value="Other">
              Other
            </option>
          </select>
        </div>

        <div className="field">
          <label>
            UTR / reference (optional)
          </label>

          <input
            value={utr}
            onChange={(event) =>
              setUtr(event.target.value)
            }
            className="input"
            placeholder="UTR or transaction ID"
          />
        </div>

        <div className="field">
          <label>Payment date</label>

          <input
            type="date"
            value={paidAt}
            onChange={(event) =>
              setPaidAt(event.target.value)
            }
            className="input"
          />
        </div>
      </div>

      {error && (
        <div
          className="notice warning-box"
          style={{ marginTop: 12 }}
        >
          {error}
        </div>
      )}
    </Modal>
  )
}

function EditAmountModal({
  charge,
  tenant,
  onClose,
  onSave,
}: {
  charge: RentChargeWithReceipt
  tenant?: Tenant
  onClose: () => void
  onSave: (amount: number) => Promise<void>
}) {
  const [amount, setAmount] = useState(
    String(charge.amount),
  )

  const [saving, setSaving] =
    useState(false)

  const [error, setError] = useState("")

  const submit = async () => {
    const parsedAmount = Number(amount)

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount < 0
    ) {
      setError("Enter a valid amount.")
      return
    }

    setSaving(true)
    setError("")

    try {
      await onSave(parsedAmount)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Edit this month's rent"
      onClose={onClose}
      footer={
        <>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
            type="button"
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving}
            type="button"
          >
            {saving
              ? "Saving..."
              : "Save amount"}
          </button>
        </>
      }
    >
      <div className="notice">
        This changes only{" "}
        {tenant?.full_name || "this tenant"}
        &apos;s{" "}
        {monthLabel(charge.rent_month)}
        charge — their permanent monthly
        rent stays the same.
      </div>

      <div
        className="field"
        style={{ marginTop: 14 }}
      >
        <label>
          Amount for{" "}
          {monthLabel(charge.rent_month)}
        </label>

        <input
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(event) =>
            setAmount(event.target.value)
          }
          className="input"
          autoFocus
        />
      </div>

      {error && (
        <div
          className="notice warning-box"
          style={{ marginTop: 12 }}
        >
          {error}
        </div>
      )}
    </Modal>
  )
}