import { useState, useEffect, useRef } from 'react'
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
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Copy,
  Check,
  HelpCircle,
  Stethoscope,
  PhoneCall,
  Calendar
} from 'lucide-react'
import api from '../api.js'

const STARTER_PROMPTS = [
  { label: '📋 Executive Briefing', query: 'Provide a comprehensive summary of this member profile.' },
  { label: '⚠️ Open Issues & Action Items', query: 'What open issues, pending claims, and urgent matters need attention?' },
  { label: '🛡️ Eligibility & Copay Schedule', query: 'What is the member eligibility, deductible, out-of-pocket max, and copays?' },
  { label: '📄 Claims & Cost Liability', query: 'List all claims, total billed amount, and member out-of-pocket responsibility.' },
  { label: '📑 Prior Authorizations', query: 'What prior authorizations are on file and what is their current status?' },
  { label: '💊 Active Medications & Prescribers', query: 'What medications is the member taking, what are the dosages, and who prescribed them?' },
  { label: '🩺 Overdue Care Gaps (HEDIS)', query: 'What quality care gaps and preventive screenings are overdue for this member?' },
  { label: '📞 Communication History', query: 'Summarize past interactions and inquiries logged for this member.' },
]

export default function MemberChatbot({ member, onSelectTab }) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedWhy, setExpandedWhy] = useState({})
  const [copiedIndex, setCopiedIndex] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Initialize conversation with welcome message tailored to current member
  useEffect(() => {
    if (!member) return

    const initialWelcome = {
      role: 'assistant',
      reply: `### Hello! I am the **Member 360° AI Assistant**.\n\nI have instant access to **${member.name}**'s verified records across:\n* **Eligibility & Benefits** (${member.plan || 'Active Policy'})\n* **Claims & Adjudications**\n* **Pharmacy & Active Prescriptions**\n* **Prior Authorizations**\n* **HEDIS Quality Care Gaps**\n* **CRM Interactions & Timeline**\n\nAll answers are strictly grounded in member records with full source traceability. What would you like to know about ${member.name}?`,
      sources: [
        {
          type: 'Eligibility',
          id: member.plan_id || 'PLN-01',
          title: `Active Policy: ${member.plan}`,
          detail: `Member ID: ${member.member_id} • Status: ${member.status}`,
          status: 'Active',
          badge_class: 'badge-green',
        },
        {
          type: 'PCP',
          id: 'PCP-01',
          title: `Primary Care: ${member.pcp || 'Assigned Physician'}`,
          detail: `Policy Period: ${member.policy_effective || '2024-01-01'} to ${member.policy_expires || '2025-12-31'}`,
          status: 'Active',
          badge_class: 'badge-blue',
        }
      ],
      why: 'AI Assistant initialized with live session connection to member records database.',
      open_issues: [],
      suggested_actions: [],
      suggested_questions: [
        'Provide a comprehensive summary of this member profile.',
        'What open issues, pending claims, and urgent matters need attention?',
        'What is the member eligibility, deductible, out-of-pocket max, and copays?'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages([initialWelcome])
    setExpandedWhy({})
  }, [member?.member_id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(textToSend) {
    const query = (textToSend || inputValue).trim()
    if (!query || loading || !member) return

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
      // Build lightweight message history for backend
      const historyPayload = newHistory.map((m) => ({
        role: m.role,
        content: m.reply,
      }))

      const response = await api.sendChatMessage(member.member_id, query, historyPayload)

      const assistantMessage = {
        role: 'assistant',
        reply: response.reply,
        sources: response.sources || [],
        retrieved_chunks: response.retrieved_chunks || [],
        rag_metadata: response.rag_metadata || null,
        why: response.why || 'Grounded on active member database records.',
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
    if (!member) return
    const initialWelcome = {
      role: 'assistant',
      reply: `### Chat Cleared\n\nAI session reset for **${member.name}** (${member.member_id}). Select a suggested query or type a question below.`,
      sources: [
        {
          type: 'Eligibility',
          id: member.plan_id || 'PLN-01',
          title: `Active Policy: ${member.plan}`,
          detail: `Member ID: ${member.member_id}`,
          status: 'Active',
          badge_class: 'badge-green',
        }
      ],
      why: 'Session reset requested by user.',
      open_issues: [],
      suggested_actions: [],
      suggested_questions: [
        'Provide a comprehensive summary of this member profile.',
        'What open issues, pending claims, and urgent matters need attention?'
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
    if (!onSelectTab) return
    const t = (source.type || '').toLowerCase()
    if (t.includes('claim')) onSelectTab('claims')
    else if (t.includes('auth')) onSelectTab('authorizations')
    else if (t.includes('med')) onSelectTab('medications')
    else if (t.includes('elig') || t.includes('benefit') || t.includes('pcp')) onSelectTab('eligibility')
    else if (t.includes('interact')) onSelectTab('interactions')
    else if (t.includes('timeline')) onSelectTab('timeline')
    else onSelectTab('overview')
  }

  function getSourceIcon(type) {
    const t = (type || '').toLowerCase()
    if (t.includes('claim')) return <FileText size={13} className="text-amber-600" />
    if (t.includes('auth')) return <ClipboardCheck size={13} className="text-purple-600" />
    if (t.includes('med')) return <Pill size={13} className="text-emerald-600" />
    if (t.includes('elig') || t.includes('benefit')) return <ShieldCheck size={13} className="text-blue-600" />
    if (t.includes('caregap')) return <AlertTriangle size={13} className="text-rose-600" />
    if (t.includes('interact')) return <PhoneCall size={13} className="text-teal-600" />
    if (t.includes('timeline')) return <Clock size={13} className="text-indigo-600" />
    return <HelpCircle size={13} className="text-slate-500" />
  }

  function renderFormattedText(text) {
    if (!text) return null

    // Split paragraphs
    const paragraphs = text.split('\n\n')

    return paragraphs.map((para, pIdx) => {
      // Header 3
      if (para.startsWith('### ')) {
        return (
          <h4 key={pIdx} className="text-base font-bold text-ink-900 mt-2 mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-600" />
            {renderInlineMarkdown(para.replace('### ', ''))}
          </h4>
        )
      }

      // Header 4 or bold titles
      if (para.startsWith('#### ')) {
        return (
          <h5 key={pIdx} className="text-sm font-bold text-ink-900 mt-2 mb-1">
            {renderInlineMarkdown(para.replace('#### ', ''))}
          </h5>
        )
      }

      // Bullet list
      if (para.includes('\n* ') || para.startsWith('* ') || para.includes('\n- ') || para.startsWith('- ')) {
        const lines = para.split('\n')
        return (
          <ul key={pIdx} className="space-y-1.5 my-1.5 pl-1">
            {lines.map((line, lIdx) => {
              const cleaned = line.replace(/^[\*\-]\s+/, '')
              if (!cleaned.trim()) return null
              return (
                <li key={lIdx} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                  <div>{renderInlineMarkdown(cleaned)}</div>
                </li>
              )
            })}
          </ul>
        )
      }

      // Standard paragraph
      return (
        <p key={pIdx} className="text-sm text-slate-700 leading-relaxed">
          {renderInlineMarkdown(para)}
        </p>
      )
    })
  }

  function renderInlineMarkdown(text) {
    if (!text) return ''

    // Match citation badges like [Claim: CLM789012], [Auth: AUTH78012], [Medication: Lisinopril], [Care Gap: Annual Physical], [PCP: Dr. ...], [Eligibility: ...], [Care Coordinator: ...]
    const citationRegex = /\[(Claim|Auth|Medication|Care Gap|PCP|Eligibility|Benefits|Timeline|Interaction|Care Coordinator):?\s*([^\]]+)\]/g

    const parts = []
    let lastIndex = 0
    let match

    while ((match = citationRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderBoldItalics(text.substring(lastIndex, match.index)))
      }

      const type = match[1]
      const label = match[2]

      let badgeColor = 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100'
      if (type === 'Claim') badgeColor = 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
      else if (type === 'Auth') badgeColor = 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
      else if (type === 'Medication') badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
      else if (type === 'Care Gap') badgeColor = 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
      else if (type === 'PCP' || type === 'Eligibility') badgeColor = 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
      else if (type === 'Care Coordinator') badgeColor = 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'

      parts.push(
        <button
          key={match.index}
          onClick={() => handleSourceClick({ type, id: label })}
          title={`Jump to ${type} in Member 360`}
          className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-xs border transition-all cursor-pointer shadow-2xs mx-0.5 ${badgeColor}`}
        >
          {getSourceIcon(type)}
          <span>{type}: {label}</span>
        </button>
      )


      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push(renderBoldItalics(text.substring(lastIndex)))
    }

    return parts
  }

  function renderBoldItalics(text) {
    if (typeof text !== 'string') return text

    // Parse **bold** and `code`
    const boldRegex = /\*\*([^*]+)\*\*|`([^`]+)`/g
    const res = []
    let lastIdx = 0
    let m

    while ((m = boldRegex.exec(text)) !== null) {
      if (m.index > lastIdx) {
        res.push(text.substring(lastIdx, m.index))
      }
      if (m[1]) {
        res.push(<strong key={m.index} className="font-semibold text-ink-900">{m[1]}</strong>)
      } else if (m[2]) {
        res.push(
          <code key={m.index} className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-xs">
            {m[2]}
          </code>
        )
      }
      lastIdx = m.index + m[0].length
    }

    if (lastIdx < text.length) {
      res.push(text.substring(lastIdx))
    }

    return res
  }

  return (
    <div className="card flex flex-col h-[750px] max-h-[82vh] p-0 overflow-hidden border border-slate-200 shadow-card bg-white">
      {/* Top Header Bar */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-brand-900 via-brand-800 to-ink-900 text-white flex items-center justify-between border-b border-brand-700/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-brand-500/30 border border-brand-400/40 text-brand-200 flex items-center justify-center shadow-inner">
              <Bot size={22} className="text-brand-200" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-brand-900 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white tracking-tight">Member 360° AI Assistant</h3>
              <span className="text-[10px] font-semibold tracking-wide bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                Ground Truth Active
              </span>
            </div>
            <p className="text-xs text-brand-200/90 flex items-center gap-1.5 mt-0.5">
              <span>{member?.name} ({member?.member_id})</span>
              <span>•</span>
              <span>{member?.plan}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
            title="Reset conversation"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Suggested Fast Prompts Bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-slate-400 font-semibold uppercase tracking-wider flex-shrink-0 text-[11px] flex items-center gap-1">
          <Sparkles size={12} className="text-brand-600" /> Quick Prompts:
        </span>
        {STARTER_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt.query)}
            disabled={loading}
            className="whitespace-nowrap px-3 py-1 rounded-full bg-white hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-slate-200 hover:border-brand-300 font-medium transition-all shadow-2xs cursor-pointer flex-shrink-0 disabled:opacity-50"
          >
            {prompt.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50/50">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user'
          const isWhyOpen = Boolean(expandedWhy[index])

          return (
            <div
              key={index}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              {/* Bot Avatar */}
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                  <Sparkles size={15} />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`flex flex-col max-w-[90%] sm:max-w-[82%] ${
                  isUser
                    ? 'bg-brand-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-sm text-sm'
                    : 'bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-card text-ink-900 space-y-3.5'
                }`}
              >
                {/* Assistant Card Header */}
                {!isUser && (
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs text-slate-400">
                    <span className="font-semibold text-brand-700 flex items-center gap-1.5">
                      <Bot size={14} /> Member 360 AI Analysis
                    </span>
                    <div className="flex items-center gap-3">
                      <span>{msg.timestamp}</span>
                      <button
                        onClick={() => copyToClipboard(msg.reply, index)}
                        className="text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
                        title="Copy response"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check size={13} className="text-emerald-600" />
                            <span className="text-[11px] text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Reply Content */}
                <div className={isUser ? 'text-white' : 'text-slate-700 space-y-2'}>
                  {isUser ? <p className="leading-relaxed">{msg.reply}</p> : renderFormattedText(msg.reply)}
                </div>

                {/* Open Issues Notification Box (if present) */}
                {!isUser && msg.open_issues && msg.open_issues.length > 0 && (
                  <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                      <AlertTriangle size={14} className="text-rose-600" />
                      <span>Identified Open Issues & Follow-ups ({msg.open_issues.length}):</span>
                    </div>
                    <ul className="space-y-1 pl-1">
                      {msg.open_issues.map((issue, iIdx) => (
                        <li key={iIdx} className="text-xs text-rose-900 flex items-start gap-1.5">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Administrative Next Actions Box (if present) */}
                {!isUser && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Recommended Administrative Next Actions:</span>
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-emerald-700 tracking-wider">
                        Workflow Ready
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 pt-1">
                      {msg.suggested_actions.map((act, aIdx) => (
                        <div
                          key={aIdx}
                          className="bg-white border border-emerald-100 rounded-lg p-2.5 text-xs shadow-2xs space-y-1"
                        >
                          <p className="font-semibold text-ink-900">{act.action}</p>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span className="font-medium text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                              {act.assignee}
                            </span>
                            <span className="text-slate-400">Due: {act.due || 'Standard'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expandable "Sources / Why?" Accordion */}
                {!isUser && ((msg.sources && msg.sources.length > 0) || msg.why) && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => toggleWhy(index)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-brand-700 py-1 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-brand-600" />
                        <span>Sources / Why? ({msg.sources?.length || 0} Verified Record{msg.sources?.length === 1 ? '' : 's'})</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                        {isWhyOpen ? 'Collapse Evidence' : 'Inspect Sources & Justification'}
                        {isWhyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </button>

                    {isWhyOpen && (
                      <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 animate-fadeIn text-xs">
                        {/* RAG Engine Status Banner */}
                        {msg.rag_metadata && (
                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                            <span className="flex items-center gap-1.5 font-bold">
                              <Sparkles size={13} className="text-emerald-600" />
                              <span>RAG Pipeline: {msg.rag_metadata.retriever}</span>
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Retrieved {msg.rag_metadata.retrieved_count} of {msg.rag_metadata.total_indexed_chunks} Chunks ({msg.rag_metadata.latency_ms}ms)
                            </span>
                          </div>
                        )}

                        {/* Why / Justification explanation */}
                        <div>
                          <p className="font-bold text-ink-900 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Stethoscope size={12} className="text-brand-600" /> Grounding Rationale & Context Synthesis:
                          </p>
                          <p className="text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                            {msg.why}
                          </p>
                        </div>

                        {/* Verified Sources / Retrieved Chunks List */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div>
                            <p className="font-bold text-ink-900 text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1">
                              <FileText size={12} className="text-brand-600" /> Retrieved Member Document Chunks & Evidence:
                            </p>
                            <div className="space-y-1.5">
                              {msg.sources.map((src, sIdx) => (
                                <div
                                  key={sIdx}
                                  onClick={() => handleSourceClick(src)}
                                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-brand-400 hover:bg-brand-50/50 transition-all cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-md bg-slate-100 group-hover:bg-brand-100 text-slate-600 group-hover:text-brand-700">
                                      {getSourceIcon(src.type)}
                                    </div>
                                    <div className="truncate">
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-ink-900 group-hover:text-brand-700 truncate">
                                          {src.title}
                                        </p>
                                        {src.similarity_score !== undefined && (
                                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                            {Math.round(src.similarity_score * 100)}% Match
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-500 truncate">{src.detail}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                                    {src.date && <span className="text-[11px] text-slate-400 hidden sm:inline">{src.date}</span>}
                                    <span className={`badge ${src.badge_class || 'badge-gray'}`}>
                                      {src.status || src.type}
                                    </span>
                                    <ArrowRight size={13} className="text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Suggested Follow-up Questions */}
                {!isUser && msg.suggested_questions && msg.suggested_questions.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Suggested Follow-ups:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggested_questions.map((sq, sqIdx) => (
                        <button
                          key={sqIdx}
                          onClick={() => handleSend(sq)}
                          disabled={loading}
                          className="text-left text-xs bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          → {sq}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-ink-900 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm text-xs font-bold">
                  U
                </div>
              )}
            </div>
          )
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 justify-start animate-fadeIn">
            <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
              <Sparkles size={16} />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3.5 shadow-card text-slate-500 text-xs flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span>Analyzing {member?.name}&apos;s records across 7 operational domains...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2.5 shadow-sm"
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Ask anything about ${member?.name || 'this member'} (e.g. deductible, pending claims, care gaps, medications)...`}
            disabled={loading}
            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-ink-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 text-white font-medium text-sm transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send size={16} />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  )
}
