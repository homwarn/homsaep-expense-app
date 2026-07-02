import { useState } from 'react'
import { FileText, Printer, Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/i18n/I18nProvider'
import { formatMoney, formatDate, startOfMonthISO, todayISO } from '@/lib/utils'
import { exportCSV, exportExcel, exportPDF } from '@/lib/export'

const REPORT_TYPES = [
  { value: 'raw_material_purchases', labelLo: 'ລາຍງານວັດຖຸດິບ', labelEn: 'Raw Material Report', dateCol: 'purchase_date', select: '*, supplier:suppliers(name), category:raw_material_categories(name)' },
  { value: 'drink_purchases', labelLo: 'ລາຍງານເຄື່ອງດື່ມ', labelEn: 'Drink Report', dateCol: 'purchase_date', select: '*, supplier:suppliers(name), category:drink_categories(name)' },
  { value: 'expenses', labelLo: 'ລາຍງານລາຍຈ່າຍ', labelEn: 'Expense Report', dateCol: 'expense_date', select: '*, category:expense_categories(name)' },
  { value: 'revenues', labelLo: 'ລາຍງານລາຍຮັບ', labelEn: 'Revenue Report', dateCol: 'revenue_date', select: '*' },
  { value: 'repairs', labelLo: 'ລາຍງານສ້ອມແປງ', labelEn: 'Repair Report', dateCol: 'repair_date', select: '*' },
  { value: 'suppliers', labelLo: 'ລາຍງານຜູ້ສະໜອງ', labelEn: 'Supplier Report', dateCol: 'created_at', select: '*' },
]

export default function Reports() {
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const [type, setType] = useState(REPORT_TYPES[0].value)
  const [from, setFrom] = useState(startOfMonthISO())
  const [to, setTo] = useState(todayISO())
  const [rows, setRows] = useState<any[]>([])
  const [cols, setCols] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const cfg = REPORT_TYPES.find((r) => r.value === type)!
  const title = lang === 'lo' ? cfg.labelLo : cfg.labelEn

  function flatten(r: any) {
    const out: Record<string, any> = {}
    Object.entries(r).forEach(([k, v]) => {
      if (['id', 'created_by', 'updated_at'].includes(k)) return
      if (v && typeof v === 'object') out[k] = (v as any).name ?? JSON.stringify(v)
      else out[k] = v
    })
    return out
  }

  async function generate() {
    setLoading(true)
    let q = supabase.from(cfg.value).select(cfg.select)
    if (cfg.value !== 'suppliers') q = q.gte(cfg.dateCol, from).lte(cfg.dateCol, to)
    const { data, error } = await q.order(cfg.dateCol, { ascending: false })
    setLoading(false)
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    const flat = (data ?? []).map(flatten)
    setRows(flat)
    setCols(flat.length ? Object.keys(flat[0]) : [])
    // Save report metadata (owner may later delete)
    supabase.from('reports').insert({ title, report_type: type, period_start: from, period_end: to })
  }

  const money = (k: string, v: any) =>
    /price|amount|cost|total/.test(k) ? formatMoney(v) : /date/.test(k) ? formatDate(v) : String(v ?? '')

  return (
    <div>
      <PageHeader title={t('reports')} icon={<FileText className="h-5 w-5" />} />

      <Card className="mb-4 print:hidden">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-4">
          <div className="space-y-1">
            <Label>{t('reports')}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REPORT_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{lang === 'lo' ? r.labelLo : r.labelEn}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>{t('date')} ({t('all')})</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label>→</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="flex items-end"><Button onClick={generate} className="w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('search')}</Button></div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />{t('print')}</Button>
          <Button variant="outline" onClick={() => exportPDF(cols, rows.map((r) => cols.map((c) => money(c, r[c]))), title, title)}><Download className="h-4 w-4" />PDF</Button>
          <Button variant="outline" onClick={() => exportExcel(rows, title)}><FileSpreadsheet className="h-4 w-4" />Excel</Button>
          <Button variant="outline" onClick={() => exportCSV(rows, title)}>CSV</Button>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{title} · {formatDate(from)} – {formatDate(to)}</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('no_data')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>{cols.map((c) => <th key={c} className="px-3 py-2 text-left font-semibold capitalize">{c.replace(/_/g, ' ')}</th>)}</tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t"><>{cols.map((c) => <td key={c} className="px-3 py-2">{money(c, r[c])}</td>)}</></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
