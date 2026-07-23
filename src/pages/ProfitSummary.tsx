import { useEffect, useState } from 'react'
import { LineChart, Wallet, UtensilsCrossed, CupSoda, Boxes } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendChart, ComparisonBar } from '@/components/charts/Charts'
import { useI18n } from '@/i18n/I18nProvider'
import { getTotals, getMonthlySeries } from '@/lib/metrics'
import { formatMoney, todayISO, startOfMonthISO, startOfYearISO, growth } from '@/lib/utils'

export default function ProfitSummary() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [day, setDay] = useState<any>()
  const [month, setMonth] = useState<any>()
  const [year, setYear] = useState<any>()
  const [lastMonth, setLastMonth] = useState<any>()
  const [series, setSeries] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      const now = new Date()
      const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
      const [d, m, y, lm, s] = await Promise.all([
        getTotals(todayISO(), todayISO()),
        getTotals(startOfMonthISO(), todayISO()),
        getTotals(startOfYearISO(), todayISO()),
        getTotals(lmStart, lmEnd),
        getMonthlySeries(now.getFullYear()),
      ])
      setDay(d); setMonth(m); setYear(y); setLastMonth(lm); setSeries(s)
      setLoading(false)
    })()
  }, [])

  // Profit per type = type revenue − directly attributable cost.
  const materialProfit = month ? month.materialRevenue - month.materialCost : 0
  const drinkProfit = month ? month.drinkRevenue - month.drinkCost : 0
  const otherProfit = month ? month.otherRevenue - month.otherExpense : 0

  return (
    <div>
      <PageHeader title={t('profit_summary')} icon={<LineChart className="h-5 w-5" />} subtitle="Profit = Revenue − Expense" />

      <p className="mb-2 text-sm font-semibold text-muted-foreground">{t('profit_total_group')}</p>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('today_profit')} value={formatMoney(day?.profit)} icon={Wallet} tone="primary" loading={loading} />
        <StatCard label={t('monthly_profit')} value={formatMoney(month?.profit)} icon={Wallet} tone="emerald" growth={month && lastMonth ? growth(month.profit, lastMonth.profit) : null} loading={loading} />
        <StatCard label={t('yearly_profit')} value={formatMoney(year?.profit)} icon={Wallet} tone="sky" loading={loading} />
      </div>

      <p className="mb-2 text-sm font-semibold text-muted-foreground">{t('profit_by_type')} · {t('monthly')}</p>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('profit_material')} value={formatMoney(materialProfit)} icon={UtensilsCrossed} tone="amber" loading={loading} />
        <StatCard label={t('profit_drink')} value={formatMoney(drinkProfit)} icon={CupSoda} tone="violet" loading={loading} />
        <StatCard label={t('profit_other')} value={formatMoney(otherProfit)} icon={Boxes} tone="sky" loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('profit_trend')}</CardTitle></CardHeader>
          <CardContent><TrendChart data={series} dataKey="profit" color="#F5C518" type="line" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('total_revenue')} vs {t('total_expense')}</CardTitle></CardHeader>
          <CardContent>
            <ComparisonBar data={series} keys={[
              { key: 'revenue', color: '#10B981', name: t('total_revenue') },
              { key: 'expense', color: '#F43F5E', name: t('total_expense') },
              { key: 'profit', color: '#F5C518', name: t('profit') },
            ]} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
