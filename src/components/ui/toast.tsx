import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'info'
interface Toast {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}
interface ToastCtx {
  toast: (t: { title: string; description?: string; variant?: ToastVariant }) => void
}

const Ctx = createContext<ToastCtx | undefined>(undefined)

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  error: <XCircle className="h-5 w-5 text-destructive" />,
  info: <Info className="h-5 w-5 text-primary" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))

  const toast = useCallback<ToastCtx['toast']>(({ title, description, variant = 'success' }) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, title, description, variant }])
    setTimeout(() => remove(id), 3500)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'animate-fade-in flex items-start gap-3 rounded-xl border bg-card p-4 shadow-lg',
            )}
          >
            {icons[t.variant]}
            <div className="flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && (
                <p className="text-xs text-muted-foreground">{t.description}</p>
              )}
            </div>
            <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
