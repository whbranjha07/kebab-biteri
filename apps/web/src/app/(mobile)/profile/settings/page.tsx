'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, Globe, Moon, Download, Trash2, LogOut, Bell, BellOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { useI18n } from '@/lib/i18n'
import { useFcm } from '@/hooks/use-fcm'
import { useAuth } from '@/hooks/use-auth'

export default function SettingsPage() {
  const { locale, setLocale } = useI18n()
  const [darkMode, setDarkMode] = useState(false)
  const { user } = useAuth()
  const fcm = useFcm()

  const handleEnableNotifications = async () => {
    if (!user) {
      toast.info(locale === 'es-ES' ? 'Inicia sesión para activar las notificaciones' : 'Please log in to enable notifications')
      return
    }
    const ok = await fcm.enable()
    if (ok) {
      toast.success(locale === 'es-ES' ? 'Notificaciones activadas 🔔' : 'Notifications enabled 🔔')
    } else if (fcm.error) {
      toast.error(fcm.error)
    }
  }

  const handleDisableNotifications = async () => {
    const ok = await fcm.disable()
    if (ok) {
      toast.success(locale === 'es-ES' ? 'Notificaciones desactivadas 🔕' : 'Notifications disabled 🔕')
    } else if (fcm.error) {
      toast.error(fcm.error)
    }
  }

  const notifStatusText = () => {
    if (!fcm.supported) return locale === 'es-ES' ? 'No compatible' : 'Not supported'
    if (!fcm.configured) return locale === 'es-ES' ? 'No configurado' : 'Not configured'
    if (fcm.permission === 'denied') return locale === 'es-ES' ? 'Bloqueado en el navegador' : 'Blocked in browser'
    if (fcm.enabled) return locale === 'es-ES' ? 'Activadas' : 'Enabled'
    return locale === 'es-ES' ? 'Desactivadas' : 'Disabled'
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-top sticky top-0 z-20 bg-surface/95 px-4 pb-3 pt-3 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="touch-target -ml-2 flex items-center justify-center rounded-full">
            <ChevronLeft className="h-6 w-6 text-charcoal" />
          </Link>
          <h1 className="font-display text-xl font-extrabold text-charcoal">
            {locale === 'es-ES' ? 'Ajustes' : 'Settings'}
          </h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-6">
        {/* Language */}
        <div>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-subtle">
            {locale === 'es-ES' ? 'Idioma' : 'Language'}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Globe className="h-5 w-5 text-muted" />
              <span className="flex-1 text-sm font-medium text-charcoal">
                {locale === 'es-ES' ? 'Idioma de la app' : 'App language'}
              </span>
            </div>
            <div className="flex">
              <button
                onClick={() => setLocale('es-ES')}
                className={cn(
                  'flex-1 py-3 text-sm font-semibold',
                  locale === 'es-ES' ? 'bg-primary text-white' : 'text-muted',
                )}
              >
                🇪🇸 Spanish
              </button>
              <div className="w-px bg-border" />
              <button
                onClick={() => setLocale('en-US')}
                className={cn(
                  'flex-1 py-3 text-sm font-semibold',
                  locale === 'en-US' ? 'bg-primary text-white' : 'text-muted',
                )}
              >
                🇬🇧 English
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-subtle">
            {locale === 'es-ES' ? 'Notificaciones' : 'Notifications'}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center gap-3 px-4 py-3.5">
              {fcm.enabled ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted" />
              )}
              <div className="flex-1">
                <span className="block text-sm font-medium text-charcoal">
                  {locale === 'es-ES' ? 'Notificaciones Push' : 'Push Notifications'}
                </span>
                <span className="block text-xs text-subtle">{notifStatusText()}</span>
              </div>
              {fcm.loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted" />
              ) : (
                <button
                  onClick={fcm.enabled ? handleDisableNotifications : handleEnableNotifications}
                  disabled={!fcm.supported || !fcm.configured || fcm.permission === 'denied'}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    fcm.enabled ? 'bg-primary' : 'bg-border',
                    (!fcm.supported || !fcm.configured || fcm.permission === 'denied') && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    fcm.enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
                  )} />
                </button>
              )}
            </div>
            {!fcm.supported && (
              <div className="px-4 py-2.5 border-t border-border bg-amber-50/50">
                <p className="text-xs text-muted">
                  {locale === 'es-ES'
                    ? 'Tu navegador no soporta notificaciones push.'
                    : 'Your browser does not support push notifications.'}
                </p>
              </div>
            )}
            {fcm.supported && !fcm.configured && (
              <div className="px-4 py-2.5 border-t border-border bg-amber-50/50">
                <p className="text-xs text-muted">
                  {locale === 'es-ES'
                    ? 'Firebase no está configurado. Añade las variables de entorno.'
                    : 'Firebase is not configured. Add the environment variables.'}
                </p>
              </div>
            )}
            {fcm.permission === 'denied' && (
              <div className="px-4 py-2.5 border-t border-border bg-red-50/50">
                <p className="text-xs text-danger">
                  {locale === 'es-ES'
                    ? 'Las notificaciones están bloqueadas. Actívalas en la configuración de tu navegador.'
                    : 'Notifications are blocked. Enable them in your browser settings.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Appearance */}
        <div>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-subtle">
            {locale === 'es-ES' ? 'Apariencia' : 'Appearance'}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Moon className="h-5 w-5 text-muted" />
              <span className="flex-1 text-sm font-medium text-charcoal">
                {locale === 'es-ES' ? 'Modo oscuro' : 'Dark mode'}
              </span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  darkMode ? 'bg-primary' : 'bg-border',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  darkMode ? 'translate-x-[22px]' : 'translate-x-0.5',
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-subtle">
            {locale === 'es-ES' ? 'Datos y privacidad (GDPR)' : 'Data & privacy (GDPR)'}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <Link href="/profile/privacy" className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Download className="h-5 w-5 text-muted" />
              <span className="flex-1 text-sm font-medium text-charcoal">
                {locale === 'es-ES' ? 'Exportar mis datos' : 'Export my data'}
              </span>
              <ChevronRight className="h-5 w-5 text-subtle" />
            </Link>
            <button
              onClick={() => toast.info(locale === 'es-ES' ? 'Solicitud de eliminación enviada. Se procesará en 30 días.' : 'Deletion request sent. Will be processed in 30 days.')}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-danger"
            >
              <Trash2 className="h-5 w-5" />
              <span className="flex-1 text-left text-sm font-medium">
                {locale === 'es-ES' ? 'Eliminar mi cuenta' : 'Remove my account'}
              </span>
              <ChevronRight className="h-5 w-5 text-subtle" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <Button variant="outline" fullWidth onClick={() => toast.info(locale === 'es-ES' ? 'Sesión cerrada' : 'Logged out')}>
          <LogOut className="h-5 w-5" />
          {locale === 'es-ES' ? 'Cerrar sesión' : 'Log out'}
        </Button>

        <p className="text-center text-xs text-subtle">Kebab Biteri v0.1.0</p>
      </div>
    </div>
  )


}
