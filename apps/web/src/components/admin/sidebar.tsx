'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Package, ChefHat, UtensilsCrossed,
  BarChart3, Settings, Menu as MenuIcon, X, Truck,
  Printer, Receipt, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoMark } from '@/components/logo'
import { useAuth } from '@/hooks/use-auth'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/billing', label: 'Billing / POS', icon: Printer },
  { href: '/admin/billing/history', label: 'Billing History', icon: Receipt },
  { href: '/admin/orders', label: 'Orders', icon: Package },
  { href: '/admin/kitchen', label: 'Kitchen', icon: ChefHat },
  { href: '/admin/delivery', label: 'Delivery', icon: Truck },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href))

  const handleLogout = async () => {
    if (!confirm('Log out of admin?')) return
    try {
      await logout()
    } finally {
      setMobileOpen(false)
      router.push('/admin/login')
    }
  }

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-amber-200/60 bg-[#F4BE2C] px-6">
        <LogoMark size="sm" />
        <span className="font-sans text-lg font-black italic tracking-tight text-zinc-950">Kebab Biteri</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all',
                active ? 'bg-[#F4BE2C] text-zinc-950 shadow-sm' : 'text-zinc-600 hover:bg-amber-50 hover:text-zinc-900',
              )}>
              <Icon className={cn("h-5 w-5 shrink-0", active ? "text-zinc-950" : "text-zinc-500")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        {user && (
          <div className="mb-2 px-2 py-1.5">
            <p className="truncate text-xs font-semibold text-charcoal">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-[11px] text-muted">{user.email ?? user.phone ?? user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-danger transition-colors hover:bg-danger/10"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Log out
        </button>
      </div>
    </>
  )

  return (
    <>
      <div className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <LogoMark size="sm" />
          <span className="font-display text-base font-bold text-charcoal">Kebab Biteri</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border" aria-label="Toggle menu">
          {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-charcoal-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-surface">{sidebarContent}</aside>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-surface lg:flex lg:flex-col">
        {sidebarContent}
      </aside>
    </>
  )
}
