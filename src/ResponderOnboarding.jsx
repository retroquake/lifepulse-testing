import { useEffect, useMemo, useState } from 'react'

const QUALIFICATIONS = ['Doctor', 'Nurse', 'Student', 'CPR Certified']

export default function ResponderOnboarding({ onComplete }) {
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [qualification, setQualification] = useState(QUALIFICATIONS[0])
  const [selectedFileName, setSelectedFileName] = useState('')
  const [scanProgress, setScanProgress] = useState(0)
  const [isScanning, setIsScanning] = useState(false)

  const canContinueStep1 = useMemo(
    () => fullName.trim().length > 1 && qualification.trim().length > 0,
    [fullName, qualification]
  )

  useEffect(() => {
    if (!isScanning) return

    const timer = window.setInterval(() => {
      setScanProgress((current) => {
        const next = Math.min(current + 8, 100)
        if (next >= 100) {
          window.clearInterval(timer)
          setIsScanning(false)
          setStep(3)
        }
        return next
      })
    }, 220)

    return () => window.clearInterval(timer)
  }, [isScanning])

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFileName(file.name)
    setScanProgress(0)
    setIsScanning(true)
  }

  function finishOnboarding() {
    onComplete({
      isVerified: true,
      fullName: fullName.trim(),
      qualification,
    })
  }

  return (
    <div className="responder-onboarding">
      <h2 style={{ marginTop: 0 }}>Responder Onboarding</h2>

      {step === 1 ? (
        <div className="onboarding-card">
          <h3>Step 1: Profile Details</h3>
          <label className="onboarding-label">
            Full Name
            <input
              className="onboarding-input"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter your full name"
            />
          </label>

          <label className="onboarding-label">
            Medical Qualification
            <select
              className="onboarding-input"
              value={qualification}
              onChange={(event) => setQualification(event.target.value)}
            >
              {QUALIFICATIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="onboarding-btn"
            disabled={!canContinueStep1}
            onClick={() => setStep(2)}
          >
            Continue
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="onboarding-card">
          <h3>Step 2: Upload Certificate</h3>
          <label className="upload-dropzone">
            <span>{selectedFileName || 'Choose a certificate document'}</span>
            <input type="file" onChange={handleFileChange} />
          </label>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Scanning Document for Authenticity...
            </div>
            <div className="onboarding-progress-track">
              <div
                className="onboarding-progress-fill"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="onboarding-card success">
          <h3>Step 3: Verification Complete</h3>
          <p>
            Identity Verified. You are now a LifePulse Authorized Responder.
          </p>
          <button type="button" className="onboarding-btn" onClick={finishOnboarding}>
            Enter Responder Dashboard
          </button>
        </div>
      ) : null}
    </div>
  )
}

