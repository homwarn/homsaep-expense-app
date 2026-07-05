import * as React from 'react'
import { ChevronsUpDown, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboOption { value: string; label: string }

interface Props {
  value: string
  onChange: (v: string) => void
  options: ComboOption[]
  placeholder?: string
  searchPlaceholder?: string
  className?: string
}

/** Lightweight searchable select (type to filter). No external deps. */
export function Combobox({ value, onChange, options, placeholder, searchPlaceholder, className }: Props) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const selected = options.find((o) => o.value === value)
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={cn('line-clamp-1 text-left', !selected && 'text-muted-foreground')}>
          {selected ? selected.label : (placeholder ?? '—')}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setQ('') }} />
          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-card shadow-lg">
            <div className="flex items-center gap-2 border-b px-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder ?? 'ຄົ້ນຫາ...'}
                className="h-9 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">—</p>}
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQ('') }}
                  className={cn('flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent', o.value === value && 'bg-accent')}
                >
                  <span className="line-clamp-1">{o.label}</span>
                  {o.value === value && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
