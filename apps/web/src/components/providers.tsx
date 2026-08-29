'use client'

import { type ReactNode } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { SplashScreen } from '@/components/splash-screen'
import { ThemeProvider } from '@/lib/theme-provider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SplashScreen />
      {children}
      <Toaster />
    </ThemeProvider>
  )
}
