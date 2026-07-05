import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Users as UsersIcon, KeyRound, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/i18n/I18nProvider'
import { navItems } from '@/components/layout/nav'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'

/** Toggle chips for granting per-user menu access (excludes owner-only menus). */
function MenuChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useI18n()
  const assignable = navItems.filter((n) => !n.ownerOnly)
  const toggle = (to: string) => onChange(value.includes(to) ? value.filter((x) => x !== to) : [...value, to])
  return (
    <div className="flex flex-wrap gap-1.5">
      {assignable.map((n) => {
        const on = value.includes(n.to)
        return (
          <button key={n.to} type="button" onClick={() => toggle(n.to)}
            className={cn('rounded-full border px-3 py-1 text-xs transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent')}>
            {t(n.labelKey)}
          </button>
        )
      })}
    </div>
  )
}

export default function Users() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [rows, setRows] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [pwUser, setPwUser] = useState<Profile | null>(null)

  const createForm = useForm<any>()
  const editForm = useForm<any>()
  const [newPw, setNewPw] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setRows((data as Profile[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function invoke(action: string, payload: any) {
    const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, ...payload } })
    if (error || data?.error) throw new Error(data?.error ?? error?.message)
    return data
  }

  async function onCreate(v: any) {
    try {
      // Admin API via Edge Function: no email sent, no verification, no rate limit.
      const res = await invoke('create', {
        email: v.email, password: v.password, full_name: v.full_name,
        role: v.role, can_view_finance: v.can_view_finance,
      })
      if (res?.id) {
        await supabase.from('profiles').update({
          full_name: v.full_name, role: v.role,
          can_view_finance: !!v.can_view_finance, allowed_menus: v.allowed_menus ?? [],
        }).eq('id', res.id)
      }
      toast({ title: t('saved') }); setCreateOpen(false); createForm.reset(); load()
    } catch (e: any) {
      toast({ title: t('error'), description: e.message, variant: 'error' })
    }
  }

  async function onEdit(v: any) {
    if (!editUser) return
    const { error } = await supabase.from('profiles').update({
      full_name: v.full_name, phone: v.phone || null, role: v.role,
      can_view_finance: v.can_view_finance, is_active: v.is_active,
      allowed_menus: v.allowed_menus ?? [],
    }).eq('id', editUser.id)
    if (error) return toast({ title: t('error'), description: error.message, variant: 'error' })
    toast({ title: t('saved') }); setEditUser(null); load()
  }

  async function onResetPw() {
    if (!pwUser) return
    try {
      await invoke('reset_password', { user_id: pwUser.id, password: newPw })
      toast({ title: t('saved') }); setPwUser(null); setNewPw('')
    } catch (e: any) {
      toast({ title: t('error'), description: e.message, variant: 'error' })
    }
  }

  function openEdit(u: Profile) {
    setEditUser(u)
    editForm.reset({ full_name: u.full_name, phone: u.phone ?? '', role: u.role, can_view_finance: u.can_view_finance, is_active: u.is_active, allowed_menus: u.allowed_menus ?? [] })
  }

  const columns: ColumnDef<Profile, unknown>[] = [
    { accessorKey: 'full_name', header: t('name'), cell: ({ row }) => row.original.full_name || '-' },
    { accessorKey: 'email', header: t('email') },
    { accessorKey: 'role', header: t('role'), cell: ({ row }) => <Badge variant={row.original.role === 'owner' ? 'default' : 'secondary'}>{row.original.role === 'owner' ? t('owner') : t('employee')}</Badge> },
    { accessorKey: 'can_view_finance', header: t('finance_access'), cell: ({ row }) => row.original.can_view_finance ? '✓' : '—' },
    { accessorKey: 'is_active', header: t('status'), cell: ({ row }) => <Badge variant={row.original.is_active ? 'success' : 'destructive'}>{row.original.is_active ? t('active') : t('inactive')}</Badge> },
    {
      id: 'actions', header: t('actions'),
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setPwUser(row.original)}><KeyRound className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={t('users')} icon={<UsersIcon className="h-5 w-5" />}
        actions={<Button onClick={() => { createForm.reset({ role: 'employee', can_view_finance: false, allowed_menus: ['/raw-materials'] }); setCreateOpen(true) }}><Plus className="h-4 w-4" />{t('create_user')}</Button>} />
      <Card><CardContent className="p-4"><DataTable columns={columns} data={rows} loading={loading} /></CardContent></Card>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('create_user')}</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-1"><Label>{t('name')}</Label><Input {...createForm.register('full_name', { required: true })} /></div>
            <div className="space-y-1"><Label>{t('email')}</Label><Input type="email" {...createForm.register('email', { required: true })} /></div>
            <div className="space-y-1"><Label>{t('password')}</Label><Input type="text" {...createForm.register('password', { required: true, minLength: 6 })} /></div>
            <div className="space-y-1"><Label>{t('role')}</Label>
              <Select value={createForm.watch('role')} onValueChange={(v) => createForm.setValue('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="owner">{t('owner')}</SelectItem><SelectItem value="employee">{t('employee')}</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3"><Switch checked={createForm.watch('can_view_finance')} onCheckedChange={(c) => createForm.setValue('can_view_finance', c)} /><Label>{t('finance_access')}</Label></div>
            <div className="space-y-1.5">
              <Label>{t('menu_access')}</Label>
              <p className="text-[11px] text-muted-foreground">{t('menu_access_hint')}</p>
              <MenuChips value={createForm.watch('allowed_menus') ?? []} onChange={(v) => createForm.setValue('allowed_menus', v)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t('cancel')}</Button>
              <Button type="submit">{t('save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('edit')} · {editUser?.email}</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
            <div className="space-y-1"><Label>{t('name')}</Label><Input {...editForm.register('full_name')} /></div>
            <div className="space-y-1"><Label>{t('phone')}</Label><Input {...editForm.register('phone')} /></div>
            <div className="space-y-1"><Label>{t('role')}</Label>
              <Select value={editForm.watch('role')} onValueChange={(v) => editForm.setValue('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="owner">{t('owner')}</SelectItem><SelectItem value="employee">{t('employee')}</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3"><Switch checked={editForm.watch('can_view_finance')} onCheckedChange={(c) => editForm.setValue('can_view_finance', c)} /><Label>{t('finance_access')}</Label></div>
            <div className="flex items-center gap-3"><Switch checked={editForm.watch('is_active')} onCheckedChange={(c) => editForm.setValue('is_active', c)} /><Label>{t('active')}</Label></div>
            <div className="space-y-1.5">
              <Label>{t('menu_access')}</Label>
              <p className="text-[11px] text-muted-foreground">{t('menu_access_hint')}</p>
              <MenuChips value={editForm.watch('allowed_menus') ?? []} onChange={(v) => editForm.setValue('allowed_menus', v)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>{t('cancel')}</Button>
              <Button type="submit">{t('save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('reset_password')}</DialogTitle></DialogHeader>
          <div className="space-y-1"><Label>{t('password')}</Label><Input type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwUser(null)}>{t('cancel')}</Button>
            <Button onClick={onResetPw} disabled={newPw.length < 6}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
