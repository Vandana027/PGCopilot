/* eslint-disable react-hooks/set-state-in-effect */

"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"

import { FileText, Pencil, Plus, Search } from "@/components/Icons"

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
  createTenant,
  getProperties,
  getRooms,
  getSignedTenantDocument,
  getTenants,
  updateTenant,
  uploadTenantDocument,
} from "@/lib/app-data"

import type {
  Property,
  Room,
  Tenant,
} from "@/lib/types"

export default function Tenants() {
  const [items, setItems] =
    useState<Tenant[]>([])

  const [properties, setProperties] =
    useState<Property[]>([])

  const [rooms, setRooms] =
    useState<Room[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] = useState("")

  const [query, setQuery] =
    useState("")

  const [show, setShow] =
    useState(false)

  const [editing, setEditing] =
    useState<Tenant | null>(null)

  const [openingDocument, setOpeningDocument] =
    useState<string | null>(null)

  const load = async () => {
    setLoading(true)

    try {
      const [
        tenantData,
        propertyData,
        roomData,
      ] = await Promise.all([
        getTenants(),
        getProperties(),
        getRooms(),
      ])

      setItems(tenantData)
      setProperties(propertyData)
      setRooms(roomData)
      setError("")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load tenants.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (
      new URLSearchParams(
        window.location.search,
      ).get("new") === "1"
    ) {
      setShow(true)

      window.history.replaceState(
        null,
        "",
        "/dashboard/tenants",
      )
    }
  }, [])

  const filtered = useMemo(() => {
    const normalizedQuery =
      query.trim().toLowerCase()

    return items.filter((tenant) =>
      `${tenant.full_name} ${tenant.whatsapp} ${
        tenant.id_type || ""
      }`
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [items, query])

  const openIdDocument = async (
    tenant: Tenant,
  ) => {
    if (!tenant.id_document_path) {
      setError(
        "No ID proof has been uploaded for this tenant.",
      )
      return
    }

    /*
     * Open a blank tab immediately so the browser
     * does not block the popup after the async
     * signed-URL request completes.
     */
    const newWindow = window.open(
      "about:blank",
      "_blank",
    )

    if (!newWindow) {
      setError(
        "Your browser blocked the document window. Please allow pop-ups for PGCopilot.",
      )
      return
    }

    newWindow.document.title =
      `${tenant.full_name} - ID Proof`

    newWindow.document.body.innerHTML = `
      <div style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        font-family:Arial,sans-serif;
        color:#475569;
        background:#f8fafc;
      ">
        Opening ID proof...
      </div>
    `

    setOpeningDocument(tenant.id)

    try {
      const signedUrl =
        await getSignedTenantDocument(
          tenant.id_document_path,
        )

      newWindow.location.href =
        signedUrl
    } catch (err) {
      newWindow.close()

      setError(
        err instanceof Error
          ? err.message
          : "Unable to open the ID proof.",
      )
    } finally {
      setOpeningDocument(null)
    }
  }

  const save = async (values: {
    property_id: string
    room_id: string | null
    full_name: string
    whatsapp: string
    monthly_rent: number
    move_in_date: string
    move_out_date?: string
    emergency_contact?: string
    id_type?: string
    status?: "active" | "inactive"
    idFile?: File | null
  }) => {
    let tenant: Tenant

    if (editing) {
      tenant = await updateTenant(
        editing.id,
        values,
      )
    } else {
      tenant = await createTenant(
        values as Parameters<
          typeof createTenant
        >[0],
      )
    }

    if (values.idFile) {
      await uploadTenantDocument(
        tenant,
        values.idFile,
      )
    }

    setShow(false)
    setEditing(null)

    await load()
  }

  return (
    <Page
      eyebrow="People"
      title="Tenants"
      desc="One clean record per tenant. The owner controls the full record."
      actions={
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditing(null)
            setShow(true)
          }}
          type="button"
        >
          <Plus size={15} />
          Add tenant
        </button>
      }
    >
      {error && (
        <ErrorNotice message={error} />
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
            placeholder="Search name, WhatsApp or ID..."
          />
        </div>
      </div>

      <section className="card section-card">
        {loading ? (
          <LoadingState text="Loading tenants..." />
        ) : filtered.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>PG / Room</th>
                  <th>WhatsApp</th>
                  <th>Rent</th>
                  <th>Move in</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {filtered.map((tenant) => {
                  const property =
                    properties.find(
                      (item) =>
                        item.id ===
                        tenant.property_id,
                    )

                  const room =
                    rooms.find(
                      (item) =>
                        item.id ===
                        tenant.room_id,
                    )

                  const hasDocument =
                    Boolean(
                      tenant.id_document_path,
                    )

                  return (
                    <tr key={tenant.id}>
                      <td>
                        <div className="person">
                          <div className="person-avatar">
                            {initials(
                              tenant.full_name,
                            )}
                          </div>

                          <div>
                            <div className="person-name">
                              {
                                tenant.full_name
                              }
                            </div>

                            <div className="person-sub">
                              {tenant.id_type ||
                                "ID not set"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        {property?.name ||
                          "—"}{" "}
                        ·{" "}
                        {room?.room_number ||
                          "—"}
                        {tenant.slot_number
                          ? ` · Slot ${tenant.slot_number}`
                          : ""}
                      </td>

                      <td>
                        +91{" "}
                        {tenant.whatsapp}
                      </td>

                      <td>
                        <strong>
                          <Money
                            value={
                              tenant.monthly_rent
                            }
                          />
                        </strong>
                      </td>

                      <td>
                        {formatDate(
                          tenant.move_in_date,
                        )}
                      </td>

                      <td>
                        <span
                          className={`pill ${
                            tenant.status ===
                            "active"
                              ? "pill-green"
                              : "pill-gray"
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            alignItems:
                              "center",
                          }}
                        >
                          {hasDocument ? (
                            <button
                              className="icon-btn"
                              type="button"
                              onClick={() =>
                                openIdDocument(
                                  tenant,
                                )
                              }
                              disabled={
                                openingDocument ===
                                tenant.id
                              }
                              aria-label={`View ID proof for ${tenant.full_name}`}
                              title="View ID proof"
                            >
                              <FileText
                                size={14}
                              />
                            </button>
                          ) : (
                            <span
                              className="icon-btn"
                              style={{
                                opacity: 0.35,
                                cursor:
                                  "default",
                              }}
                              title="No ID proof uploaded"
                              aria-label="No ID proof uploaded"
                            >
                              <FileText
                                size={14}
                              />
                            </span>
                          )}

                          <button
                            className="icon-btn"
                            type="button"
                            onClick={() => {
                              setEditing(
                                tenant,
                              )
                              setShow(true)
                            }}
                            aria-label={`Edit ${tenant.full_name}`}
                            title="Edit tenant"
                          >
                            <Pencil
                              size={14}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No tenants found"
            text={
              query
                ? "Try a different search."
                : "Add your first tenant to start rent tracking."
            }
          />
        )}
      </section>

      {show && (
        <TenantModal
          initial={editing}
          properties={properties}
          rooms={rooms}
          tenants={items}
          onClose={() => {
            setShow(false)
            setEditing(null)
          }}
          onSave={save}
        />
      )}
    </Page>
  )
}

function TenantModal({
  initial,
  properties,
  rooms,
  tenants,
  onClose,
  onSave,
}: {
  initial: Tenant | null
  properties: Property[]
  rooms: Room[]
  tenants: Tenant[]
  onClose: () => void
  onSave: (values: {
    property_id: string
    room_id: string | null
    full_name: string
    whatsapp: string
    monthly_rent: number
    move_in_date: string
    move_out_date?: string
    emergency_contact?: string
    id_type?: string
    status?: "active" | "inactive"
    idFile?: File | null
  }) => Promise<void>
}) {
  const [propertyId, setPropertyId] =
    useState(
      initial?.property_id ||
        properties[0]?.id ||
        "",
    )

  const [roomId, setRoomId] =
    useState(
      initial?.room_id || "",
    )

  const selectedRoom = rooms.find(
    (room) => room.id === roomId,
  )

  const [fullName, setFullName] =
    useState(
      initial?.full_name || "",
    )

  const [whatsapp, setWhatsapp] =
    useState(
      initial?.whatsapp || "",
    )

  const [rent, setRent] =
    useState(
      initial?.monthly_rent ||
        selectedRoom?.rent_per_tenant ||
        7500,
    )

  const [moveIn, setMoveIn] =
    useState(
      initial?.move_in_date ||
        new Date()
          .toISOString()
          .slice(0, 10),
    )

  const [moveOut, setMoveOut] =
    useState(
      initial?.move_out_date || "",
    )

  const [emergency, setEmergency] =
    useState(
      initial?.emergency_contact ||
        "",
    )

  const [idType, setIdType] =
    useState(
      initial?.id_type || "Aadhaar",
    )

  const [status, setStatus] =
    useState<"active" | "inactive">(
      initial?.status || "active",
    )

  const [idFile, setIdFile] =
    useState<File | null>(null)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState("")

  const availableRooms = useMemo(
    () =>
      rooms.filter(
        (room) =>
          room.property_id ===
          propertyId,
      ),
    [rooms, propertyId],
  )

  const roomOccupancy = useMemo(() => {
    const map = new Map<
      string,
      number
    >()

    tenants.forEach((tenant) => {
      if (
        tenant.status === "active" &&
        tenant.id !== initial?.id &&
        tenant.room_id
      ) {
        map.set(
          tenant.room_id,
          (map.get(
            tenant.room_id,
          ) || 0) + 1,
        )
      }
    })

    return map
  }, [tenants, initial])

  useEffect(() => {
    if (!initial) {
      setRoomId(
        availableRooms[0]?.id || "",
      )

      if (availableRooms[0]) {
        setRent(
          availableRooms[0]
            .rent_per_tenant,
        )
      }
    }
  }, [
    propertyId,
    availableRooms,
    initial,
  ])

  useEffect(() => {
    if (
      selectedRoom &&
      !initial
    ) {
      setRent(
        selectedRoom.rent_per_tenant,
      )
    }
  }, [
    roomId,
    selectedRoom,
    initial,
  ])

  const submit = async () => {
    if (
      !fullName.trim() ||
      whatsapp.replace(
        /\D/g,
        "",
      ).length < 10 ||
      !propertyId ||
      !roomId ||
      !moveIn ||
      rent <= 0
    ) {
      setError(
        "Name, valid WhatsApp number, PG, room, rent and move-in date are required.",
      )
      return
    }

    setSaving(true)
    setError("")

    try {
      await onSave({
        property_id: propertyId,
        room_id: roomId,
        full_name: fullName,
        whatsapp,
        monthly_rent: rent,
        move_in_date: moveIn,
        move_out_date: moveOut,
        emergency_contact:
          emergency,
        id_type: idType,
        status,
        idFile,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save tenant.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={
        initial
          ? "Edit tenant"
          : "Add tenant"
      }
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
              : initial
                ? "Save changes"
                : "Add tenant"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label>Full name</label>

          <input
            value={fullName}
            onChange={(event) =>
              setFullName(
                event.target.value,
              )
            }
            placeholder="Vandyy"
          />
        </div>

        <div className="field">
          <label>
            WhatsApp number
          </label>

          <input
            value={whatsapp}
            onChange={(event) =>
              setWhatsapp(
                event.target.value,
              )
            }
            inputMode="numeric"
            placeholder="+91"
          />
        </div>

        <div className="field">
          <label>PG</label>

          <select
            value={propertyId}
            onChange={(event) =>
              setPropertyId(
                event.target.value,
              )
            }
          >
            {properties.map(
              (property) => (
                <option
                  key={property.id}
                  value={property.id}
                >
                  {property.name}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="field">
          <label>Room</label>

          <select
            value={roomId}
            onChange={(event) =>
              setRoomId(
                event.target.value,
              )
            }
          >
            <option value="">
              Select room
            </option>

            {availableRooms.map(
              (room) => {
                const occupied =
                  roomOccupancy.get(
                    room.id,
                  ) || 0

                const full =
                  occupied >=
                    room.sharing &&
                  room.id !==
                    initial?.room_id

                return (
                  <option
                    key={room.id}
                    value={room.id}
                    disabled={full}
                  >
                    {room.room_number} ·{" "}
                    {occupied}/
                    {room.sharing}
                    {full
                      ? " · Full"
                      : ""}{" "}
                    · ₹
                    {Number(
                      room.rent_per_tenant,
                    ).toLocaleString(
                      "en-IN",
                    )}
                  </option>
                )
              },
            )}
          </select>
        </div>

        <div className="field">
          <label>
            Monthly rent
          </label>

          <input
            type="number"
            min={1}
            value={rent}
            onChange={(event) =>
              setRent(
                Number(
                  event.target.value,
                ),
              )
            }
          />
        </div>

        <div className="field">
          <label>
            Move-in date
          </label>

          <input
            type="date"
            value={moveIn}
            onChange={(event) =>
              setMoveIn(
                event.target.value,
              )
            }
          />
        </div>

        <div className="field">
          <label>
            Move-out date
          </label>

          <input
            type="date"
            value={moveOut}
            onChange={(event) =>
              setMoveOut(
                event.target.value,
              )
            }
          />
        </div>

        <div className="field">
          <label>
            Emergency contact
          </label>

          <input
            value={emergency}
            onChange={(event) =>
              setEmergency(
                event.target.value,
              )
            }
            inputMode="numeric"
          />
        </div>

        <div className="field">
          <label>
            ID proof type
          </label>

          <select
            value={idType}
            onChange={(event) =>
              setIdType(
                event.target.value,
              )
            }
          >
            <option>
              Aadhaar
            </option>

            <option>
              Driving Licence
            </option>

            <option>
              Passport
            </option>

            <option>
              Other
            </option>
          </select>
        </div>

        {initial && (
          <div className="field">
            <label>Status</label>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as
                    | "active"
                    | "inactive",
                )
              }
            >
              <option value="active">
                Active
              </option>

              <option value="inactive">
                Moved out / inactive
              </option>
            </select>
          </div>
        )}

        <div className="field">
          <label>
            ID proof file
          </label>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(
              event: ChangeEvent<HTMLInputElement>,
            ) =>
              setIdFile(
                event.target.files?.[0] ||
                  null,
              )
            }
          />
        </div>
      </div>

      {initial?.id_document_path && (
        <div
          className="notice"
          style={{ marginTop: 12 }}
        >
          An ID document is already
          stored. Uploading a new file
          will add a new private document
          reference.
        </div>
      )}

      {error && (
        <div
          className="notice warning-box"
          style={{ marginTop: 14 }}
        >
          {error}
        </div>
      )}
    </Modal>
  )
}