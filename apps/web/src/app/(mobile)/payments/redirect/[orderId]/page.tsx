'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SabadellPaymentResponse {
  gatewayUrl: string
  fields: {
    Ds_SignatureVersion: string
    Ds_MerchantParameters: string
    Ds_Signature: string
  }
  orderId: string
  redsysOrder: string
  amount: number
}

export default function SabadellRedirectPage() {
  const params = useParams<{ orderId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const method = searchParams.get('method') || 'CARD'
  const formRef = useRef<HTMLFormElement | null>(null)
  const [data, setData] = useState<SabadellPaymentResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .post<SabadellPaymentResponse>('/payments/sabadell/create', {
        orderId: params.orderId,
        method,
      })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'No se pudo iniciar el pago')
      })
    return () => {
      cancelled = true
    }
  }, [params.orderId, method])

  useEffect(() => {
    if (data && formRef.current) {
      formRef.current.submit()
    }
  }, [data])

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-600" />
        <h1 className="mt-4 text-xl font-black text-zinc-950">Error al iniciar el pago</h1>
        <p className="mt-2 text-sm font-medium text-zinc-600">{error}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/orders/${params.orderId}`)}>
            Ver pedido
          </Button>
          <Button onClick={() => router.refresh()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-[#D99F16]" />
      <h1 className="mt-4 text-lg font-black text-zinc-950">
        Redirigiendo a Banco Sabadell…
      </h1>
      <p className="mt-2 text-sm font-medium text-zinc-500">
        Espera un momento, no cierres la ventana.
      </p>
      {data && (
        <form ref={formRef} action={data.gatewayUrl} method="POST" className="hidden">
          <input type="hidden" name="Ds_SignatureVersion" value={data.fields.Ds_SignatureVersion} />
          <input type="hidden" name="Ds_MerchantParameters" value={data.fields.Ds_MerchantParameters} />
          <input type="hidden" name="Ds_Signature" value={data.fields.Ds_Signature} />
        </form>
      )}
    </div>
  )
}
