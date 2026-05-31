import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BookOpen, Mail, Lock, AlertCircle } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/', { replace: true })
    } catch (err) {
      const responseDetail = err?.response?.data?.detail
      let message = err?.message || 'Invalid credentials. Please try again.'
      if (typeof responseDetail === 'string') {
        message = responseDetail
      } else if (Array.isArray(responseDetail)) {
        message = responseDetail
          .map(detail => {
            if (typeof detail === 'string') return detail
            if (detail && detail.msg) {
              const field = Array.isArray(detail.loc) ? detail.loc[detail.loc.length - 1] : ''
              return `${field ? `'${field}'` : 'Field'} ${detail.msg}`
            }
            return String(detail)
          })
          .join('. ')
      } else if (typeof responseDetail === 'object' && responseDetail !== null) {
        message = JSON.stringify(responseDetail)
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--bg-primary)]">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Card */}
        <div className="glass border border-white/10 rounded-3xl p-10 shadow-2xl animate-slide-up">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-hero-gradient flex items-center justify-center shadow-2xl shadow-brand-600/40 mb-4 animate-float">
              <BookOpen size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Collegium Net</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">Central Academin Portal</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="login-email"
                  type="email"
                  required
                  className="input pl-10"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="admin@college.edu"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="login-password"
                  type="password"
                  required
                  className="input pl-10"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base font-semibold mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)] mt-6">
            Contact your administrator to create an account.
          </p>
        </div>
      </div>
    </div>
  )
}
