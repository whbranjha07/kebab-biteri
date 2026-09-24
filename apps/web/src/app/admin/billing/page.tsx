'use client'

import { useState, useEffect } from 'react'
import {
  Search, Plus, Minus, Trash2, User, Printer, ShoppingBag,
  CreditCard, DollarSign, CheckCircle2, AlertCircle, RefreshCw, X, Utensils
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { api } from '@/lib/api-client'

interface Product {
  _id?: string
  id?: string
  name: string
  basePrice: number
  imageUrl: string
  categoryId: string
  variants?: Array<{ name: string; price: number }>
}

interface Category {
  _id?: string
  id?: string
  name: string
}

interface CartItem {
  product: Product
  variantName?: string
  quantity: number
  price: number
  notes?: string
}

interface Customer {
  _id: string
  firstName: string
  lastName: string
  phone?: string
  email?: string
}

import { products as fallbackProducts, categories as fallbackCategories } from '@/data/menu-data'

export default function AdminBillingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [settings, setSettings] = useState<any>(null)
  
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [productSearch, setProductSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [orderType, setOrderType] = useState<'TAKEAWAY' | 'DINE_IN' | 'DELIVERY'>('TAKEAWAY')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BIZUM'>('CASH')
  const [amountReceived, setAmountReceived] = useState<number>(0)
  const [discount, setDiscount] = useState<number>(0)
  
  const [submitting, setSubmitting] = useState(false)
  const [completedReceipt, setCompletedReceipt] = useState<any>(null)
  const [printError, setPrintError] = useState<string | null>(null)
  const [printerConnected, setPrinterConnected] = useState<boolean | null>(null)

  useEffect(() => {
    loadData()
    checkPrinterConnection()
  }, [])

  const getProductId = (p: Product) => (p._id || p.id || '').toString()
  const getCategoryId = (c: Category) => (c._id || c.id || '').toString()

  const loadData = async () => {
    try {
      const [prodRes, catRes, custRes, setRes] = await Promise.all([
        api.get<Product[]>('/admin/products').catch(() => []),
        api.get<Category[]>('/admin/categories').catch(() => []),
        api.get<{ data: Customer[] }>('/admin/customers?limit=100').catch(() => ({ data: [] })),
        api.get<any>('/admin/settings').catch(() => null)
      ])
      
      const loadedProducts = Array.isArray(prodRes) && prodRes.length > 0 ? prodRes : (fallbackProducts as unknown as Product[])
      const loadedCategories = Array.isArray(catRes) && catRes.length > 0 ? catRes : (fallbackCategories as unknown as Category[])

      setProducts(loadedProducts)
      setCategories(loadedCategories)

      if (custRes && Array.isArray(custRes.data)) setCustomers(custRes.data)
      if (setRes) setSettings(setRes)
    } catch (err) {
      setProducts(fallbackProducts as unknown as Product[])
      setCategories(fallbackCategories as unknown as Category[])
    }
  }

  const checkPrinterConnection = async () => {
    try {
      const bridgeUrl = settings?.printerBridgeUrl || 'http://localhost:9123'
      const res = await fetch(`${bridgeUrl}/status`, { method: 'GET' }).catch(() => null)
      if (res && res.ok) {
        setPrinterConnected(true)
      } else {
        setPrinterConnected(false)
      }
    } catch (e) {
      setPrinterConnected(false)
    }
  }

  const addToCart = (product: Product, variantName?: string, priceOverride?: number) => {
    const itemPrice = priceOverride ?? product.basePrice
    const pId = getProductId(product)
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => getProductId(item.product) === pId && item.variantName === variantName
      )
      if (existingIndex > -1) {
        const updated = [...prev]
        updated[existingIndex].quantity += 1
        return updated
      }
      return [...prev, { product, variantName, quantity: 1, price: itemPrice }]
    })
    toast.success(`Added ${product.name} to cart`)
  }

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev]
      const newQty = updated[index].quantity + delta
      if (newQty <= 0) {
        updated.splice(index, 1)
      } else {
        updated[index].quantity = newQty
      }
      return updated
    })
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const grandTotal = Math.max(0, subtotal - discount)
  const changeDue = paymentMethod === 'CASH' ? Math.max(0, amountReceived - grandTotal) : 0

  const filteredProducts = products.filter((p) => {
    const pCatId = (p.categoryId || '').toString()
    const matchesCategory = selectedCategory === 'ALL' || pCatId === selectedCategory || pCatId === selectedCategory.toLowerCase()
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const filteredCustomers = customers.filter((c) => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase()
    const query = customerSearch.toLowerCase()
    return fullName.includes(query) || (c.phone && c.phone.includes(query)) || (c.email && c.email.includes(query))
  })

  const handlePrintReceipt = async (receiptData: any) => {
    setPrintError(null)
    try {
      const bridgeUrl = settings?.printerBridgeUrl || 'http://localhost:9123'
      const printPayload = {
        connectionType: settings?.printerConnectionType || 'BRIDGE',
        printerIp: settings?.printerIp,
        printerPort: settings?.printerPort,
        receiptNumber: receiptData.receiptNumber,
        subtotal: receiptData.subtotal,
        discount: receiptData.discount,
        total: receiptData.total,
        paymentMethod: receiptData.paymentMethod,
        items: receiptData.items,
        rawBuffer: [27, 64, 27, 97, 1, 27, 33, 16, 75, 69, 66, 65, 66, 32, 66, 73, 84, 69, 82, 73, 10], // ESC/POS Header Buffer
      }

      const res = await fetch(`${bridgeUrl}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(printPayload),
      }).catch(() => null)

      if (res && res.ok) {
        toast.success(`Receipt ${receiptData.receiptNumber} printed on physical printer! 🖨️`)
      } else {
        setPrintError('Order created, but receipt could not be printed. Printer service is unavailable.')
        toast.error('Printer connection failed')
      }
    } catch (err: any) {
      setPrintError(`Print failed: ${err.message}`)
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    const effectiveCashReceived = paymentMethod === 'CASH'
      ? (amountReceived > 0 ? amountReceived : grandTotal)
      : grandTotal

    if (paymentMethod === 'CASH' && effectiveCashReceived < grandTotal) {
      toast.error(`Received amount (€${effectiveCashReceived.toFixed(2)}) is less than total (€${grandTotal.toFixed(2)})`)
      return
    }

    setSubmitting(true)
    setPrintError(null)

    try {
      const payload = {
        userId: selectedCustomer?._id,
        customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Walk-in Customer',
        customerPhone: selectedCustomer?.phone || '',
        orderType,
        items: cart.map((item) => ({
          productId: getProductId(item.product),
          variantName: item.variantName,
          quantity: item.quantity,
          notes: item.notes,
        })),
        paymentMethod,
        amountReceived: effectiveCashReceived,
        discount,
      }

      const res = await api.post<any>('/admin/billing/orders', payload)

      if (res && res.receipt) {
        setCompletedReceipt(res.receipt)
        toast.success(`Bill Created & Saved! Receipt #${res.receipt.receiptNumber}`)

        // Reset Cart
        setCart([])
        setSelectedCustomer(null)
        setAmountReceived(0)
        setDiscount(0)
      }
    } catch (err: any) {
      toast.error(err.message || 'Billing transaction failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-5rem)]">
      {/* LEFT COLUMN: Menu Products Selection */}
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Top Controls: Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-amber-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search product by name..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="h-10 w-full rounded-2xl border border-amber-200 bg-amber-50/20 pl-10 pr-4 text-sm font-semibold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-[#F4BE2C] text-zinc-950 shadow-sm'
                  : 'bg-amber-50 text-zinc-600 hover:bg-amber-100'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => {
              const cId = getCategoryId(cat)
              return (
                <button
                  key={cId}
                  onClick={() => setSelectedCategory(cId)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all whitespace-nowrap ${
                    selectedCategory === cId
                      ? 'bg-[#F4BE2C] text-zinc-950 shadow-sm'
                      : 'bg-amber-50 text-zinc-600 hover:bg-amber-100'
                  }`}
                >
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredProducts.map((product) => {
            const pId = getProductId(product)
            return (
              <div
                key={pId}
                onClick={() => addToCart(product)}
                className="group relative cursor-pointer rounded-3xl border border-amber-200 bg-white p-3 shadow-sm hover:border-[#F4BE2C] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-28 w-full rounded-2xl bg-amber-50 overflow-hidden mb-2">
                    <img
                      src={product.imageUrl || '/images/kebab-placeholder.jpg'}
                      alt={product.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h3 className="font-sans text-xs font-black text-zinc-950 line-clamp-1">{product.name}</h3>
                  <p className="font-sans text-sm font-extrabold text-[#D99F16] mt-0.5">€{product.basePrice.toFixed(2)}</p>
                </div>

                <div className="mt-2 flex items-center justify-between pt-2 border-t border-amber-100">
                  <span className="text-[10px] font-bold text-zinc-400">Click to add</span>
                  <div className="h-7 w-7 rounded-xl bg-[#F4BE2C] flex items-center justify-center text-zinc-950 shadow-sm">
                    <Plus className="h-4 w-4 stroke-[3]" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Bill Cart & Checkout */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-3xl border border-amber-200 shadow-md p-4 min-h-0">
        {/* Cart Header & Customer Selector */}
        <div className="border-b border-amber-100 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-base font-black text-zinc-950 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#D99F16]" /> Current Bill Cart
            </h2>
            <span className="text-xs font-black bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
            </span>
          </div>

          {/* Customer Search & Walk-in Toggle */}
          <div className="relative">
            <div className="flex items-center justify-between bg-amber-50/50 p-2.5 rounded-2xl border border-amber-200">
              <div className="flex items-center gap-2 overflow-hidden">
                <User className="h-4 w-4 text-[#D99F16] shrink-0" />
                {selectedCustomer ? (
                  <div className="truncate">
                    <p className="text-xs font-extrabold text-zinc-950 truncate">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </p>
                    <p className="text-[10px] font-medium text-zinc-500">{selectedCustomer.phone || selectedCustomer.email}</p>
                  </div>
                ) : (
                  <span className="text-xs font-extrabold text-zinc-700">Walk-in Customer</span>
                )}
              </div>

              {selectedCustomer ? (
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs font-bold text-red-500 hover:underline shrink-0"
                >
                  Clear
                </button>
              ) : (
                <button
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  className="text-xs font-extrabold text-[#D99F16] hover:underline shrink-0"
                >
                  Change
                </button>
              )}
            </div>

            {/* Customer Dropdown */}
            {showCustomerDropdown && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-amber-200 rounded-2xl shadow-xl p-2 max-h-48 overflow-y-auto space-y-1">
                <input
                  type="text"
                  placeholder="Filter customer by name/phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="h-8 w-full rounded-xl border border-amber-200 bg-amber-50/20 px-2.5 text-xs font-semibold focus:outline-none mb-2"
                />
                <div
                  onClick={() => {
                    setSelectedCustomer(null)
                    setShowCustomerDropdown(false)
                  }}
                  className="p-2 hover:bg-amber-50 rounded-xl cursor-pointer text-xs font-bold text-zinc-800"
                >
                  👤 Walk-in Customer (Default)
                </div>
                {filteredCustomers.map((cust) => (
                  <div
                    key={cust._id}
                    onClick={() => {
                      setSelectedCustomer(cust)
                      setShowCustomerDropdown(false)
                    }}
                    className="p-2 hover:bg-amber-50 rounded-xl cursor-pointer text-xs font-bold text-zinc-900 border-t border-amber-50"
                  >
                    {cust.firstName} {cust.lastName} {cust.phone && `(${cust.phone})`}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Type Toggle */}
          <div className="grid grid-cols-3 gap-1.5 bg-amber-50/60 p-1 rounded-2xl border border-amber-200">
            {(['TAKEAWAY', 'DINE_IN', 'DELIVERY'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`py-1.5 rounded-xl text-[11px] font-black transition-all ${
                  orderType === type
                    ? 'bg-[#F4BE2C] text-zinc-950 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {type === 'TAKEAWAY' ? 'Takeaway' : type === 'DINE_IN' ? 'Dine-In' : 'Delivery'}
              </button>
            ))}
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 text-zinc-400">
              <Utensils className="h-8 w-8 mb-2 stroke-[1.5]" />
              <p className="text-xs font-bold">Cart is empty</p>
              <p className="text-[10px] text-zinc-400">Select items from menu to start bill</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={`${item.product._id}-${idx}`}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-50/30 border border-amber-100"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-black text-zinc-950 truncate">{item.product.name}</p>
                  <p className="text-[11px] font-bold text-[#D99F16]">
                    €{item.price.toFixed(2)} × {item.quantity} = €{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(idx, -1)}
                    className="h-6 w-6 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-black hover:bg-amber-200"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-black px-1.5 text-zinc-950">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(idx, 1)}
                    className="h-6 w-6 rounded-lg bg-[#F4BE2C] text-zinc-950 flex items-center justify-center font-black hover:bg-amber-400"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Calculations & Payment */}
        <div className="border-t border-amber-100 pt-3 space-y-2.5">
          <div className="space-y-1 text-xs font-bold text-zinc-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Discount (€)</span>
              <input
                type="number"
                min="0"
                step="0.50"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="h-7 w-20 rounded-lg border border-amber-200 text-right px-2 text-xs font-bold text-zinc-950 focus:outline-none"
              />
            </div>

            <div className="flex justify-between text-base font-black text-zinc-950 pt-1 border-t border-amber-100">
              <span>Grand Total</span>
              <span className="text-[#D99F16]">€{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-3 gap-1.5">
            {(['CASH', 'CARD', 'BIZUM'] as const).map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`py-1.5 rounded-xl text-xs font-black transition-all ${
                  paymentMethod === method
                    ? 'bg-zinc-950 text-[#F4BE2C]'
                    : 'bg-amber-100 text-zinc-700 hover:bg-amber-200'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {/* Cash Change Calculation */}
          {paymentMethod === 'CASH' && (
            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-zinc-700">Amount Received:</span>
                <div className="flex items-center gap-1">
                  <span className="text-zinc-950 font-black">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={grandTotal.toFixed(2)}
                    value={amountReceived === 0 ? '' : amountReceived}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      setAmountReceived(isNaN(val) ? 0 : val)
                    }}
                    className="h-8 w-24 rounded-xl border border-amber-300 bg-white text-right px-2.5 font-black text-sm text-zinc-950 focus:border-[#F4BE2C] focus:outline-none shadow-inner"
                  />
                </div>
              </div>

              {/* Quick Preset Cash Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAmountReceived(grandTotal)}
                  className={`flex-1 py-1.5 rounded-xl border text-[11px] font-black transition-all ${
                    amountReceived === grandTotal
                      ? 'bg-zinc-950 text-[#F4BE2C] border-zinc-950 shadow-sm'
                      : 'bg-white border-amber-300 text-zinc-800 hover:bg-amber-100'
                  }`}
                >
                  Exact (€{grandTotal.toFixed(2)})
                </button>
                {[10, 20, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmountReceived(val)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black transition-all ${
                      amountReceived === val
                        ? 'bg-zinc-950 text-[#F4BE2C] border-zinc-950 shadow-sm'
                        : 'bg-white border-amber-300 text-zinc-800 hover:bg-amber-100'
                    }`}
                  >
                    €{val}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs font-black pt-2 border-t border-amber-200">
                <span className="text-zinc-700">Change Due:</span>
                <span className={`text-base font-extrabold ${changeDue > 0 ? 'text-emerald-600' : 'text-zinc-950'}`}>
                  €{changeDue.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Create Bill Button */}
          <Button
            onClick={handleCheckout}
            loading={submitting}
            disabled={submitting || cart.length === 0}
            size="lg"
            className="w-full font-black text-sm py-3 bg-[#F4BE2C] text-zinc-950 hover:bg-amber-400"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5 stroke-[2.5]" /> Create Bill (€{grandTotal.toFixed(2)})
          </Button>
        </div>
      </div>

      {/* COMPLETED RECEIPT MODAL */}
      {completedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-amber-200 shadow-2xl relative">
            <button
              onClick={() => setCompletedReceipt(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-1 border-b border-amber-100 pb-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="font-sans text-lg font-black text-zinc-950">Bill Created & Saved</h3>
              <p className="text-xs font-bold text-amber-600">Receipt #{completedReceipt.receiptNumber}</p>
            </div>

            {/* Receipt Formatting Preview */}
            <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-200 font-mono text-[11px] leading-relaxed text-zinc-900 space-y-1">
              <div className="text-center font-bold">{completedReceipt.restaurantName}</div>
              <div className="text-center text-[10px] text-zinc-500">{completedReceipt.address}</div>
              <div className="border-b border-dashed border-amber-300 my-1" />
              <div className="flex justify-between">
                <span>Receipt: {completedReceipt.receiptNumber}</span>
                <span>Type: {completedReceipt.orderType}</span>
              </div>
              <div className="flex justify-between">
                <span>Date: {completedReceipt.date}</span>
                <span>Time: {completedReceipt.time}</span>
              </div>
              <div className="border-b border-dashed border-amber-300 my-1" />
              {completedReceipt.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.name} x{item.quantity}</span>
                  <span>€{item.total.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-b border-dashed border-amber-300 my-1" />
              <div className="flex justify-between font-bold text-xs pt-1">
                <span>TOTAL</span>
                <span>€{completedReceipt.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => setCompletedReceipt(null)}
                className="w-full font-black text-xs bg-zinc-950 text-[#F4BE2C]"
              >
                Close & Next Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
