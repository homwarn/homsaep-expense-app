import { useEffect, useState } from 'react'
import { getTotals } from '@/lib/metrics'
import { supabase } from '@/lib/supabase'
import { todayISO, startOfMonthISO } from '@/lib/utils'

export interface AppNotification {
  id: string
  titleLo: string
  titleEn: string
  variant: 'warning' | 'error' | 'info'
}

export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: s } = await supabase.from('settings').select('*').eq('id', 1).single()
      if (!s) return
      const today = todayISO()
      const monthStart = startOfMonthISO()
      const [dayT, monthT] = await Promise.all([
        getTotals(today, today),
        getTotals(monthStart, today),
      ])
      const out: AppNotification[] = []

      if (s.daily_expense_target && dayT.expense > Number(s.daily_expense_target)) {
        out.push({
          id: 'daily-exp',
          titleLo: 'ລາຍຈ່າຍມື້ນີ້ເກີນເປົ້າໝາຍ',
          titleEn: "Today's expense exceeded target",
          variant: 'warning',
        })
      }
      if (s.monthly_expense_budget && monthT.expense > Number(s.monthly_expense_budget)) {
        out.push({
          id: 'month-exp',
          titleLo: 'ລາຍຈ່າຍເດືອນນີ້ເກີນງົບປະມານ',
          titleEn: 'Monthly expense exceeded budget',
          variant: 'error',
        })
      }
      if (s.low_profit_threshold != null && monthT.profit < Number(s.low_profit_threshold)) {
        out.push({
          id: 'low-profit',
          titleLo: 'ກຳໄລເດືອນນີ້ຕ່ຳກວ່າເກນ',
          titleEn: 'Monthly profit is below threshold',
          variant: 'warning',
        })
      }
      if (active) setItems(out)
    })()
    return () => {
      active = false
    }
  }, [])

  return items
}
