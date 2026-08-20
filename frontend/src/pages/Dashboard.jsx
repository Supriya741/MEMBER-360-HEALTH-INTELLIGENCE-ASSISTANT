import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCog, ClipboardList, HeartPulse, Eye, ShieldAlert, FileClock, HeartCrack, CalendarClock } from 'lucide-react'
import api from '../api.js'
import StatCard from '../components/StatCard.jsx'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentSearches, setRecentSearches] = useState([])
  const [alerts, setAlerts] = useState([])
  const displayName = localStorage.getItem('m360_display_name') || 'Service Rep'

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch(() => {})
    api.getRecentSearches().then(setRecentSearches).catch(() => {})
    api.getAlerts().then(setAlerts).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Welcome back, {displayName}!</h2>
        <p className="text-slate-500 text-sm">Here's your overview for today.</p>
      </div>

      {stats && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Active Members" value={stats.total_active_members.value.toLocaleString()} change={stats.total_active_members.change} icon={Users} tint="brand" />
          <StatCard label="Members with Open Issues" value={stats.members_with_open_issues.value} change={stats.members_with_open_issues.change} icon={UserCog} tint="amber" />
          <StatCard label="Pending Authorizations" value={stats.pending_authorizations.value} change={stats.pending_authorizations.change} icon={ClipboardList} tint="brand" />
          <StatCard label="Care Gap — High Priority" value={stats.care_gap_high_priority.value} change={stats.care_gap_high_priority.change} icon={HeartPulse} tint="rose" />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-900">Recent Member Searches</h3>
            <Link to="/search" className="text-sm text-brand-600 font-medium">View all</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 font-medium">Member ID</th>
                <th className="py-2 font-medium">Member Name</th>
                <th className="py-2 font-medium">Last Viewed</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentSearches.map((r) => (
                <tr key={r.member_id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 text-brand-600 font-medium">{r.member_id}</td>
                  <td className="py-2.5">{r.name}</td>
                  <td className="py-2.5 text-slate-500">{r.last_viewed}</td>
                  <td className="py-2.5 text-right">
                    <Link to={`/members/${r.member_id}`} className="inline-flex text-slate-400 hover:text-brand-600">
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-900">Pending Follow-ups</h3>
            <Link to="/dashboard" className="text-sm text-brand-600 font-medium">View all</Link>
          </div>
          {stats && (
            <div className="space-y-3">
              <FollowupRow icon={FileClock} label="Prior Authorizations" value={stats.pending_followups.prior_authorizations} tint="brand" />
              <FollowupRow icon={ClipboardList} label="Pending Claims" value={stats.pending_followups.pending_claims} tint="amber" />
              <FollowupRow icon={HeartCrack} label="Care Gaps" value={stats.pending_followups.care_gaps} tint="rose" />
              <FollowupRow icon={CalendarClock} label="Upcoming Deadlines" value={stats.pending_followups.upcoming_deadlines} tint="brand" />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink-900 flex items-center gap-2">
            <ShieldAlert size={17} className="text-rose-500" /> Alerts & Follow-ups
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2 font-medium">Alert Type</th>
              <th className="py-2 font-medium">Member</th>
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium">Priority</th>
              <th className="py-2 font-medium">Due Date</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5">{a.alert_type}</td>
                <td className="py-2.5">
                  <Link to={`/members/${a.member_id}`} className="text-brand-600 font-medium">{a.member}</Link>
                </td>
                <td className="py-2.5 text-slate-600">{a.description}</td>
                <td className="py-2.5">
                  <span className={`badge ${a.priority === 'High' ? 'badge-red' : 'badge-yellow'}`}>{a.priority}</span>
                </td>
                <td className="py-2.5 text-slate-500">{a.due_date}</td>
                <td className="py-2.5">
                  <span className="badge badge-blue">{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FollowupRow({ icon: Icon, label, value, tint }) {
  const tints = {
    brand: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  }
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${tints[tint]}`}>
          <Icon size={15} />
        </span>
        <span className="text-sm text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-semibold text-ink-900">{value}</span>
    </div>
  )
}
