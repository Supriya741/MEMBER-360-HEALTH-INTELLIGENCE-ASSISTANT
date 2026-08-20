import { Navigate, Route, Routes } from 'react-router-dom'
import Welcome from './pages/Welcome.jsx'
import AppLayout from './components/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import MemberSearch from './pages/MemberSearch.jsx'
import MemberProfile from './pages/MemberProfile.jsx'
import AISummary from './pages/AISummary.jsx'

const AUTH_PATH = '/sign.html'

function getDefaultLandingPath() {
  const token = localStorage.getItem('m360_token')
  const role = localStorage.getItem('m360_role')
  const memberId = localStorage.getItem('m360_username') || localStorage.getItem('m360_member_id')

  if (token && role === 'Member' && memberId) {
    return `/members/${encodeURIComponent(memberId)}`
  }

  if (token && role && role !== 'Member') {
    return '/dashboard'
  }

  return AUTH_PATH
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to={AUTH_PATH} replace />} />
      <Route path="/secure-access" element={<Navigate to={AUTH_PATH} replace />} />
      <Route path="/welcome" element={<Welcome />} />

      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to={getDefaultLandingPath()} replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="search" element={<MemberSearch />} />
        <Route path="members/:memberId" element={<MemberProfile />} />
        <Route path="members/:memberId/ai-summary" element={<AISummary />} />
      </Route>

      <Route path="*" element={<Navigate to={getDefaultLandingPath()} replace />} />
    </Routes>
  )
}
