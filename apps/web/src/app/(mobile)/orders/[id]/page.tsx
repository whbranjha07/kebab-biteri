'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Check, Clock, Truck, Package, Home, AlertCircle, Store, MapPin,
  Phone, LogIn, Share2, Printer, QrCode, RefreshCw, Sparkles, ShieldCheck, ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice, formatTime, cn } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { useOrder, cancelOrder } from '@/hooks/use-orders'
import { getAccessToken } from '@/lib/api-client'
import { useCartStore } from '@/lib/cart-store'
import type { CartItem } from '@kebab-biteri/types'
import { restaurantInfo } from '@/data/menu-data'
import { TrackingMap } from '@/components/order/tracking-map'
import { useI18n } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/language-switcher'

const timeline = [
  { status: 'PENDING', label: 'Order Placed', desc: 'Received by kitchen', icon: Package },
  { status: 'ACCEPTED', label: 'Order Confirmed', desc: 'Kitchen accepted', icon: Check },
  { status: 'PREPARING', label: 'In Preparation', desc: 'Cooking your order', icon: Clock },
  { status: 'READY', label: 'Ready', desc: 'Packed & ready', icon: Check },
  { status: 'OUT_FOR_DELIVERY', label: 'On The Way', desc: 'Courier on route', icon: Truck },
  { status: 'DELIVERED', label: 'Delivered', desc: 'Enjoy your food!', icon: Home },
]

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { order, loading, error } = useOrder(params.id)
  const addItem = useCartStore((s) => s.addItem)
  const { t, locale } = useI18n()

  const [mounted, setMounted] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsLoggedIn(!!getAccessToken())
  }, [])

  if (!mounted || loading) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#FFFDF2]">
        <header className="safe-top sticky top-0 lg:top-[65px] z-20 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-lg border-b border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/orders" className="touch-target -ml-2 flex items-center justify-center rounded-full">
                <ChevronLeft className="h-6 w-6 text-zinc-950" />
              </Link>
              <h1 className="font-sans text-xl font-black text-zinc-950">Receipt #{params.id?.slice(-6)}</h1>
            </div>
            <LanguageSwitcher />
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#F4BE2C] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#FFFDF2]">
        <header className="safe-top sticky top-0 lg:top-[65px] z-20 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-lg border-b border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/orders" className="touch-target -ml-2 flex items-center justify-center rounded-full">
                <ChevronLeft className="h-6 w-6 text-zinc-950" />
              </Link>
              <h1 className="font-sans text-xl font-black text-zinc-950">{t('orders.title')}</h1>
            </div>
            <LanguageSwitcher />
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F4BE2C]/20 border border-amber-300">
            <LogIn className="h-10 w-10 text-[#D99F16]" />
          </div>
          <p className="mt-4 text-xl font-black text-zinc-950">{t('orders.loginRequired')}</p>
          <p className="mt-1 text-xs font-semibold text-zinc-500">{t('orders.loginPrompt')}</p>
          <Link href="/profile/login" className="mt-6">
            <Button size="lg" className="font-black">{t('orders.loginBtn')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#FFFDF2] items-center justify-center px-6 text-center">
        <AlertCircle className="h-12 w-12 text-[#E50909]" />
        <p className="mt-4 text-xl font-black text-zinc-950">Could not load receipt</p>
        <p className="mt-1 text-xs font-semibold text-zinc-500">Please check your connection and try again</p>
        <Link href="/orders" className="mt-6"><Button variant="outline" className="font-black">View All Orders</Button></Link>
      </div>
    )
  }

  const isCancelled = order.status === 'CANCELLED'
  const isDelivery = order.orderType === 'DELIVERY'
  const activeStep = isCancelled ? -1 : timeline.findIndex((t) => t.status === order.status)
  const eta = order.estimatedDeliveryAt
    ? new Date(order.estimatedDeliveryAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '25-35 min'

  const handleCancel = async () => {
    if (order.status !== 'PENDING' && order.status !== 'ACCEPTED') {
      toast.error('Cannot cancel order in preparation')
      return
    }
    try {
      await cancelOrder(order._id)
      toast.success('Order cancelled')
      router.push('/orders')
    } catch (e: any) {
      toast.error(e.message || 'Could not cancel order')
    }
  }

  const handleOrderAgain = () => {
    if (!order || !order.items) return
    for (const item of order.items) {
      const cartItem: CartItem = {
        id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productId: item.productId,
        productName: item.productName,
        productImage: '/images/menu/kebab_pita_real.jpg',
        variantId: (item as any).variantId ?? null,
        variantName: item.variantName ?? null,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        modifiers: [],
        lineTotal: item.lineTotal,
        notes: item.notes ?? null,
      }
      addItem(cartItem)
    }
    toast.success('🎉 Order items added to cart! Proceeding to checkout...')
    router.push('/checkout')
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt #${order.orderNumber} - Kebab Biteri`,
          text: `My Kebab Biteri order #${order.orderNumber} total: ${formatPrice(order.total)}`,
          url: window.location.href,
        })
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Receipt link copied to clipboard!')
    }
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#FFFDF2]">
      {/* Header */}
      <header className="safe-top sticky top-0 lg:top-[65px] z-20 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-lg border-b border-amber-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/orders" className="touch-target -ml-2 flex items-center justify-center rounded-full">
              <ChevronLeft className="h-6 w-6 text-zinc-950" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans text-xl font-black text-zinc-950">Receipt #{order.orderNumber}</h1>
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                  isCancelled ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                )}>
                  {isCancelled ? 'CANCELLED' : order.status}
                </span>
              </div>
              <p className="text-xs font-semibold text-zinc-500">{formatTime(order.placedAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-zinc-800 border border-amber-200 active:scale-95 transition-all hover:bg-amber-100"
              title="Share Receipt"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={handlePrint}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-zinc-800 border border-amber-200 active:scale-95 transition-all hover:bg-amber-100"
              title="Print Receipt"
            >
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-44 space-y-5">
        {/* Estimated Time Banner */}
        {!isCancelled && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#F4BE2C] via-amber-400 to-amber-300 p-5 shadow-md border border-amber-400 text-zinc-950">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-black text-[#F4BE2C] shadow-xs">
                  <Clock className="h-3 w-3 animate-spin" /> ESTIMATED TIME
                </span>
                <p className="mt-2 text-xs font-bold text-zinc-800">
                  {isDelivery ? '🛵 Delivery arrival time' : '🏪 In-store pickup time'}
                </p>
                <p className="font-sans text-3xl font-black text-zinc-950 tracking-tight mt-0.5">{eta}</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-950 text-[#F4BE2C] shadow-lg">
                {isDelivery ? <Truck className="h-8 w-8" /> : <Store className="h-8 w-8" />}
              </div>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="rounded-3xl bg-red-50 p-5 border border-red-200 text-center space-y-2">
            <AlertCircle className="mx-auto h-10 w-10 text-[#E50909]" />
            <h2 className="text-lg font-black text-zinc-950">Order Cancelled</h2>
            <p className="text-xs font-semibold text-zinc-600">This order was cancelled. If you were charged, your refund will process automatically.</p>
          </div>
        )}

        {/* Live Tracking Map */}
        {order.deliveryAddress && (
          <TrackingMap
            deliveryAddress={order.deliveryAddress}
            status={order.status}
            orderType={order.orderType}
          />
        )}

        {/* Live Order Timeline */}
        <div className="rounded-3xl bg-white p-5 border border-amber-200 shadow-sm space-y-4">
          <h2 className="font-sans text-base font-black text-zinc-950 flex items-center justify-between">
            <span>Live Order Progress</span>
            <span className="text-xs font-bold text-[#D99F16]">Step {Math.max(1, activeStep + 1)} of {timeline.length}</span>
          </h2>
          <div className="relative">
            {timeline.map((step, i) => {
              const Icon = step.icon
              const reached = !isCancelled && i <= activeStep
              const isCurrent = !isCancelled && i === activeStep
              const tsField = `${step.status.toLowerCase()}At` as keyof typeof order
              const timestamp = order[tsField] as string | null
              return (
                <div key={step.status} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 shadow-xs',
                      reached ? 'bg-[#F4BE2C] text-zinc-950 font-black' : 'bg-amber-100/60 text-zinc-400',
                      isCurrent && 'ring-4 ring-[#F4BE2C]/40 scale-110 bg-[#F4BE2C]',
                    )}>
                      <Icon className="h-4 w-4 stroke-[2.5]" />
                    </div>
                    {i < timeline.length - 1 && (
                      <div className={cn('my-1 w-0.5 flex-1 min-h-7 rounded-full', !isCancelled && i < activeStep ? 'bg-[#F4BE2C]' : 'bg-amber-100')} />
                    )}
                  </div>
                  <div className="pb-5 flex-1 flex justify-between items-start">
                    <div>
                      <p className={cn('text-sm font-black tracking-tight', reached ? 'text-zinc-950' : 'text-zinc-400', isCurrent && 'text-[#D99F16]')}>
                        {step.label}
                      </p>
                      <p className="text-xs text-zinc-500 font-medium">{step.desc}</p>
                    </div>
                    {timestamp && (
                      <span className="text-[11px] font-bold text-zinc-500 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {formatTime(timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Digital Tax Invoice Receipt Ticket */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-amber-300 shadow-lg p-6 space-y-4">
          {/* Top Zigzag cut simulation bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-300 via-[#F4BE2C] to-amber-300" />
          
          <div className="flex items-center justify-between border-b border-dashed border-amber-300 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D99F16]">{restaurantInfo.name}</span>
              <h2 className="font-sans text-xl font-black text-zinc-950">OFFICIAL RECEIPT</h2>
              <p className="text-xs font-semibold text-zinc-500">Order #{order.orderNumber}</p>
            </div>
            <div className="flex flex-col items-end">
              <QrCode className="h-10 w-10 text-zinc-800" />
              <span className="text-[9px] font-mono text-zinc-400 mt-1">KB-{order.orderNumber}</span>
            </div>
          </div>

          {/* Customer / Order Info */}
          <div className="grid grid-cols-2 gap-3 text-xs border-b border-amber-100 pb-3">
            <div>
              <span className="text-zinc-500 font-medium">Order Type:</span>
              <p className="font-black text-zinc-950 mt-0.5">{isDelivery ? '🛵 Home Delivery' : '🏪 In-Store Pickup'}</p>
            </div>
            <div>
              <span className="text-zinc-500 font-medium">Payment Method:</span>
              <p className="font-black text-zinc-950 mt-0.5">
                {order.paymentMethod === 'CASH' ? '💵 Cash on delivery' : order.paymentMethod === 'CARD' ? '💳 Card on delivery' : order.paymentMethod ?? 'Card'}
              </p>
            </div>
            {isDelivery && order.deliveryAddress && (
              <div className="col-span-2">
                <span className="text-zinc-500 font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[#E50909]" /> Delivery Address:
                </span>
                <p className="font-bold text-zinc-950 mt-0.5">{order.deliveryAddress}</p>
              </div>
            )}
          </div>

          {/* Itemized list */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2">Itemized Summary</h3>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between text-xs py-1.5 border-b border-amber-50">
                  <div>
                    <span className="font-black text-zinc-950">{item.quantity}×</span>{' '}
                    <span className="font-bold text-zinc-900">{item.productName}</span>
                    {item.variantName && <span className="text-zinc-500 font-semibold text-[11px]"> ({item.variantName})</span>}
                  </div>
                  <span className="font-black text-zinc-950 shrink-0">{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="border-t border-amber-300 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between font-semibold text-zinc-600">
              <span>Food Subtotal</span>
              <span className="font-bold text-zinc-950">{formatPrice(order.subtotal)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between font-semibold text-zinc-600">
                <span>Delivery Fee</span>
                <span className="font-bold text-zinc-950">+{formatPrice(order.deliveryFee)}</span>
              </div>
            )}
            <div className="border-t border-amber-200 pt-2 flex justify-between items-center text-sm">
              <span className="font-black text-zinc-950 text-base">TOTAL PAID</span>
              <span className="font-sans text-2xl font-black text-zinc-950">{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Verified Badge */}
          <div className="rounded-2xl bg-amber-50 p-3 border border-amber-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span>Verified Restaurant Purchase</span>
            </div>
            <span className="text-[11px] font-bold text-zinc-500">{formatTime(order.placedAt)}</span>
          </div>
        </div>

        {/* Restaurant Contact Card */}
        <div className="rounded-3xl bg-white p-4 border border-amber-200 shadow-2xs flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-zinc-950">{restaurantInfo.name}</h3>
            <p className="text-xs font-semibold text-zinc-500">{restaurantInfo.deliveryHours}</p>
          </div>
          <a
            href={`tel:${restaurantInfo.phone1}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#F4BE2C] px-4 py-2.5 text-xs font-black text-zinc-950 shadow-xs hover:bg-amber-400 active:scale-95 transition-all"
          >
            <Phone className="h-4 w-4" /> Call Store
          </a>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-3 pt-2">
          {(order.status === 'PENDING' || order.status === 'ACCEPTED') && (
            <Button variant="danger" fullWidth onClick={handleCancel} className="font-black">
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-[60px] lg:bottom-0 right-0 left-0 lg:left-64 z-30 app-container border-t border-amber-200 bg-white/95 p-3.5 backdrop-blur-xl safe-bottom shadow-lg flex gap-3">
        <Button variant="outline" fullWidth onClick={() => router.push('/orders')} className="font-black">
          All Orders
        </Button>
        <Button onClick={handleOrderAgain} fullWidth className="bg-[#F4BE2C] text-zinc-950 font-black hover:bg-amber-400 shadow-md">
          Order Again 🔄
        </Button>
      </div>
    </div>
  )
}

