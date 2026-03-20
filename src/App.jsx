import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'
import ResponderDashboard from './ResponderDashboard'

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

function formatElapsedTime(createdAt, resolvedAt) {
  if (!createdAt || !resolvedAt) return 'Unknown'

  const startMs = new Date(createdAt).getTime()
  const endMs = new Date(resolvedAt).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return 'Unknown'
  }

  const totalSeconds = Math.floor((endMs - startMs) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes} minutes and ${seconds} seconds`
}

function App() {
  const [role, setRole] = useState('victim') // 'victim' | 'responder'
  const [coords, setCoords] = useState(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [myEmergencyId, setMyEmergencyId] = useState(null)
  const [isAccepted, setIsAccepted] = useState(false)
  const [isResolved, setIsResolved] = useState(false)
  const [responderDistanceKm, setResponderDistanceKm] = useState(null)
  const [responseTimeText, setResponseTimeText] = useState('Unknown')
  const [resolvedResponderLabel, setResolvedResponderLabel] = useState('Unknown')

  // Listen for updates only for the victim's own emergency row.
  // This turns the Victim page into a live status screen when accepted.
  useEffect(() => {
    if (!myEmergencyId || !coords) return

    const channel = supabase
      .channel(`victim-emergency-${myEmergencyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'emergencies',
          filter: `id=eq.${myEmergencyId}`,
        },
        (payload) => {
          const updatedRow = payload.new
          if (!updatedRow) return

          if (
            typeof updatedRow.status === 'string' &&
            updatedRow.status.toLowerCase() === 'resolved'
          ) {
            setResponseTimeText(
              formatElapsedTime(updatedRow.created_at, updatedRow.resolved_at)
            )
            setResolvedResponderLabel(
              updatedRow.responder_name ??
                updatedRow.responder_id ??
                'Unknown'
            )
            setIsResolved(true)
            setIsAccepted(false)
            return
          }

          if (updatedRow.is_accepted === true) {
            setIsAccepted(true)
          }

          if (
            updatedRow.responder_lat != null &&
            updatedRow.responder_lng != null
          ) {
            const distance = getDistanceKm(
              {
                latitude: coords.latitude,
                longitude: coords.longitude,
              },
              {
                latitude: Number(updatedRow.responder_lat),
                longitude: Number(updatedRow.responder_lng),
              }
            )
            setResponderDistanceKm(distance)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [myEmergencyId, coords])

  function handleReturnHome() {
    setRole('victim')
    setCoords(null)
    setSaveMessage('')
    setMyEmergencyId(null)
    setIsAccepted(false)
    setIsResolved(false)
    setResponderDistanceKm(null)
    setResponseTimeText('Unknown')
    setResolvedResponderLabel('Unknown')
  }

  const handleSendSos = () => {
    if (!navigator.geolocation) return

    setSaveMessage('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        }

        setCoords(nextCoords)
        setIsAccepted(false)
        setIsResolved(false)
        setResponderDistanceKm(null)
        setResponseTimeText('Unknown')
        setResolvedResponderLabel('Unknown')

        // Inserts a new emergency row once we have GPS coordinates.
        const { data, error } = await supabase
          .from('emergencies')
          .insert({
            latitude: nextCoords.latitude,
            longitude: nextCoords.longitude,
            status: 'active',
          })
          .select('id')
          .single()

        if (error) {
          console.error('Supabase insert error:', error)
          return
        }

        setMyEmergencyId(data.id)
        setSaveMessage('Success')
      },
      (err) => {
        // Failures will result in no coordinates saved.
        console.error('Geolocation error:', err)
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setRole('victim')}
          style={{
            flex: '1 1 0',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            fontWeight: 700,
            background: role === 'victim' ? '#fee2e2' : 'white',
          }}
        >
          I am a Victim
        </button>
        <button
          type="button"
          onClick={() => setRole('responder')}
          style={{
            flex: '1 1 0',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            fontWeight: 700,
            background: role === 'responder' ? '#dbeafe' : 'white',
          }}
        >
          I am a Responder
        </button>
      </div>

      {role === 'victim' ? (
        <main style={{ padding: '0 0 24px' }}>
          {isResolved ? (
            <div
              style={{
                border: '1px solid #86efac',
                background: '#f0fdf4',
                borderRadius: 12,
                padding: 22,
                textAlign: 'left',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    color: '#16a34a',
                    fontSize: 78,
                    lineHeight: 1,
                    fontWeight: 900,
                  }}
                >
                  ✓
                </div>
                <h2 style={{ color: '#166534', margin: '12px 0 8px 0' }}>
                  You are Safe
                </h2>
              </div>

              <p style={{ color: '#166534', fontWeight: 700, marginTop: 8 }}>
                Emergency Resolved. You are safe. The responder has marked the
                incident as complete.
              </p>

              <div
                style={{
                  marginTop: 14,
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  padding: 12,
                  background: '#ffffff',
                }}
              >
                <p style={{ margin: 0, color: '#14532d', fontWeight: 700 }}>
                  Response Time: {responseTimeText}
                </p>
                <p style={{ margin: '8px 0 0 0', color: '#14532d', fontWeight: 700 }}>
                  Responder: {resolvedResponderLabel}
                </p>
              </div>

              <div
                style={{
                  marginTop: 14,
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  padding: 12,
                  background: '#ffffff',
                }}
              >
                <p style={{ margin: 0, color: '#14532d', fontWeight: 800 }}>
                  Feedback
                </p>
                <p
                  style={{
                    margin: '8px 0 0 0',
                    fontSize: 28,
                    color: '#f59e0b',
                    letterSpacing: 2,
                  }}
                >
                  ★★★★★
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{
                    marginTop: 16,
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: 8,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Finish
                </button>
              </div>
            </div>
          ) : isAccepted ? (
            <div
              style={{
                border: '1px solid #bbf7d0',
                background: '#f0fdf4',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center',
              }}
            >
              <div className="pulse-dot" />
              <p
                style={{
                  color: '#166534',
                  fontWeight: 800,
                  fontSize: 20,
                  marginTop: 14,
                }}
              >
                HELP IS ON THE WAY! A responder has been dispatched.
              </p>
              {responderDistanceKm != null ? (
                <p style={{ color: '#166534', marginTop: 10, fontWeight: 700 }}>
                  Responder distance: {responderDistanceKm.toFixed(2)} km
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSendSos}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '22px 18px',
                  background: '#e00000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '26px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                SEND SOS
              </button>

              <ul style={{ marginTop: '16px' }}>
                {coords ? (
                  <>
                    <li>Latitude: {coords.latitude}</li>
                    <li>Longitude: {coords.longitude}</li>
                    <li>Accuracy: {coords.accuracy} meters</li>
                    <li>
                      Time:{' '}
                      {new Date(coords.timestamp).toLocaleString(undefined, {
                        hour12: false,
                      })}
                    </li>
                  </>
                ) : null}
              </ul>

              {saveMessage ? (
                <p style={{ color: 'green', marginTop: '16px', fontWeight: 700 }}>
                  {saveMessage}
                </p>
              ) : null}
            </>
          )}
        </main>
      ) : (
        <ResponderDashboard />
      )}
    </div>
  )
}

export default App
