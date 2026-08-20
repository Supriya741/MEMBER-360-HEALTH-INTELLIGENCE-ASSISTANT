import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, User, Users, ShieldAlert, ArrowRight, X, Lock } from 'lucide-react'
import api from '../api.js'

export default function Welcome() {
  const navigate = useNavigate()
  const [activeModal, setActiveModal] = useState(null) // 'Admin' | 'User' | null
  const [idValue, setIdValue] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Allow access for registration - no auth check needed
    // Users can come here to register without prior authentication
  }, [navigate])

  function openModal(role) {
    setActiveModal(role)
    setIdValue('')
    setPasswordValue('')
    setError('')
  }

  function closeModal() {
    setActiveModal(null)
    setError('')
  }

  async function handleRoleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!idValue.trim() || !passwordValue.trim()) {
      setError('Please enter both your ID and password.')
      return
    }

    const isAdmin = activeModal === 'Admin'

    // Enforce Member ID == Member Password
    if (!isAdmin && idValue.trim().toUpperCase() !== passwordValue.trim().toUpperCase()) {
      setError('Member Password must match Member ID (e.g. MEM123456).')
      return
    }

    setLoading(true)
    try {
      const res = await api.login(idValue.trim(), passwordValue.trim())
      const memberId = (res.username || idValue.trim()).toUpperCase()

      localStorage.setItem('m360_token', res.token)
      localStorage.setItem('m360_display_name', res.display_name)
      localStorage.setItem('m360_role', res.role)
      localStorage.setItem('m360_username', res.username || idValue.trim())
      localStorage.setItem('m360_user_type', activeModal)

      if (res.role === 'Member') {
        localStorage.setItem('m360_member_id', memberId)
        navigate(`/members/${encodeURIComponent(memberId)}`)
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.clear()
    window.location.href = '/sign.html'
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            M
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">Member 360°</h1>
            <p className="text-xs text-emerald-700 font-semibold">Health Intelligence Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Role Selection Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-4xl mx-auto w-full text-center">
        <div className="mb-10">
          <h2 className="text-4xl font-extrabold text-emerald-950 tracking-tight uppercase mb-2">
            WELCOME
          </h2>
          <div className="w-16 h-1 bg-emerald-600 mx-auto rounded-full mb-3" />
          <p className="text-lg text-slate-600">
            Please select <span className="font-bold text-emerald-800 italic">your role !</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 w-full max-w-2xl">
          {/* Card 1: Admin / Claims */}
          <div
            onClick={() => openModal('Admin')}
            className="bg-white rounded-2xl border-2 border-emerald-800 p-8 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center text-3xl mb-6 group-hover:scale-105 transition-transform border border-emerald-200">
              <Shield size={36} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">ADMIN/CLAIMS</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">
              Manage users, prior authorizations, claims data, and system controls.
            </p>
            <button
              type="button"
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>ENTER</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Card 2: User / Member */}
          <div
            onClick={() => openModal('User')}
            className="bg-white rounded-2xl border-2 border-emerald-800 p-8 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center text-3xl mb-6 group-hover:scale-105 transition-transform border border-emerald-200">
              <Users size={36} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">USER</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">
              Access your health records, eligibility, medications, timeline and AI summary.
            </p>
            <button
              type="button"
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>ENTER</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </main>

      {/* Role Login Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  {activeModal === 'Admin' ? <Shield size={20} /> : <User size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {activeModal === 'Admin' ? 'Admin / Claims Access' : 'Member 360° User Access'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeModal === 'Admin' ? 'Enter Admin ID & Password' : 'Password is same as Member ID'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  {activeModal === 'Admin' ? 'Admin / Staff ID' : 'Member 360 ID (User ID)'}
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder={activeModal === 'Admin' ? 'e.g. admin or servicerep' : 'e.g. MEM123456'}
                    value={idValue}
                    onChange={(e) => setIdValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  {activeModal === 'User' && (
                    <span className="text-[11px] font-semibold text-emerald-700">Must match Member ID</span>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder={activeModal === 'Admin' ? 'Enter admin password' : 'Enter password (same as Member ID)'}
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
              >
                {loading ? 'Authenticating...' : (
                  <>
                    <span>Authenticate & Enter {activeModal === 'Admin' ? 'Admin' : 'Member'} Portal</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
        &copy; 2025 Member 360° Health Intelligence Assistant. All rights reserved.
      </footer>
    </div>
  )
}
