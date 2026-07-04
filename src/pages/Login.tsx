import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Loader2, Moon, Sun, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/common/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'
import { useTheme } from '@/contexts/ThemeContext'

interface FormValues {
  email: string
  password: string
}

export default function Login() {
  const { session, signIn } = useAuth()
  const { t, lang, setLang } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>()

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (values: FormValues) => {
    setError(null)
    const { error } = await signIn(values.email, values.password)
    if (error) setError(error)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4 flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => setLang(lang === 'lo' ? 'en' : 'lo')}>
          <Languages className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      <div className="glass-strong w-full max-w-md animate-scale-in rounded-3xl p-8 sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 ring-1 ring-primary/25 shadow-glow">
            <Logo className="h-16 w-16" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="brand-gradient">ຮ້ານບຸບເຟ້ ຫອມແຊບ</span>
          </h1>
          <p className="mt-1 text-lg font-semibold">{t('welcome_back')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('sign_in_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="owner@homsaep.la" {...register('email', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register('password', { required: true })} />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('login')}
          </Button>
        </form>
      </div>
    </div>
  )
}
