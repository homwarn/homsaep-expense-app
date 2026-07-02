import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Loader2, Moon, Sun, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-background to-background p-4 dark:from-orange-950/20">
      <div className="absolute right-4 top-4 flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => setLang(lang === 'lo' ? 'en' : 'lo')}>
          <Languages className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <img src="/logo.svg" alt="logo" className="mb-4 h-16 w-16" />
            <h1 className="text-2xl font-bold">{t('welcome_back')}</h1>
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('login')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
