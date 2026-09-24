'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VerifyResponse {
  paymentId: string
  orderId: string
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED'
  amount: number
  currency: string
}

export default function SabadellResultPage() {
  const params = useParams<{ orderId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectStatus = searchParams.get('status') // "ok" | "ko"
  const [state, setState] = useState<VerifyResponse | null>(null)
  const [attempts, setAttempts] = useState(0)

  // Redsys notification is async — poll a few times before giving up.
  useEffect(() => {
    let stop = false
    const poll = async () => {
      try {
        const res = await api.get<VerifyResponse>(`/payments/${params.orderId}/verify`)
        if (stop) return
        setState(res)
        if (res.status === 'PAID' || res.status === 'FAILED') return
        if (attempts < 8) {
          setTimeout(() => setAttempts((a) => a + 1), 1500)
        }
      } catch {
        if (attempts < 8 && !stop) {
          setTimeout(() => setAttempts((a) => a + 1), 1500)
        }
      }
    }
    poll()
    return () => {
      stop = true
    }
  }, [params.orderId, attempts])

  const isPaid = state?.status === 'PAID'
  const isFailed = state?.status === 'FAILED' || redirectStatus === 'ko'
  const isPending = !state || (!isPaid && !isFailed)

  if (isPending) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#D99F16]" />
        <h1 className="mt-4 text-lg font-black text-zinc-950">Confirmando el pago…</h1>
        <p className="mt-2 text-sm font-medium text-zinc-500">
          Estamos verificando la transacción con Banco Sabadell.
        </p>
      </div>
    )
  }

  if (isPaid) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-600" />
        <h1 className="mt-4 text-xl font-black text-zinc-950">¡Pago confirmado!</h1>
        <p className="mt-2 text-sm font-medium text-zinc-600">
          Tu pedido está en preparación.
        </p>
        <Button className="mt-6 font-black" onClick={() => router.push(`/orders/${params.orderId}`)}>
          Ver mi pedido
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <XCircle className="h-16 w-16 text-red-600" />
      <h1 className="mt-4 text-xl font-black text-zinc-950">Pago no completado</h1>
      <p className="mt-2 text-sm font-medium text-zinc-600">
        El pago fue rechazado o cancelado. Puedes reintentarlo o pagar en efectivo al recibir el pedido.
      </p>
      <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
        <Button
          className="font-black"
          onClick={() => router.push(`/payments/redirect/${params.orderId}`)}
        >
          Reintentar pago
        </Button>
        <Button
          variant="outline"
          className="font-black"
          onClick={() => router.push(`/orders/${params.orderId}`)}
        >
          Ver pedido
        </Button>
      </div>
    </div>
  )
}
