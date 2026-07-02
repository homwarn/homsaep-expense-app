import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { navItems } from './nav'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isOwner, canViewFinance } = useAuth()
  const { t } = useI18n()

  const visible = navItems.filter((item) => {
    if (item.ownerOnly && !isOwner) return false
    if (item.financeOnly && !canViewFinance) return false
    return true
  })

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b px-5">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="logo" className="h-9 w-9" />
            <div className="leading-tight">
              <p className="text-sm font-bold">ຫອມແຊບ</p>
              <p className="text-[10px] text-muted-foreground">Expense Manager</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-4 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} ຮ້ານບຸບເຟ້ ຫອມແຊບ
        </div>
      </aside>
    </>
  )
}
