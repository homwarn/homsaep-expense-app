import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Truck } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase, logActivity } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'
import type { Supplier } from '@/types/database'

interface FormValues {
  name: string
  phone: string
  address: string
  contact_person: string
  remark: string
  is_active: boolean
}

export default function Suppliers() {
  const { t } = useI18n()
  const { isOwner } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false })
    setRows((data as Supplier[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    reset({ name: '', phone: '', address: '', contact_person: '', remark: '', is_active: true })
    setDialogOpen(true)
  }
  function openEdit(s: Supplier) {
    setEditing(s)
    reset({ name: s.name, phone: s.phone ?? '', address: s.address ?? '', contact_person: s.contact_person ?? '', remark: s.remark ?? '', is_active: s.is_active })
    setDialogOpen(true)
  }

  async function onSubmit(v: FormValues) {
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = { ...v, phone: v.phone || null, address: v.address || null, contact_person: v.contact_person || null, remark: v.remark || null }
    let error
    if (editing) ({ error } = await supabase.from('suppliers').update(payload).eq('id', editing.id))
    else { payload.created_by = user?.id; ({ error } = await supabase.from('suppliers').insert(payload)) }
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    logActivity(editing ? 'update' : 'insert', 'suppliers', editing?.id)
    toast({ title: t('saved') })
    setDialogOpen(false)
    load()
  }

  async function confirmDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('suppliers').delete().eq('id', deleteId)
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    toast({ title: t('deleted') })
    setDeleteId(null)
    load()
  }

  const columns: ColumnDef<Supplier, unknown>[] = [
    { accessorKey: 'name', header: t('name') },
    { accessorKey: 'phone', header: t('phone'), cell: ({ row }) => row.original.phone ?? '-' },
    { accessorKey: 'contact_person', header: t('contact_person'), cell: ({ row }) => row.original.contact_person ?? '-' },
    { accessorKey: 'address', header: t('address'), cell: ({ row }) => row.original.address ?? '-' },
    {
      accessorKey: 'is_active', header: t('status'),
      cell: ({ row }) => <Badge variant={row.original.is_active ? 'success' : 'secondary'}>{row.original.is_active ? t('active') : t('inactive')}</Badge>,
    },
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
      <PageHeader title={t('suppliers')} icon={<Truck className="h-5 w-5" />}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />{t('add')}</Button>} />
      <Card><CardContent className="p-4"><DataTable columns={columns} data={rows} loading={loading} /></CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('edit') : t('add')} · {t('suppliers')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1"><Label>{t('name')}</Label><Input {...register('name', { required: true })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>{t('phone')}</Label><Input {...register('phone')} /></div>
              <div className="space-y-1"><Label>{t('contact_person')}</Label><Input {...register('contact_person')} /></div>
            </div>
            <div className="space-y-1"><Label>{t('address')}</Label><Input {...register('address')} /></div>
            <div className="space-y-1"><Label>{t('remark')}</Label><Input {...register('remark')} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={watch('is_active')} onCheckedChange={(c) => setValue('is_active', c)} />
              <Label>{t('active')}</Label>
            </div>
            <DialogFooter>
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
