
import { useState } from 'react'
import { supabase } from './supabase'

function AdminLogin({ onLogin, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password
        })

      if (loginError) throw loginError

      const { data: admin, error: adminError } =
        await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', data.user.id)
          .maybeSingle()

      if (adminError) throw adminError

      if (!admin) {
        await supabase.auth.signOut()
        throw new Error('You are not authorized as an admin.')
      }

      onLogin(data.user)
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f1f6fc',
      padding: '20px'
    }}>
      <form onSubmit={handleLogin} style={{
        background: 'white',
        padding: '35px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ color: '#147de0', textAlign: 'center' }}>
          HealthConnect AI
        </h1>

        <h2 style={{ textAlign: 'center' }}>Admin Login</h2>

        <p style={{ textAlign: 'center', color: '#64748b' }}>
          Sign in to manage hospital records
        </p>

        <label>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Enter admin email"
          required
          style={inputStyle}
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter password"
          required
          style={inputStyle}
        />

        {error && (
          <p style={{ color: 'red' }}>{error}</p>
        )}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Checking...' : 'Login as Admin'}
        </button>

        <button type="button" onClick={onBack} style={{
          ...buttonStyle,
          background: '#e5f2ff',
          color: '#147de0',
          marginTop: '10px'
        }}>
          Back to Home
        </button>
      </form>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '13px',
  margin: '8px 0 18px',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  boxSizing: 'border-box'
}

const buttonStyle = {
  width: '100%',
  padding: '13px',
  border: 'none',
  borderRadius: '8px',
  background: '#147de0',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer'
}

export default AdminLogin
