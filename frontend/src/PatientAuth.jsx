
import { useState } from 'react'
import { supabase } from './supabase'

export default function PatientAuth({ onLogin, onBack }) {
  const [mode, setMode] = useState('login')
  const [method, setMethod] = useState('email')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const clearMessages = () => {
    setError('')
    setMessage('')
  }

  
  const checkAdmin = async (userId) => {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  if (data) {
    await supabase.auth.signOut()
    throw new Error(
      'This is an admin account. Please use Admin Login.'
    )
  }
}


  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    clearMessages()

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('Please enter your full name.')
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim()
            }
          }
        })

        if (error) throw error

        if (data.user && data.session) {
          await checkAdmin(data.user.id)

          const { error: profileError } = await supabase
            .from('patient_profiles')
            .upsert({
              id: data.user.id,
              full_name: name.trim()
            })

          if (profileError) throw profileError

          onLogin(data.user)
        } else {
          setMessage(
            'Registration successful! Please verify your email and then log in.'
          )
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

        if (error) throw error

        await checkAdmin(data.user.id)

        const profileName =
          data.user.user_metadata?.full_name ||
          data.user.email?.split('@')[0] ||
          'Patient'

        const { error: profileError } = await supabase
          .from('patient_profiles')
          .upsert({
            id: data.user.id,
            full_name: profileName
          })

        if (profileError) {
          await supabase.auth.signOut()
          throw profileError
        }

        onLogin(data.user)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const sendOtp = async () => {
    setLoading(true)
    clearMessages()

    try {
      const formattedPhone = phone.trim()

      if (!/^\+[1-9]\d{7,14}$/.test(formattedPhone)) {
        throw new Error(
          'Enter a valid phone number with country code. Example: +919876543210'
        )
      }

      if (mode === 'register' && !name.trim()) {
        throw new Error('Please enter your full name.')
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          shouldCreateUser: mode === 'register',
          data: mode === 'register'
            ? { full_name: name.trim() }
            : undefined
        }
      })

      if (error) throw error

      setOtpSent(true)
      setMessage('OTP sent successfully. Please check your phone.')
    } catch (err) {
      setError(err.message || 'Unable to send OTP.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setLoading(true)
    clearMessages()

    try {
      if (!otp.trim()) {
        throw new Error('Please enter the OTP.')
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: otp.trim(),
        type: 'sms'
      })

      if (error) throw error

      if (!data.user) {
        throw new Error('User verification failed. Please try again.')
      }

      await checkAdmin(data.user.id)

      const { data: profile, error: profileError } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profile && mode === 'register') {
        const { error: insertError } = await supabase
          .from('patient_profiles')
          .insert({
            id: data.user.id,
            full_name: name.trim(),
            phone: phone.trim()
          })

        if (insertError) throw insertError
      } else if (!profile) {
        await supabase.auth.signOut()
        throw new Error('Patient account not found. Please register first.')
      }

      onLogin(data.user)
    } catch (err) {
      setError(err.message || 'OTP verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const changeMode = (newMode) => {
    setMode(newMode)
    setOtpSent(false)
    setOtp('')
    clearMessages()
  }

  const changeMethod = (newMethod) => {
    setMethod(newMethod)
    setOtpSent(false)
    setOtp('')
    clearMessages()
  }

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#f0f6ff',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      boxSizing: 'border-box',
      fontFamily: 'Arial, sans-serif'
    },
    card: {
      width: '100%',
      maxWidth: '440px',
      background: '#ffffff',
      padding: '36px',
      borderRadius: '20px',
      boxShadow: '0 12px 40px rgba(20, 60, 100, 0.10)',
      boxSizing: 'border-box'
    },
    heading: {
      textAlign: 'center',
      color: '#1479df',
      fontSize: '30px',
      margin: '0 0 8px'
    },
    subtitle: {
      textAlign: 'center',
      color: '#18375c',
      fontSize: '22px',
      margin: '0 0 8px'
    },
    description: {
      textAlign: 'center',
      color: '#64748b',
      marginBottom: '25px'
    },
    input: {
      width: '100%',
      padding: '14px',
      marginBottom: '16px',
      border: '1px solid #cbd8e8',
      borderRadius: '9px',
      background: '#f7faff',
      fontSize: '15px',
      boxSizing: 'border-box',
      outlineColor: '#1680e8'
    },
    button: {
      padding: '13px 16px',
      border: 'none',
      borderRadius: '9px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '600'
    },
    primary: {
      width: '100%',
      background: '#1479df',
      color: '#ffffff',
      marginTop: '5px'
    },
    secondary: {
      background: '#e8f2ff',
      color: '#1479df'
    },
    tabs: {
      display: 'flex',
      gap: '10px',
      marginBottom: '18px'
    },
    tab: {
      flex: 1,
      padding: '12px 8px',
      borderRadius: '9px',
      border: '1px solid #d5e2f1',
      cursor: 'pointer',
      fontWeight: '600'
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>HealthConnect AI</h1>

        <h2 style={styles.subtitle}>
          Patient {mode === 'login' ? 'Login' : 'Registration'}
        </h2>

        <p style={styles.description}>
          Your healthcare journey starts here.
        </p>

        <button
          type="button"
          style={{
            ...styles.button,
            ...styles.secondary,
            marginBottom: '22px'
          }}
          onClick={onBack}
        >
          ← Back to Home
        </button>

        <div style={styles.tabs}>
          <button
            type="button"
            style={{
              ...styles.tab,
              background: method === 'email' ? '#1479df' : '#e8f2ff',
              color: method === 'email' ? '#fff' : '#1479df'
            }}
            onClick={() => changeMethod('email')}
          >
            Email
          </button>

          <button
            type="button"
            style={{
              ...styles.tab,
              background: method === 'phone' ? '#1479df' : '#e8f2ff',
              color: method === 'phone' ? '#fff' : '#1479df'
            }}
            onClick={() => changeMethod('phone')}
          >
            Phone OTP
          </button>
        </div>

        <div style={styles.tabs}>
          <button
            type="button"
            style={{
              ...styles.tab,
              background: mode === 'login' ? '#1479df' : '#e8f2ff',
              color: mode === 'login' ? '#fff' : '#1479df'
            }}
            onClick={() => changeMode('login')}
          >
            Login
          </button>

          <button
            type="button"
            style={{
              ...styles.tab,
              background: mode === 'register' ? '#1479df' : '#e8f2ff',
              color: mode === 'register' ? '#fff' : '#1479df'
            }}
            onClick={() => changeMode('register')}
          >
            Register
          </button>
        </div>

        {method === 'email' ? (
          <form onSubmit={handleEmailAuth}>
            {mode === 'register' && (
              <input
                style={styles.input}
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            )}

            <input
              style={styles.input}
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <input
              style={styles.input}
              type="password"
              placeholder="Password (minimum 6 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
            />

            <button
              type="submit"
              style={{
                ...styles.button,
                ...styles.primary
              }}
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Login to Account'
                  : 'Create Patient Account'}
            </button>
          </form>
        ) : (
          <div>
            {mode === 'register' && (
              <input
                style={styles.input}
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            )}

            <input
              style={styles.input}
              type="tel"
              placeholder="Phone (+919876543210)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={otpSent}
              required
            />

            {!otpSent ? (
              <button
                type="button"
                style={{
                  ...styles.button,
                  ...styles.primary
                }}
                onClick={sendOtp}
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            ) : (
              <>
                <input
                  style={styles.input}
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  maxLength={10}
                  required
                />

                <button
                  type="button"
                  style={{
                    ...styles.button,
                    ...styles.primary
                  }}
                  onClick={verifyOtp}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.button,
                    ...styles.secondary,
                    width: '100%',
                    marginTop: '12px'
                  }}
                  onClick={sendOtp}
                  disabled={loading}
                >
                  Resend OTP
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.button,
                    ...styles.secondary,
                    width: '100%',
                    marginTop: '12px'
                  }}
                  onClick={() => {
                    setOtpSent(false)
                    setOtp('')
                    clearMessages()
                  }}
                >
                  Change Phone Number
                </button>
              </>
            )}
          </div>
        )}

        {message && (
          <p style={{
            color: '#15803d',
            background: '#ecfdf5',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '18px'
          }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{
            color: '#dc2626',
            background: '#fef2f2',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '18px'
          }}>
            {error}
          </p>
        )}

        <p style={{
          textAlign: 'center',
          color: '#64748b',
          fontSize: '13px',
          marginTop: '25px'
        }}>
          Secure Patient Authentication
        </p>
      </div>
    </div>
  )
}
