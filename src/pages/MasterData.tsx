import { useEffect, useState } from 'react'
import { Database, Plus, Pencil, Trash2, Truck, Tag, Package } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'

export default function MasterData() {
  const { t } = useI18n()
  return (
    <div>
      <PageHeader title={t('master_data')} icon={<Database className="h-5 w-5" />} />
      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers"><Truck className="mr-1 h-4 w-4" />{t('suppliers')}</TabsTrigger>
          <TabsTrigger value="rm"><Package className="mr-1 h-4 w-4" />{t('raw_materials_data')}</TabsTrigger>
          <TabsTrigger value="drink"><Package className="mr-1 h-4 w-4" />{t('drinks_data')}</TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers"><SuppliersManager /></TabsContent>
        <TabsContent value="rm"><CategoryItemManager categoryTable="raw_material_categories" itemTable="raw_materials" /></TabsContent>
        <TabsContent value="drink"><CategoryItemManager categoryTable="drink_categories" itemTable="drinks" /></TabsContent>
      </Tabs>
    </div>
  )
}

/* ============ Suppliers ============ */
function SuppliersManager() {
  const { t } = useI18n()
  const { isOwner } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({ name: '', contact_person: '', phone: '', address: '', is_active: true })

  async function load() {
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setRows(data ?? [])
  }
  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm({ name: '', contact_person: '', phone: '', address: '', is_active: true }); setOpen(true) }
  function openEdit(s: any) { setEditing(s); setForm({ name: s.name, contact_person: s.contact_person ?? '', phone: s.phone ?? '', address: s.address ?? '', is_active: s.is_active }); setOpen(true) }

  async function save() {
    if (!form.name.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = { name: form.name.trim(), contact_person: form.contact_person || null, phone: form.phone || null, address: form.address || null, is_active: form.is_active }
    let error
    if (editing) ({ error } = await supabase.from('suppliers').update(payload).eq('id', editing.id))
    else { payload.created_by = user?.id; ({ error } = await supabase.from('suppliers').insert(payload)) }
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    toast({ title: t('saved') }); setOpen(false); load()
  }
  async function confirmDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('suppliers').delete().eq('id', deleteId)
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    toast({ title: t('deleted') }); setDeleteId(null); load()
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex justify-end"><Button onClick={openCreate}><Plus className="h-4 w-4" />{t('add_supplier')}</Button></div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="px-4 py-2 text-left">{t('shop_name')}</th>
              <th className="px-4 py-2 text-left">{t('person_name')}</th>
              <th className="px-4 py-2 text-left">{t('phone')}</th>
              <th className="px-4 py-2 text-left">{t('status')}</th>
              <th className="px-4 py-2 text-right">{t('actions')}</th>
            </tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2">{s.contact_person ?? '-'}</td>
                  <td className="px-4 py-2">{s.phone ?? '-'}</td>
                  <td className="px-4 py-2"><Badge variant={s.is_active ? 'success' : 'secondary'}>{s.is_active ? t('active') : t('inactive')}</Badge></td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    {<Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t('no_data')}</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('edit') : t('add_supplier')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>{t('shop_name')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t('person_name')}</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t('phone')}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>{t('address')}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} /><Label>{t('active')}</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button onClick={save}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={confirmDelete} />
    </Card>
  )
}

/* ============ Categories + Items ============ */
function CategoryItemManager({ categoryTable, itemTable }: { categoryTable: string; itemTable: string }) {
  const { t } = useI18n()
  const { isOwner } = useAuth()
  const { toast } = useToast()
  const [categories, setCategories] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [selectedCat, setSelectedCat] = useState<string>('') // '' = all

  // category state
  const [catName, setCatName] = useState('')
  const [editCat, setEditCat] = useState<any>(null)
  const [delCat, setDelCat] = useState<string | null>(null)

  // item state
  const [itemOpen, setItemOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [itemForm, setItemForm] = useState<any>({ name: '', category_id: '', unit: '' })
  const [delItem, setDelItem] = useState<string | null>(null)

  async function load() {
    const [{ data: c }, { data: it }] = await Promise.all([
      supabase.from(categoryTable).select('*').order('name'),
      supabase.from(itemTable).select('*, category:' + categoryTable + '(name)').order('name'),
    ])
    setCategories(c ?? [])
    setItems(it ?? [])
  }
  useEffect(() => { load() }, [categoryTable])

  async function saveCat() {
    const name = (editCat ? editCat.name : catName).trim()
    if (!name) return
    let error
    if (editCat) ({ error } = await supabase.from(categoryTable).update({ name }).eq('id', editCat.id))
    else ({ error } = await supabase.from(categoryTable).insert({ name }))
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    setCatName(''); setEditCat(null); toast({ title: t('saved') }); load()
  }
  async function confirmDelCat() {
    if (!delCat) return
    const { error } = await supabase.from(categoryTable).delete().eq('id', delCat)
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    setDelCat(null); toast({ title: t('deleted') }); load()
  }

  const shownItems = selectedCat ? items.filter((it) => it.category_id === selectedCat) : items
  const selectedCatName = categories.find((c) => c.id === selectedCat)?.name

  function openItemCreate() { setEditItem(null); setItemForm({ name: '', category_id: selectedCat || categories[0]?.id || '', unit: '' }); setItemOpen(true) }
  function openItemEdit(it: any) { setEditItem(it); setItemForm({ name: it.name, category_id: it.category_id ?? '', unit: it.unit ?? '' }); setItemOpen(true) }
  async function saveItem() {
    if (!itemForm.name.trim()) return
    const payload = { name: itemForm.name.trim(), category_id: itemForm.category_id || null, unit: itemForm.unit || null }
    let error
    if (editItem) ({ error } = await supabase.from(itemTable).update(payload).eq('id', editItem.id))
    else ({ error } = await supabase.from(itemTable).insert(payload))
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    setItemOpen(false); toast({ title: t('saved') }); load()
  }
  async function confirmDelItem() {
    if (!delItem) return
    const { error } = await supabase.from(itemTable).delete().eq('id', delItem)
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    setDelItem(null); toast({ title: t('deleted') }); load()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* categories */}
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Tag className="h-4 w-4" />{t('categories')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={editCat ? editCat.name : catName} onChange={(e) => editCat ? setEditCat({ ...editCat, name: e.target.value }) : setCatName(e.target.value)} placeholder={t('category')} onKeyDown={(e) => e.key === 'Enter' && saveCat()} />
            <Button onClick={saveCat}>{editCat ? t('save') : <Plus className="h-4 w-4" />}</Button>
            {editCat && <Button variant="outline" onClick={() => setEditCat(null)}>{t('cancel')}</Button>}
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCat('')}
              className={cn('flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors', selectedCat === '' ? 'border-primary bg-primary/10 font-semibold' : 'hover:bg-accent')}
            >
              <span>{t('all')}</span>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </button>
            {categories.map((c) => {
              const count = items.filter((it) => it.category_id === c.id).length
              return (
                <div key={c.id} className={cn('flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors', selectedCat === c.id ? 'border-primary bg-primary/10' : '')}>
                  <button className="flex-1 text-left font-medium" onClick={() => setSelectedCat(c.id)}>
                    {c.name} <span className="ml-1 text-xs text-muted-foreground">({count})</span>
                  </button>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditCat(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDelCat(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              )
            })}
            {categories.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t('no_data')}</p>}
          </div>
        </CardContent>
      </Card>

      {/* items */}
      <Card className="lg:col-span-3">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />{t('items')}
            {selectedCatName && <Badge variant="secondary" className="font-normal">{selectedCatName}</Badge>}
          </CardTitle>
          <Button size="sm" onClick={openItemCreate}>
            <Plus className="h-4 w-4" />{t('add_item')}{selectedCatName ? ` · ${selectedCatName}` : ''}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="px-4 py-2 text-left">{t('item_name')}</th>
                <th className="px-4 py-2 text-left">{t('category')}</th>
                <th className="px-4 py-2 text-left">{t('unit')}</th>
                <th className="px-4 py-2 text-right">{t('actions')}</th>
              </tr></thead>
              <tbody>
                {shownItems.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{it.name}</td>
                    <td className="px-4 py-2">{it.category?.name ?? '-'}</td>
                    <td className="px-4 py-2">{it.unit ?? '-'}</td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openItemEdit(it)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDelItem(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
                {shownItems.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">{t('no_data')}</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? t('edit') : t('add_item')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>{t('item_name')}</Label><Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} autoFocus /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t('category')}</Label>
                <Select value={itemForm.category_id} onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>{t('unit')}</Label><Input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="kg, ຖົງ" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemOpen(false)}>{t('cancel')}</Button>
            <Button onClick={saveItem}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!delCat} onOpenChange={(o) => !o && setDelCat(null)} onConfirm={confirmDelCat} />
      <ConfirmDialog open={!!delItem} onOpenChange={(o) => !o && setDelItem(null)} onConfirm={confirmDelItem} />
    </div>
  )
}
