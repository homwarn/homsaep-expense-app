import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Download, ShoppingCart, Truck, X, Check } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase, logActivity } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/i18n/I18nProvider'
import { formatMoney, formatDate, todayISO } from '@/lib/utils'
import { exportCSV, exportExcel, exportPDF } from '@/lib/export'
import { cn } from '@/lib/utils'

interface Config {
  table: 'raw_material_purchases' | 'drink_purchases'
  categoryTable: 'raw_material_categories' | 'drink_categories'
  itemTable: 'raw_materials' | 'drinks'
  nameField: 'material_name' | 'drink_name'
  titleKey: 'raw_materials' | 'drinks'
}

interface Line {
  category_id: string
  name: string
  quantity: number
  unit: string
  unit_price: number
}
interface Picked { quantity: number; unit: string; unit_price: number }

const emptyLine = (): Line => ({ category_id: '', name: '', quantity: 1, unit: '', unit_price: 0 })

export function PurchaseModule({ config }: { config: Config }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [filterCat, setFilterCat] = useState('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [mode, setMode] = useState<'items' | 'lump'>('items')
  const [date, setDate] = useState(todayISO())
  const [supplierId, setSupplierId] = useState('')
  const [shipping, setShipping] = useState(0)
  const [remark, setRemark] = useState('')
  const [lumpAmount, setLumpAmount] = useState(0)
  const [payMethod, setPayMethod] = useState('cash')
  const [payStatus, setPayStatus] = useState('paid')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const lakPrice = (it: any) => (it?.currency && it.currency !== 'LAK' ? (Number(it.price) || 0) * (Number(it.exchange_rate) || 1) : (Number(it?.price) || 0))

  const [mappedIds, setMappedIds] = useState<Set<string>>(new Set())
  const [picked, setPicked] = useState<Record<string, Picked>>({})
  const [customLines, setCustomLines] = useState<Line[]>([])

  const junction = config.itemTable === 'raw_materials'
    ? { table: 'supplier_raw_materials', col: 'raw_material_id' }
    : { table: 'supplier_drinks', col: 'drink_id' }

  async function loadLookups() {
    const [{ data: sup }, { data: cat }, { data: it }] = await Promise.all([
      supabase.from('suppliers').select('id,name,contact_person').eq('is_active', true).order('name'),
      supabase.from(config.categoryTable).select('id,name').order('name'),
      supabase.from(config.itemTable).select(`id,name,category_id,unit,price,currency,exchange_rate, category:${config.categoryTable}(name)`).order('name'),
    ])
    setSuppliers(sup ?? [])
    setCategories(cat ?? [])
    setItems(it ?? [])
  }

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
    load(); loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.table])

  // load supplier→item mapping when supplier changes
  useEffect(() => {
    if (!supplierId) { setMappedIds(new Set()); return }
    supabase.from(junction.table).select(junction.col).eq('supplier_id', supplierId).then(({ data }) => {
      setMappedIds(new Set((data ?? []).map((x: any) => x[junction.col])))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  const filtered = useMemo(
    () => (filterCat === 'all' ? rows : rows.filter((r) => r.category_id === filterCat)),
    [rows, filterCat],
  )

  const supplierItemList = supplierId && mappedIds.size ? items.filter((i) => mappedIds.has(i.id)) : []
  const groupedSupplierItems = useMemo(() => {
    const m = new Map<string, any[]>()
    supplierItemList.forEach((it) => {
      const k = it.category?.name ?? '—'
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(it)
    })
    return [...m.entries()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierItemList.map((i) => i.id).join(',')])

  const pickedTotal = Object.values(picked).reduce((s, p) => s + (Number(p.quantity) || 0) * (Number(p.unit_price) || 0), 0)
  const customTotal = customLines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0)
  const subtotal = mode === 'lump' ? (Number(lumpAmount) || 0) : pickedTotal + customTotal
  const grandTotal = subtotal + (Number(shipping) || 0)

  function resetForm() {
    setEditingId(null); setMode('items'); setDate(todayISO()); setSupplierId('')
    setShipping(0); setRemark(''); setLumpAmount(0); setPicked({}); setCustomLines([])
    setPayMethod('cash'); setPayStatus('paid')
  }
  function openCreate() { resetForm(); setDialogOpen(true) }
  function openEdit(row: any) {
    setEditingId(row.id); setMode('items'); setDate(row.purchase_date); setSupplierId(row.supplier_id ?? '')
    setShipping(row.shipping_cost ?? 0); setRemark(row.remark ?? ''); setLumpAmount(0); setPicked({})
    setPayMethod(row.payment_method ?? 'cash'); setPayStatus(row.payment_status ?? 'paid')
    setCustomLines([{ category_id: row.category_id ?? '', name: row[config.nameField], quantity: row.quantity, unit: row.unit ?? '', unit_price: row.unit_price }])
    setDialogOpen(true)
  }

  function togglePick(it: any) {
    setPicked((p) => {
      const next = { ...p }
      if (next[it.id]) delete next[it.id]
      else next[it.id] = { quantity: 1, unit: it.unit ?? '', unit_price: lakPrice(it) }
      return next
    })
  }
  function patchPick(id: string, patch: Partial<Picked>) {
    setPicked((p) => ({ ...p, [id]: { ...p[id], ...patch } }))
  }
  function updateCustom(i: number, patch: Partial<Line>) {
    setCustomLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  async function ensureItem(categoryId: string, name: string, unit: string, price: number) {
    if (!categoryId || !name.trim()) return
    const key = name.trim().toLowerCase()
    if (!items.some((it) => it.name.trim().toLowerCase() === key)) {
      await supabase.from(config.itemTable).insert({ category_id: categoryId, name: name.trim(), unit: unit || null, price: price || 0 })
    }
  }

  async function onSubmit() {
    const { data: { user } } = await supabase.auth.getUser()

    // ---- edit: single row ----
    if (editingId) {
      const l = customLines[0]
      if (!l?.name.trim()) return toast({ title: t('error'), description: t('item_name'), variant: 'error' })
      const { error } = await supabase.from(config.table).update({
        purchase_date: date, supplier_id: supplierId || null, category_id: l.category_id || null,
        [config.nameField]: l.name.trim(), quantity: Number(l.quantity), unit: l.unit || null,
        unit_price: Number(l.unit_price), shipping_cost: Number(shipping) || 0, remark: remark || null,
        payment_method: payMethod, payment_status: payStatus,
      }).eq('id', editingId)
      if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
      logActivity('update', config.table, editingId)
      toast({ title: t('saved') }); setDialogOpen(false); load()
      return
    }

    // ---- lump-sum bill ----
    if (mode === 'lump') {
      if (!(Number(lumpAmount) > 0)) return toast({ title: t('error'), description: t('bill_amount'), variant: 'error' })
      const { error } = await supabase.from(config.table).insert({
        purchase_date: date, supplier_id: supplierId || null, category_id: null,
        [config.nameField]: remark.trim() || t('mode_total'), quantity: 1, unit: null,
        unit_price: Number(lumpAmount), shipping_cost: Number(shipping) || 0, remark: remark || null,
        payment_method: payMethod, payment_status: payStatus, created_by: user?.id,
      })
      if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
      logActivity('insert', config.table)
      toast({ title: t('saved') }); setDialogOpen(false); load()
      return
    }

    // ---- itemized: picked + custom ----
    const pickedRows = Object.entries(picked).map(([id, p]) => {
      const it = items.find((x) => x.id === id)
      return { category_id: it?.category_id ?? null, name: it?.name ?? '', quantity: Number(p.quantity), unit: p.unit || null, unit_price: Number(p.unit_price) }
    })
    const customRows = customLines.filter((l) => l.name.trim()).map((l) => ({ category_id: l.category_id || null, name: l.name.trim(), quantity: Number(l.quantity), unit: l.unit || null, unit_price: Number(l.unit_price) }))
    const all = [...pickedRows, ...customRows]
    if (!all.length) return toast({ title: t('error'), description: t('item_name'), variant: 'error' })

    for (const l of customRows) await ensureItem(l.category_id ?? '', l.name, l.unit ?? '', l.unit_price)

    const payloads = all.map((r, i) => ({
      purchase_date: date, supplier_id: supplierId || null, category_id: r.category_id,
      [config.nameField]: r.name, quantity: r.quantity, unit: r.unit, unit_price: r.unit_price,
      shipping_cost: i === 0 ? Number(shipping) || 0 : 0, remark: remark || null,
      payment_method: payMethod, payment_status: payStatus, created_by: user?.id,
    }))
    const { error } = await supabase.from(config.table).insert(payloads)
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    logActivity('insert', config.table)
    toast({ title: t('saved') }); setDialogOpen(false); load(); loadLookups()
  }

  async function confirmDelete() {
    if (!deleteId) return
    const { error } = await supabase.from(config.table).delete().eq('id', deleteId)
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    logActivity('delete', config.table, deleteId)
    toast({ title: t('deleted') }); setDeleteId(null); load()
  }

  const columns: ColumnDef<any, unknown>[] = [
    { accessorKey: 'purchase_date', header: t('date'), cell: ({ row }) => formatDate(row.original.purchase_date) },
    { accessorFn: (r) => r.category?.name ?? '-', id: 'category', header: t('category') },
    { accessorKey: config.nameField, header: t('name') },
    { accessorFn: (r) => r.supplier?.name ?? '-', id: 'supplier', header: t('supplier') },
    { accessorKey: 'quantity', header: t('quantity') },
    { accessorKey: 'unit', header: t('unit') },
    { accessorKey: 'unit_price', header: t('unit_price'), cell: ({ row }) => formatMoney(row.original.unit_price) },
    { accessorKey: 'shipping_cost', header: t('shipping_cost'), cell: ({ row }) => formatMoney(row.original.shipping_cost) },
    { accessorKey: 'total_price', header: t('total_price'), cell: ({ row }) => <span className="font-semibold text-primary">{formatMoney(row.original.total_price)}</span> },
    {
      accessorKey: 'payment_status', header: t('payment_status'),
      cell: ({ row }) => (
        <Badge variant={row.original.payment_status === 'paid' ? 'success' : 'warning'}>
          {row.original.payment_status === 'paid' ? t('pay_paid') : t('pay_unpaid')}
        </Badge>
      ),
    },
    {
      id: 'actions', header: t('actions'),
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  function doExport(kind: 'csv' | 'xlsx' | 'pdf') {
    const data = filtered.map((r) => ({
      [t('date')]: r.purchase_date, [t('category')]: r.category?.name ?? '', [t('name')]: r[config.nameField],
      [t('supplier')]: r.supplier?.name ?? '', [t('quantity')]: r.quantity, [t('unit')]: r.unit ?? '',
      [t('unit_price')]: r.unit_price, [t('shipping_cost')]: r.shipping_cost ?? 0, [t('total_price')]: r.total_price,
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

      {/* ---- dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              {editingId ? t('edit') : t('add')} · {t(config.titleKey)}
            </DialogTitle>
            <DialogDescription>{t('purchase_form_hint')}</DialogDescription>
          </DialogHeader>

          {/* header: date + supplier */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t('date')}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" />{t('supplier')}</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}{s.contact_person ? ` · ${s.contact_person}` : ''}</SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
          </div>

          {/* payment method + status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t('payment_method')}</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('pay_cash')}</SelectItem>
                  <SelectItem value="transfer">{t('pay_transfer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('payment_status')}</Label>
              <Select value={payStatus} onValueChange={setPayStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">{t('pay_paid')}</SelectItem>
                  <SelectItem value="unpaid">{t('pay_unpaid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* mode switch (create only) */}
          {!editingId && (
            <div className="flex rounded-xl border p-1 text-sm">
              <button type="button" onClick={() => setMode('items')} className={cn('flex-1 rounded-lg px-3 py-1.5 font-medium', mode === 'items' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{t('mode_detail')}</button>
              <button type="button" onClick={() => setMode('lump')} className={cn('flex-1 rounded-lg px-3 py-1.5 font-medium', mode === 'lump' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{t('mode_total')}</button>
            </div>
          )}

          {/* ===== LUMP MODE ===== */}
          {mode === 'lump' && !editingId && (
            <div className="space-y-1">
              <Label>{t('bill_amount')}</Label>
              <Input type="number" step="any" value={lumpAmount} onChange={(e) => setLumpAmount(Number(e.target.value))} placeholder="0" />
            </div>
          )}

          {/* ===== ITEMS MODE ===== */}
          {mode === 'items' && (
            <div className="space-y-3">
              {/* supplier mapped items */}
              {!editingId && (
                <div className="space-y-2">
                  <Label>{t('supplied_items')}</Label>
                  {!supplierId && <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">{t('select_supplier_first')}</p>}
                  {supplierId && supplierItemList.length === 0 && <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">{t('no_mapped_hint')}</p>}
                  {groupedSupplierItems.map(([cat, list]) => (
                    <div key={cat}>
                      <p className="mb-1 text-xs font-semibold text-muted-foreground">{cat}</p>
                      <div className="space-y-1.5">
                        {list.map((it) => {
                          const on = !!picked[it.id]
                          const p = picked[it.id]
                          return (
                            <div key={it.id} className={cn('rounded-lg border p-2 transition-colors', on ? 'border-primary bg-primary/5' : '')}>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => togglePick(it)}
                                  className={cn('flex h-6 w-6 items-center justify-center rounded-md border', on ? 'border-primary bg-primary text-primary-foreground' : '')}>
                                  {on && <Check className="h-4 w-4" />}
                                </button>
                                <span className="flex-1 text-sm font-medium">{it.name}</span>
                                <span className="text-xs text-muted-foreground">{formatMoney(it.price)}{it.unit ? ` / ${it.unit}` : ''}</span>
                              </div>
                              {on && (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                  <div><Label className="text-[10px] text-muted-foreground">{t('quantity')}</Label><Input type="number" step="any" className="h-8" value={p.quantity} onChange={(e) => patchPick(it.id, { quantity: Number(e.target.value) })} /></div>
                                  <div><Label className="text-[10px] text-muted-foreground">{t('unit')}</Label><Input className="h-8" value={p.unit} onChange={(e) => patchPick(it.id, { unit: e.target.value })} /></div>
                                  <div><Label className="text-[10px] text-muted-foreground">{t('unit_price')}</Label><Input type="number" step="any" className="h-8" value={p.unit_price} onChange={(e) => patchPick(it.id, { unit_price: Number(e.target.value) })} /></div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* custom / editable lines */}
              {(customLines.length > 0 || editingId) && (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>
                      <th className="px-2 py-2 text-left font-medium">{t('category')}</th>
                      <th className="px-2 py-2 text-left font-medium">{t('item_name')}</th>
                      <th className="px-2 py-2 text-left font-medium">{t('quantity')}</th>
                      <th className="px-2 py-2 text-left font-medium">{t('unit')}</th>
                      <th className="px-2 py-2 text-left font-medium">{t('unit_price')}</th>
                      <th className="w-8" />
                    </tr></thead>
                    <tbody>
                      {customLines.map((line, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1.5">
                            <Select value={line.category_id} onValueChange={(v) => updateCustom(i, { category_id: v })}>
                              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1.5"><Input className="h-9 min-w-[9rem]" value={line.name} onChange={(e) => updateCustom(i, { name: e.target.value })} /></td>
                          <td className="px-2 py-1.5"><Input type="number" step="any" className="h-9 w-20" value={line.quantity} onChange={(e) => updateCustom(i, { quantity: Number(e.target.value) })} /></td>
                          <td className="px-2 py-1.5"><Input className="h-9 w-20" value={line.unit} onChange={(e) => updateCustom(i, { unit: e.target.value })} placeholder="kg" /></td>
                          <td className="px-2 py-1.5"><Input type="number" step="any" className="h-9 w-28" value={line.unit_price} onChange={(e) => updateCustom(i, { unit_price: Number(e.target.value) })} /></td>
                          <td className="px-1">{!editingId && <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCustomLines((ls) => ls.filter((_, idx) => idx !== i))}><X className="h-4 w-4 text-destructive" /></Button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!editingId && (
                <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => setCustomLines((ls) => [...ls, emptyLine()])}>
                  <Plus className="h-4 w-4" />{t('add_other_item')}
                </Button>
              )}
            </div>
          )}

          {/* totals + shipping */}
          <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('subtotal')}</span>
              <span className="font-medium">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground"><Truck className="h-3.5 w-3.5" />{t('shipping_cost')}</span>
              <Input type="number" step="any" className="h-9 w-40 text-right" value={shipping} onChange={(e) => setShipping(Number(e.target.value))} placeholder="0" />
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-medium">{t('grand_total')}</span>
              <span className="text-lg font-extrabold text-primary">{formatMoney(grandTotal)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t('remark')}</Label>
            <Input value={remark} onChange={(e) => setRemark(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button type="button" onClick={onSubmit}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  )
}
