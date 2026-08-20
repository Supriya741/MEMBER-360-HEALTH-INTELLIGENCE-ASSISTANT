import { ArrowUpRight } from 'lucide-react'

export default function StatCard({ label, value, change, icon: Icon, tint = 'brand' }) {
  const tints = {
    brand: 'bg-brand-50 text-brand-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-ink-900 mt-1">{value}</p>
        {change && (
          <p className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-2">
            <ArrowUpRight size={13} /> {change}
          </p>
        )}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tints[tint]}`}>
        <Icon size={20} />
      </div>
    </div>
  )
}
