import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Receipt, Download, Wrench, Tags } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { supabase, logActivity } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'
import { formatMoney, formatDate, todayISO } from '@/lib/utils'
import { exportExcel } from '@/lib/export'

export default function OtherExpenses() {
  const { t } = useI18n()
  return (
    <div>
      <PageHeader title={t('other_expenses')} icon={<Receipt className="h-5 w-5" />} />
      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses"><Receipt className="mr-1 h-4 w-4" />{t('other_expenses')}</TabsTrigger>
          <TabsTrigger value="repairs"><Wrench className="mr-1 h-4 w-4" />{t('repair')}</TabsTrigger>
          <TabsTrigger value="categories"><Tags className="mr-1 h-4 w-4" />{t('category')}</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses"><ExpensesTab /></TabsContent>
        <TabsContent value="repairs"><RepairsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
      </Tabs>
    </div>
  )
}

/* ---------------- Expenses ---------------- */
function ExpensesTab() {
  const { t } = useI18n()
  const { isOwner } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<any[]>([])
  const [cats, setCats] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('expenses')
      .select('*, category:expense_categories(id,name), supplier:suppliers(id,name)')
      .order('expense_date', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
    supabase.from('expense_categories').select('id,name').then(({ data }) => setCats(data ?? []))
    supabase.from('suppliers').select('id,name').eq('is_active', true).then(({ data }) => setSuppliers(data ?? []))
  }, [])

  function openCreate() { setEditing(null); reset({ expense_date: todayISO(), category_id: '', supplier_id: '', title: '', amount: 0, remark: '' }); setOpen(true) }
  function openEdit(r: any) { setEditing(r); reset({ expense_date: r.expense_date, category_id: r.category_id ?? '', supplier_id: r.supplier_id ?? '', title: r.title, amount: r.amount, remark: r.remark ?? '' }); setOpen(true) }

  async function onSubmit(v: any) {
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = { expense_date: v.expense_date, category_id: v.category_id || null, supplier_id: v.supplier_id || null, title: v.title, amount: Number(v.amount), remark: v.remark || null }
    let error
    if (editing) ({ error } = await supabase.from('expenses').update(payload).eq('id', editing.id))
    else { payload.created_by = user?.id; ({ error } = await supabase.from('expenses').insert(payload)) }
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    logActivity(editing ? 'update' : 'insert', 'expenses', editing?.id)
    toast({ title: t('saved') }); setOpen(false); load()
  }
  async function confirmDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('expenses').delete().eq('id', deleteId)
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    toast({ title: t('deleted') }); setDeleteId(null); load()
  }

  const columns: ColumnDef<any, unknown>[] = [
    { accessorKey: 'expense_date', header: t('date'), cell: ({ row }) => formatDate(row.original.expense_date) },
    { accessorFn: (r) => r.category?.name ?? '-', id: 'category', header: t('category') },
    { accessorKey: 'title', header: t('title') },
    { accessorFn: (r) => r.supplier?.name ?? '-', id: 'supplier', header: t('supplier') },
    { accessorKey: 'amount', header: t('amount'), cell: ({ row }) => <span className="font-semibold">{formatMoney(row.original.amount)}</span> },
    {
      id: 'actions', header: t('actions'),
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          {<Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
        </div>
      ),
    },
  ]

  return (
    <Card><CardContent className="space-y-4 p-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => exportExcel(rows.map((r) => ({ date: r.expense_date, category: r.category?.name, title: r.title, amount: r.amount })), 'expenses')}><Download className="h-4 w-4" />{t('export')}</Button>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />{t('add')}</Button>
      </div>
      <DataTable columns={columns} data={rows} loading={loading} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('edit') : t('add')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>{t('date')}</Label><Input type="date" {...register('expense_date', { required: true })} /></div>
            <div className="space-y-1"><Label>{t('category')}</Label>
              <Select value={watch('category_id')} onValueChange={(v) => setValue('category_id', v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1"><Label>{t('title')}</Label><Input {...register('title', { required: true })} /></div>
            <div className="space-y-1"><Label>{t('supplier')}</Label>
              <Select value={watch('supplier_id')} onValueChange={(v) => setValue('supplier_id', v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>{t('amount')}</Label><Input type="number" step="any" {...register('amount', { required: true })} /></div>
            <div className="col-span-2 space-y-1"><Label>{t('remark')}</Label><Input {...register('remark')} /></div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
              <Button type="submit">{t('save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={confirmDelete} />
    </CardContent></Card>
  )
}

/* ---------------- Repairs ---------------- */
function RepairsTab() {
  const { t } = useI18n()
  const { isOwner } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { register, handleSubmit, reset, watch } = useForm<any>()
  const total = (Number(watch('repair_cost')) || 0) + (Number(watch('material_cost')) || 0)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('repairs').select('*').order('repair_date', { ascending: false })
    setRows(data ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); reset({ repair_date: todayISO(), repair_name: '', repair_cost: 0, material_cost: 0, remark: '' }); setOpen(true) }
  function openEdit(r: any) { setEditing(r); reset(r); setOpen(true) }

  async function onSubmit(v: any) {
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = { repair_date: v.repair_date, repair_name: v.repair_name, repair_cost: Number(v.repair_cost), material_cost: Number(v.material_cost), remark: v.remark || null }
    let error
    if (editing) ({ error } = await supabase.from('repairs').update(payload).eq('id', editing.id))
    else { payload.created_by = user?.id; ({ error } = await supabase.from('repairs').insert(payload)) }
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    toast({ title: t('saved') }); setOpen(false); load()
  }
  async function confirmDelete() {
    if (!deleteId) return
    await supabase.from('repairs').delete().eq('id', deleteId)
    toast({ title: t('deleted') }); setDeleteId(null); load()
  }

  const columns: ColumnDef<any, unknown>[] = [
    { accessorKey: 'repair_date', header: t('date'), cell: ({ row }) => formatDate(row.original.repair_date) },
    { accessorKey: 'repair_name', header: t('repair_name') },
    { accessorKey: 'repair_cost', header: t('repair_cost'), cell: ({ row }) => formatMoney(row.original.repair_cost) },
    { accessorKey: 'material_cost', header: t('material_cost'), cell: ({ row }) => formatMoney(row.original.material_cost) },
    { accessorKey: 'total_cost', header: t('total_cost'), cell: ({ row }) => <span className="font-semibold">{formatMoney(row.original.total_cost)}</span> },
    {
      id: 'actions', header: t('actions'),
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          {<Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
        </div>
      ),
    },
  ]

  return (
    <Card><CardContent className="space-y-4 p-4">
      <div className="flex justify-end"><Button onClick={openCreate}><Plus className="h-4 w-4" />{t('add')}</Button></div>
      <DataTable columns={columns} data={rows} loading={loading} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('edit') : t('add')} · {t('repair')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>{t('date')}</Label><Input type="date" {...register('repair_date', { required: true })} /></div>
            <div className="space-y-1"><Label>{t('repair_name')}</Label><Input {...register('repair_name', { required: true })} /></div>
            <div className="space-y-1"><Label>{t('repair_cost')}</Label><Input type="number" step="any" {...register('repair_cost')} /></div>
            <div className="space-y-1"><Label>{t('material_cost')}</Label><Input type="number" step="any" {...register('material_cost')} /></div>
            <div className="col-span-2 rounded-lg bg-muted p-3 text-sm">{t('total_cost')}: <span className="font-bold text-primary">{formatMoney(total)}</span></div>
            <div className="col-span-2 space-y-1"><Label>{t('remark')}</Label><Input {...register('remark')} /></div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
              <Button type="submit">{t('save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={confirmDelete} />
    </CardContent></Card>
  )
}

/* ---------------- Categories ---------------- */
function CategoriesTab() {
  const { t } = useI18n()
  const { isOwner } = useAuth()
  const { toast } = useToast()
  const [cats, setCats] = useState<any[]>([])
  const [name, setName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('expense_categories').select('*').order('created_at')
    setCats(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!name.trim()) return
    const { error } = await supabase.from('expense_categories').insert({ name: name.trim() })
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    setName(''); toast({ title: t('saved') }); load()
  }
  async function confirmDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('expense_categories').delete().eq('id', deleteId)
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    toast({ title: t('deleted') }); setDeleteId(null); load()
  }

  return (
    <Card><CardContent className="space-y-4 p-4">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('category')} className="max-w-sm" />
        <Button onClick={add}><Plus className="h-4 w-4" />{t('add')}</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
            <span className="flex items-center gap-2 text-sm">{c.name}{c.is_system && <Badge variant="secondary">system</Badge>}</span>
            {!c.is_system && (
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            )}
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={confirmDelete} />
    </CardContent></Card>
  )
}
