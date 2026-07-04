import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, TrendingUp, Download, UtensilsCrossed, CupSoda, Boxes } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase, logActivity } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'
import { formatMoney, formatDate, todayISO, startOfMonthISO } from '@/lib/utils'
import { exportExcel } from '@/lib/export'

export default function Revenue() {
  const { t } = useI18n()
  const { isOwner } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [sum, setSum] = useState({ material: 0, drink: 0, other: 0, month: 0 })
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('revenues').select('*').order('revenue_date', { ascending: false })
    setRows(data ?? [])
    const monthStart = startOfMonthISO()
    const byType = (ty: string) =>
      (data ?? [])
        .filter((r: any) => r.revenue_date >= monthStart && r.type === ty)
        .reduce((s: number, r: any) => s + Number(r.amount), 0)
    const material = byType('material'), drink = byType('drink'), other = byType('other')
    setSum({ material, drink, other, month: material + drink + other })
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); reset({ revenue_date: todayISO(), type: 'material', amount: 0, remark: '' }); setOpen(true) }
  const typeLabel = (ty: string) => ty === 'material' ? t('rev_material') : ty === 'drink' ? t('rev_drink') : t('rev_other')
  function openEdit(r: any) { setEditing(r); reset(r); setOpen(true) }

  async function onSubmit(v: any) {
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = { revenue_date: v.revenue_date, type: v.type, amount: Number(v.amount), remark: v.remark || null }
    let error
    if (editing) ({ error } = await supabase.from('revenues').update(payload).eq('id', editing.id))
    else { payload.created_by = user?.id; ({ error } = await supabase.from('revenues').insert(payload)) }
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    logActivity(editing ? 'update' : 'insert', 'revenues', editing?.id)
    toast({ title: t('saved') }); setOpen(false); load()
  }
  async function confirmDelete() {
    if (!deleteId) return
    await supabase.from('revenues').delete().eq('id', deleteId)
    toast({ title: t('deleted') }); setDeleteId(null); load()
  }

  const columns: ColumnDef<any, unknown>[] = [
    { accessorKey: 'revenue_date', header: t('date'), cell: ({ row }) => formatDate(row.original.revenue_date) },
    { accessorKey: 'type', header: t('type'), cell: ({ row }) => <Badge variant={row.original.type === 'material' ? 'default' : row.original.type === 'drink' ? 'secondary' : 'warning'}>{typeLabel(row.original.type)}</Badge> },
    { accessorKey: 'amount', header: t('amount'), cell: ({ row }) => <span className="font-semibold">{formatMoney(row.original.amount)}</span> },
    { accessorKey: 'remark', header: t('remark'), cell: ({ row }) => row.original.remark ?? '-' },
    {
      id: 'actions', header: t('actions'),
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          {isOwner && <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={t('revenue')} icon={<TrendingUp className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => exportExcel(rows.map((r) => ({ date: r.revenue_date, type: r.type, amount: r.amount })), 'revenue')}><Download className="h-4 w-4" />{t('export')}</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4" />{t('add')}</Button>
          </>
        }
      />
      <p className="mb-2 text-sm text-muted-foreground">{t('monthly')} · {t('revenue')}</p>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('rev_material')} value={formatMoney(sum.material)} icon={UtensilsCrossed} tone="amber" loading={loading} />
        <StatCard label={t('rev_drink')} value={formatMoney(sum.drink)} icon={CupSoda} tone="sky" loading={loading} />
        <StatCard label={t('rev_other')} value={formatMoney(sum.other)} icon={Boxes} tone="violet" loading={loading} />
        <StatCard label={t('total_revenue')} value={formatMoney(sum.month)} icon={TrendingUp} tone="emerald" loading={loading} />
      </div>

      <Card><CardContent className="p-4"><DataTable columns={columns} data={rows} loading={loading} /></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('edit') : t('add')} · {t('revenue')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>{t('date')}</Label><Input type="date" {...register('revenue_date', { required: true })} /></div>
            <div className="space-y-1"><Label>{t('type')}</Label>
              <Select value={watch('type')} onValueChange={(v) => setValue('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">{t('rev_material')}</SelectItem>
                  <SelectItem value="drink">{t('rev_drink')}</SelectItem>
                  <SelectItem value="other">{t('rev_other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1"><Label>{t('amount')}</Label><Input type="number" step="any" {...register('amount', { required: true })} /></div>
            <div className="col-span-2 space-y-1"><Label>{t('remark')}</Label><Input {...register('remark')} /></div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
              <Button type="submit">{t('save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  )
}
