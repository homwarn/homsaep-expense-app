import { useEffect, useState } from 'react'
import { Coins, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/i18n/I18nProvider'
import { useRates } from '@/hooks/useRates'

/** Global exchange-rate quick editor, reachable from the top bar on every page. */
export function RatesButton() {
  const { t } = useI18n()
  const { toast } = useToast()
  const { rates, reload } = useRates()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({ THB: '', USD: '', CNY: '' })

  useEffect(() => {
    if (open) setForm({ THB: String(rates.THB ?? ''), USD: String(rates.USD ?? ''), CNY: String(rates.CNY ?? '') })
  }, [open, rates.THB, rates.USD, rates.CNY])

  async function save() {
    const rows = ['THB', 'USD', 'CNY'].map((c) => ({ currency: c, rate: Number(form[c]) || 0, updated_at: new Date().toISOString() }))
    const { error } = await supabase.from('exchange_rates').upsert(rows, { onConflict: 'currency' })
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    toast({ title: t('saved') }); reload(); setOpen(false)
  }

  return (
    <>
      <Button variant="ghost" size="icon" title={t('exchange_rates')} onClick={() => setOpen(true)}>
        <Coins className="h-5 w-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-primary" />{t('exchange_rates')}</DialogTitle>
            <DialogDescription>{t('exchange_rates_hint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(['THB', 'USD', 'CNY'] as const).map((c) => (
              <div key={c} className="flex items-center gap-3">
                <span className="w-16 font-semibold">1 {c}</span>
                <span className="text-muted-foreground">=</span>
                <Input type="number" step="any" value={form[c]} onChange={(e) => setForm({ ...form, [c]: e.target.value })} className="flex-1" />
                <span className="text-muted-foreground">LAK</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button onClick={save}><Save className="h-4 w-4" />{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
