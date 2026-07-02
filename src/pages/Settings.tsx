import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Upload, Database, DownloadCloud, Save } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/i18n/I18nProvider'
import { useSettings } from '@/hooks/useSettings'

const BACKUP_TABLES = [
  'suppliers', 'raw_material_categories', 'raw_material_purchases',
  'drink_categories', 'drink_purchases', 'expense_categories',
  'expenses', 'repairs', 'revenues', 'settings',
]

export default function Settings() {
  const { t, setLang } = useI18n()
  const { toast } = useToast()
  const { settings, reload } = useSettings()
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (settings) setForm(settings) }, [settings])

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('settings').update({
      restaurant_name: form.restaurant_name,
      currency: form.currency,
      language: form.language,
      daily_expense_target: Number(form.daily_expense_target) || 0,
      monthly_expense_budget: Number(form.monthly_expense_budget) || 0,
      low_profit_threshold: Number(form.low_profit_threshold) || 0,
    }).eq('id', 1)
    setSaving(false)
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    if (form.language) setLang(form.language)
    toast({ title: t('saved') }); reload()
  }

  async function uploadLogo(file: File) {
    setBusy(true)
    const path = `logo-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('assets').upload(path, file, { upsert: true })
    if (error) { setBusy(false); return toast({ title: t('error'), description: error.message, variant: 'error' }) }
    const { data } = supabase.storage.from('assets').getPublicUrl(path)
    await supabase.from('settings').update({ logo_url: data.publicUrl }).eq('id', 1)
    setBusy(false); toast({ title: t('saved') }); reload()
  }

  async function backup() {
    setBusy(true)
    const dump: Record<string, unknown> = { _exported_at: new Date().toISOString() }
    for (const table of BACKUP_TABLES) {
      const { data } = await supabase.from(table).select('*')
      dump[table] = data ?? []
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `homsaep-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setBusy(false)
  }

  async function restore(file: File) {
    if (!confirm('Restore will insert records from the backup file. Continue?')) return
    setBusy(true)
    try {
      const dump = JSON.parse(await file.text())
      for (const table of BACKUP_TABLES) {
        if (table === 'settings') continue
        const records = dump[table]
        if (Array.isArray(records) && records.length) {
          await supabase.from(table).upsert(records)
        }
      }
      toast({ title: t('saved') }); reload()
    } catch (e: any) {
      toast({ title: t('error'), description: e.message, variant: 'error' })
    }
    setBusy(false)
  }

  return (
    <div>
      <PageHeader title={t('settings')} icon={<SettingsIcon className="h-5 w-5" />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('restaurant_name')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1"><Label>{t('restaurant_name')}</Label><Input value={form.restaurant_name ?? ''} onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>{t('currency')}</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="LAK">LAK ₭</SelectItem><SelectItem value="THB">THB ฿</SelectItem><SelectItem value="USD">USD $</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>{t('language')}</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="lo">ລາວ</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-2"><Upload className="h-4 w-4" />Logo</Label>
              {form.logo_url && <img src={form.logo_url} alt="logo" className="mb-2 h-14 w-14 rounded-lg" />}
              <Input type="file" accept="image/*" disabled={busy} onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('notifications')} — {t('filter')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1"><Label>{t('today_expense')} — {t('filter')} (target)</Label><Input type="number" value={form.daily_expense_target ?? 0} onChange={(e) => setForm({ ...form, daily_expense_target: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t('monthly_expense')} — budget</Label><Input type="number" value={form.monthly_expense_budget ?? 0} onChange={(e) => setForm({ ...form, monthly_expense_budget: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t('monthly_profit')} — threshold</Label><Input type="number" value={form.low_profit_threshold ?? 0} onChange={(e) => setForm({ ...form, low_profit_threshold: e.target.value })} /></div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={saving}><Save className="h-4 w-4" />{t('save')}</Button>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />{t('backup')} / {t('restore')}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={backup} disabled={busy}><DownloadCloud className="h-4 w-4" />{t('backup')}</Button>
          <label>
            <input type="file" accept="application/json" className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
            <Button variant="outline" asChild><span><Upload className="h-4 w-4" />{t('restore')}</span></Button>
          </label>
        </CardContent>
      </Card>
    </div>
  )
}
