import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye } from 'lucide-react'
import api from '../api.js'

export default function MemberSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  async function runSearch(q) {
    setLoading(true)
    try {
      const data = await api.listMembers(q || undefined)
      setResults(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runSearch('')
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    runSearch(query)
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-ink-900 mb-4">Search by Member ID or Name</h3>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter Member ID or Name"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg px-4 py-2.5 text-sm">
            <Search size={16} /> Search
          </button>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink-900">Results {loading ? '' : `(${results.length})`}</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2 font-medium">Member ID</th>
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">DOB</th>
              <th className="py-2 font-medium">Plan</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((m) => (
              <tr key={m.member_id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 text-brand-600 font-medium">{m.member_id}</td>
                <td className="py-2.5">{m.name}</td>
                <td className="py-2.5 text-slate-500">{m.dob}</td>
                <td className="py-2.5">{m.plan}</td>
                <td className="py-2.5">
                  <span className="badge badge-green">{m.status}</span>
                </td>
                <td className="py-2.5 text-right">
                  <Link to={`/members/${m.member_id}`} className="inline-flex text-slate-400 hover:text-brand-600">
                    <Eye size={16} />
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && results.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">No members found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
