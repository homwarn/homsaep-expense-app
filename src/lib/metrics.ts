import { supabase } from '@/lib/supabase'

export interface RangeTotals {
  revenue: number
  foodRevenue: number
  drinkRevenue: number
  expense: number
  profit: number
}

async function sumColumn(
  table: string,
  column: string,
  dateCol: string,
  from: string,
  to: string,
  extra?: { col: string; val: string },
): Promise<number> {
  let query = supabase.from(table).select(column).gte(dateCol, from).lte(dateCol, to)
  if (extra) query = query.eq(extra.col, extra.val)
  const { data } = await query
  return (data ?? []).reduce((s: number, r: any) => s + Number(r[column] ?? 0), 0)
}

/** Aggregate revenue, expense & profit for a date range (inclusive). */
export async function getTotals(from: string, to: string): Promise<RangeTotals> {
  const [foodRevenue, drinkRevenue, rm, dr, otherExp, repairs] = await Promise.all([
    sumColumn('revenues', 'amount', 'revenue_date', from, to, { col: 'type', val: 'food' }),
    sumColumn('revenues', 'amount', 'revenue_date', from, to, { col: 'type', val: 'drink' }),
    sumColumn('raw_material_purchases', 'total_price', 'purchase_date', from, to),
    sumColumn('drink_purchases', 'total_price', 'purchase_date', from, to),
    sumColumn('expenses', 'amount', 'expense_date', from, to),
    sumColumn('repairs', 'total_cost', 'repair_date', from, to),
  ])
  const revenue = foodRevenue + drinkRevenue
  const expense = rm + dr + otherExp + repairs
  return { revenue, foodRevenue, drinkRevenue, expense, profit: revenue - expense }
}

/** Expense broken down by category for a range → [{name, value}] */
export async function getExpenseByCategory(from: string, to: string) {
  const { data } = await supabase
    .from('expenses')
    .select('amount, category:expense_categories(name)')
    .gte('expense_date', from)
    .lte('expense_date', to)
  const map = new Map<string, number>()
  ;(data ?? []).forEach((r: any) => {
    const name = r.category?.name ?? 'Other'
    map.set(name, (map.get(name) ?? 0) + Number(r.amount))
  })
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

/** Top suppliers by purchase value across raw materials + drinks */
export async function getTopSuppliers(from: string, to: string, limit = 5) {
  const [rm, dr] = await Promise.all([
    supabase.from('raw_material_purchases').select('total_price, supplier:suppliers(name)').gte('purchase_date', from).lte('purchase_date', to),
    supabase.from('drink_purchases').select('total_price, supplier:suppliers(name)').gte('purchase_date', from).lte('purchase_date', to),
  ])
  const map = new Map<string, number>()
  ;[...(rm.data ?? []), ...(dr.data ?? [])].forEach((r: any) => {
    const name = r.supplier?.name ?? '—'
    map.set(name, (map.get(name) ?? 0) + Number(r.total_price))
  })
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

/** Monthly series for a given year: 12 points of revenue/expense/profit */
export async function getMonthlySeries(year: number) {
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const [rev, rm, dr, ex, rep] = await Promise.all([
    supabase.from('revenues').select('amount, revenue_date').gte('revenue_date', from).lte('revenue_date', to),
    supabase.from('raw_material_purchases').select('total_price, purchase_date').gte('purchase_date', from).lte('purchase_date', to),
    supabase.from('drink_purchases').select('total_price, purchase_date').gte('purchase_date', from).lte('purchase_date', to),
    supabase.from('expenses').select('amount, expense_date').gte('expense_date', from).lte('expense_date', to),
    supabase.from('repairs').select('total_cost, repair_date').gte('repair_date', from).lte('repair_date', to),
  ])
  const months = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(year, i, 1).toLocaleDateString('en', { month: 'short' }),
    revenue: 0,
    expense: 0,
    profit: 0,
  }))
  const m = (d: string) => new Date(d).getMonth()
  rev.data?.forEach((r: any) => (months[m(r.revenue_date)].revenue += Number(r.amount)))
  rm.data?.forEach((r: any) => (months[m(r.purchase_date)].expense += Number(r.total_price)))
  dr.data?.forEach((r: any) => (months[m(r.purchase_date)].expense += Number(r.total_price)))
  ex.data?.forEach((r: any) => (months[m(r.expense_date)].expense += Number(r.amount)))
  rep.data?.forEach((r: any) => (months[m(r.repair_date)].expense += Number(r.total_cost)))
  months.forEach((x) => (x.profit = x.revenue - x.expense))
  return months
}
