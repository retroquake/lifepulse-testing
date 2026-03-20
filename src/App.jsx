import { useEffect, useMemo, useState } from 'react'
import { Phone } from 'lucide-react'
import './App.css'
import { supabase } from './supabaseClient'
import ResponderDashboard from './ResponderDashboard'
import AuthPage from './AuthPage'
import CPRMetronome from './CPRMetronome'

/** Strip spaces for tel: — DB/realtime may return string or rare numeric text */
function responderPhoneForTel(responderPhone) {
  if (responderPhone == null) return ''
  return String(responderPhone).replace(/\s/g, '')
}

/** After SOS accepted: primary call link or connecting state (realtime + DB handshake). */
function CallResponderHandshake({ responderPhone }) {
  const emergency = { responder_phone: responderPhone }
  const dial = responderPhoneForTel(emergency.responder_phone)

  if (dial.length > 0) {
    return (
      <a
        className="call-responder-btn"
        href={'tel:' + dial}
        aria-label="Call responder"
      >
        <Phone
          className="call-responder-icon"
          size={22}
          strokeWidth={2.25}
          aria-hidden
        />
        Call Responder
      </a>
    )
  }

  return (
    <p
      className="call-responder-connecting"
      role="status"
      aria-live="polite"
    >
      Connecting to Responder...
    </p>
  )
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
  const [session, setSession] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [coords, setCoords] = useState(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [myEmergencyId, setMyEmergencyId] = useState(null)
  const [isAccepted, setIsAccepted] = useState(false)
  const [isResolved, setIsResolved] = useState(false)
  const [responderDistanceKm, setResponderDistanceKm] = useState(null)
  const [responseTimeText, setResponseTimeText] = useState('Unknown')
  const [resolvedResponderLabel, setResolvedResponderLabel] = useState('Unknown')
  const [responderPhone, setResponderPhone] = useState('')

  const userRole = useMemo(() => {
    const role = session?.user?.user_metadata?.role
    return typeof role === 'string' ? role.toLowerCase() : 'citizen'
  }, [session])

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session ?? null)
      setIsAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsAuthLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Listen for updates only for the citizen's own emergency row.
  // Realtime UPDATE payloads may omit unchanged columns (Postgres replica identity),
  // so we also SELECT the full row on subscribe and after accept when phone is missing.
  useEffect(() => {
    if (!myEmergencyId || !coords) return

    let cancelled = false
    const emergencyId = myEmergencyId

    const CITIZEN_EMERGENCY_SELECT =
      'status, is_accepted, responder_phone, responder_lat, responder_lng, created_at, resolved_at, responder_name, responder_id'

    function applyEmergencyRow(updatedRow) {
      if (!updatedRow) return

      if (
        typeof updatedRow.status === 'string' &&
        updatedRow.status.toLowerCase() === 'resolved'
      ) {
        setResponseTimeText(
          formatElapsedTime(updatedRow.created_at, updatedRow.resolved_at)
        )
        setResolvedResponderLabel(
          updatedRow.responder_name ?? updatedRow.responder_id ?? 'Unknown'
        )
        setIsResolved(true)
        setIsAccepted(false)
        return
      }

      if (updatedRow.is_accepted === true) {
        setIsAccepted(true)
      }

      const rp = updatedRow.responder_phone
      if (rp != null && String(rp).trim() !== '') {
        setResponderPhone(String(rp).trim())
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

    async function fetchFullEmergencyRow() {
      const { data, error } = await supabase
        .from('emergencies')
        .select(CITIZEN_EMERGENCY_SELECT)
        .eq('id', emergencyId)
        .single()
      if (cancelled || error || !data) return
      applyEmergencyRow(data)
    }

    void fetchFullEmergencyRow()

    const channel = supabase
      .channel(`citizen-emergency-${emergencyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'emergencies',
          filter: `id=eq.${emergencyId}`,
        },
        (payload) => {
          const updatedRow = payload.new
          if (!updatedRow) return

          applyEmergencyRow(updatedRow)

          const accepted = updatedRow.is_accepted === true
          const phoneInPayload = Object.prototype.hasOwnProperty.call(
            updatedRow,
            'responder_phone'
          )
          const phoneVal = updatedRow.responder_phone
          const phoneEmpty =
            phoneVal == null || String(phoneVal).trim() === ''

          if (accepted && (!phoneInPayload || phoneEmpty)) {
            void fetchFullEmergencyRow()
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [myEmergencyId, coords])

  function resetCitizenFlow() {
    setCoords(null)
    setSaveMessage('')
    setMyEmergencyId(null)
    setIsAccepted(false)
    setIsResolved(false)
    setResponderDistanceKm(null)
    setResponseTimeText('Unknown')
    setResolvedResponderLabel('Unknown')
    setResponderPhone('')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    resetCitizenFlow()
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
        setResponderPhone('')

        const emergencyRow = {
          latitude: nextCoords.latitude,
          longitude: nextCoords.longitude,
          status: 'active',
          citizen_name: session?.user?.user_metadata?.full_name ?? null,
          blood_group: session?.user?.user_metadata?.blood_group ?? null,
          emergency_contact_name:
            session?.user?.user_metadata?.emergency_contact_name ?? null,
          emergency_contact_phone:
            session?.user?.user_metadata?.emergency_contact_phone ?? null,
          medical_conditions:
            session?.user?.user_metadata?.medical_conditions_allergies ?? null,
          citizen_phone: session?.user?.user_metadata?.phone_number ?? null,
        }

        let { data, error } = await supabase
          .from('emergencies')
          .insert(emergencyRow)
          .select('id')
          .single()

        const errMsg = error?.message ?? ''
        if (error?.code === 'PGRST204' && errMsg.includes('citizen_phone')) {
          console.warn(
            '[LifePulse] Add column citizen_phone (see supabase/migrations/20260220120000_add_emergency_phone_columns.sql). Retrying SOS insert without phone.'
          )
          const withoutPhone = { ...emergencyRow }
          delete withoutPhone.citizen_phone
          const retry = await supabase
            .from('emergencies')
            .insert(withoutPhone)
            .select('id')
            .single()
          data = retry.data
          error = retry.error
        }

        if (error) {
          console.error('Supabase insert error:', error)
          return
        }

        setMyEmergencyId(data.id)
        setSaveMessage('Success')
      },
      (err) => {
        console.error('Geolocation error:', err)
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  return (
    <div className="medical-shell">
      {isAuthLoading ? (
        <p className="lp-emergency-meta">Loading…</p>
      ) : !session ? (
        <AuthPage />
      ) : userRole === 'responder' ? (
        <>
          <div className="lp-toolbar">
            <button type="button" className="role-btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
          <ResponderDashboard />
        </>
      ) : (
        <main className="lp-citizen-main">
          <div className="lp-toolbar" style={{ width: '100%', maxWidth: '28rem' }}>
            <button type="button" className="role-btn" onClick={handleLogout}>
              Log out
            </button>
          </div>

          {isResolved ? (
            <div className="safe-summary-card">
              <div style={{ textAlign: 'center' }}>
                <div className="lp-safe-check" aria-hidden>
                  ✓
                </div>
                <h2 style={{ color: '#14532d', margin: '1rem 0 0 0' }}>
                  You are safe
                </h2>
              </div>

              <p className="lp-safe-lead">
                Emergency resolved. You are safe — the responder has marked the
                incident complete.
              </p>

              <div className="lp-nested-card">
                <p style={{ margin: 0, color: '#14532d', fontWeight: 700 }}>
                  Response time: {responseTimeText}
                </p>
                <p style={{ margin: '8px 0 0 0', color: '#14532d', fontWeight: 700 }}>
                  Responder: {resolvedResponderLabel}
                </p>
              </div>

              <div className="lp-nested-card">
                <p style={{ margin: 0, color: '#14532d', fontWeight: 800 }}>
                  Feedback
                </p>
                <p
                  style={{
                    margin: '8px 0 0 0',
                    fontSize: 28,
                    color: '#d97706',
                    letterSpacing: 2,
                  }}
                >
                  ★★★★★
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  className="lp-btn-finish"
                  onClick={() => window.location.reload()}
                >
                  Finish
                </button>
              </div>
            </div>
          ) : isAccepted ? (
            <>
              <div className="dispatched-card">
                <div className="dispatched-header">
                  <div className="pulse-dot" />
                  <span>Responder dispatched</span>
                </div>
                <p className="lp-dispatch-headline">
                  Help is on the way. A responder has been dispatched to your
                  location.
                </p>
                <div className="dispatch-progress">
                  <div className="dispatch-progress-fill" />
                </div>
                {responderDistanceKm != null ? (
                  <p className="lp-dispatch-meta">
                    Responder distance: {responderDistanceKm.toFixed(2)} km
                  </p>
                ) : null}

                <div className="call-responder-handshake">
                  <CallResponderHandshake responderPhone={responderPhone} />
                </div>
              </div>
              <CPRMetronome />
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSendSos}
                className="sos-pulse-btn"
              >
                SEND SOS
              </button>

              {coords ? (
                <ul className="citizen-coord-list">
                  <li>Latitude: {coords.latitude}</li>
                  <li>Longitude: {coords.longitude}</li>
                  <li>Accuracy: {coords.accuracy} meters</li>
                  <li>
                    Time:{' '}
                    {new Date(coords.timestamp).toLocaleString(undefined, {
                      hour12: false,
                    })}
                  </li>
                </ul>
              ) : null}

              {saveMessage ? (
                <p className="lp-success-toast">{saveMessage}</p>
              ) : null}

              {myEmergencyId && !isAccepted && !isResolved ? (
                <div className="immediate-actions-card">
                  <h3 className="immediate-actions-title">Immediate Actions</h3>
                  <ul className="immediate-actions-list">
                    <li>
                      <strong>Stay Calm:</strong> Take deep breaths; help is
                      navigating to you.
                    </li>
                    <li>
                      <strong>Clear the Area:</strong> Move furniture or
                      obstacles to give the responder space.
                    </li>
                    <li>
                      <strong>Secure Pets:</strong> Ensure any animals are in a
                      separate room.
                    </li>
                    <li>
                      <strong>Unlock the Door:</strong> If indoors, ensure the
                      entrance is accessible.
                    </li>
                    <li>
                      <strong>Monitor:</strong> Stay on this screen and follow the
                      CPR metronome if needed.
                    </li>
                  </ul>
                </div>
              ) : null}

              {myEmergencyId ? <CPRMetronome /> : null}
            </>
          )}
        </main>
      )}
    </div>
  )
}

export default App
