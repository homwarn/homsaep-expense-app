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
  primary: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  sky: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
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
