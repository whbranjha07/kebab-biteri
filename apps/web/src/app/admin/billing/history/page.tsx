'use client'

import { useState, useEffect } from 'react'
import { Receipt, Search, Printer, Eye, RefreshCw, Calendar, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { api } from '@/lib/api-client'

interface BillingOrder {
  _id: string
  receiptNumber: string
  orderNumber: string
  customerName: string
  orderType: string
  paymentMethod: string
  total: number
  amountReceived?: number
  changeAmount?: number
  cashierName?: string
  placedAt: string
}

export default function AdminBillingHistoryPage() {
  const [orders, setOrders] = useState<BillingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)
  const [reprintingId, setReprintingId] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: BillingOrder[] }>(`/admin/billing/history?search=${encodeURIComponent(search)}`)
      if (res && Array.isArray(res.data)) {
        setOrders(res.data)
      }
    } catch (err) {
      toast.error('Failed to load billing history')
    } finally {
      setLoading(false)
    }
  }

  const handleReprint = async (orderId: string) => {
    setReprintingId(orderId)
    try {
      const receiptData = await api.get<any>(`/admin/billing/receipt/${orderId}`)
      if (receiptData) {
        // Fetch printer settings
        const settings = await api.get<any>('/admin/settings').catch(() => null)
        const bridgeUrl = settings?.printerBridgeUrl || 'http://localhost:9123'

        const printPayload = {
          connectionType: settings?.printerConnectionType || 'BRIDGE',
          printerIp: settings?.printerIp,
          printerPort: settings?.printerPort,
          receiptNumber: receiptData.receiptNumber,
          rawBuffer: [27, 64, 27, 97, 1, 27, 33, 16, 75, 69, 66, 65, 66, 32, 66, 73, 84, 69, 82, 73, 10],
        }

        const res = await fetch(`${bridgeUrl}/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(printPayload),
        }).catch(() => null)

        if (res && res.ok) {
          toast.success(`Receipt #${receiptData.receiptNumber} reprinted on physical printer!`)
        } else {
          toast.error('Receipt data loaded, but local Print Bridge was unreachable.')
        }
      }
    } catch (err: any) {
      toast.error('Reprint operation failed')
    } finally {
      setReprintingId(null)
    }
  }

  const handleViewReceipt = async (orderId: string) => {
    try {
      const receiptData = await api.get<any>(`/admin/billing/receipt/${orderId}`)
      if (receiptData) {
        setSelectedReceipt(receiptData)
      }
    } catch (err) {
      toast.error('Could not load receipt details')
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-black text-zinc-950 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-[#D99F16]" /> Billing History & Thermal Receipts
          </h1>
          <p className="mt-1 text-xs font-semibold text-zinc-500">
            View completed counter sales and reprint physical thermal receipts without altering analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search receipt / customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
              className="h-10 w-64 rounded-2xl border border-amber-200 bg-amber-50/20 pl-10 pr-4 text-xs font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
            />
          </div>
          <Button onClick={fetchHistory} variant="outline" className="font-black text-xs">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-3xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-amber-200 bg-amber-50/50 text-[11px] font-black uppercase text-zinc-600">
              <th className="py-3.5 px-4">Receipt #</th>
              <th className="py-3.5 px-4">Order #</th>
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Date & Time</th>
              <th className="py-3.5 px-4">Payment</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Cashier</th>
              <th className="py-3.5 px-4">Total</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100 text-xs font-bold text-zinc-950">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-zinc-400">
                  Loading billing history...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-zinc-400">
                  No billing receipts found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="py-3 px-4 font-black text-[#D99F16]">{order.receiptNumber || 'N/A'}</td>
                  <td className="py-3 px-4 font-mono text-zinc-600">{order.orderNumber}</td>
                  <td className="py-3 px-4">{order.customerName || 'Walk-in Customer'}</td>
                  <td className="py-3 px-4 text-zinc-600">
                    {new Date(order.placedAt).toLocaleDateString('es-ES')} {new Date(order.placedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 text-[10px] font-black uppercase">
                      {order.paymentMethod || 'CASH'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[10px] font-black">
                      {order.orderType || 'TAKEAWAY'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-600">{order.cashierName || 'Admin'}</td>
                  <td className="py-3 px-4 font-black text-zinc-950">€{order.total.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleViewReceipt(order._id)}
                      className="p-1.5 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold transition-all"
                      title="View Receipt"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleReprint(order._id)}
                      disabled={reprintingId === order._id}
                      className="p-1.5 rounded-xl bg-[#F4BE2C] text-zinc-950 hover:bg-amber-400 font-bold transition-all"
                      title="Reprint Physical Receipt"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-amber-200 shadow-2xl relative">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 font-bold text-lg"
            >
              ✕
            </button>

            <div className="text-center border-b border-amber-100 pb-3">
              <h3 className="font-sans text-lg font-black text-zinc-950">{selectedReceipt.restaurantName}</h3>
              <p className="text-xs font-bold text-amber-600">Receipt #{selectedReceipt.receiptNumber}</p>
            </div>

            <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-200 font-mono text-[11px] leading-relaxed text-zinc-900 space-y-1">
              <div className="flex justify-between">
                <span>Receipt: {selectedReceipt.receiptNumber}</span>
                <span>Order: {selectedReceipt.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date: {selectedReceipt.date}</span>
                <span>Time: {selectedReceipt.time}</span>
              </div>
              <div className="border-b border-dashed border-amber-300 my-1" />
              {selectedReceipt.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.name} x{item.quantity}</span>
                  <span>€{item.total.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-b border-dashed border-amber-300 my-1" />
              <div className="flex justify-between font-bold text-xs pt-1">
                <span>TOTAL</span>
                <span>€{selectedReceipt.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleReprint(selectedReceipt.orderId || selectedReceipt._id)}
                className="w-full font-black text-xs"
              >
                <Printer className="h-4 w-4 mr-1" /> Reprint Physical Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
