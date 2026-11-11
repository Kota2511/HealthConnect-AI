
import { useEffect, useState, useCallback } from 'react'
import './App.css'
import { supabase } from './supabase'
import AdminLogin from './AdminLogin'
import AddHospital from './AddHospital'

// Convert Telugu voice-search words into English search terms
function normalizeSearch(text) {
  let value = String(text || '').toLowerCase().trim()

  const replacements = [
    [/కాకినాడలో|కాకినాడకు|కాకినాడని|కాకినాడ సిటీలో|కాకినాడ/g, ' kakinada '],

    [/హాస్పిటల్స్|హాస్పిటల్|హాస్పిటల్స్ ని|ఆసుపత్రులు|ఆసుపత్రి|వైద్యశాలలు|వైద్యశాల/g, ' '],

    [/చూపించండి|చూపించు|చూపించవా|కనిపించండి|కనిపించు|కావాలి|కావలెను|ఉన్నవి|ఉన్న|లో ఉన్న|లోని|ఎక్కడ|ఏమైనా/g, ' '],

    [/కార్డియాలజిస్టులు|కార్డియాలజిస్ట్|కార్డియాలజీని|కార్డియాలజీ|గుండె వైద్యులు|గుండె వైద్యుడు|గుండె వైద్యం|గుండె సంబంధిత|హృదయ వైద్యం|గుండె/g, ' cardiology '],

    [/న్యూరాలజిస్టులు|న్యూరాలజిస్ట్|న్యూరాలజీని|న్యూరాలజీ|నరాల వైద్యం|నరాల|నరాలు|మెదడు వైద్యం|మెదడు/g, ' neurology '],

    [/ఆర్థోపెడిక్స్|ఆర్థోపెడిక్|ఎముకల వైద్యం|ఎముకల|ఎముకలు|ఎముకల డాక్టర్/g, ' orthopedics '],

    [/నెఫ్రాలజిస్టులు|నెఫ్రాలజిస్ట్|నెఫ్రాలజీ|కిడ్నీ వైద్యం|కిడ్నీ|మూత్రపిండాలు/g, ' nephrology '],

    [/జనరల్ మెడిసిన్|సాధారణ వైద్యం|జనరల్ వైద్యం|సాధారణ వైద్యులు/g, ' general medicine ']
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
  const [checkingSession, setCheckingSession] = useState(true)

  // Edit hospital states
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

  // Fetch verified hospitals for public website
  const fetchHospitals = useCallback(async () => {
    try {
      const response = await fetch(
        'http://127.0.0.1:8000/hospitals'
      )

      if (!response.ok) {
        throw new Error('Unable to fetch hospitals')
      }

      const data = await response.json()

      setHospitals(data.hospitals || [])
      setError('')
    } catch (err) {
      console.error(err)
      setError('Backend connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch all hospitals for admin dashboard
  const fetchAdminHospitals = useCallback(async () => {
    setAdminLoading(true)
    setAdminError('')

    try {
      const { data, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError) throw sessionError

      const token = data.session?.access_token

      if (!token) {
        throw new Error('Please login again.')
      }

      const response = await fetch(
        'http://127.0.0.1:8000/admin/hospitals',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.detail || 'Unable to load hospitals.'
        )
      }

      setAdminHospitals(result.hospitals || [])
    } catch (err) {
      console.error(err)
      setAdminError(
        err.message || 'Unable to load hospital records.'
      )
    } finally {
      setAdminLoading(false)
    }
  }, [])

  // Load public hospitals
  useEffect(() => {
    fetchHospitals()
  }, [fetchHospitals])

  // Load admin hospital list when dashboard opens
  useEffect(() => {
    if (page === 'dashboard' && adminUser) {
      fetchAdminHospitals()
    }
  }, [page, adminUser, fetchAdminHospitals])

  // Check existing admin session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const user = data.session?.user

        if (user) {
          const { data: admin, error: adminError } =
            await supabase
              .from('admin_users')
              .select('user_id')
              .eq('user_id', user.id)
              .maybeSingle()

          if (adminError) throw adminError

          if (admin) {
            setAdminUser(user)
            setPage('dashboard')
          } else {
            await supabase.auth.signOut()
          }
        }
      } catch (err) {
        console.error('Session check failed:', err)
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  // Telugu and English voice search
  const startVoiceSearch = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setVoiceError(
        'Voice search is not supported. Please use Google Chrome.'
      )
      return
    }

    const recognition = new SpeechRecognition()

    recognition.lang = language
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setVoiceError('')
    }

    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript

      setSearch(transcript)
      setVoiceError('')
    }

    recognition.onerror = event => {
      setVoiceError(
        event.error === 'not-allowed'
          ? 'Please allow microphone permission in Chrome.'
          : 'Voice recognition failed. Please try again.'
      )
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    try {
      recognition.start()
    } catch {
      setIsListening(false)
      setVoiceError(
        'Unable to start microphone. Please try again.'
      )
    }
  }

  // Speak hospital details
  const speakHospital = hospital => {
    if (!('speechSynthesis' in window)) {
      setVoiceError(
        'Voice output is not supported in this browser.'
      )
      return
    }

    window.speechSynthesis.cancel()
    setVoiceError('')

    const details = `
      Hospital name: ${hospital.name}.
      Address: ${hospital.address}.
      City: ${hospital.city}.
      Specialties: ${hospital.specialty || 'Not available'}.
      Phone number: ${hospital.phone || 'Not available'}.
    `

    const speech = new SpeechSynthesisUtterance(details)

    speech.lang = 'en-IN'
    speech.rate = 0.9
    speech.pitch = 1

    speech.onstart = () => setSpeakingId(hospital.id)
    speech.onend = () => setSpeakingId(null)
    speech.onerror = () => setSpeakingId(null)

    window.speechSynthesis.speak(speech)
  }

  // Stop voice output
  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    setSpeakingId(null)
  }

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  // Admin login success
  const handleAdminLogin = user => {
    setAdminUser(user)
    setPage('dashboard')
  }

  // Admin logout
  const handleAdminLogout = async () => {
    await supabase.auth.signOut()

    setAdminUser(null)
    setAdminHospitals([])
    setEditingHospital(null)
    setPage('home')
  }

  // Start editing hospital
  const startEditing = hospital => {
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

  // Handle edit form changes
  const handleEditChange = event => {
    const { name, value } = event.target

    setEditForm(previous => ({
      ...previous,
      [name]: value
    }))
  }

  // Save hospital changes
  const handleUpdateHospital = async event => {
    event.preventDefault()

    setEditLoading(true)
    setEditMessage('')
    setEditError('')

    try {
      const { data, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError) throw sessionError

      const token = data.session?.access_token

      if (!token) {
        throw new Error('Please login again.')
      }

      const response = await fetch(
        `http://127.0.0.1:8000/hospitals/${editingHospital}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...editForm,
            latitude: editForm.latitude === ''
              ? null
              : Number(editForm.latitude),
            longitude: editForm.longitude === ''
              ? null
              : Number(editForm.longitude)
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.detail || 'Unable to update hospital.'
        )
      }

      setEditMessage('Hospital updated successfully!')

      await fetchAdminHospitals()
      await fetchHospitals()

      setEditingHospital(null)
    } catch (err) {
      console.error(err)
      setEditError(
        err.message || 'Unable to update hospital.'
      )
    } finally {
      setEditLoading(false)
    }
  }

  // Loading screen
  if (checkingSession) {
    return (
      <div style={{
        padding: '50px',
        textAlign: 'center'
      }}>
        Checking session...
      </div>
    )
  }

  // Admin login page
  if (page === 'login') {
    return (
      <AdminLogin
        onLogin={handleAdminLogin}
        onBack={() => setPage('home')}
      />
    )
  }

  // Admin dashboard
  if (page === 'dashboard' && adminUser) {
    const verifiedCount = adminHospitals.filter(
      hospital => hospital.is_verified
    ).length

    const pendingCount = adminHospitals.filter(
      hospital => !hospital.is_verified
    ).length

    const editInputStyle = {
      width: '100%',
      padding: '11px',
      marginTop: '6px',
      marginBottom: '13px',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      boxSizing: 'border-box'
    }

    return (
      <div style={{
        minHeight: '100vh',
        background: '#f1f6fc',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '30px auto',
          background: 'white',
          padding: '30px',
          borderRadius: '16px',
          boxShadow: '0 5px 25px rgba(0,0,0,0.08)'
        }}>
          <h1 style={{ color: '#147de0' }}>
            HealthConnect AI
          </h1>

          <h2>Admin Dashboard</h2>
          <p>Welcome, Admin!</p>
          <p>Email: {adminUser.email}</p>

          <hr />

          <h3>Hospital Management</h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '25px'
          }}>
            <div style={{
              padding: '20px',
              background: '#e5f2ff',
              borderRadius: '10px'
            }}>
              <h2 style={{
                color: '#147de0',
                margin: 0
              }}>
                {adminLoading ? '...' : adminHospitals.length}
              </h2>
              <p>Total Hospitals</p>
            </div>

            <div style={{
              padding: '20px',
              background: '#dcfce7',
              borderRadius: '10px'
            }}>
              <h2 style={{
                color: '#15803d',
                margin: 0
              }}>
                {adminLoading ? '...' : verifiedCount}
              </h2>
              <p>Verified Hospitals</p>
            </div>

            <div style={{
              padding: '20px',
              background: '#fef3c7',
              borderRadius: '10px'
            }}>
              <h2 style={{
                color: '#b45309',
                margin: 0
              }}>
                {adminLoading ? '...' : pendingCount}
              </h2>
              <p>Pending Verification</p>
            </div>
          </div>

          {adminError && (
            <p style={{ color: 'red' }}>
              {adminError}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              fetchAdminHospitals()
              fetchHospitals()
            }}
            style={{
              padding: '11px 18px',
              background: '#e5f2ff',
              color: '#147de0',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            ↻ Refresh Hospital List
          </button>

          <hr />

          {/* Add Hospital Form */}
          <AddHospital
            onAdded={() => {
              fetchHospitals()
              fetchAdminHospitals()
            }}
          />

          <hr style={{ margin: '30px 0' }} />

          {/* Hospital Records */}
          <h3>All Hospital Records</h3>

          <p style={{ color: '#64748b' }}>
            Edit hospital information and add missing specialties.
          </p>

          {adminLoading && (
            <p>Loading hospital records...</p>
          )}

          {!adminLoading && adminHospitals.length === 0 && (
            <p>No hospital records found.</p>
          )}

          <div style={{
            display: 'grid',
            gap: '18px'
          }}>
            {adminHospitals.map(hospital => (
              <div
                key={hospital.id}
                style={{
                  border: '1px solid #dbe3ed',
                  borderRadius: '12px',
                  padding: '18px',
                  background: '#ffffff'
                }}
              >
                {editingHospital === hospital.id ? (
                  <form onSubmit={handleUpdateHospital}>
                    <h3 style={{ color: '#147de0' }}>
                      Edit Hospital
                    </h3>

                    <label>Hospital Name *</label>
                    <input
                      style={editInputStyle}
                      name="name"
                      value={editForm.name}
                      onChange={handleEditChange}
                      required
                      minLength={2}
                    />

                    <label>Address *</label>
                    <textarea
                      style={editInputStyle}
                      name="address"
                      value={editForm.address}
                      onChange={handleEditChange}
                      required
                      minLength={5}
                      rows={3}
                    />

                    <label>City *</label>
                    <input
                      style={editInputStyle}
                      name="city"
                      value={editForm.city}
                      onChange={handleEditChange}
                      required
                      minLength={2}
                    />

                    <label>Phone Number</label>
                    <input
                      style={editInputStyle}
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditChange}
                    />

                    <label>Specialties</label>
                    <textarea
                      style={editInputStyle}
                      name="specialty"
                      value={editForm.specialty}
                      onChange={handleEditChange}
                      rows={4}
                      placeholder="Example: Cardiology, Neurology, Orthopedics"
                    />

                    <label>Latitude (Optional)</label>
                    <input
                      style={editInputStyle}
                      type="number"
                      step="any"
                      name="latitude"
                      value={editForm.latitude}
                      onChange={handleEditChange}
                    />

                    <label>Longitude (Optional)</label>
                    <input
                      style={editInputStyle}
                      type="number"
                      step="any"
                      name="longitude"
                      value={editForm.longitude}
                      onChange={handleEditChange}
                    />

                    {editError && (
                      <p style={{ color: 'red' }}>
                        {editError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={editLoading}
                      style={{
                        padding: '11px 18px',
                        background: '#15803d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginRight: '10px'
                      }}
                    >
                      {editLoading
                        ? 'Saving...'
                        : 'Save Changes'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingHospital(null)
                        setEditError('')
                      }}
                      style={{
                        padding: '11px 18px',
                        background: '#e5e7eb',
                        color: '#111827',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}>
                      <h3 style={{ margin: 0 }}>
                        {hospital.name}
                      </h3>

                      <span style={{
                        padding: '5px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        background: hospital.is_verified
                          ? '#dcfce7'
                          : '#fef3c7',
                        color: hospital.is_verified
                          ? '#166534'
                          : '#92400e'
                      }}>
                        {hospital.is_verified
                          ? 'Verified'
                          : 'Pending Verification'}
                      </span>
                    </div>

                    <p>📍 {hospital.address}</p>
                    <p>🏙️ {hospital.city}</p>
                    <p>
                      📞 {hospital.phone || 'Phone not available'}
                    </p>
                    <p>
                      🩺 {hospital.specialty || 'Specialty not added'}
                    </p>

                    <button
                      type="button"
                      onClick={() => startEditing(hospital)}
                      style={{
                        padding: '10px 18px',
                        background: '#147de0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginTop: '8px'
                      }}
                    >
                      ✏️ Edit Hospital
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <hr style={{ margin: '30px 0' }} />

          <button
            type="button"
            onClick={() => setPage('home')}
            style={{
              padding: '12px 20px',
              background: '#147de0',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            View Website
          </button>

          <button
            type="button"
            onClick={handleAdminLogout}
            style={{
              padding: '12px 20px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  // Public hospital search
  const searchText = normalizeSearch(search)

  const filteredHospitals = hospitals.filter(hospital => {
    const hospitalDetails = normalizeSearch(
      `${hospital.name} ${hospital.city} ${hospital.specialty || ''} ${hospital.address}`
    )

    if (!searchText) return true

    return searchText.split(' ').every(word =>
      hospitalDetails.includes(word)
    )
  })

  return (
    <div className="app">

      {/* Navigation */}
      <nav className="navbar">
        <div className="brand">
          <span className="brand-icon">✚</span>
          HealthConnect <span>AI</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <a href="#hospitals">
            Find Hospitals
          </a>

          <button
            type="button"
            onClick={() => setPage('login')}
            style={{
              padding: '10px 16px',
              background: '#147de0',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Admin Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <span className="tagline">
            YOUR HEALTH, OUR PRIORITY
          </span>

          <h1>
            Find the Right Hospital <span>Near You</span>
          </h1>

          <p>
            Discover verified hospitals and healthcare services
            with HealthConnect AI.
          </p>

          <div className="search-box">
            <span>🔍</span>

            <input
              type="text"
              placeholder="Search hospital, city or specialty..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />

            <select
              value={language}
              onChange={event => setLanguage(event.target.value)}
              aria-label="Select voice search language"
            >
              <option value="te-IN">తెలుగు</option>
              <option value="en-IN">English</option>
            </select>

            <button
              type="button"
              onClick={startVoiceSearch}
              disabled={isListening}
              title="Voice Search"
              aria-label="Start voice search"
              style={{
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                background: isListening ? '#dc2626' : '#147de0',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          </div>

          {isListening && (
            <p style={{
              color: 'white',
              marginTop: '12px'
            }}>
              Listening... Speak now.
            </p>
          )}

          {voiceError && (
            <p style={{
              color: '#ffe0e0',
              marginTop: '12px'
            }}>
              {voiceError}
            </p>
          )}
        </div>
      </header>

      {/* Hospital Directory */}
      <main className="hospital-section" id="hospitals">
        <div className="section-heading">
          <div>
            <span className="small-title">
              HEALTHCARE DIRECTORY
            </span>

            <h2>Available Hospitals</h2>
          </div>

          <span className="hospital-count">
            {filteredHospitals.length} Hospitals
          </span>
        </div>

        {loading && (
          <p>Loading hospitals...</p>
        )}

        {error && (
          <p className="error">{error}</p>
        )}

        {!loading && !error && filteredHospitals.length === 0 && (
          <p>No hospitals found. Try another search.</p>
        )}

        <div className="hospital-grid">
          {filteredHospitals.map(hospital => (
            <article
              className="hospital-card"
              key={hospital.id}
            >
              <div className="hospital-image">
                🏥
              </div>

              <div className="hospital-info">
                {hospital.is_verified && (
                  <span className="verified">
                    ✓ Verified Hospital
                  </span>
                )}

                <h3>{hospital.name}</h3>

                <p>📍 {hospital.address}</p>
                <p>🏙️ {hospital.city}</p>

                <p>
                  🩺 {hospital.specialty || 'Specialty not listed'}
                </p>

                <p>
                  📞 {hospital.phone || 'Phone unavailable'}
                </p>

                <button
                  type="button"
                  onClick={() => speakHospital(hospital)}
                  style={{
                    marginTop: '12px',
                    padding: '10px 18px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#e5f2ff',
                    color: '#147de0',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {speakingId === hospital.id
                    ? '🔊 Speaking...'
                    : '🔊 Listen to Hospital Details'}
                </button>

                {speakingId === hospital.id && (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    style={{
                      marginLeft: '8px',
                      padding: '10px 18px',
                      border: 'none',
                      borderRadius: '8px',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      cursor: 'pointer'
                    }}
                  >
                    ⏹ Stop
                  </button>
                )}

                <div className="hospital-actions">
                  {hospital.phone ? (
                    <a href={`tel:${hospital.phone}`}>
                      📞 Call Hospital
                    </a>
                  ) : (
                    <span>Phone unavailable</span>
                  )}

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.address)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    📍 Directions
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer>
        <h3>HealthConnect AI</h3>
        <p>Smart Healthcare. Better Lives.</p>
        <p>© 2026 HealthConnect AI</p>
      </footer>
    </div>
  )
}

export default App
