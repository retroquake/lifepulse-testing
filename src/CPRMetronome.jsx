import { useEffect, useRef, useState } from 'react'
import { Heart, Volume2, VolumeX } from 'lucide-react'

const BPM = 110
const BEAT_MS = Math.round((60 / BPM) * 1000)

export default function CPRMetronome() {
  const [isRunning, setIsRunning] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [beatTick, setBeatTick] = useState(0)
  const audioContextRef = useRef(null)
  const intervalRef = useRef(null)

  function playBeep() {
    if (isMuted) return

    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext()
    }

    const ctx = audioContextRef.current
    const now = ctx.currentTime
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, now)

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.1)
  }

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const tick = () => {
      setBeatTick((value) => value + 1)
      playBeep()
    }

    queueMicrotask(tick)

    intervalRef.current = window.setInterval(tick, BEAT_MS)

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, isMuted])

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return (
    <section className="cpr-card">
      <div className="cpr-header">
        <h3>Bystander Guide - CPR Metronome</h3>
        <span>110 BPM</span>
      </div>

      <div className="cpr-heart-wrap" key={beatTick}>
        <Heart
          className={`cpr-heart ${isRunning ? 'is-running' : ''}`}
          size={52}
          strokeWidth={1.35}
          fill="none"
          aria-hidden
        />
      </div>

      <p className="cpr-tip">
        Follow the rhythm for chest compressions while help is on the way.
      </p>

      <div className="cpr-controls">
        <button
          type="button"
          className="cpr-start-btn"
          onClick={() => setIsRunning((value) => !value)}
        >
          {isRunning ? 'STOP' : 'START'}
        </button>

        <button
          type="button"
          className="cpr-volume-btn"
          onClick={() => setIsMuted((value) => !value)}
          aria-label={isMuted ? 'Unmute metronome' : 'Mute metronome'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </section>
  )
}

