import { useEffect, useState } from 'react'
import { Bell, Menu, Moon, Search, Sun, LogOut, Languages, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GlobalSearch } from '@/components/common/GlobalSearch'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'
import { useNotifications } from '@/hooks/useNotifications'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggleTheme } = useTheme()
  const { profile, signOut } = useAuth()
  const { t, lang, setLang } = useI18n()
  const notifications = useNotifications()
  const [searchOpen, setSearchOpen] = useState(false)

  // Keyboard shortcut: Ctrl/Cmd + K opens global search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </Button>

      <button
        onClick={() => setSearchOpen(true)}
        className="flex h-10 flex-1 max-w-md items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground hover:bg-muted"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">{t('search_everything')}</span>
        <kbd className="hidden rounded border bg-background px-1.5 text-[10px] sm:inline">⌘K</kbd>
      </button>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setLang(lang === 'lo' ? 'en' : 'lo')} title="Language">
          <Languages className="h-5 w-5" />
          <span className="ml-0.5 text-xs font-semibold uppercase">{lang}</span>
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Theme">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>{t('notifications')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">{t('no_data')}</p>
            ) : (
              notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="flex-col items-start">
                  <span className="text-sm">{lang === 'lo' ? n.titleLo : n.titleEn}</span>
                  <Badge variant={n.variant === 'error' ? 'destructive' : 'warning'} className="mt-1">
                    {n.variant}
                  </Badge>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <UserCircle className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span>{profile?.full_name || profile?.email}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {profile?.role === 'owner' ? t('owner') : t('employee')}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="h-4 w-4" />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}
