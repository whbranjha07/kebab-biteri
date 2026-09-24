'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, RefreshCw, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { api } from '@/lib/api-client'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'verifying' | 'success' | 'expired' | 'invalid'>('verifying')
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [showResendInput, setShowResendInput] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      setMessage('No verification token provided.')
      return
    }

    api.get<{ success: boolean; message: string }>(`/auth/verify-email?token=${token}`, { skipAuth: true })
      .then((res) => {
        setStatus('success')
        setMessage(res.message || 'Your email address has been verified successfully!')
        toast.success('Email verified successfully! 🎉')
      })
      .catch((err: any) => {
        const errMsg = err?.message || 'Verification failed.'
        if (errMsg.includes('EXPIRED') || errMsg.includes('expired')) {
          setStatus('expired')
          setMessage('This verification link has expired. Please request a new link.')
        } else {
          setStatus('invalid')
          setMessage(errMsg || 'This verification link is invalid or has already been used.')
        }
      })
  }, [token])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput) {
      toast.error('Please enter your email address')
      return
    }
    setResending(true)
    try {
      const res = await api.post<{ message: string }>('/auth/resend-verification', { email: emailInput }, { skipAuth: true })
      toast.success(res.message || 'Verification email sent!')
      setShowResendInput(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification email')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center py-10">
      <Logo size="lg" className="mb-6" />

      {status === 'verifying' && (
        <div className="flex flex-col items-center space-y-4 animate-fade-in">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#F4BE2C] border-t-transparent" />
          <h1 className="font-sans text-xl font-black text-zinc-950">Verifying your email...</h1>
          <p className="text-sm font-medium text-zinc-500">Please wait while we confirm your account details.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center max-w-sm space-y-4 animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 border border-emerald-300">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="font-sans text-2xl font-black text-zinc-950">Email Verified! 🎉</h1>
          <p className="text-sm font-semibold text-zinc-600">{message}</p>
          <div className="pt-4 w-full">
            <Button size="xl" fullWidth onClick={() => router.push('/profile/login')} className="font-black">
              Continue to Login <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {status === 'expired' && (
        <div className="flex flex-col items-center max-w-sm space-y-4 animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 border border-amber-300">
            <Clock className="h-10 w-10 text-[#D99F16]" />
          </div>
          <h1 className="font-sans text-xl font-black text-zinc-950">Link Expired</h1>
          <p className="text-sm font-semibold text-zinc-600">{message}</p>

          {!showResendInput ? (
            <div className="pt-4 space-y-3 w-full">
              <Button size="lg" fullWidth onClick={() => setShowResendInput(true)} className="font-black">
                Resend verification email <RefreshCw className="ml-2 h-4 w-4" />
              </Button>
              <Link href="/profile/login" className="block text-xs font-semibold text-zinc-500 hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResend} className="pt-2 space-y-3 w-full animate-fade-in">
              <input
                type="email"
                placeholder="Enter your email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="h-12 w-full rounded-xl border border-amber-300 bg-amber-50/50 px-4 text-sm font-semibold text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#F4BE2C]"
              />
              <Button size="lg" fullWidth loading={resending} disabled={resending} className="font-black">
                Send New Verification Email
              </Button>
            </form>
          )}
        </div>
      )}

      {status === 'invalid' && (
        <div className="flex flex-col items-center max-w-sm space-y-4 animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 border border-rose-300">
            <XCircle className="h-10 w-10 text-rose-600" />
          </div>
          <h1 className="font-sans text-xl font-black text-zinc-950">Invalid Verification Link</h1>
          <p className="text-sm font-semibold text-zinc-600">{message}</p>

          <div className="pt-4 space-y-3 w-full">
            <Link href="/profile/login">
              <Button size="xl" fullWidth className="font-black">
                Go to Login Page
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F4BE2C] border-t-transparent" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
