import { Bell, ChevronDown, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function Topbar({ title = 'Dashboard' }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const displayName = localStorage.getItem('m360_display_name') || 'Service Rep'

  function handleLogout() {
    localStorage.removeItem('m360_token')
    localStorage.removeItem('m360_display_name')
    localStorage.removeItem('m360_role')
    localStorage.removeItem('m360_username')
    localStorage.removeItem('m360_email')
    window.location.href = '/sign.html'
  }

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
      <div className="flex items-center gap-5">
        <button className="relative text-slate-500 hover:text-ink-900">
          <Bell size={19} />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-ink-900"
          >
            <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-xs">
              {displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            {displayName}
            <ChevronDown size={15} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-card py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg"
              >
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
