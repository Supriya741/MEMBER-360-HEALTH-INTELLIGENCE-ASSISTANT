import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Lightbulb, ListChecks, Sparkles } from 'lucide-react'
import api from '../api.js'

export default function AISummary() {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api.getMember(memberId).then(setMember).catch(() => setError('Member not found'))
    api.getAiSummary(memberId).then(setSummary).catch(() => setError('No AI summary available for this member yet'))
  }, [memberId])

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(`/members/${memberId}`)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-ink-900">
        <ChevronLeft size={16} /> Back to Member
      </button>

      <div className="flex items-center gap-2">
        <Sparkles className="text-brand-600" size={20} />
        <h2 className="text-lg font-bold text-ink-900">AI Summary {member ? `— ${member.name}` : ''}</h2>
      </div>

      {error && !summary && (
        <div className="card text-center py-12 text-slate-500">{error}</div>
      )}

      {summary && (
        <>
          <div className="card">
            <h3 className="font-semibold text-ink-900 mb-2">AI Member Summary</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{summary.summary}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-ink-900 mb-4 flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" /> Key Insights
              </h3>
              <ul className="space-y-2.5">
                {summary.key_insights.map((k, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                    {k}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold text-ink-900 mb-4 flex items-center gap-2">
                <ListChecks size={16} className="text-emerald-500" /> Recommendations
              </h3>
              <ul className="space-y-2.5">
                {summary.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-ink-900 mb-4">AI Insights (Explainable)</h3>
            <div className="space-y-4">
              {summary.insights_detail.map((d, i) => (
                <div key={i} className="flex items-start justify-between gap-4 border-b border-slate-50 last:border-0 pb-4 last:pb-0">
                  <div className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink-900">{d.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{d.detail}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">Confidence</p>
                    <p className={`text-xs font-semibold ${d.confidence === 'High' ? 'text-emerald-600' : 'text-amber-600'}`}>{d.confidence}</p>
                    <p className="text-xs text-slate-400 mt-1">Source</p>
                    <p className="text-xs text-slate-600">{d.source}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
