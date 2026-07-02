import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/i18n/I18nProvider'
import { formatMoney, formatDate } from '@/lib/utils'

interface Result {
  label: string
  sub: string
  to: string
}

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])

  useEffect(() => {
    if (!open) {
      setQ('')
      setResults([])
    }
  }, [open])

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      const like = `%${q}%`
      const [sup, rm, dr, ex] = await Promise.all([
        supabase.from('suppliers').select('id,name,phone').ilike('name', like).limit(4),
        supabase.from('raw_material_purchases').select('id,material_name,total_price,purchase_date').ilike('material_name', like).limit(4),
        supabase.from('drink_purchases').select('id,drink_name,total_price,purchase_date').ilike('drink_name', like).limit(4),
        supabase.from('expenses').select('id,title,amount,expense_date').ilike('title', like).limit(4),
      ])
      const out: Result[] = []
      sup.data?.forEach((s: any) => out.push({ label: s.name, sub: `${t('suppliers')} · ${s.phone ?? ''}`, to: '/suppliers' }))
      rm.data?.forEach((r: any) => out.push({ label: r.material_name, sub: `${t('raw_materials')} · ${formatMoney(r.total_price)} · ${formatDate(r.purchase_date)}`, to: '/raw-materials' }))
      dr.data?.forEach((d: any) => out.push({ label: d.drink_name, sub: `${t('drinks')} · ${formatMoney(d.total_price)} · ${formatDate(d.purchase_date)}`, to: '/drinks' }))
      ex.data?.forEach((e: any) => out.push({ label: e.title, sub: `${t('other_expenses')} · ${formatMoney(e.amount)} · ${formatDate(e.expense_date)}`, to: '/expenses' }))
      setResults(out)
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [q, t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] max-w-xl translate-y-0 p-0">
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search_everything')}
            className="border-0 shadow-none focus-visible:ring-0"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && q.length >= 2 && !loading && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('no_data')}</p>
          )}
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                navigate(r.to)
                onOpenChange(false)
              }}
              className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-accent"
            >
              <span className="text-sm font-medium">{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.sub}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
