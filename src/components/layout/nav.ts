import {
  LayoutDashboard, ShoppingCart, CupSoda, Receipt, TrendingUp,
  PieChart, LineChart, FileText, Users, Settings, type LucideIcon,
} from 'lucide-react'
import type { TranslationKey } from '@/i18n/translations'

export interface NavItem {
  to: string
  labelKey: TranslationKey
  icon: LucideIcon
  ownerOnly?: boolean
  financeOnly?: boolean // requires owner or can_view_finance
}

export const navItems: NavItem[] = [
  { to: '/', labelKey: 'dashboard', icon: LayoutDashboard, financeOnly: true },
  { to: '/raw-materials', labelKey: 'raw_materials', icon: ShoppingCart },
  { to: '/drinks', labelKey: 'drinks', icon: CupSoda },
  { to: '/expenses', labelKey: 'other_expenses', icon: Receipt },
  { to: '/revenue', labelKey: 'revenue', icon: TrendingUp, financeOnly: true },
  { to: '/expense-summary', labelKey: 'expense_summary', icon: PieChart, financeOnly: true },
  { to: '/profit-summary', labelKey: 'profit_summary', icon: LineChart, financeOnly: true },
  { to: '/reports', labelKey: 'reports', icon: FileText, financeOnly: true },
  { to: '/users', labelKey: 'users', icon: Users, ownerOnly: true },
  { to: '/settings', labelKey: 'settings', icon: Settings, ownerOnly: true },
]
