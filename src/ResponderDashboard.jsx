import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

function formatCreatedTime(row) {
  const raw =
    row.created_at ?? row.createdAt ?? row.inserted_at ?? row.insertedAt
  if (!raw) return 'Unknown time'

  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? 'Unknown time' : d.toLocaleString()
}

function getRowKey(row, fallbackIndex) {
  return row.id ?? row.emergency_id ?? row.uuid ?? row.created_at ?? fallbackIndex
}

function getGoogleMapsUrl(latitude, longitude) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

function toRad(value) {
  return (value * Math.PI) / 180
}

function getDistanceKm(from, to) {
  if (!from || !to) return null
  const earthRadiusKm = 6371
  const latDiff = toRad(to.latitude - from.latitude)
  const lonDiff = toRad(to.longitude - from.longitude)
  const fromLat = toRad(from.latitude)
  const toLat = toRad(to.latitude)
  const a =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(lonDiff / 2) *
      Math.sin(lonDiff / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

function EmergencyMap({ latitude, longitude }) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        border: '1px solid #d1d5db',
        borderRadius: 10,
        background: '#f9fafb',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>EmergencyMap</div>
      <div style={{ fontSize: 14 }}>
        Latitude: {latitude}, Longitude: {longitude}
      </div>
    </div>
  )
}

function EmergencyCard({
  row,
  responderLocation,
  onAccept,
  onDecline,
  onResolve,
  isResolving,
  isAccepting,
}) {
  const distanceKm = getDistanceKm(responderLocation, {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  })
  const isAccepted = Boolean(row.is_accepted)

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 14,
        background: '#ffffff',
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Emergency</div>
      <div style={{ marginTop: 6, color: '#6b7280', fontSize: 14 }}>
        Distance:{' '}
        {distanceKm == null ? 'Unknown' : `${distanceKm.toFixed(2)} km`}
      </div>
      <div style={{ marginTop: 4, color: '#6b7280', fontSize: 14 }}>
        Time: {formatCreatedTime(row)}
      </div>

      {!isAccepted ? (
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button
            type="button"
            onClick={onAccept}
            disabled={isAccepting}
            style={{
              flex: 1,
              padding: '14px 12px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 18,
              cursor: isAccepting ? 'not-allowed' : 'pointer',
              opacity: isAccepting ? 0.65 : 1,
            }}
          >
            {isAccepting ? 'ACCEPTING...' : 'ACCEPT SOS'}
          </button>
          <button
            type="button"
            onClick={onDecline}
            style={{
              padding: '14px 12px',
              background: 'white',
              color: '#111827',
              border: '1px solid #d1d5db',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            DECLINE
          </button>
        </div>
      ) : (
        <>
          <EmergencyMap latitude={row.latitude} longitude={row.longitude} />
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <a
              href={getGoogleMapsUrl(row.latitude, row.longitude)}
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none',
                background: '#2563eb',
                color: 'white',
                padding: '10px 12px',
                borderRadius: 8,
                fontWeight: 700,
              }}
            >
              Open in Google Maps
            </a>
            <button
              type="button"
              onClick={onResolve}
              disabled={isResolving}
              style={{
                background: '#16a34a',
                color: 'white',
                border: 'none',
                padding: '10px 14px',
                borderRadius: 8,
                fontWeight: 800,
                cursor: isResolving ? 'not-allowed' : 'pointer',
                opacity: isResolving ? 0.65 : 1,
              }}
            >
              {isResolving ? 'RESOLVING...' : 'MARK AS RESOLVED'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function ResponderDashboard() {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [responderLocation, setResponderLocation] = useState(null)
  const [declinedKeys, setDeclinedKeys] = useState([])
  const [acceptingKeys, setAcceptingKeys] = useState([])
  const [resolvingKeys, setResolvingKeys] = useState([])

  const activeFilterValue = useMemo(() => 'active', [])
  const activeFilterValueLower = useMemo(
    () => activeFilterValue.toLowerCase(),
    [activeFilterValue]
  )

  useEffect(() => {
    let isMounted = true

    async function loadInitial() {
      console.log('[ResponderDashboard] Initial fetch starts', {
        table: 'emergencies',
        filter: { column: 'status', value: activeFilterValue },
      })
      setIsLoading(true)
      const { data, error } = await supabase
        .from('emergencies')
        .select('*')
        // Case-insensitive match to avoid issues like 'Active' vs 'active'
        .ilike('status', activeFilterValue)
        .order('created_at', { ascending: false })

      if (!isMounted) return
      if (error) {
        console.error('Failed to load emergencies:', error)
        setRows([])
        setIsLoading(false)
        return
      }

      console.log('[ResponderDashboard] Initial fetch returned data', {
        count: (data ?? []).length,
        data,
      })
      setRows(data ?? [])
      setIsLoading(false)
    }

    loadInitial()

    const channel = supabase
      .channel('emergencies-active-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergencies' },
        (payload) => {
          const eventType = payload.eventType
          const next = payload.new
          const prev = payload.old

          setRows((current) => {
            // Helpers
            const currentKeyByRow = new Map(
              current.map((r, idx) => [getRowKey(r, idx), r])
            )

            const nextStatus = next?.status
            const prevStatus = prev?.status
            const nextStatusLower =
              typeof nextStatus === 'string' ? nextStatus.toLowerCase() : ''
            const prevStatusLower =
              typeof prevStatus === 'string' ? prevStatus.toLowerCase() : ''

            // INSERT
            if (eventType === 'INSERT') {
              console.log('[ResponderDashboard] Realtime INSERT detected', {
                next: next,
                nextStatus,
                activeFilterValue,
              })

              if (nextStatusLower !== activeFilterValueLower) return current
              return [next, ...current]
            }

            // DELETE
            if (eventType === 'DELETE') {
              const delKey = getRowKey(prev, prev?.created_at)
              if (currentKeyByRow.has(delKey)) {
                return current.filter((r, idx) => getRowKey(r, idx) !== delKey)
              }
              return current
            }

            // UPDATE (and other eventType fallbacks)
            if (eventType === 'UPDATE') {
              const nextKey = getRowKey(next, next?.created_at)
              const existingIndex = current.findIndex(
                (r, idx) => getRowKey(r, idx) === nextKey
              )
              const wasActive = prevStatusLower === activeFilterValueLower
              const isActive = nextStatusLower === activeFilterValueLower

              // If the row already exists in local state, always replace/remove it
              // by key first. This prevents duplicate cards when UPDATE payload.old
              // is minimal and doesn't include status.
              if (existingIndex !== -1) {
                if (!isActive) {
                  return current.filter((r, idx) => getRowKey(r, idx) !== nextKey)
                }

                return current.map((r, idx) =>
                  getRowKey(r, idx) === nextKey ? next : r
                )
              }

              // Row does not exist locally yet; only add if it is active.
              if (wasActive || isActive) {
                return isActive ? [next, ...current] : current
              }

              return current
            }

            return current
          })
        }
      )
      .subscribe((status) => {
        console.log('[ResponderDashboard] Realtime channel status', status)
      })

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [activeFilterValue])

  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setResponderLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        console.error('Responder geolocation error:', error)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  async function handleAccept(row, rowKey) {
    setAcceptingKeys((current) => [...current, rowKey])

    const responderLat = responderLocation?.latitude ?? null
    const responderLng = responderLocation?.longitude ?? null

    const { error } = await supabase
      .from('emergencies')
      .update({
        is_accepted: true,
        responder_id: 'demo_responder_1',
        responder_lat: responderLat,
        responder_lng: responderLng,
      })
      .eq('id', row.id)

    if (error) {
      console.error('Failed to accept emergency:', error)
    }

    setAcceptingKeys((current) => current.filter((key) => key !== rowKey))
  }

  function handleDecline(rowKey) {
    setDeclinedKeys((current) => [...current, rowKey])
  }

  async function handleResolve(row, rowKey) {
    const confirmed = window.confirm(
      'Are you sure you want to mark this emergency as resolved?'
    )
    if (!confirmed) return

    setResolvingKeys((current) => [...current, rowKey])

    const { error } = await supabase
      .from('emergencies')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (error) {
      console.error('Failed to resolve emergency:', error)
    }

    setResolvingKeys((current) => current.filter((key) => key !== rowKey))
  }

  const visibleRows = rows.filter((row, idx) => {
    const rowKey = getRowKey(row, idx)
    return !declinedKeys.includes(rowKey)
  })

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ margin: '0 0 12px 0' }}>Responder Dashboard</h2>

      {isLoading ? (
        <div>Loading...</div>
      ) : visibleRows.length === 0 ? (
        <div>No active emergencies</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {visibleRows.map((row, idx) => {
            const rowKey = getRowKey(row, idx)
            return (
            <EmergencyCard
              key={rowKey}
              row={row}
              responderLocation={responderLocation}
              onAccept={() => handleAccept(row, rowKey)}
              onDecline={() => handleDecline(rowKey)}
              onResolve={() => handleResolve(row, rowKey)}
              isResolving={resolvingKeys.includes(rowKey)}
              isAccepting={acceptingKeys.includes(rowKey)}
            />
            )
          })}
        </div>
      )}
    </div>
  )
}

