import { useEffect, useState } from 'react'
import { PieChart, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategoryPie, ComparisonBar, TrendChart } from '@/components/charts/Charts'
import { useI18n } from '@/i18n/I18nProvider'
import { getExpenseByCategory, getTopSuppliers, getMonthlySeries, getTotals } from '@/lib/metrics'
import { formatMoney, todayISO, startOfMonthISO, startOfYearISO } from '@/lib/utils'

type Period = 'daily' | 'monthly' | 'yearly'

export default function ExpenseSummary() {
  const { t } = useI18n()
  const [period, setPeriod] = useState<Period>('monthly')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [byCat, setByCat] = useState<{ name: string; value: number }[]>([])
  const [bySup, setBySup] = useState<{ name: string; value: number }[]>([])
  const [series, setSeries] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const from = period === 'daily' ? todayISO() : period === 'monthly' ? startOfMonthISO() : startOfYearISO()
      const to = todayISO()
      const [totals, cat, sup, s] = await Promise.all([
        getTotals(from, to),
        getExpenseByCategory(from, to),
        getTopSuppliers(from, to, 8),
        getMonthlySeries(new Date().getFullYear()),
      ])
      setTotal(totals.expense); setByCat(cat); setBySup(sup); setSeries(s)
      setLoading(false)
    })()
  }, [period])

  return (
    <div>
      <PageHeader title={t('expense_summary')} icon={<Receipt className="h-5 w-5" />}
        actions={
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="daily">{t('daily')}</TabsTrigger>
              <TabsTrigger value="monthly">{t('monthly')}</TabsTrigger>
              <TabsTrigger value="yearly">{t('yearly')}</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('total_expense')} value={formatMoney(total)} icon={Receipt} tone="rose" loading={loading} />
        <StatCard label={t('top_expense_category')} value={byCat[0]?.name ?? '-'} icon={PieChart} tone="amber" loading={loading} />
        <StatCard label={t('top_supplier')} value={bySup[0]?.name ?? '-'} icon={Receipt} tone="violet" loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('expense_by_category')}</CardTitle></CardHeader>
          <CardContent>{byCat.length ? <CategoryPie data={byCat} /> : <p className="py-16 text-center text-sm text-muted-foreground">{t('no_data')}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('top_supplier')}</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-2">
            {bySup.length ? bySup.map((s, i) => (
              <div key={i}>
                <div className="mb-1 flex justify-between text-sm"><span>{s.name}</span><span className="font-medium">{formatMoney(s.value)}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(s.value / (bySup[0]?.value || 1)) * 100}%` }} /></div>
              </div>
            )) : <p className="py-16 text-center text-sm text-muted-foreground">{t('no_data')}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('expense_trend')}</CardTitle></CardHeader>
          <CardContent><TrendChart data={series} dataKey="expense" color="#F43F5E" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('total_revenue')} / {t('total_expense')}</CardTitle></CardHeader>
          <CardContent>
            <ComparisonBar data={series} keys={[
              { key: 'revenue', color: '#10B981', name: t('total_revenue') },
              { key: 'expense', color: '#F43F5E', name: t('total_expense') },
            ]} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
