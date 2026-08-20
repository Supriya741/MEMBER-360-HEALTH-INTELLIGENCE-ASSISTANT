import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Sparkles, Bot, MessageSquareText } from 'lucide-react'
import api from '../api.js'
import MemberChatbot from '../components/MemberChatbot.jsx'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'assistant', label: 'AI Assistant / Chat', icon: Sparkles, highlight: true },
  { key: 'eligibility', label: 'Eligibility' },
  { key: 'claims', label: 'Claims' },
  { key: 'medications', label: 'Medications' },
  { key: 'authorizations', label: 'Authorizations' },
  { key: 'interactions', label: 'Interactions' },
  { key: 'timeline', label: 'Timeline' },
]

function statusBadgeClass(status) {
  const s = (status || '').toLowerCase()
  if (['processed', 'approved', 'active', 'completed', 'resolved'].includes(s)) return 'badge-green'
  if (['pending', 'in progress'].includes(s)) return 'badge-yellow'
  if (['denied', 'action needed', 'closed'].includes(s)) return s === 'closed' ? 'badge-gray' : 'badge-red'
  return 'badge-gray'
}

export default function MemberProfile() {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'

  const [member, setMember] = useState(null)
  const [overview, setOverview] = useState(null)
  const [eligibility, setEligibility] = useState(null)
  const [claims, setClaims] = useState([])
  const [medications, setMedications] = useState([])
  const [authorizations, setAuthorizations] = useState([])
  const [interactions, setInteractions] = useState([])
  const [timeline, setTimeline] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api.getMember(memberId).then(setMember).catch(() => setError('Member not found'))
    api.getOverview(memberId).then(setOverview).catch(() => {})
    api.getEligibility(memberId).then(setEligibility).catch(() => setEligibility(null))
    api.getClaims(memberId).then(setClaims).catch(() => {})
    api.getMedications(memberId).then(setMedications).catch(() => {})
    api.getAuthorizations(memberId).then(setAuthorizations).catch(() => {})
    api.getInteractions(memberId).then(setInteractions).catch(() => {})
    api.getTimeline(memberId).then(setTimeline).catch(() => {})
  }, [memberId])

  function setTab(tab) {
    setSearchParams(tab === 'overview' ? {} : { tab })
  }

  if (error) {
    return (
      <div className="card text-center py-16">
        <p className="text-slate-500">{error}</p>
        <button onClick={() => navigate('/search')} className="mt-4 text-brand-600 font-medium">
          Back to search
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/search')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-ink-900">
        <ChevronLeft size={16} /> Back to Search
      </button>

      {member && (
        <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg">
              {member.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-ink-900">{member.name}</h2>
                <span className="badge badge-green">{member.status}</span>
              </div>
              <p className="text-sm text-slate-500">
                Member ID {member.member_id} &nbsp;·&nbsp; DOB {member.dob} &nbsp;·&nbsp; Plan {member.plan}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('assistant')}
              className={`flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2.5 transition-all cursor-pointer ${
                activeTab === 'assistant'
                  ? 'bg-brand-700 text-white shadow-sm ring-2 ring-brand-300'
                  : 'bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200'
              }`}
            >
              <Bot size={17} className="text-brand-600" />
              <span>Ask AI Assistant</span>
            </button>
            <Link
              to={`/members/${memberId}/ai-summary`}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 w-fit transition-colors shadow-sm"
            >
              <Sparkles size={16} className="text-emerald-400" /> AI Summary
            </Link>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === t.key
                ? 'border-brand-600 text-brand-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-ink-900'
            }`}
          >
            {t.icon && <t.icon size={15} className={activeTab === t.key ? 'text-brand-600' : 'text-slate-400'} />}
            <span>{t.label}</span>
            {t.highlight && (
              <span className="text-[10px] uppercase font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                AI
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'assistant' && member && (
        <MemberChatbot member={member} onSelectTab={setTab} />
      )}

      {activeTab === 'overview' && member && (
        <div className="space-y-6">
          {/* Quick AI Assistant Card */}
          <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-ink-900 rounded-2xl p-5 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-white/10 text-brand-200">
                  <Bot size={18} />
                </span>
                <h3 className="font-bold text-base text-white">Member 360° AI Intelligence Assistant</h3>
                <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px]">Active</span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl">
                Have questions about {member.name}&apos;s deductible, open claims, prior authorizations, active medications, or overdue care gaps? Ask the AI assistant for instant answers with complete source traceability.
              </p>
            </div>
            <button
              onClick={() => setTab('assistant')}
              className="flex items-center gap-2 bg-white hover:bg-slate-100 text-brand-900 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all whitespace-nowrap w-fit cursor-pointer"
            >
              <Sparkles size={14} className="text-brand-600" />
              <span>Launch AI Chat</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-ink-900 mb-4">Member Information</h3>
              <dl className="text-sm space-y-3">
                <Row label="Address" value={member.address} />
                <Row label="Gender" value={member.gender} />
                <Row label="PCP" value={member.pcp} />
                <Row label="Group Number" value={member.group_number} />
                <Row label="Policy Effective" value={member.policy_effective} />
                <Row label="Policy Expires" value={member.policy_expires} />
              </dl>
            </div>
            <div className="card">
              <h3 className="font-semibold text-ink-900 mb-4">Quick Summary</h3>
              {overview && (
                <dl className="text-sm space-y-3">
                  <Row label="Open Claims" value={overview.quick_summary.open_claims} />
                  <Row label="Pending Authorizations" value={overview.quick_summary.pending_authorizations} />
                  <Row label="Active Medications" value={overview.quick_summary.active_medications} valueClass="text-emerald-600 font-semibold" />
                  <Row label="Care Gaps" value={overview.quick_summary.care_gaps} valueClass="text-rose-600 font-semibold" />
                  <Row label="Upcoming Appointments" value={overview.quick_summary.upcoming_appointments} />
                </dl>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'eligibility' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-ink-900 mb-4">Eligibility Overview</h3>
            {eligibility && (
              <dl className="text-sm space-y-3">
                <Row label="Coverage Status" value={<span className="badge badge-green">{eligibility.coverage_status}</span>} />
                <Row label="Plan Effective Date" value={eligibility.plan_effective_date} />
                <Row label="Plan Expiration Date" value={eligibility.plan_expiration_date} />
                <Row label="Member Since" value={eligibility.member_since} />
                <Row label="PCP" value={eligibility.pcp} />
              </dl>
            )}
          </div>
          <div className="card">
            <h3 className="font-semibold text-ink-900 mb-4">Benefits Summary</h3>
            {eligibility && (
              <dl className="text-sm space-y-3">
                <Row label="Deductible" value={`$${eligibility.benefits.deductible.toLocaleString()}`} />
                <Row label="Out of Pocket Max" value={`$${eligibility.benefits.out_of_pocket_max.toLocaleString()}`} />
                <Row label="Copay (PCP)" value={`$${eligibility.benefits.copay_pcp}`} />
                <Row label="Copay (Specialist)" value={`$${eligibility.benefits.copay_specialist}`} />
                <Row label="ER Copay" value={`$${eligibility.benefits.er_copay}`} />
              </dl>
            )}
          </div>
        </div>
      )}

      {activeTab === 'claims' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-ink-900 mb-4">Claims</h3>
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 font-medium">Claim ID</th>
                <th className="py-2 font-medium">Date of Service</th>
                <th className="py-2 font-medium">Provider</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Amount</th>
                <th className="py-2 font-medium">Patient Responsibility</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.claim_id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 text-brand-600 font-medium">{c.claim_id}</td>
                  <td className="py-2.5 text-slate-500">{c.date_of_service}</td>
                  <td className="py-2.5">{c.provider}</td>
                  <td className="py-2.5"><span className={`badge ${statusBadgeClass(c.status)}`}>{c.status}</span></td>
                  <td className="py-2.5">${c.amount.toFixed(2)}</td>
                  <td className="py-2.5">${c.patient_responsibility.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'medications' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-ink-900 mb-4">Medications</h3>
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 font-medium">Medication</th>
                <th className="py-2 font-medium">Dosage</th>
                <th className="py-2 font-medium">Frequency</th>
                <th className="py-2 font-medium">Prescribed By</th>
                <th className="py-2 font-medium">Start Date</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((m, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{m.medication}</td>
                  <td className="py-2.5">{m.dosage}</td>
                  <td className="py-2.5">{m.frequency}</td>
                  <td className="py-2.5">{m.prescribed_by}</td>
                  <td className="py-2.5 text-slate-500">{m.start_date}</td>
                  <td className="py-2.5"><span className={`badge ${statusBadgeClass(m.status)}`}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'authorizations' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-ink-900 mb-4">Authorizations</h3>
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 font-medium">Authorization ID</th>
                <th className="py-2 font-medium">Service</th>
                <th className="py-2 font-medium">Provider</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Request Date</th>
                <th className="py-2 font-medium">Valid Until</th>
              </tr>
            </thead>
            <tbody>
              {authorizations.map((a) => (
                <tr key={a.authorization_id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 text-brand-600 font-medium">{a.authorization_id}</td>
                  <td className="py-2.5">{a.service}</td>
                  <td className="py-2.5">{a.provider}</td>
                  <td className="py-2.5"><span className={`badge ${statusBadgeClass(a.status)}`}>{a.status}</span></td>
                  <td className="py-2.5 text-slate-500">{a.request_date}</td>
                  <td className="py-2.5 text-slate-500">{a.valid_until || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'interactions' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-ink-900 mb-4">Interactions</h3>
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Notes</th>
                <th className="py-2 font-medium">By</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {interactions.map((it, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{it.type}</td>
                  <td className="py-2.5">{it.notes}</td>
                  <td className="py-2.5 text-slate-500">{it.by}</td>
                  <td className="py-2.5 text-slate-500">{it.date}</td>
                  <td className="py-2.5"><span className={`badge ${statusBadgeClass(it.outcome)}`}>{it.outcome}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="card">
          <h3 className="font-semibold text-ink-900 mb-4">Timeline</h3>
          <ol className="relative border-l border-slate-200 ml-2 space-y-6">
            {timeline.map((ev, i) => (
              <li key={i} className="ml-5">
                <span className="absolute -left-[7px] w-3.5 h-3.5 rounded-full bg-brand-500 border-2 border-white" />
                <p className="text-sm text-slate-400">{ev.date}</p>
                <p className="text-sm font-medium text-ink-900">{ev.event}</p>
                <span className={`badge mt-1 ${statusBadgeClass(ev.status)}`}>{ev.status}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, valueClass = 'font-medium text-ink-900' }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={valueClass}>{value}</dd>
    </div>
  )
}
