export default function Spinner({ label = 'Loading…', className = '', size = 'md' }) {
  const sizeClass =
    size === 'sm' ? 'w-6 h-6 mb-2' : size === 'lg' ? 'w-12 h-12 mb-4' : 'w-9 h-9 mb-3'

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`} role="status" aria-live="polite">
      <div className={`${sizeClass} border-2 border-brand-500 border-t-transparent rounded-full animate-spin`} />
      {label ? <p className="text-[var(--text-muted)] text-xs">{label}</p> : null}
    </div>
  )
}
