import { NavLink, useParams } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  Users,
  ShieldCheck,
  FileText,
  Pill,
  ClipboardCheck,
  MessageSquare,
  Clock,
  Sparkles,
  BarChart3,
  BellRing,
  BrainCircuit,
} from 'lucide-react'

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-slate-300 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <Icon size={17} />
      <span>{label}</span>
    </NavLink>
  )
}

function SectionLabel({ children }) {
  return <p className="px-3 pt-4 pb-1 text-[11px] font-semibold tracking-wider text-slate-500">{children}</p>
}

export default function Sidebar() {
  const { memberId } = useParams()
  const isMember = ['Member', 'User'].includes(localStorage.getItem('m360_role'))
  const sessionMemberId = localStorage.getItem('m360_username') || localStorage.getItem('m360_member_id') || 'MEM123456'
  const activeMember = isMember ? sessionMemberId : (memberId || 'MEM123456')

  if (isMember) {
    return (
      <aside className="hidden md:flex md:w-64 flex-col bg-ink-900 h-screen sticky top-0 shrink-0 px-3 py-4 overflow-hidden">
        <div className="flex items-center gap-2 px-2 pb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold">
            M
          </div>
          <div>
            <p className="text-white font-semibold leading-tight text-sm">Member 360°</p>
            <p className="text-emerald-400 text-[11px] leading-tight font-medium">Personal Health Portal</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          <SectionLabel>MY HEALTH RECORDS</SectionLabel>
          <NavItem to={`/members/${activeMember}`} icon={ShieldCheck} label="My Overview" end />
          <NavItem to={`/members/${activeMember}?tab=assistant`} icon={Sparkles} label="My AI Assistant" />
          <NavItem to={`/members/${activeMember}?tab=eligibility`} icon={ShieldCheck} label="My Eligibility" />
          <NavItem to={`/members/${activeMember}?tab=claims`} icon={FileText} label="My Claims" />
          <NavItem to={`/members/${activeMember}?tab=medications`} icon={Pill} label="My Medications" />
          <NavItem to={`/members/${activeMember}?tab=authorizations`} icon={ClipboardCheck} label="My Authorizations" />
          <NavItem to={`/members/${activeMember}?tab=timeline`} icon={Clock} label="My Timeline" />
          <NavItem to={`/members/${activeMember}/ai-summary`} icon={Sparkles} label="My AI Summary" />

          <SectionLabel>NAVIGATION</SectionLabel>
          <NavItem to="/welcome" icon={Users} label="Switch Role" />
        </nav>
      </aside>
    )
  }

  return (
    <aside className="hidden md:flex md:w-64 flex-col bg-ink-900 h-screen sticky top-0 shrink-0 px-3 py-4 overflow-hidden">
      <div className="flex items-center gap-2 px-2 pb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold">
          M
        </div>
        <div>
          <p className="text-white font-semibold leading-tight text-sm">Member 360°</p>
          <p className="text-slate-400 text-[11px] leading-tight">Health Intelligence</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />

        <SectionLabel>MEMBER DIRECTORY</SectionLabel>
        <NavItem to="/search" icon={Search} label="Search Member" />
        <NavItem to="/search" icon={Users} label="Member Directory" />

        <SectionLabel>MEMBER 360° DOSSIER</SectionLabel>
        <NavItem to={`/members/${activeMember}`} icon={ShieldCheck} label="Overview" end />
        <NavItem to={`/members/${activeMember}?tab=assistant`} icon={Sparkles} label="AI Assistant / Chat" />
        <NavItem to={`/members/${activeMember}?tab=eligibility`} icon={ShieldCheck} label="Eligibility" />
        <NavItem to={`/members/${activeMember}?tab=claims`} icon={FileText} label="Claims" />
        <NavItem to={`/members/${activeMember}?tab=medications`} icon={Pill} label="Medications" />
        <NavItem to={`/members/${activeMember}?tab=authorizations`} icon={ClipboardCheck} label="Authorizations" />
        <NavItem to={`/members/${activeMember}?tab=interactions`} icon={MessageSquare} label="Interactions" />
        <NavItem to={`/members/${activeMember}?tab=timeline`} icon={Clock} label="Timeline" />
        <NavItem to={`/members/${activeMember}/ai-summary`} icon={Sparkles} label="AI Summary" />

        <SectionLabel>ANALYTICS & QUEUES</SectionLabel>
        <NavItem to="/dashboard" icon={BarChart3} label="Analytics" />
        <NavItem to="/dashboard" icon={BellRing} label="Alerts & Follow-ups" />
        <NavItem to="/welcome" icon={Users} label="Switch Role" />
      </nav>
    </aside>
  )
}
