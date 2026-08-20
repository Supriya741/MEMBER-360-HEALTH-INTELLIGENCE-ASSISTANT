import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, Activity, Users2, Lock, User, Key, CheckCircle, ArrowRight } from 'lucide-react'
import api from '../api.js'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.login(username, password)
      localStorage.setItem('m360_token', res.token)
      localStorage.setItem('m360_display_name', res.display_name)
      localStorage.setItem('m360_role', res.role)
      localStorage.setItem('m360_org_authenticated', 'true')
      if (res.username) localStorage.setItem('m360_username', res.username)
      if (res.email) localStorage.setItem('m360_email', res.email)
      navigate('/welcome')
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      {/* Left panel: Form & Access */}
      <div className="flex flex-col justify-between px-8 sm:px-16 py-10">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-900 flex items-center justify-center text-white font-bold shadow-md">
              M
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg leading-tight">Member 360°</p>
              <p className="text-xs text-emerald-700 font-semibold tracking-wide uppercase leading-tight">Health Intelligence</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Secure Access</h1>
          <p className="text-slate-500 mt-1 mb-6 text-sm">
            Enter your institutional credentials to access the health intelligence portal.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Organizational ID or Email
              </label>
              <div className="relative mt-1">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                  placeholder="e.g. admin or user@hospital.org"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Password</label>
                <a href="sign.html" className="text-xs text-emerald-700 hover:text-emerald-900 font-medium">Forgot password?</a>
              </div>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600" defaultChecked /> Remember this device
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg py-2.5 text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? 'Authenticating…' : (
                <>
                  <span>Sign In to Organization</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <div className="text-center text-xs text-slate-600">
              <span>Need an account?</span>{' '}
              <button
                type="button"
                onClick={() => navigate('/welcome')}
                className="font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
              >
                Register now
              </button>
            </div>
          </form>
        </div>

        <div className="pt-8 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <p>© 2025 Member 360°. All rights reserved.</p>
          <div className="flex gap-3">
            <a href="privacy.html" className="hover:text-emerald-800">Privacy Policy</a>
            <span>•</span>
            <a href="terms.html" className="hover:text-emerald-800">Terms of Service</a>
          </div>
        </div>
      </div>

      {/* Right panel: Hospital green theme branding illustration */}
      <div className="hidden md:flex flex-col items-center justify-between bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white p-12 relative overflow-hidden">
        <div className="w-full flex justify-end">
          <span className="text-xs text-emerald-400/80 font-mono">v4.2.0 (Stable)</span>
        </div>

        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mb-6 shadow-2xl">
            <ShieldCheck size={36} className="text-emerald-300" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-3">One view. Every insight.</h2>
          <p className="text-emerald-200/80 text-sm leading-relaxed">
            Unified longitudinal clinical summaries, prior authorizations, and predictive health intelligence.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-xs text-center border-t border-white/10 pt-6">
          <div>
            <p className="text-lg font-bold text-white">50k+</p>
            <p className="text-[11px] text-emerald-300/70 uppercase font-semibold">Active Members</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">99.8%</p>
            <p className="text-[11px] text-emerald-300/70 uppercase font-semibold">Uptime SLA</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">HIPAA</p>
            <p className="text-[11px] text-emerald-300/70 uppercase font-semibold">SOC 2 Verified</p>
          </div>
        </div>
      </div>
    </div>
  )
}
