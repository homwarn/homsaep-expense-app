import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Settings } from '@/types/database'

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
    setSettings(data as Settings)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return { settings, loading, reload: load }
}
