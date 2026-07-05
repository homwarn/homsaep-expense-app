import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type RateMap = Record<string, number> // e.g. { LAK:1, THB:600, USD:21500, CNY:3000 }

/** Central exchange rates (LAK per 1 unit of currency). LAK is always 1. */
export function useRates() {
  const [rates, setRates] = useState<RateMap>({ LAK: 1 })
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data } = await supabase.from('exchange_rates').select('currency,rate')
    const map: RateMap = { LAK: 1 }
    ;(data ?? []).forEach((r: any) => { map[r.currency] = Number(r.rate) || 1 })
    setRates(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  /** convert an amount in `currency` to LAK */
  const toLak = (amount: number, currency = 'LAK') =>
    currency === 'LAK' ? amount : amount * (rates[currency] ?? 1)

  return { rates, toLak, loading, reload: load }
}
