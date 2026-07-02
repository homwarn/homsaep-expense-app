import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'
import { Loader2, ShieldAlert } from 'lucide-react'

export function ProtectedRoute({
  children,
  requireOwner,
  requireFinance,
}: {
  children: ReactNode
  requireOwner?: boolean
  requireFinance?: boolean
}) {
  const { session, profile, loading, isOwner, canViewFinance } = useAuth()
  const { t } = useI18n()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (profile && !profile.is_active) return <Navigate to="/login" replace />

  const denied = (requireOwner && !isOwner) || (requireFinance && !canViewFinance)
  if (denied) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-semibold">{t('no_access')}</p>
      </div>
    )
  }

  return <>{children}</>
}
