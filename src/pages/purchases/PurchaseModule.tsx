import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Download, ShoppingCart } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase, logActivity } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'
import { formatMoney, formatDate, todayISO } from '@/lib/utils'
import { exportCSV, exportExcel, exportPDF } from '@/lib/export'

interface Config {
  table: 'raw_material_purchases' | 'drink_purchases'
  categoryTable: 'raw_material_categories' | 'drink_categories'
  nameField: 'material_name' | 'drink_name'
  titleKey: 'raw_materials' | 'drinks'
}

interface FormValues {
  purchase_date: string
  supplier_id: string
  category_id: string
  name: string
  quantity: number
  unit: string
  unit_price: number
  remark: string
}

export function PurchaseModule({ config }: { config: Config }) {
  const { t } = useI18n()
  const { isOwner } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('all')

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>()
  const qty = watch('quantity')
  const price = watch('unit_price')
  const total = (Number(qty) || 0) * (Number(price) || 0)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from(config.table)
      .select(`*, supplier:suppliers(id,name), category:${config.categoryTable}(id,name)`)
      .order('purchase_date', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('suppliers').select('id,name').eq('is_active', true).then(({ data }) => setSuppliers(data ?? []))
    supabase.from(config.categoryTable).select('id,name').then(({ data }) => setCategories(data ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.table])

  const filtered = useMemo(
    () => (filterCat === 'all' ? rows : rows.filter((r) => r.category_id === filterCat)),
    [rows, filterCat],
  )

  function openCreate() {
    setEditing(null)
    reset({ purchase_date: todayISO(), supplier_id: '', category_id: '', name: '', quantity: 0, unit: '', unit_price: 0, remark: '' })
    setDialogOpen(true)
  }

  function openEdit(row: any) {
    setEditing(row)
    reset({
      purchase_date: row.purchase_date,
      supplier_id: row.supplier_id ?? '',
      category_id: row.category_id ?? '',
      name: row[config.nameField],
      quantity: row.quantity,
      unit: row.unit ?? '',
      unit_price: row.unit_price,
      remark: row.remark ?? '',
    })
    setDialogOpen(true)
  }

  async function onSubmit(v: FormValues) {
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = {
      purchase_date: v.purchase_date,
      supplier_id: v.supplier_id || null,
      category_id: v.category_id || null,
      [config.nameField]: v.name,
      quantity: Number(v.quantity),
      unit: v.unit || null,
      unit_price: Number(v.unit_price),
      remark: v.remark || null,
    }
    let error
    if (editing) {
      ;({ error } = await supabase.from(config.table).update(payload).eq('id', editing.id))
    } else {
      payload.created_by = user?.id
      ;({ error } = await supabase.from(config.table).insert(payload))
    }
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    logActivity(editing ? 'update' : 'insert', config.table, editing?.id)
    toast({ title: t('saved') })
    setDialogOpen(false)
    load()
  }

  async function confirmDelete() {
    if (!deleteId) return
    const { error } = await supabase.from(config.table).delete().eq('id', deleteId)
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    logActivity('delete', config.table, deleteId)
    toast({ title: t('deleted') })
    setDeleteId(null)
    load()
  }

  const columns: ColumnDef<any, unknown>[] = [
    { accessorKey: 'purchase_date', header: t('date'), cell: ({ row }) => formatDate(row.original.purchase_date) },
    { accessorFn: (r) => r.category?.name ?? '-', id: 'category', header: t('category') },
    { accessorKey: config.nameField, header: t('name') },
    { accessorFn: (r) => r.supplier?.name ?? '-', id: 'supplier', header: t('supplier') },
    { accessorKey: 'quantity', header: t('quantity') },
    { accessorKey: 'unit', header: t('unit') },
    { accessorKey: 'unit_price', header: t('unit_price'), cell: ({ row }) => formatMoney(row.original.unit_price) },
    { accessorKey: 'total_price', header: t('total_price'), cell: ({ row }) => <span className="font-semibold">{formatMoney(row.original.total_price)}</span> },
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

  function doExport(kind: 'csv' | 'xlsx' | 'pdf') {
    const data = filtered.map((r) => ({
      [t('date')]: r.purchase_date,
      [t('category')]: r.category?.name ?? '',
      [t('name')]: r[config.nameField],
      [t('supplier')]: r.supplier?.name ?? '',
      [t('quantity')]: r.quantity,
      [t('unit')]: r.unit ?? '',
      [t('unit_price')]: r.unit_price,
      [t('total_price')]: r.total_price,
    }))
    const fn = config.table
    if (kind === 'csv') exportCSV(data, fn)
    else if (kind === 'xlsx') exportExcel(data, fn)
    else exportPDF(Object.keys(data[0] ?? { x: '' }), data.map((d) => Object.values(d) as any), fn, t(config.titleKey))
  }

  const total_all = filtered.reduce((s, r) => s + Number(r.total_price), 0)

  return (
    <div>
      <PageHeader
        title={t(config.titleKey)}
        icon={<ShoppingCart className="h-5 w-5" />}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"><Download className="h-4 w-4" />{t('export')}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => doExport('csv')}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => doExport('xlsx')}>Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => doExport('pdf')}>PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={openCreate}><Plus className="h-4 w-4" />{t('add')}</Button>
          </>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">{t('filter')}:</Label>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">{t('total_price')}: </span>
            <span className="font-bold text-primary">{formatMoney(total_all)}</span>
          </div>
        </CardContent>
      </Card>

      <Card><CardContent className="p-4"><DataTable columns={columns} data={filtered} loading={loading} /></CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('edit') : t('add')} · {t(config.titleKey)}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t('date')}</Label>
              <Input type="date" {...register('purchase_date', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>{t('category')}</Label>
              <Select value={watch('category_id')} onValueChange={(v) => setValue('category_id', v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>{t('name')}</Label>
              <Input {...register('name', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>{t('supplier')}</Label>
              <Select value={watch('supplier_id')} onValueChange={(v) => setValue('supplier_id', v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('unit')}</Label>
              <Input {...register('unit')} placeholder="kg, ຖົງ, ຂວດ..." />
            </div>
            <div className="space-y-1">
              <Label>{t('quantity')}</Label>
              <Input type="number" step="any" {...register('quantity', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>{t('unit_price')}</Label>
              <Input type="number" step="any" {...register('unit_price', { required: true })} />
            </div>
            <div className="col-span-2 rounded-lg bg-muted p-3 text-sm">
              {t('total_price')}: <span className="font-bold text-primary">{formatMoney(total)}</span>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>{t('remark')}</Label>
              <Input {...register('remark')} />
            </div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
              <Button type="submit">{t('save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  )
}
