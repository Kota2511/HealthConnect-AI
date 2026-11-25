
import { useEffect, useState, useCallback } from 'react'
import './App.css'
import { supabase } from './supabase'
import AdminLogin from './AdminLogin'
import AddHospital from './AddHospital'
import PatientAuth from './PatientAuth'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://healthconnect-ai-4qgk.onrender.com'

function normalizeSearch(text) {
  let value = String(text || '').toLowerCase().trim()

  const replacements = [
    [/కాకినాడ|కాకినాడలో|కాకినాడలొ|కాకినాడ లో/g, 'kakinada'],
    [/ఆసుపత్రులు|హాస్పిటల్స్|హాస్పిటల్|ఆసుపత్రి/g, ''],
    [/కావాలి|చూపించు|చూపించండి|ఉన్నాయా|ఉన్నవి|దగ్గరలో/g, ''],
    [/గుండె|హార్ట్/g, 'cardiology'],
    [/మెదడు|నరాలు|న్యూరో/g, 'neurology'],
    [/ఎముకలు|ఆర్థో/g, 'orthopedics'],
    [/కిడ్నీ|మూత్రపిండాలు/g, 'nephrology'],
    [/జనరల్|సాధారణ/g, 'general medicine']
  ]

  replacements.forEach(([pattern, replacement]) => {
    value = value.replace(pattern, replacement)
  })

  return value
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function App() {
  const [hospitals, setHospitals] = useState([])
  const [adminHospitals, setAdminHospitals] = useState([])
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [adminLoading, setAdminLoading] = useState(false)
  const [error, setError] = useState('')
  const [adminError, setAdminError] = useState('')

  const [language, setLanguage] = useState('te-IN')
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [speakingId, setSpeakingId] = useState(null)

  const [page, setPage] = useState('home')
  const [adminUser, setAdminUser] = useState(null)
  const [patientUser, setPatientUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  const [editingHospital, setEditingHospital] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    specialty: '',
    latitude: '',
    longitude: ''
  })

  const [editLoading, setEditLoading] = useState(false)
  const [editMessage, setEditMessage] = useState('')
  const [editError, setEditError] = useState('')

  const fetchHospitals = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/hospitals`)

      if (!response.ok) {
        throw new Error('Unable to load hospitals')
      }

      const data = await response.json()
      setHospitals(data.hospitals || [])
    } catch (err) {
      setError(err.message || 'Failed to load hospitals')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAdminHospitals = useCallback(async () => {
    setAdminLoading(true)
    setAdminError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Admin session not found. Please login again.')
      }

      const response = await fetch(`${API_URL}/admin/hospitals`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to load admin hospitals')
      }

      setAdminHospitals(data.hospitals || [])
    } catch (err) {
      setAdminError(err.message || 'Failed to load admin hospitals')
    } finally {
      setAdminLoading(false)
    }
  }, [])

  // Check whether the active Supabase session belongs to an admin or patient.
  useEffect(() => {
    let active = true

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!active) return

        if (!session?.user) {
          setCheckingSession(false)
          return
        }

        const user = session.user

        const { data: adminRecord, error: adminCheckError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (!active) return

        if (!adminCheckError && adminRecord) {
          setAdminUser(user)
          setPatientUser(null)
          setPage('dashboard')
          setCheckingSession(false)
          return
        }

        const { data: patientRecord, error: patientCheckError } = await supabase
          .from('patient_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (!active) return

        if (!patientCheckError && patientRecord) {
          setPatientUser(user)
          setAdminUser(null)
          setPage('patient-dashboard')
        }
      } catch (err) {
        console.error('Session check error:', err)
      } finally {
        if (active) setCheckingSession(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Session is checked on initial load and explicit login/logout handlers.
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    fetchHospitals()
  }, [fetchHospitals])

  useEffect(() => {
    if (page === 'dashboard' && adminUser) {
      fetchAdminHospitals()
    }
  }, [page, adminUser, fetchAdminHospitals])

  const handleAdminLogin = (user) => {
    setAdminUser(user)
    setPatientUser(null)
    setPage('dashboard')
  }

  const handleAdminLogout = async () => {
    await supabase.auth.signOut()
    setAdminUser(null)
    setPatientUser(null)
    setPage('home')
  }

  const handlePatientLogin = (user) => {
    setPatientUser(user)
    setAdminUser(null)
    setPage('patient-dashboard')
  }

  const handlePatientLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert(error.message)
      return
    }

    setPatientUser(null)
    setAdminUser(null)
    setPage('home')
  }

  const startVoiceSearch = () => {
    setVoiceError('')

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setVoiceError('Voice search is not supported in this browser. Try Chrome.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = language
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setSearch(transcript)
      setIsListening(false)
    }

    recognition.onerror = (event) => {
      setVoiceError(`Voice search error: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => setIsListening(false)

    recognition.start()
  }

  const speakHospital = (hospital) => {
    if (!window.speechSynthesis) return

    window.speechSynthesis.cancel()

    const message = [
      hospital.name,
      hospital.address,
      hospital.city,
      hospital.specialty,
      hospital.phone
    ].filter(Boolean).join('. ')

    const utterance = new SpeechSynthesisUtterance(message)
    utterance.lang = 'en-IN'

    utterance.onstart = () => setSpeakingId(hospital.id)
    utterance.onend = () => setSpeakingId(null)
    utterance.onerror = () => setSpeakingId(null)

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel()
    setSpeakingId(null)
  }

  useEffect(() => {
    return () => window.speechSynthesis?.cancel()
  }, [])

  const startEditing = (hospital) => {
    setEditingHospital(hospital.id)

    setEditForm({
      name: hospital.name || '',
      address: hospital.address || '',
      city: hospital.city || '',
      phone: hospital.phone || '',
      specialty: hospital.specialty || '',
      latitude: hospital.latitude ?? '',
      longitude: hospital.longitude ?? ''
    })

    setEditMessage('')
    setEditError('')
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target

    setEditForm(previous => ({
      ...previous,
      [name]: value
    }))
  }

  const handleUpdateHospital = async (event) => {
    event.preventDefault()

    setEditLoading(true)
    setEditError('')
    setEditMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Please login again')
      }

      const payload = {
        ...editForm,
        latitude: editForm.latitude === '' ? null : Number(editForm.latitude),
        longitude: editForm.longitude === '' ? null : Number(editForm.longitude)
      }

      const response = await fetch(
        `${API_URL}/hospitals/${editingHospital}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Hospital update failed')
      }

      setEditMessage('Hospital updated successfully!')
      setEditingHospital(null)

      await fetchHospitals()
      await fetchAdminHospitals()
    } catch (err) {
      setEditError(err.message || 'Unable to update hospital')
    } finally {
      setEditLoading(false)
    }
  }

  const filteredHospitals = hospitals.filter(hospital => {
    const query = normalizeSearch(search)

    if (!query) return true

    const hospitalText = normalizeSearch([
      hospital.name,
      hospital.city,
      hospital.specialty,
      hospital.address
    ].join(' '))

    return query.split(' ').every(word => hospitalText.includes(word))
  })

  if (checkingSession) {
    return (
      <div className="loading-screen">
        <h2>HealthConnect AI</h2>
        <p>Checking your session...</p>
      </div>
    )
  }

  if (page === 'login') {
    return (
      <AdminLogin
        onLogin={handleAdminLogin}
        onBack={() => setPage('home')}
      />
    )
  }

  if (page === 'patient-auth') {
    return (
      <PatientAuth
        onLogin={handlePatientLogin}
        onBack={() => setPage('home')}
      />
    )
  }

  if (page === 'patient-dashboard' && patientUser) {
    const patientName =
      patientUser.user_metadata?.full_name ||
      patientUser.phone ||
      patientUser.email ||
      'Patient'

    return (
      <div className="patient-dashboard">
        <header className="navbar">
          <h2>HealthConnect AI</h2>
          <button onClick={handlePatientLogout}>Logout</button>
        </header>

        <main className="dashboard-container">
          <h1>Welcome, {patientName}</h1>
          <p>You are successfully logged in to HealthConnect AI.</p>

          <section className="dashboard-card">
            <h2>Find Hospitals</h2>
            <p>Search hospitals and healthcare services near you.</p>
            <button onClick={() => setPage('home')}>
              Browse Hospitals
            </button>
          </section>
        </main>
      </div>
    )
  }

  if (page === 'dashboard' && adminUser) {
    return (
      <div className="admin-dashboard">
        <header className="navbar">
          <h2>HealthConnect AI Admin</h2>
          <button onClick={handleAdminLogout}>Logout</button>
        </header>

        <main className="dashboard-container">
          <h1>Admin Dashboard</h1>
          <p>Welcome, {adminUser.email}</p>

          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>{hospitals.length}</h3>
              <p>Total Public Hospitals</p>
            </div>
            <div className="stat-card">
              <h3>{adminHospitals.length}</h3>
              <p>Admin Hospital Records</p>
            </div>
          </div>

          {adminError && <p className="error-message">{adminError}</p>}

          <button onClick={fetchAdminHospitals} disabled={adminLoading}>
            {adminLoading ? 'Refreshing...' : 'Refresh Hospitals'}
          </button>

          <AddHospital
            onAdded={() => {
              fetchHospitals()
              fetchAdminHospitals()
            }}
          />

          <h2>Manage Hospitals</h2>

          {adminLoading ? (
            <p>Loading hospitals...</p>
          ) : (
            <div className="hospital-list">
              {adminHospitals.map(hospital => (
                <div className="hospital-card" key={hospital.id}>
                  <h3>{hospital.name}</h3>
                  <p>{hospital.address}</p>
                  <p>{hospital.city}</p>
                  <p>{hospital.phone}</p>
                  <p>{hospital.specialty}</p>

                  <button onClick={() => startEditing(hospital)}>
                    Edit Hospital
                  </button>
                </div>
              ))}
            </div>
          )}

          {editingHospital && (
            <form onSubmit={handleUpdateHospital} className="edit-form">
              <h2>Edit Hospital</h2>

              {Object.keys(editForm).map(field => (
                <input
                  key={field}
                  name={field}
                  value={editForm[field]}
                  onChange={handleEditChange}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  required={['name', 'address', 'city'].includes(field)}
                />
              ))}

              {editError && <p className="error-message">{editError}</p>}
              {editMessage && <p className="success-message">{editMessage}</p>}

              <button type="submit" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={() => setEditingHospital(null)}
              >
                Cancel
              </button>
            </form>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="brand">
          <h2>HealthConnect AI</h2>
        </div>

        <div className="nav-links">
          <a href="#hospitals">Find Hospitals</a>

          <button onClick={() => setPage('patient-auth')}>
            Patient Login
          </button>

          <button onClick={() => setPage('login')}>
            Admin Login
          </button>
        </div>
      </nav>

      <main>
        <section className="hero">
          <h1>Find the Right Hospital with HealthConnect AI</h1>
          <p>
            Search hospitals, explore specialties and find healthcare
            services with voice assistance.
          </p>

          <div className="search-container">
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search hospitals, city or specialty..."
            />

            <select
              value={language}
              onChange={event => setLanguage(event.target.value)}
            >
              <option value="te-IN">Telugu</option>
              <option value="en-IN">English</option>
              <option value="hi-IN">Hindi</option>
            </select>

            <button onClick={startVoiceSearch} disabled={isListening}>
              {isListening ? 'Listening...' : '🎤 Voice Search'}
            </button>
          </div>

          {voiceError && <p className="error-message">{voiceError}</p>}
        </section>

        <section id="hospitals" className="hospital-section">
          <h2>Available Hospitals</h2>

          {loading ? (
            <p>Loading hospitals...</p>
          ) : error ? (
            <div>
              <p className="error-message">{error}</p>
              <button onClick={fetchHospitals}>Try Again</button>
            </div>
          ) : filteredHospitals.length === 0 ? (
            <p>No hospitals found. Try another search.</p>
          ) : (
            <div className="hospital-list">
              {filteredHospitals.map(hospital => (
                <div className="hospital-card" key={hospital.id}>
                  <h3>{hospital.name}</h3>
                  <p>{hospital.address}</p>
                  <p>{hospital.city}</p>
                  <p>Specialty: {hospital.specialty || 'General'}</p>

                  {hospital.phone && (
                    <p>
                      Phone:{' '}
                      <a href={`tel:${hospital.phone}`}>
                        {hospital.phone}
                      </a>
                    </p>
                  )}

                  <div className="hospital-actions">
                    <button onClick={() => speakHospital(hospital)}>
                      {speakingId === hospital.id ? 'Speaking...' : '🔊 Listen'}
                    </button>

                    {speakingId === hospital.id && (
                      <button onClick={stopSpeaking}>Stop</button>
                    )}

                    {hospital.latitude && hospital.longitude && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Get Directions
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} HealthConnect AI. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
