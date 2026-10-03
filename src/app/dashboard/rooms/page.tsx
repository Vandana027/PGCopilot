/* eslint-disable react-hooks/set-state-in-effect */

"use client"

import { useEffect, useMemo, useState } from 'react'

import { Edit2, Plus } from '@/components/Icons'

import {
  EmptyState,
  ErrorNotice,
  LoadingState,
  Modal,
  Money,
  Page,
} from '@/components/Ui'

import {
  createRoom,
  deleteRoom,
  getProperties,
  getRooms,
  getTenants,
  updateRoom,
} from '@/lib/app-data'

import type { Property, Room, Tenant } from '@/lib/types'

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Room | null>(null)
  const [show, setShow] = useState(false)

  const load = async () => {
    setLoading(true)

    try {
      const [roomData, propertyData, tenantData] =
        await Promise.all([
          getRooms(),
          getProperties(),
          getTenants(),
        ])

      setRooms(roomData)
      setProperties(propertyData)
      setTenants(tenantData)
      setError('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load rooms.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async (values: {
    property_id: string
    floor_number: number
    room_number: string
    sharing: number
    rent_per_tenant: number
  }) => {
    if (editing) {
      await updateRoom(editing.id, values)
    } else {
      await createRoom(values)
    }

    setShow(false)
    setEditing(null)
    await load()
  }

  const remove = async (room: Room) => {
    await deleteRoom(room.id)
    setShow(false)
    setEditing(null)
    await load()
  }

  const grouped = useMemo(() => {
    return rooms
      .map((room) => ({
        room,
        property: properties.find(
          (property) =>
            property.id === room.property_id,
        ),
        occupants: tenants
          .filter(
            (tenant) =>
              tenant.room_id === room.id &&
              tenant.status === 'active',
          )
          .sort(
            (a, b) =>
              Number(a.slot_number || 0) -
              Number(b.slot_number || 0),
          ),
      }))
      .sort((a, b) => {
        const floorDifference =
          a.room.floor_number -
          b.room.floor_number

        if (floorDifference !== 0) {
          return floorDifference
        }

        return a.room.room_number.localeCompare(
          b.room.room_number,
          undefined,
          { numeric: true },
        )
      })
  }, [rooms, properties, tenants])

  const floorGroups = useMemo(() => {
    const groups = new Map<
      number,
      typeof grouped
    >()

    for (const item of grouped) {
      const floor = item.room.floor_number

      if (!groups.has(floor)) {
        groups.set(floor, [])
      }

      groups.get(floor)!.push(item)
    }

    return Array.from(groups.entries()).sort(
      ([floorA], [floorB]) =>
        floorA - floorB,
    )
  }, [grouped])

  return (
    <Page
      eyebrow="Space management"
      title="Rooms & beds"
      desc="Set sharing and rent once. PGCopilot assigns the next available slot automatically when a tenant moves in."
      actions={
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditing(null)
            setShow(true)
          }}
        >
          <Plus size={15} />
          Add room
        </button>
      }
    >
      {error && <ErrorNotice message={error} />}

      {loading ? (
        <LoadingState text="Loading rooms..." />
      ) : grouped.length ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 34,
          }}
        >
          {floorGroups.map(
            ([floor, floorRooms]) => (
              <section key={floor}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 20,
                        fontWeight: 700,
                        color: 'var(--ink)',
                      }}
                    >
                      {getFloorLabel(floor)}
                    </h2>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: 'var(--muted)',
                      }}
                    >
                      {floorRooms.length}{' '}
                      {floorRooms.length === 1
                        ? 'room'
                        : 'rooms'}
                    </div>
                  </div>

                  <div
                    style={{
                      height: 1,
                      flex: 1,
                      background:
                        'var(--line)',
                    }}
                  />
                </div>

                <div className="room-grid">
                  {floorRooms.map(
                    ({
                      room,
                      property,
                      occupants,
                    }) => (
                      <RoomCard
                        key={room.id}
                        room={room}
                        property={property}
                        occupants={
                          occupants
                        }
                        onEdit={() => {
                          setEditing(room)
                          setShow(true)
                        }}
                      />
                    ),
                  )}
                </div>
              </section>
            ),
          )}
        </div>
      ) : (
        <div className="card section-card">
          <EmptyState
            title="No rooms yet"
            text="Add a room to start assigning tenants."
          />
        </div>
      )}

      {show && (
        <RoomModal
          initial={editing}
          properties={properties}
          onClose={() => {
            setShow(false)
            setEditing(null)
          }}
          onSave={save}
          onDelete={editing ? () => remove(editing) : undefined}
        />
      )}
    </Page>
  )
}

function getFloorLabel(
  floor: number,
) {
  if (floor === -2) {
    return 'Basement 2'
  }

  if (floor === -1) {
    return 'Basement'
  }

  if (floor === 0) {
    return 'Ground Floor'
  }

  if (floor === 1) {
    return '1st Floor'
  }

  if (floor === 2) {
    return '2nd Floor'
  }

  if (floor === 3) {
    return '3rd Floor'
  }

  return `${floor}th Floor`
}

function RoomCard({
  room,
  property,
  occupants,
  onEdit,
}: {
  room: Room
  property?: Property
  occupants: Tenant[]
  onEdit: () => void
}) {
  const occupied = occupants.length
  const capacity = room.sharing

  const occupancyPercent =
    capacity > 0
      ? Math.min(
          100,
          Math.round(
            (occupied / capacity) * 100,
          ),
        )
      : 0

  const isFull =
    occupied >= capacity

  return (
    <div className="card room-card">
      <div className="room-top">
        <div>
          <div className="room-no">
            Room {room.room_number}
          </div>

          <div className="room-type">
            {property?.name || 'PG'} ·{' '}
            {room.sharing} sharing ·{' '}
            <Money
              value={
                room.rent_per_tenant
              }
            />
            /tenant
          </div>
        </div>

        <button
          className="icon-btn"
          onClick={onEdit}
          aria-label={`Edit room ${room.room_number}`}
          type="button"
        >
          <Edit2 size={15} />
        </button>
      </div>

      <div className="progress">
        <span
          style={{
            width: `${occupancyPercent}%`,
          }}
        />
      </div>

      <div
        className="occupancy"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>
          {occupied} of {capacity}{' '}
          occupied
        </span>

        <span
          style={{
            color: isFull
              ? 'var(--green)'
              : 'var(--muted)',
            fontWeight: 600,
          }}
        >
          {isFull
            ? 'Full'
            : `${
                capacity - occupied
              } available`}
        </span>
      </div>

      <div
        className="slot-list"
        style={{ marginTop: 11 }}
      >
        {Array.from({
          length: capacity,
        }).map((_, index) => {
          const tenant =
            occupants.find(
              (item) =>
                item.slot_number ===
                index + 1,
            )

          return (
            <div
              className="slot"
              key={index}
              style={{
                background: tenant
                  ? 'rgba(31, 126, 99, 0.06)'
                  : undefined,
              }}
            >
              <strong>
                Slot {index + 1}
              </strong>

              <span
                style={{
                  color: tenant
                    ? 'var(--ink)'
                    : undefined,
                  fontWeight: tenant
                    ? 500
                    : undefined,
                }}
              >
                {tenant?.full_name ||
                  'Available'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RoomModal({
  initial,
  properties,
  onClose,
  onSave,
  onDelete,
}: {
  initial: Room | null
  properties: Property[]
  onClose: () => void
  onSave: (values: {
    property_id: string
    floor_number: number
    room_number: string
    sharing: number
    rent_per_tenant: number
  }) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [propertyId, setPropertyId] =
    useState(
      initial?.property_id ||
        properties[0]?.id ||
        '',
    )

  const [floorNumber, setFloorNumber] =
    useState(
      initial?.floor_number ?? 0,
    )

  const [number, setNumber] =
    useState(
      initial?.room_number || '',
    )

  const [sharing, setSharing] =
    useState(initial?.sharing || 2)

  const [rent, setRent] = useState(
    initial?.rent_per_tenant || 7500,
  )

  const [saving, setSaving] =
    useState(false)

  const [deleting, setDeleting] =
    useState(false)

  const [confirmingDelete, setConfirmingDelete] =
    useState(false)

  const [error, setError] =
    useState('')

  const property = properties.find(
    (item) => item.id === propertyId,
  )

  const confirmDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    setError('')
    try {
      await onDelete()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete room.',
      )
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  const submit = async () => {
    if (
      !propertyId ||
      !number.trim() ||
      rent < 0 ||
      Number.isNaN(rent)
    ) {
      setError(
        'PG, floor, room number and a valid rent are required.',
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      await onSave({
        property_id: propertyId,
        floor_number: floorNumber,
        room_number: number.trim(),
        sharing,
        rent_per_tenant: rent,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save room.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={
        initial
          ? 'Edit room'
          : 'Add a room'
      }
      onClose={onClose}
      footer={
        <>
          {onDelete && !confirmingDelete && (
            <button
              className="btn btn-secondary"
              style={{ color: '#b42318', marginRight: 'auto' }}
              onClick={() => setConfirmingDelete(true)}
              disabled={saving || deleting}
              type="button"
            >
              Delete room
            </button>
          )}

          {onDelete && confirmingDelete && (
            <>
              <span style={{ marginRight: 'auto', fontSize: 12, color: '#b42318', alignSelf: 'center' }}>Delete this room permanently?</span>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                type="button"
              >
                No, keep it
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#b42318' }}
                onClick={confirmDelete}
                disabled={deleting}
                type="button"
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </>
          )}

          {!confirmingDelete && (
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
                  ? 'Saving...'
                  : initial
                    ? 'Save room'
                    : 'Create room'}
              </button>
            </>
          )}
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="room-property">
            PG
          </label>

          {initial ? (
            <input
              id="room-property"
              value={property?.name || 'Unknown PG'}
              disabled
              title="A room's PG can't be changed after creation. Create a new room in the target PG instead."
            />
          ) : (
            <select
              id="room-property"
              value={propertyId}
              onChange={(event) =>
                setPropertyId(
                  event.target.value,
                )
              }
            >
              {properties.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ),
              )}
            </select>
          )}
        </div>

        <div className="field">
          <label htmlFor="room-floor">
            Floor
          </label>

          <select
            id="room-floor"
            value={floorNumber}
            onChange={(event) =>
              setFloorNumber(
                Number(
                  event.target.value,
                ),
              )
            }
          >
            <option value={-2}>
              Basement 2
            </option>

            <option value={-1}>
              Basement
            </option>

            <option value={0}>
              Ground Floor
            </option>

            <option value={1}>
              1st Floor
            </option>

            <option value={2}>
              2nd Floor
            </option>

            <option value={3}>
              3rd Floor
            </option>

            <option value={4}>
              4th Floor
            </option>

            <option value={5}>
              5th Floor
            </option>

            <option value={6}>
              6th Floor
            </option>

            <option value={7}>
              7th Floor
            </option>

            <option value={8}>
              8th Floor
            </option>

            <option value={9}>
              9th Floor
            </option>

            <option value={10}>
              10th Floor
            </option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="room-number">
            Room number
          </label>

          <input
            id="room-number"
            value={number}
            onChange={(event) =>
              setNumber(
                event.target.value,
              )
            }
            placeholder="e.g. 301"
          />
        </div>

        <div className="field">
          <label htmlFor="room-sharing">
            Sharing
          </label>

          <select
            id="room-sharing"
            value={sharing}
            onChange={(event) =>
              setSharing(
                Number(
                  event.target.value,
                ),
              )
            }
          >
            {[1, 2, 3, 4].map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value} sharing
                </option>
              ),
            )}
          </select>
        </div>

        <div className="field">
          <label htmlFor="room-rent">
            Monthly rent / tenant
          </label>

          <input
            id="room-rent"
            type="number"
            min={0}
            value={rent}
            onChange={(event) =>
              setRent(
                Number(
                  event.target.value,
                ),
              )
            }
            placeholder="7500"
          />
        </div>
      </div>

      {error && (
        <div
          className="notice warning-box"
          style={{ marginTop: 14 }}
        >
          {error}
        </div>
      )}

      <div
        className="notice"
        style={{ marginTop: 14 }}
      >
        <strong>
          No bed names needed.
        </strong>{' '}
        Tenant assignment automatically
        takes the first open slot in this
        room.
      </div>
    </Modal>
  )
}