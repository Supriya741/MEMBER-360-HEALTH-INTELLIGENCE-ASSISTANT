import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import FloatingChatbotWidget from './FloatingChatbotWidget.jsx'

const TITLES = {
  '/dashboard': 'Dashboard',
  '/search': 'Search Member',
}

export default function AppLayout() {
  const location = useLocation()

  const token = localStorage.getItem('m360_token')

  if (!token) {
    window.location.replace('/sign.html')
    return null
  }

  let title = TITLES[location.pathname]
  if (!title) {
    if (location.pathname.includes('ai-summary')) title = 'AI Summary'
    else if (location.pathname.startsWith('/members/')) title = 'Member 360°'
    else title = 'Member 360°'
  }

  return (
    <div className="flex h-screen bg-slate-50 relative overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 h-screen overflow-y-auto">
        <Topbar title={title} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      {/* Global Floating AI Health Intelligence Assistant */}
      <FloatingChatbotWidget />
    </div>
  )
}

