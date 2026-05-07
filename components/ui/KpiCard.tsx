import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: React.ReactNode
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  highlight?: boolean
}

export function KpiCard({ label, value, sub, highlight }: KpiCardProps) {
  return (
    <div className={cn(
      'rounded-xl border p-5 flex flex-col gap-1',
      highlight
        ? 'bg-teal-500/10 border-teal-500/30'
        : 'bg-gray-900 border-gray-800'
    )}>
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={cn('text-2xl font-bold', highlight ? 'text-teal-400' : 'text-white')}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}
