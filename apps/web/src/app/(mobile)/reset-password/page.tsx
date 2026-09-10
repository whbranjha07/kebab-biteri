'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, Lock, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { api } from '@/lib/api-client'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 border border-rose-300 mb-4">
          <AlertCircle className="h-10 w-10 text-rose-600" />
        </div>
        <h1 className="font-sans text-xl font-black text-zinc-950">Invalid Reset Link</h1>
        <p className="mt-2 text-sm font-semibold text-zinc-500 max-w-xs">
          No password reset token was found in the URL.
        </p>
        <Link href="/profile/login" className="mt-6 w-full max-w-xs">
          <Button size="xl" fullWidth className="font-black">Back to Login</Button>
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        '/auth/reset-password',
        { token, password },
        { skipAuth: true },
      )
      setSuccess(true)
      toast.success(res.message || 'Password reset successfully! 🎉')
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. Link may be invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm text-center">
        <Logo size="lg" className="mx-auto mb-4" />

        {success ? (
          <div className="space-y-4 animate-fade-in">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 border border-emerald-300">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="font-sans text-2xl font-black text-zinc-950">Password Reset!</h1>
            <p className="text-sm font-semibold text-zinc-600">
              Your password has been updated successfully. You can now log in with your new password.
            </p>
            <div className="pt-4">
              <Button size="xl" fullWidth onClick={() => router.push('/profile/login')} className="font-black">
                Go to Login <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in text-left">
            <div className="text-center">
              <h1 className="font-sans text-2xl font-black text-zinc-950">Set New Password</h1>
              <p className="text-xs text-zinc-500 mt-1">Please enter a new password for your account.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-subtle" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-surface-alt pl-11 pr-11 text-sm text-charcoal placeholder:text-subtle focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-subtle hover:text-charcoal"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-subtle" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-surface-alt pl-11 pr-11 text-sm text-charcoal placeholder:text-subtle focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3.5 text-subtle hover:text-charcoal"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <Button type="submit" size="xl" fullWidth loading={loading} disabled={loading} className="mt-4 font-black">
                Reset Password <KeyRound className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="text-center pt-2">
              <Link href="/profile/login" className="text-xs font-semibold text-zinc-500 hover:underline">
                Back to login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
