'use client'

import { useState, useEffect } from 'react'
import { Package, Euro, TrendingUp, Users, Calendar, BarChart3, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { api } from '@/lib/api-client'

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get<any>('/admin/analytics')
        setData(res)
      } catch (e) {}
      setLoading(false)
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#F4BE2C] border-t-transparent" />
      </div>
    )
  }

  const totalOrders = data?.totalOrders ?? 0
  const totalRevenue = data?.totalRevenue ?? 0
  const todayRevenue = data?.todayRevenue ?? 0
  const weeklyRevenue = data?.weeklyRevenue ?? 0
  const monthlyRevenue = data?.monthlyRevenue ?? 0
  const totalCustomers = data?.totalCustomers ?? 0
  const ordersByStatus = data?.ordersByStatus ?? {}
  const topProducts = data?.topProducts ?? []

  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const statusLabels: Record<string, string> = {
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    PREPARING: 'Preparing',
    READY: 'Ready',
    OUT_FOR_DELIVERY: 'On the way',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sans text-2xl font-black text-zinc-950">Real-Time Analytics</h1>
        <p className="mt-1 text-xs font-semibold text-zinc-500">Live MongoDB database metrics & sales reporting</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Sales</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D99F16] border border-amber-200">
              <Euro className="h-5 w-5" />
            </div>
          </div>
          <p className="font-sans text-3xl font-black text-zinc-950 mt-2">{formatPrice(totalRevenue)}</p>
          <p className="text-[11px] font-semibold text-zinc-500 mt-1">All time cumulative revenue</p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Today's Sales</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D99F16] border border-amber-200">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <p className="font-sans text-3xl font-black text-zinc-950 mt-2">{formatPrice(todayRevenue)}</p>
          <p className="text-[11px] font-semibold text-zinc-500 mt-1">Orders placed today</p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Orders</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D99F16] border border-amber-200">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="font-sans text-3xl font-black text-zinc-950 mt-2">{totalOrders}</p>
          <p className="text-[11px] font-semibold text-zinc-500 mt-1">Avg Order: {formatPrice(avgOrderValue)}</p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Customers</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D99F16] border border-amber-200">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="font-sans text-3xl font-black text-zinc-950 mt-2">{totalCustomers}</p>
          <p className="text-[11px] font-semibold text-zinc-500 mt-1">Registered customer accounts</p>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Last 7 Days Revenue</p>
          <p className="font-sans text-2xl font-black text-zinc-950 mt-1">{formatPrice(weeklyRevenue)}</p>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Last 30 Days Revenue</p>
          <p className="font-sans text-2xl font-black text-zinc-950 mt-1">{formatPrice(monthlyRevenue)}</p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Breakdown */}
        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-sans text-base font-black text-zinc-950 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#D99F16]" /> Order Status Distribution
          </h2>
          {Object.keys(ordersByStatus).length === 0 ? (
            <p className="text-xs font-semibold text-zinc-500">No order data recorded yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(ordersByStatus).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between text-xs py-1 border-b border-amber-50">
                  <span className="font-bold text-zinc-700">{statusLabels[status] ?? status}</span>
                  <span className="font-black text-zinc-950 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Best-selling Products */}
        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-sans text-base font-black text-zinc-950 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#D99F16]" /> Best-Selling Items
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-xs font-semibold text-zinc-500">No itemized sales data yet</p>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between text-xs py-1 border-b border-amber-50">
                  <div>
                    <p className="font-black text-zinc-950">{p.name}</p>
                    <p className="text-[11px] font-semibold text-zinc-500">{p.count} units sold</p>
                  </div>
                  <span className="font-sans font-black text-[#D99F16]">{formatPrice(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
