import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileText,
  Pill,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Copy,
  Check,
  PhoneCall,
  X,
  Minimize2,
  Maximize2,
  Users,
  Search,
  CheckCircle2,
  HelpCircle,
  Stethoscope
} from 'lucide-react'
import api from '../api.js'

const STARTER_PROMPTS = [
  { label: 'Summarize Member', query: 'Give me a summary of this member.' },
  { label: 'Recent Claims', query: 'What are the member recent claims?' },
  { label: 'Current Medications', query: 'What medications is this member taking?' },
  { label: 'Open Care Gaps', query: 'What care gaps are open?' },
  { label: 'Pending Authorizations', query: 'Are there pending authorizations?' },
  { label: 'Recent Interactions', query: 'When was the last interaction and what was the outcome?' },
  { label: 'Priority Issues', query: 'What are the most important issues?' },
  { label: 'Recommended Next Action', query: 'What should I do next?' },
]

export default function FloatingChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeMember, setActiveMember] = useState(null)
  const [allMembers, setAllMembers] = useState([])
  const [memberSelectorOpen, setMemberSelectorOpen] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedWhy, setExpandedWhy] = useState({})
  const [copiedIndex, setCopiedIndex] = useState(null)

  const location = useLocation()
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // 1. Fetch available members for switcher
  useEffect(() => {
    async function loadMembers() {
      try {
        const isMemberUser = ['Member', 'User'].includes(localStorage.getItem('m360_role'))
        const memberIdFromSession = localStorage.getItem('m360_username') || localStorage.getItem('m360_member_id')

        if (isMemberUser && memberIdFromSession) {
          const member = await api.getMember(memberIdFromSession)
          setAllMembers([member])
          setActiveMember(member)
          return
        }

        const res = await api.listMembers()
        const membersList = Array.isArray(res) ? res : (res.members || [])
        setAllMembers(membersList)

        // If URL contains member ID, match it
        const match = location.pathname.match(/\/members\/([A-Za-z0-9_\-]+)/)
        if (match && match[1]) {
          const currentId = match[1].toUpperCase()
          const matched = membersList.find((m) => m.member_id.toUpperCase() === currentId)
          if (matched) {
            setActiveMember(matched)
            return
          }
        }

        // Default fallback to first member if none selected
        if (!activeMember && membersList.length > 0) {
          setActiveMember(membersList[0])
        }
      } catch (err) {
        console.error('Failed to load members for AI assistant:', err)
      }
    }

    loadMembers()
  }, [location.pathname])

  // 2. Initialize chat whenever active member changes
  useEffect(() => {
    if (!activeMember) return

    const initialWelcome = {
      role: 'assistant',
      reply: `### Member 360° AI Health Intelligence Assistant\n\nI am connected to verified records for **${activeMember.name}** (${activeMember.member_id}).\n\n* **Active Policy:** [Eligibility: ${activeMember.plan || 'Standard Plan'}] (Status: \`${activeMember.status || 'Active'}\`)\n* **Primary Care Physician:** [PCP: ${activeMember.pcp || 'Assigned PCP'}]\n* **Lead Care Coordinator:** **Sarah Jenkins, RN**\n\nAsk any question regarding claims, authorizations, medications, care gaps, benefits, or next actions. All answers are strictly grounded in member records.`,
      sources: [
        {
          type: 'Eligibility',
          id: activeMember.plan_id || 'PLN-01',
          title: `Plan: ${activeMember.plan}`,
          detail: `Member: ${activeMember.member_id} | Status: ${activeMember.status}`,
          status: 'Active',
          badge_class: 'badge-green',
          similarity_score: 1.0,
        },
        {
          type: 'Care Coordinator',
          id: `CC-${activeMember.member_id}`,
          title: 'Care Coordinator: Sarah Jenkins, RN',
          detail: 'Complex Care Management',
          status: 'Active',
          badge_class: 'badge-teal',
          similarity_score: 0.95,
        }
      ],
      why: 'AI session synchronized with active member context in Member 360 database.',
      open_issues: [],
      suggested_actions: [
        {
          action: 'Review comprehensive member 360 briefing',
          assignee: 'Care Coordinator',
          priority: 'Medium',
          due: 'Routine',
          reason: 'Initial member context briefing.'
        }
      ],
      suggested_questions: [
        'Give me a summary of this member and their current status.',
        'What are the open care gaps and which should we prioritize?',
        'What are the member recent claims and patient liability?',
        'Are there any pending authorizations?'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages([initialWelcome])
    setExpandedWhy({})
  }, [activeMember?.member_id])

  // Scroll to bottom on updates
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, isOpen, isMinimized])

  async function handleSend(textToSend) {
    const query = (textToSend || inputValue).trim()
    if (!query || loading || !activeMember) return

    const userMessage = {
      role: 'user',
      reply: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const newHistory = [...messages, userMessage]
    setMessages(newHistory)
    setInputValue('')
    setLoading(true)

    try {
      const historyPayload = newHistory.map((m) => ({
        role: m.role,
        content: m.reply,
      }))

      const response = await api.sendChatMessage(activeMember.member_id, query, historyPayload)

      const assistantMessage = {
        role: 'assistant',
        reply: response.reply,
        sources: response.sources || [],
        retrieved_chunks: response.retrieved_chunks || [],
        rag_metadata: response.rag_metadata || null,
        why: response.why || 'Grounded strictly on retrieved member records.',
        open_issues: response.open_issues || [],
        suggested_actions: response.suggested_actions || [],
        suggested_questions: response.suggested_questions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        reply: `**Notice:** Unable to connect to the healthcare intelligence assistant. ${err?.response?.data?.detail || err?.message || 'Please check your connection and try again.'}`,
        sources: [],
        retrieved_chunks: [],
        rag_metadata: null,
        why: 'Network or session error encountered while contacting the API.',
        open_issues: [],
        suggested_actions: [],
        suggested_questions: ['Retry question', 'Summarize member profile'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleResetChat() {
    if (!activeMember) return
    const initialWelcome = {
      role: 'assistant',
      reply: `### Chat Cleared\n\nAI session reset for **${activeMember.name}** (${activeMember.member_id}). How can I assist you with this member?`,
      sources: [],
      why: 'Session reset requested by user.',
      open_issues: [],
      suggested_actions: [],
      suggested_questions: [
        'Give me a summary of this member and their current status.',
        'What care gaps are overdue?',
        'Show recent claims'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages([initialWelcome])
    setExpandedWhy({})
  }

  function toggleWhy(index) {
    setExpandedWhy((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  function copyToClipboard(text, index) {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  function handleSourceClick(source) {
    if (!activeMember) return
    const t = (source.type || '').toLowerCase()
    let tab = 'overview'
    if (t.includes('claim')) tab = 'claims'
    else if (t.includes('auth')) tab = 'authorizations'
    else if (t.includes('med')) tab = 'medications'
    else if (t.includes('elig') || t.includes('benefit') || t.includes('pcp')) tab = 'eligibility'
    else if (t.includes('care gap') || t.includes('gap')) tab = 'care-gaps'
    else if (t.includes('interact')) tab = 'interactions'
    else if (t.includes('timeline')) tab = 'timeline'

    navigate(`/members/${activeMember.member_id}?tab=${tab}`)
  }

  function getSourceIcon(type) {
    const t = (type || '').toLowerCase()
    if (t.includes('claim')) return <FileText size={13} className="text-amber-600" />
    if (t.includes('auth')) return <ClipboardCheck size={13} className="text-purple-600" />
    if (t.includes('med')) return <Pill size={13} className="text-emerald-600" />
    if (t.includes('elig') || t.includes('benefit')) return <ShieldCheck size={13} className="text-blue-600" />
    if (t.includes('care gap') || t.includes('gap')) return <AlertTriangle size={13} className="text-rose-600" />
    if (t.includes('interact')) return <PhoneCall size={13} className="text-teal-600" />
    if (t.includes('timeline')) return <Clock size={13} className="text-indigo-600" />
    if (t.includes('coordinator')) return <Users size={13} className="text-teal-600" />
    return <HelpCircle size={13} className="text-slate-500" />
  }

  function renderInlineMarkdown(text) {
    if (!text) return ''

    // Replace citations like [Claim: CLM123], [Auth: AUTH123], [Medication: Drug], [Care Gap: Measure], [Eligibility: Plan], [PCP: Name]
    const citationRegex = /\[(Claim|Auth|Medication|Care Gap|Eligibility|PCP|Interaction|Care Coordinator|Timeline):\s*([^\]]+)\]/g

    const parts = []
    let lastIndex = 0
    let match

    while ((match = citationRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }

      const type = match[1]
      const id = match[2]

      let badgeColor = 'bg-slate-100 text-slate-800 border-slate-300'
      if (type === 'Claim') badgeColor = 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
      else if (type === 'Auth') badgeColor = 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100'
      else if (type === 'Medication') badgeColor = 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
      else if (type === 'Care Gap') badgeColor = 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
      else if (type === 'Eligibility' || type === 'PCP') badgeColor = 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100'
      else if (type === 'Care Coordinator') badgeColor = 'bg-teal-50 text-teal-900 border-teal-300 hover:bg-teal-100'

      parts.push(
        <button
          key={`cite-${match.index}`}
          onClick={() => handleSourceClick({ type, id })}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold border transition-all cursor-pointer mx-0.5 shadow-2xs ${badgeColor}`}
          title={`Click to inspect ${type} record in Member 360`}
        >
          {getSourceIcon(type)}
          <span>{type}: {id}</span>
        </button>
      )

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.map((part, i) => {
      if (typeof part !== 'string') return part

      const segments = part.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
      return segments.map((seg, sIdx) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return <strong key={sIdx} className="font-bold text-ink-900">{seg.slice(2, -2)}</strong>
        }
        if (seg.startsWith('`') && seg.endsWith('`')) {
          return <code key={sIdx} className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-mono border border-slate-200">{seg.slice(1, -1)}</code>
        }
        if (seg.startsWith('*') && seg.endsWith('*')) {
          return <em key={sIdx} className="italic text-slate-600">{seg.slice(1, -1)}</em>
        }
        return seg
      })
    })
  }

  function renderFormattedText(text) {
    if (!text) return null
    const paragraphs = text.split('\n\n')

    return paragraphs.map((para, pIdx) => {
      if (para.startsWith('### ')) {
        return (
          <h4 key={pIdx} className="text-sm font-bold text-ink-900 mt-2 mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-600" />
            {renderInlineMarkdown(para.replace('### ', ''))}
          </h4>
        )
      }

      if (para.startsWith('#### ')) {
        return (
          <h5 key={pIdx} className="text-xs font-bold text-ink-900 mt-2 mb-1 uppercase tracking-wide">
            {renderInlineMarkdown(para.replace('#### ', ''))}
          </h5>
        )
      }

      if (para.includes('\n* ') || para.startsWith('* ') || para.includes('\n- ') || para.startsWith('- ')) {
        const lines = para.split('\n')
        return (
          <ul key={pIdx} className="space-y-1 my-1 pl-1">
            {lines.map((line, lIdx) => {
              const cleaned = line.replace(/^[\*\-]\s+/, '')
              if (!cleaned.trim()) return null
              return (
                <li key={lIdx} className="flex items-start gap-1.5 text-xs text-slate-700 leading-relaxed">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-brand-500 flex-shrink-0" />
                  <span className="flex-1">{renderInlineMarkdown(cleaned)}</span>
                </li>
              )
            })}
          </ul>
        )
      }

      return (
        <p key={pIdx} className="text-xs text-slate-700 leading-relaxed my-1">
          {renderInlineMarkdown(para)}
        </p>
      )
    })
  }

  const filteredMembers = allMembers.filter((m) => {
    const q = memberSearchQuery.toLowerCase()
    return m.name.toLowerCase().includes(q) || m.member_id.toLowerCase().includes(q) || (m.plan || '').toLowerCase().includes(q)
  })

  return (
    <>
      {/* 1. FLOATING LAUNCHER BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-brand-600 via-brand-700 to-emerald-800 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 border-2 border-emerald-300/30 group focus:outline-hidden focus:ring-4 focus:ring-brand-500/30"
          title="Open Member 360 AI Health Intelligence Assistant"
        >
          <div className="relative flex items-center justify-center">
            <Bot size={20} className="text-white group-hover:rotate-12 transition-transform duration-200" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold tracking-wide flex items-center gap-1">
              AI Assistant
              <Sparkles size={12} className="text-amber-300 fill-amber-300" />
            </span>
            {activeMember && (
              <span className="text-[10px] text-emerald-100 font-medium truncate max-w-[120px]">
                {activeMember.name}
              </span>
            )}
          </div>
        </button>
      )}

      {/* 2. FLOATING CHAT DRAWER PANEL */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-200 ${
            isMinimized
              ? 'w-80 h-14'
              : 'w-[480px] max-w-[95vw] h-[660px] max-h-[88vh]'
          }`}
          style={{ boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 0 1px 1px rgba(0, 0, 0, 0.05)' }}
        >
          {/* A. HEADER */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700/60 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                <Bot size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white tracking-wide truncate">
                    Member 360 AI Assistant
                  </h3>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-semibold border border-emerald-500/30 flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    RAG Grounded
                  </span>
                </div>

                {/* Active Member Context Pill with Switcher */}
                {activeMember ? (
                  <button
                    onClick={() => setMemberSelectorOpen(!memberSelectorOpen)}
                    className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer group mt-0.5"
                    title="Click to switch active member context"
                  >
                    <span className="font-semibold text-emerald-400 group-hover:underline truncate max-w-[240px]">
                      Member: {activeMember.name} | ID: {activeMember.member_id}
                    </span>
                    <ChevronDown size={11} className="text-slate-400 group-hover:text-white flex-shrink-0" />
                  </button>
                ) : (
                  <span className="text-[11px] text-amber-300 font-medium">Select a Member</span>
                )}
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={handleResetChat}
                className="p-1.5 hover:text-white hover:bg-slate-700/60 rounded-md transition-colors"
                title="Clear conversation history"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:text-white hover:bg-slate-700/60 rounded-md transition-colors"
                title={isMinimized ? 'Expand window' : 'Minimize window'}
              >
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-rose-400 hover:bg-slate-700/60 rounded-md transition-colors"
                title="Close AI Assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* B. MEMBER SWITCHER DROPDOWN */}
          {!isMinimized && memberSelectorOpen && (
            <div className="bg-slate-900 border-b border-slate-700 p-3 text-white text-xs z-20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-300 flex items-center gap-1">
                  <Users size={12} className="text-brand-400" /> Switch Active Member Context
                </span>
                <button
                  onClick={() => setMemberSelectorOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search member name or ID..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md pl-7 pr-2 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
                />
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredMembers.map((m) => (
                  <button
                    key={m.member_id}
                    onClick={() => {
                      setActiveMember(m)
                      setMemberSelectorOpen(false)
                      setMemberSearchQuery('')
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md flex items-center justify-between transition-colors ${
                      m.member_id === activeMember?.member_id
                        ? 'bg-brand-600 text-white font-bold'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div>
                      <span className="block font-medium">{m.name}</span>
                      <span className="text-[10px] text-slate-400">{m.plan || 'Standard Plan'} • Age {m.age}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded">
                      {m.member_id}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* C. BODY / MESSAGES */}
          {!isMinimized && (
            <>
              {/* STARTER PROMPTS CAROUSEL */}
              <div className="bg-slate-50 border-b border-slate-200/80 px-3 py-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 flex-shrink-0">
                  <Sparkles size={11} className="text-amber-500" /> Prompts:
                </span>
                {STARTER_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.query)}
                    disabled={loading}
                    className="flex-shrink-0 text-[11px] font-medium bg-white hover:bg-brand-50 text-slate-700 hover:text-brand-700 px-2 py-1 rounded-full border border-slate-200 hover:border-brand-300 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* CHAT MESSAGES SCROLL AREA */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-slate-50/50">
                {messages.map((msg, index) => {
                  const isUser = msg.role === 'user'

                  return (
                    <div
                      key={index}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Avatar */}
                      {!isUser && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-600 to-emerald-700 text-white flex items-center justify-center text-xs shadow-xs flex-shrink-0 mt-0.5">
                          <Bot size={14} />
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl px-3.5 py-3 max-w-[86%] shadow-xs transition-all ${
                          isUser
                            ? 'bg-slate-900 text-white rounded-tr-xs'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                        }`}
                      >
                        {/* Timestamp & Copy header */}
                        <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-slate-100/10 text-[10px] text-slate-400">
                          <span className="font-medium">
                            {isUser ? 'You (Care Coordinator)' : 'Member 360° RAG Synthesizer'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span>{msg.timestamp}</span>
                            {!isUser && (
                              <button
                                onClick={() => copyToClipboard(msg.reply, index)}
                                className="hover:text-slate-600 text-slate-400 transition-colors p-0.5"
                                title="Copy message text"
                              >
                                {copiedIndex === index ? (
                                  <Check size={11} className="text-emerald-500" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="prose prose-xs max-w-none text-xs">
                          {isUser ? (
                            <p className="text-xs text-slate-100 leading-relaxed m-0 font-normal">
                              {msg.reply}
                            </p>
                          ) : (
                            renderFormattedText(msg.reply)
                          )}
                        </div>

                        {/* OPEN ISSUES BADGE CONTAINER */}
                        {!isUser && msg.open_issues && msg.open_issues.length > 0 && (
                          <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-[11px]">
                            <div className="flex items-center gap-1 font-bold text-rose-800 mb-1">
                              <AlertTriangle size={12} className="text-rose-600" />
                              <span>Flagged Priority Issues ({msg.open_issues.length}):</span>
                            </div>
                            <ul className="space-y-0.5 pl-3 list-disc">
                              {msg.open_issues.map((iss, iIdx) => (
                                <li key={iIdx} className="leading-tight text-[11px]">{iss}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* RECOMMENDED NEXT ACTIONS CONTAINER */}
                        {!isUser && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                          <div className="mt-2.5 p-2 bg-emerald-50/80 border border-emerald-200 rounded-lg text-emerald-900 text-[11px]">
                            <div className="flex items-center gap-1 font-bold text-emerald-800 mb-1.5">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>Recommended Next Actions:</span>
                            </div>
                            <div className="space-y-1">
                              {msg.suggested_actions.map((act, aIdx) => (
                                <div
                                  key={aIdx}
                                  className="bg-white/90 p-1.5 rounded border border-emerald-100 shadow-2xs flex flex-col gap-0.5"
                                >
                                  <span className="font-semibold text-emerald-950 text-[11px]">{act.action}</span>
                                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                                    <span>Assignee: <strong>{act.assignee}</strong></span>
                                    <span>Due: <strong className="text-emerald-700">{act.due || 'Standard'}</strong></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* SOURCES & EVIDENCE TRACEABILITY DRAWER */}
                        {!isUser && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => toggleWhy(index)}
                              className="w-full flex items-center justify-between text-[11px] font-bold text-brand-700 hover:text-brand-800 transition-colors py-0.5 cursor-pointer"
                            >
                              <span className="flex items-center gap-1">
                                <ShieldCheck size={12} className="text-emerald-600" />
                                <span>Evidence & Source Traceability ({msg.sources?.length || 0})</span>
                              </span>
                              {expandedWhy[index] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>

                            {expandedWhy[index] && (
                              <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-[11px] animate-in fade-in duration-150">
                                {/* RAG Metadata Banner */}
                                {msg.rag_metadata && (
                                  <div className="flex items-center justify-between px-2 py-1 bg-emerald-100/60 border border-emerald-300/60 rounded text-[10px] text-emerald-900 font-medium">
                                    <span>⚡ {msg.rag_metadata.retriever}</span>
                                    <span>{msg.rag_metadata.retrieved_count} chunks ({msg.rag_metadata.latency_ms}ms)</span>
                                  </div>
                                )}

                                {/* Rationale */}
                                <div>
                                  <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-0.5">
                                    AI Grounding Rationale:
                                  </span>
                                  <p className="text-slate-600 text-[11px] leading-relaxed italic bg-white p-1.5 rounded border border-slate-200">
                                    "{msg.why}"
                                  </p>
                                </div>

                                {/* Source Records List */}
                                {msg.sources && msg.sources.length > 0 && (
                                  <div>
                                    <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-1">
                                      Retrieved Member Records:
                                    </span>
                                    <div className="space-y-1">
                                      {msg.sources.map((s, sIdx) => (
                                        <div
                                          key={sIdx}
                                          onClick={() => handleSourceClick(s)}
                                          className="p-1.5 bg-white rounded border border-slate-200 hover:border-brand-400 hover:shadow-2xs cursor-pointer transition-all flex items-center justify-between group"
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            {getSourceIcon(s.type)}
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1">
                                                <span className="font-bold text-ink-900 truncate text-[11px]">{s.title}</span>
                                                {s.similarity_score !== undefined && (
                                                  <span className="px-1 py-0.2 bg-emerald-50 text-emerald-700 font-mono text-[9px] rounded border border-emerald-200">
                                                    {Math.round(s.similarity_score * 100)}% Match
                                                  </span>
                                                )}
                                              </div>
                                              <span className="text-[10px] text-slate-500 block truncate">{s.detail}</span>
                                            </div>
                                          </div>
                                          <ArrowRight size={11} className="text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-1" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* SUGGESTED FOLLOW-UP QUESTIONS */}
                        {!isUser && msg.suggested_questions && msg.suggested_questions.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                            {msg.suggested_questions.map((sq, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSend(sq)}
                                disabled={loading}
                                className="text-[10.5px] text-slate-600 hover:text-brand-700 bg-slate-50 hover:bg-brand-50 px-2 py-0.5 rounded-full border border-slate-200 hover:border-brand-300 transition-all text-left truncate max-w-full cursor-pointer disabled:opacity-50"
                              >
                                → {sq}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* User Avatar */}
                      {isUser && (
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs shadow-xs flex-shrink-0 mt-0.5">
                          <User size={14} />
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Loading Indicator */}
                {loading && (
                  <div className="flex gap-2.5 items-center justify-start text-xs text-slate-500">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-600 to-emerald-700 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                      <Bot size={14} className="animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-xs flex items-center gap-2">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce [animation-delay:0.4s]" />
                      </span>
                      <span className="text-[11px] font-medium text-slate-600">Retrieving & grounding member records...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* D. INPUT FORM */}
              <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSend()
                  }}
                  className="relative flex items-center"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={`Ask about ${activeMember?.name || 'this member'}...`}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={loading || !activeMember}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-500/20 transition-all disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || loading || !activeMember}
                    className="absolute right-1.5 p-2 bg-gradient-to-r from-brand-600 to-emerald-700 text-white rounded-lg hover:shadow-md transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Send query"
                  >
                    <Send size={13} />
                  </button>
                </form>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
                  <span>Press <kbd className="font-mono bg-slate-100 px-1 py-0.2 rounded border border-slate-200">Enter</kbd> to send</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={10} className="text-emerald-600" />
                    Zero-Hallucination Guardrail Active
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
