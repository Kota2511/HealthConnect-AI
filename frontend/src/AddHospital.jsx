
import { useState } from 'react'
import { supabase } from './supabase'

function AddHospital({ onAdded }) {
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    specialty: '',
    latitude: '',
    longitude: ''
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const { data, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError) throw sessionError

      const token = data.session?.access_token

      if (!token) {
        throw new Error('Please login again.')
      }

      const response = await fetch(
        'https://healthconnect-ai-4qgk.onrender.com/hospitals',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...form,
            latitude: form.latitude
              ? Number(form.latitude)
              : null,
            longitude: form.longitude
              ? Number(form.longitude)
              : null
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Unable to add hospital.')
      }

      setMessage(
        'Hospital added successfully! Verification is pending.'
      )

      setForm({
        name: '',
        address: '',
        city: '',
        phone: '',
        specialty: '',
        latitude: '',
        longitude: ''
      })

      if (onAdded) onAdded()

    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px',
    marginTop: '6px',
    marginBottom: '15px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    boxSizing: 'border-box'
  }

  return (
    <div style={{
      marginTop: '30px',
      padding: '25px',
      background: '#f8fafc',
      borderRadius: '12px'
    }}>
      <h3>Add New Hospital</h3>

      <form onSubmit={handleSubmit}>
        <label>Hospital Name *</label>
        <input
          style={inputStyle}
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          minLength={2}
          placeholder="Enter hospital name"
        />

        <label>Address *</label>
        <textarea
          style={inputStyle}
          name="address"
          value={form.address}
          onChange={handleChange}
          required
          minLength={5}
          placeholder="Enter complete address"
        />

        <label>City *</label>
        <input
          style={inputStyle}
          name="city"
          value={form.city}
          onChange={handleChange}
          required
          minLength={2}
          placeholder="Enter city"
        />

        <label>Phone Number</label>
        <input
          style={inputStyle}
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Enter phone number"
        />

        <label>Specialties</label>
        <input
          style={inputStyle}
          name="specialty"
          value={form.specialty}
          onChange={handleChange}
          placeholder="Example: Cardiology, Neurology"
        />

        <label>Latitude (Optional)</label>
        <input
          style={inputStyle}
          name="latitude"
          type="number"
          step="any"
          value={form.latitude}
          onChange={handleChange}
          placeholder="Enter latitude"
        />

        <label>Longitude (Optional)</label>
        <input
          style={inputStyle}
          name="longitude"
          type="number"
          step="any"
          value={form.longitude}
          onChange={handleChange}
          placeholder="Enter longitude"
        />

        {message && (
          <p style={{ color: 'green' }}>{message}</p>
        )}

        {error && (
          <p style={{ color: 'red' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '13px 22px',
            background: '#147de0',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Adding...' : 'Add Hospital'}
        </button>
      </form>
    </div>
  )
}

export default AddHospital
