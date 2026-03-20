import { useState } from 'react'
import { supabase } from './supabaseClient'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('citizen')
  const [fullName, setFullName] = useState('')
  const [medicalQualification, setMedicalQualification] = useState('')
  const [certificateFileName, setCertificateFileName] = useState('')
  const [bloodGroup, setBloodGroup] = useState(BLOOD_GROUPS[0])
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [medicalConditions, setMedicalConditions] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifyingCredentials, setIsVerifyingCredentials] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    if (mode === 'signup') {
      if (!phoneNumber.trim()) {
        setMessage('Please enter your phone number.')
        setIsSubmitting(false)
        return
      }

      if (role === 'responder') {
        if (!fullName.trim() || !medicalQualification.trim() || !certificateFileName) {
          setMessage(
            'Responders must provide full name, medical qualification, and a certificate file.'
          )
          setIsSubmitting(false)
          return
        }

        setIsVerifyingCredentials(true)
        // Demo-only simulation before creating account.
        await new Promise((resolve) => window.setTimeout(resolve, 3000))
        setIsVerifyingCredentials(false)
      }
      if (role === 'citizen') {
        if (
          !fullName.trim() ||
          !bloodGroup ||
          !emergencyContactName.trim() ||
          !emergencyContactPhone.trim()
        ) {
          setMessage(
            'Citizens must provide full name, blood group, and emergency contact details.'
          )
          setIsSubmitting(false)
          return
        }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role, // citizen | responder
            phone_number: phoneNumber.trim(),
            full_name: fullName.trim() || null,
            medical_qualification:
              role === 'responder' ? medicalQualification.trim() : null,
            certificate_file_name:
              role === 'responder' ? certificateFileName : null,
            blood_group: role === 'citizen' ? bloodGroup : null,
            emergency_contact_name:
              role === 'citizen' ? emergencyContactName.trim() : null,
            emergency_contact_phone:
              role === 'citizen' ? emergencyContactPhone.trim() : null,
            medical_conditions_allergies:
              role === 'citizen' ? medicalConditions.trim() : null,
          },
        },
      })

      if (error) {
        setMessage(error.message)
        setIsVerifyingCredentials(false)
        setIsSubmitting(false)
        return
      }

      setMessage('Sign up successful. Please check your email if confirmation is enabled.')
      setIsVerifyingCredentials(false)
      setIsSubmitting(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      setIsSubmitting(false)
      return
    }

    setMessage('Login successful.')
    setIsSubmitting(false)
  }

  function handleCertificateChange(event) {
    const file = event.target.files?.[0]
    setCertificateFileName(file ? file.name : '')
  }

  return (
    <div className="responder-onboarding">
      <h2 style={{ marginTop: 0 }}>{mode === 'signup' ? 'Create Account' : 'Login'}</h2>

      <form onSubmit={handleSubmit} className="onboarding-card">
        <label className="onboarding-label">
          Email
          <input
            className="onboarding-input"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="onboarding-label">
          Password
          <input
            className="onboarding-input"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
          />
        </label>

        {mode === 'signup' ? (
          <>
            <fieldset className="onboarding-label" style={{ border: 'none', padding: 0 }}>
              <legend style={{ marginBottom: 8, fontWeight: 700 }}>Role</legend>
              <label style={{ marginRight: 16 }}>
                <input
                  type="radio"
                  name="role"
                  value="citizen"
                  checked={role === 'citizen'}
                  onChange={(event) => setRole(event.target.value)}
                />{' '}
                Citizen
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="responder"
                  checked={role === 'responder'}
                  onChange={(event) => setRole(event.target.value)}
                />{' '}
                Responder
              </label>
            </fieldset>

            <label className="onboarding-label">
              Phone Number
              <input
                className="onboarding-input"
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="+1 555 123 4567"
                required
                autoComplete="tel"
              />
            </label>

            {role === 'responder' ? (
              <>
                <label className="onboarding-label">
                  Full Name
                  <input
                    className="onboarding-input"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    // placeholder="Dr. Jane Doe"
                    required
                  />
                </label>

                <label className="onboarding-label">
                  Medical Qualification
                  <input
                    className="onboarding-input"
                    type="text"
                    value={medicalQualification}
                    onChange={(event) => setMedicalQualification(event.target.value)}
                    placeholder="Doctor / Nurse / CPR Certified"
                    required
                  />
                </label>

                <label className="onboarding-label">
                  Upload Certificate
                  <input
                    className="onboarding-input"
                    type="file"
                    onChange={handleCertificateChange}
                    required
                  />
                </label>
              </>
            ) : null}

            {role === 'citizen' ? (
              <>
                <label className="onboarding-label">
                  Full Name
                  <input
                    className="onboarding-input"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </label>

                <label className="onboarding-label">
                  Blood Group
                  <select
                    className="onboarding-input"
                    value={bloodGroup}
                    onChange={(event) => setBloodGroup(event.target.value)}
                  >
                    {BLOOD_GROUPS.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="onboarding-label">
                  Emergency Contact Name
                  <input
                    className="onboarding-input"
                    type="text"
                    value={emergencyContactName}
                    onChange={(event) => setEmergencyContactName(event.target.value)}
                    placeholder="Contact person name"
                    required
                  />
                </label>

                <label className="onboarding-label">
                  Emergency Contact Phone
                  <input
                    className="onboarding-input"
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(event) => setEmergencyContactPhone(event.target.value)}
                    placeholder="+1 555 123 4567"
                    required
                  />
                </label>

                <label className="onboarding-label">
                  Medical Conditions/Allergies
                  <textarea
                    className="onboarding-input"
                    value={medicalConditions}
                    onChange={(event) => setMedicalConditions(event.target.value)}
                    placeholder="Optional details (e.g., diabetes, penicillin allergy)"
                    rows={4}
                  />
                </label>
              </>
            ) : null}
          </>
        ) : null}

        <button type="submit" className="onboarding-btn" disabled={isSubmitting}>
          {isSubmitting
            ? 'Please wait...'
            : mode === 'signup'
              ? 'Sign Up'
              : 'Login'}
        </button>

        {isVerifyingCredentials ? (
          <p style={{ marginTop: 10, fontWeight: 700, color: '#0f766e' }}>
            Verifying Credentials with Medical Database...
          </p>
        ) : null}
      </form>

      <div style={{ marginTop: 12 }}>
        {mode === 'signup' ? (
          <button type="button" className="role-btn" onClick={() => setMode('login')}>
            Already have an account? Login
          </button>
        ) : (
          <button type="button" className="role-btn" onClick={() => setMode('signup')}>
            New user? Sign Up
          </button>
        )}
      </div>

      {message ? (
        <p style={{ marginTop: 12, fontWeight: 700, color: '#0f172a' }}>{message}</p>
      ) : null}
    </div>
  )
}

