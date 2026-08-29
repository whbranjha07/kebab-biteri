'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, Globe, Moon, Sun, Download, Trash2, LogOut, Bell, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme-provider'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex min-h-dvh flex-col bg-[#FFFDF2] dark:bg-zinc-950 dark:text-white">
      <header className="safe-top sticky top-0 lg:top-[65px] z-20 bg-white/95 dark:bg-zinc-900/95 px-4 pb-3 pt-3 backdrop-blur-lg border-b border-amber-200 dark:border-zinc-800 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="touch-target -ml-2 flex items-center justify-center rounded-full">
              <ChevronLeft className="h-6 w-6 text-zinc-950 dark:text-white" />
            </Link>
            <h1 className="font-sans text-xl font-black text-zinc-950 dark:text-white">{t('profile.settings')}</h1>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-6 pb-28">
        {/* Language */}
        <div>
          <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-[#D99F16]">{t('profile.language')}</h2>
          <div className="overflow-hidden rounded-3xl border border-amber-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-amber-100 dark:border-zinc-800">
              <Globe className="h-5 w-5 text-[#D99F16]" />
              <span className="flex-1 text-sm font-black text-zinc-950 dark:text-white">App Language / Idioma</span>
            </div>
            <div className="flex p-2 gap-2">
              <button
                onClick={() => {
                  setLocale('es-ES')
                  toast.success('Idioma cambiado a Español 🇪🇸')
                }}
                className={cn(
                  'flex-1 py-2.5 rounded-2xl text-xs font-black transition-all',
                  locale === 'es-ES' ? 'bg-[#F4BE2C] text-zinc-950 shadow-sm' : 'bg-amber-50/50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
                )}
              >
                🇪🇸 Español
              </button>
              <button
                onClick={() => {
                  setLocale('en-US')
                  toast.success('Language switched to English 🇬🇧')
                }}
                className={cn(
                  'flex-1 py-2.5 rounded-2xl text-xs font-black transition-all',
                  locale === 'en-US' ? 'bg-[#F4BE2C] text-zinc-950 shadow-sm' : 'bg-amber-50/50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
                )}
              >
                🇬🇧 English
              </button>
            </div>
          </div>
        </div>

        {/* Appearance Mode */}
        <div>
          <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-[#D99F16]">{t('theme.title') || 'Appearance'}</h2>
          <div className="overflow-hidden rounded-3xl border border-amber-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setTheme('light')
                  toast.success('Light Mode activated ☀️')
                }}
                className={cn(
                  'flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-black transition-all',
                  theme === 'light' ? 'bg-[#F4BE2C] text-zinc-950 shadow-sm' : 'bg-amber-50/50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
                )}
              >
                <Sun className="h-4 w-4 text-amber-700" /> Light Mode ☀️
              </button>
              <button
                onClick={() => {
                  setTheme('dark')
                  toast.success('Dark Mode activated 🌙')
                }}
                className={cn(
                  'flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-black transition-all',
                  theme === 'dark' ? 'bg-zinc-950 text-[#F4BE2C] shadow-sm border border-amber-300' : 'bg-amber-50/50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
                )}
              >
                <Moon className="h-4 w-4 text-[#F4BE2C]" /> Dark Mode 🌙
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Shortcut */}
        <div>
          <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-[#D99F16]">{t('profile.notifications')}</h2>
          <div className="overflow-hidden rounded-3xl border border-amber-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <Link href="/profile/notifications" className="flex items-center gap-3 px-4 py-3.5">
              <Bell className="h-5 w-5 text-[#D99F16]" />
              <span className="flex-1 text-sm font-black text-zinc-950 dark:text-white">Notification Preferences</span>
              <ChevronRight className="h-5 w-5 text-amber-400" />
            </Link>
          </div>
        </div>

        {/* Data & Privacy */}
        <div>
          <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-[#D99F16]">Data & Privacy (GDPR)</h2>
          <div className="overflow-hidden rounded-3xl border border-amber-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <Link href="/profile/privacy" className="flex items-center gap-3 px-4 py-3.5 border-b border-amber-100 dark:border-zinc-800">
              <Download className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              <span className="flex-1 text-sm font-bold text-zinc-950 dark:text-white">Export My Personal Data</span>
              <ChevronRight className="h-5 w-5 text-amber-400" />
            </Link>
            <button
              onClick={() => toast.info('Account deletion request submitted. Will be processed within 30 days.')}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-red-600"
            >
              <Trash2 className="h-5 w-5" />
              <span className="flex-1 text-left text-sm font-black">Delete Account</span>
              <ChevronRight className="h-5 w-5 text-amber-400" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400 font-medium">Kebab Biteri v0.1.0 · Errenteria, Gipuzkoa</p>
      </div>
    </div>
  )
}
