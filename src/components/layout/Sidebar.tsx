import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { navItems } from './nav'
import { Logo } from '@/components/common/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'

// menus a non-owner sees by default when no explicit permissions are set
const DEFAULT_EMPLOYEE_MENUS = ['/raw-materials', '/drinks', '/expenses', '/master-data']

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isOwner, profile } = useAuth()
  const { t } = useI18n()

  const allowed = profile?.allowed_menus?.length ? profile.allowed_menus : DEFAULT_EMPLOYEE_MENUS

  const visible = navItems.filter((item) => {
    if (item.ownerOnly) return isOwner
    if (isOwner) return true
    return allowed.includes(item.to)
  })

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 m-0 flex w-72 flex-col transition-transform lg:static lg:m-3 lg:h-[calc(100vh-1.5rem)] lg:w-64 lg:rounded-3xl',
          'glass-strong',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-20 items-center justify-between gap-2 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-primary/15 ring-1 ring-primary/20">
              <Logo className="h-9 w-9" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight">ຫອມແຊບ</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Expense Manager</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-[18px] w-[18px] transition-transform group-hover:scale-110', isActive && 'scale-110')} />
                  {t(item.labelKey)}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} ຮ້ານບຸບເຟ້ ຫອມແຊບ
        </div>
      </aside>
    </>
  )
}
