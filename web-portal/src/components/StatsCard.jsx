import clsx from 'clsx'

export default function StatsCard({ title, value, icon: Icon, trend, trendLabel, color = 'brand', loading }) {
  const colorMap = {
    brand:  { bg: 'bg-brand-600/15',  border: 'border-brand-500/20',  text: 'text-brand-400',  icon: 'bg-brand-600/20'  },
    green:  { bg: 'bg-green-600/15',  border: 'border-green-500/20',  text: 'text-green-400',  icon: 'bg-green-600/20'  },
    red:    { bg: 'bg-red-600/15',    border: 'border-red-500/20',    text: 'text-red-400',    icon: 'bg-red-600/20'    },
    yellow: { bg: 'bg-yellow-600/15', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: 'bg-yellow-600/20' },
    purple: { bg: 'bg-purple-600/15', border: 'border-purple-500/20', text: 'text-purple-400', icon: 'bg-purple-600/20' },
  }
  const c = colorMap[color] || colorMap.brand

  return (
    <div
      className={clsx(
        'stat-card glass rounded-2xl p-6 border flex items-start gap-4 hover:scale-[1.02] transition-transform duration-200',
        c.bg, c.border
      )}
    >
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', c.icon)}>
        {Icon && <Icon size={22} className={c.text} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-white/10 rounded-lg animate-pulse" />
        ) : (
          <p className={clsx('text-3xl font-bold', c.text)}>{value}</p>
        )}
        {trendLabel && (
          <p className={clsx('text-xs mt-1', trend >= 0 ? 'text-green-400' : 'text-red-400')}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% {trendLabel}
          </p>
        )}
      </div>
    </div>
  )
}
