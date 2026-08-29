'use client'

import { type ReactNode } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { SplashScreen } from '@/components/splash-screen'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <SplashScreen />
      {children}
      <Toaster />
    </>
  )
}
