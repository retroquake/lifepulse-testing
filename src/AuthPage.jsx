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
      <div className="lp-auth-heading">
        <p className="lp-auth-brand">LifePulse</p>
        <h2 style={{ marginTop: 0 }}>
          {mode === 'signup' ? 'Create Account' : 'Sign In'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="onboarding-card" noValidate>
        <div className="lp-float-field">
          <input
            id="lp-auth-email"
            className="lp-float-input"
            type="email"
            placeholder=" "
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="lp-auth-email" className="lp-float-label">
            Email
          </label>
        </div>

        <div className="lp-float-field">
          <input
            id="lp-auth-password"
            className="lp-float-input"
            type="password"
            placeholder=" "
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <label htmlFor="lp-auth-password" className="lp-float-label">
            Password
          </label>
        </div>

        {mode === 'signup' ? (
          <>
            <fieldset className="lp-fieldset">
              <legend className="lp-fieldset-legend">Role</legend>
              <div className="lp-radio-row">
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="citizen"
                    checked={role === 'citizen'}
                    onChange={(event) => setRole(event.target.value)}
                  />
                  Citizen
                </label>
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="responder"
                    checked={role === 'responder'}
                    onChange={(event) => setRole(event.target.value)}
                  />
                  Responder
                </label>
              </div>
            </fieldset>

            <div className="lp-float-field">
              <input
                id="lp-auth-phone"
                className="lp-float-input"
                type="tel"
                placeholder=" "
                required
                autoComplete="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
              <label htmlFor="lp-auth-phone" className="lp-float-label">
                Phone number
              </label>
            </div>

            {role === 'responder' ? (
              <>
                <div className="lp-float-field">
                  <input
                    id="lp-auth-fullname-r"
                    className="lp-float-input"
                    type="text"
                    placeholder=" "
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                  <label htmlFor="lp-auth-fullname-r" className="lp-float-label">
                    Full name
                  </label>
                </div>

                <div className="lp-float-field">
                  <input
                    id="lp-auth-qual"
                    className="lp-float-input"
                    type="text"
                    placeholder=" "
                    required
                    value={medicalQualification}
                    onChange={(event) => setMedicalQualification(event.target.value)}
                  />
                  <label htmlFor="lp-auth-qual" className="lp-float-label">
                    Medical qualification
                  </label>
                </div>

                <div className="lp-file-field">
                  <label className="lp-float-label" htmlFor="lp-auth-cert">
                    Certificate file
                  </label>
                  <input
                    id="lp-auth-cert"
                    className="lp-float-input"
                    type="file"
                    onChange={handleCertificateChange}
                    required
                  />
                </div>
              </>
            ) : null}

            {role === 'citizen' ? (
              <>
                <div className="lp-float-field">
                  <input
                    id="lp-auth-fullname-c"
                    className="lp-float-input"
                    type="text"
                    placeholder=" "
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                  <label htmlFor="lp-auth-fullname-c" className="lp-float-label">
                    Full name
                  </label>
                </div>

                <div className="lp-float-field lp-float-field--select">
                  <select
                    id="lp-auth-blood"
                    className="lp-float-input lp-float-input--select"
                    value={bloodGroup}
                    onChange={(event) => setBloodGroup(event.target.value)}
                  >
                    {BLOOD_GROUPS.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="lp-auth-blood" className="lp-float-label">
                    Blood group
                  </label>
                </div>

                <div className="lp-float-field">
                  <input
                    id="lp-auth-ec-name"
                    className="lp-float-input"
                    type="text"
                    placeholder=" "
                    required
                    autoComplete="section-emergency name"
                    value={emergencyContactName}
                    onChange={(event) => setEmergencyContactName(event.target.value)}
                  />
                  <label htmlFor="lp-auth-ec-name" className="lp-float-label">
                    Emergency contact name
                  </label>
                </div>

                <div className="lp-float-field">
                  <input
                    id="lp-auth-ec-phone"
                    className="lp-float-input"
                    type="tel"
                    placeholder=" "
                    required
                    autoComplete="tel"
                    value={emergencyContactPhone}
                    onChange={(event) => setEmergencyContactPhone(event.target.value)}
                  />
                  <label htmlFor="lp-auth-ec-phone" className="lp-float-label">
                    Emergency contact phone
                  </label>
                </div>

                <div className="lp-textarea-outlined">
                  <label htmlFor="lp-auth-medical">
                    Medical conditions / allergies (optional)
                  </label>
                  <textarea
                    id="lp-auth-medical"
                    rows={4}
                    value={medicalConditions}
                    onChange={(event) => setMedicalConditions(event.target.value)}
                  />
                </div>
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
          <p className="lp-auth-verify">
            Verifying credentials with medical database…
          </p>
        ) : null}
      </form>

      <div className="lp-auth-switch">
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

      {message ? <p className="lp-auth-message">{message}</p> : null}
    </div>
  )
}

