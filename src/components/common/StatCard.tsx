import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'primary' | 'emerald' | 'rose' | 'sky' | 'violet' | 'amber'
  growth?: number | null
  loading?: boolean
}

const tones: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-emerald-500/10 text-emerald-500',
  rose: 'bg-rose-500/10 text-rose-500',
  sky: 'bg-sky-500/10 text-sky-500',
  violet: 'bg-violet-500/10 text-violet-500',
  amber: 'bg-amber-500/10 text-amber-500',
}

export function StatCard({ label, value, icon: Icon, tone = 'primary', growth, loading }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', tones[tone])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-24" />
          ) : (
            <p className="truncate text-xl font-bold">{value}</p>
          )}
          {growth != null && !loading && (
            <span
              className={cn(
                'mt-1 inline-flex items-center gap-0.5 text-xs font-medium',
                growth >= 0 ? 'text-emerald-500' : 'text-rose-500',
              )}
            >
              {growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(growth)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
