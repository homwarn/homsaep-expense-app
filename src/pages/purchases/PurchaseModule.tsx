import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Download, ShoppingCart, Truck, X } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const [date, setDate] = useState(todayISO())
  const [supplierId, setSupplierId] = useState('')
  const [lines, setLines] = useState<Line[]>([emptyLine()])
  const [shipping, setShipping] = useState(0)
  const [remark, setRemark] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [supplierItems, setSupplierItems] = useState<Set<string>>(new Set())

  const junction = config.itemTable === 'raw_materials'
    ? { table: 'supplier_raw_materials', col: 'raw_material_id' }
    : { table: 'supplier_drinks', col: 'drink_id' }

  // when a supplier is selected, suggest the items they supply (if mapped)
  useEffect(() => {
    if (!supplierId) { setSupplierItems(new Set()); return }
    supabase.from(junction.table).select(junction.col).eq('supplier_id', supplierId).then(({ data }) => {
      setSupplierItems(new Set((data ?? []).map((x: any) => x[junction.col])))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  async function loadLookups() {
    const [{ data: sup }, { data: cat }, { data: it }] = await Promise.all([
      supabase.from('suppliers').select('id,name,contact_person').eq('is_active', true).order('name'),
      supabase.from(config.categoryTable).select('id,name').order('name'),
      supabase.from(config.itemTable).select('id,name,category_id,unit').order('name'),
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
    load()
    loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.table])

  const filtered = useMemo(
    () => (filterCat === 'all' ? rows : rows.filter((r) => r.category_id === filterCat)),
    [rows, filterCat],
  )

  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0)
  const grandTotal = subtotal + (Number(shipping) || 0)

  function openCreate() {
    setEditingId(null)
    setDate(todayISO()); setSupplierId(''); setLines([emptyLine()]); setShipping(0); setRemark('')
    setDialogOpen(true)
  }
  function openEdit(row: any) {
    setEditingId(row.id)
    setDate(row.purchase_date)
    setSupplierId(row.supplier_id ?? '')
    setLines([{ category_id: row.category_id ?? '', name: row[config.nameField], quantity: row.quantity, unit: row.unit ?? '', unit_price: row.unit_price }])
    setShipping(row.shipping_cost ?? 0)
    setRemark(row.remark ?? '')
    setDialogOpen(true)
  }
  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  async function ensureItem(categoryId: string, name: string, unit: string) {
    // only remember items that belong to a category, and avoid duplicates (any category)
    if (!categoryId || !name.trim()) return
    const key = name.trim().toLowerCase()
    const exists = items.some((it) => it.name.trim().toLowerCase() === key)
    if (!exists) {
      await supabase.from(config.itemTable).insert({ category_id: categoryId, name: name.trim(), unit: unit || null })
    }
  }

  async function onSubmit() {
    const valid = lines.filter((l) => l.name.trim())
    if (!valid.length) return toast({ title: t('error'), description: t('item_name'), variant: 'error' })
    const { data: { user } } = await supabase.auth.getUser()

    if (editingId) {
      const l = valid[0]
      await ensureItem(l.category_id, l.name, l.unit)
      const { error } = await supabase.from(config.table).update({
        purchase_date: date, supplier_id: supplierId || null, category_id: l.category_id || null,
        [config.nameField]: l.name.trim(), quantity: Number(l.quantity), unit: l.unit || null,
        unit_price: Number(l.unit_price), shipping_cost: Number(shipping) || 0, remark: remark || null,
      }).eq('id', editingId)
      if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    } else {
      const payloads = await Promise.all(valid.map(async (l, i) => {
        await ensureItem(l.category_id, l.name, l.unit)
        return {
          purchase_date: date, supplier_id: supplierId || null, category_id: l.category_id || null,
          [config.nameField]: l.name.trim(), quantity: Number(l.quantity), unit: l.unit || null,
          unit_price: Number(l.unit_price), shipping_cost: i === 0 ? Number(shipping) || 0 : 0,
          remark: remark || null, created_by: user?.id,
        }
      }))
      const { error } = await supabase.from(config.table).insert(payloads)
      if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    }
    logActivity(editingId ? 'update' : 'insert', config.table, editingId ?? undefined)
    toast({ title: t('saved') })
    setDialogOpen(false)
    load(); loadLookups()
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
  const listId = `${config.itemTable}-items`

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

      {/* ---- Invoice dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              {editingId ? t('edit') : t('add')} · {t(config.titleKey)}
            </DialogTitle>
            <DialogDescription>{t('purchase_form_hint')}</DialogDescription>
          </DialogHeader>

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

          <datalist id={listId}>
            {(supplierItems.size ? items.filter((it) => supplierItems.has(it.id)) : items).map((it) => <option key={it.id} value={it.name} />)}
          </datalist>

          {/* line-item card table */}
          <div className="space-y-2">
            <Label>{t('line_items')}</Label>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">{t('category')}</th>
                    <th className="px-2 py-2 text-left font-medium">{t('item_name')}</th>
                    <th className="px-2 py-2 text-left font-medium">{t('quantity')}</th>
                    <th className="px-2 py-2 text-left font-medium">{t('unit')}</th>
                    <th className="px-2 py-2 text-left font-medium">{t('unit_price')}</th>
                    <th className="px-2 py-2 text-right font-medium">{t('line_total')}</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => {
                    const lineTotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0)
                    const catItems = items.filter((it) => !line.category_id || it.category_id === line.category_id)
                    return (
                      <tr key={i} className="border-t align-middle">
                        <td className="px-2 py-1.5">
                          <Select value={line.category_id} onValueChange={(v) => updateLine(i, { category_id: v })}>
                            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input list={listId} className="h-9 min-w-[9rem]" value={line.name}
                            onChange={(e) => { const val = e.target.value; const m = catItems.find((it) => it.name === val); updateLine(i, { name: val, unit: m?.unit ?? line.unit }) }} />
                        </td>
                        <td className="px-2 py-1.5"><Input type="number" step="any" className="h-9 w-20" value={line.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} /></td>
                        <td className="px-2 py-1.5"><Input className="h-9 w-20" value={line.unit} onChange={(e) => updateLine(i, { unit: e.target.value })} placeholder="kg" /></td>
                        <td className="px-2 py-1.5"><Input type="number" step="any" className="h-9 w-28" value={line.unit_price} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} /></td>
                        <td className="px-2 py-1.5 text-right font-medium">{formatMoney(lineTotal)}</td>
                        <td className="px-1">
                          {!editingId && (
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title={t('delete')}
                              onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : [emptyLine()]))}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!editingId && (
              <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
                <Plus className="h-4 w-4" />{t('add_line')}
              </Button>
            )}
          </div>

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
