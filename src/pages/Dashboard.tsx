import { useEffect, useState } from 'react'
import {
  DollarSign, Receipt, TrendingUp, Wallet, CalendarDays, CalendarRange,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendChart, CategoryPie } from '@/components/charts/Charts'
import { useI18n } from '@/i18n/I18nProvider'
import { useSettings } from '@/hooks/useSettings'
import {
  getTotals, getMonthlySeries, getExpenseByCategory, getTopSuppliers, type RangeTotals,
} from '@/lib/metrics'
import { formatMoney, todayISO, startOfMonthISO, startOfYearISO, growth } from '@/lib/utils'
import { LayoutDashboard } from 'lucide-react'

export default function Dashboard() {
  const { t } = useI18n()
  const { settings } = useSettings()
  const cur = settings?.currency ?? 'LAK'
  const [loading, setLoading] = useState(true)
  const [day, setDay] = useState<RangeTotals>()
  const [month, setMonth] = useState<RangeTotals>()
  const [year, setYear] = useState<RangeTotals>()
  const [lastMonth, setLastMonth] = useState<RangeTotals>()
  const [series, setSeries] = useState<any[]>([])
  const [byCat, setByCat] = useState<{ name: string; value: number }[]>([])
  const [topSup, setTopSup] = useState<{ name: string; value: number }[]>([])

  useEffect(() => {
    ;(async () => {
      const now = new Date()
      const yr = now.getFullYear()
      const lmStart = new Date(yr, now.getMonth() - 1, 1).toISOString().slice(0, 10)
      const lmEnd = new Date(yr, now.getMonth(), 0).toISOString().slice(0, 10)
      const [d, m, y, lm, s, c, ts] = await Promise.all([
        getTotals(todayISO(), todayISO()),
        getTotals(startOfMonthISO(), todayISO()),
        getTotals(startOfYearISO(), todayISO()),
        getTotals(lmStart, lmEnd),
        getMonthlySeries(yr),
        getExpenseByCategory(startOfMonthISO(), todayISO()),
        getTopSuppliers(startOfYearISO(), todayISO()),
      ])
      setDay(d); setMonth(m); setYear(y); setLastMonth(lm)
      setSeries(s); setByCat(c); setTopSup(ts)
      setLoading(false)
    })()
  }, [])

  const g = (cur?: number, prev?: number) =>
    cur != null && prev != null ? growth(cur, prev) : null

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard')} subtitle={settings?.restaurant_name} icon={<LayoutDashboard className="h-5 w-5" />} />

      {/* Today */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> {t('daily')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t('today_revenue')} value={formatMoney(day?.revenue, cur)} icon={DollarSign} tone="emerald" loading={loading} />
          <StatCard label={t('today_expense')} value={formatMoney(day?.expense, cur)} icon={Receipt} tone="rose" loading={loading} />
          <StatCard label={t('today_profit')} value={formatMoney(day?.profit, cur)} icon={TrendingUp} tone="primary" loading={loading} />
        </div>
      </section>

      {/* Month */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <CalendarRange className="h-4 w-4" /> {t('monthly')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t('monthly_revenue')} value={formatMoney(month?.revenue, cur)} icon={DollarSign} tone="emerald" growth={g(month?.revenue, lastMonth?.revenue)} loading={loading} />
          <StatCard label={t('monthly_expense')} value={formatMoney(month?.expense, cur)} icon={Receipt} tone="rose" growth={g(month?.expense, lastMonth?.expense)} loading={loading} />
          <StatCard label={t('monthly_profit')} value={formatMoney(month?.profit, cur)} icon={Wallet} tone="primary" growth={g(month?.profit, lastMonth?.profit)} loading={loading} />
        </div>
      </section>

      {/* Year */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <CalendarRange className="h-4 w-4" /> {t('yearly')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t('yearly_revenue')} value={formatMoney(year?.revenue, cur)} icon={DollarSign} tone="emerald" loading={loading} />
          <StatCard label={t('yearly_expense')} value={formatMoney(year?.expense, cur)} icon={Receipt} tone="rose" loading={loading} />
          <StatCard label={t('yearly_profit')} value={formatMoney(year?.profit, cur)} icon={Wallet} tone="primary" loading={loading} />
        </div>
      </section>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('revenue_trend')}</CardTitle></CardHeader>
          <CardContent><TrendChart data={series} dataKey="revenue" color="#10B981" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('expense_trend')}</CardTitle></CardHeader>
          <CardContent><TrendChart data={series} dataKey="expense" color="#F43F5E" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('profit_trend')}</CardTitle></CardHeader>
          <CardContent><TrendChart data={series} dataKey="profit" color="#F5C518" type="line" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('expense_by_category')}</CardTitle></CardHeader>
          <CardContent>
            {byCat.length ? <CategoryPie data={byCat} /> : <p className="py-16 text-center text-sm text-muted-foreground">{t('no_data')}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Top suppliers & category */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('top_supplier')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topSup.length ? topSup.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                  {s.name}
                </span>
                <span className="text-sm font-semibold">{formatMoney(s.value, cur)}</span>
              </div>
            )) : <p className="py-8 text-center text-sm text-muted-foreground">{t('no_data')}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('top_expense_category')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {byCat.slice(0, 5).length ? byCat.slice(0, 5).map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm">{c.name}</span>
                <span className="text-sm font-semibold">{formatMoney(c.value, cur)}</span>
              </div>
            )) : <p className="py-8 text-center text-sm text-muted-foreground">{t('no_data')}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
