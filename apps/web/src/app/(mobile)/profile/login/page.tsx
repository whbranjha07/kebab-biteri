'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Mail, Lock, ArrowRight, AlertCircle, User as UserIcon, CheckCircle2, RefreshCw, KeyRound, Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/profile'
  const { login, verifyLoginOtp, resendLoginOtp, verifyRegistrationCode, loginWithGoogle, register, user } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' })
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // OTP Login State
  const [otpStep, setOtpStep] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [resendingOtp, setResendingOtp] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Registration Verification Code State
  const [regCode, setRegCode] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')

  // Google Login State
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const [googleEmail, setGoogleEmail] = useState('')

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState('')

  // Cooldown countdown effect for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Check email query param
  useEffect(() => {
    const queryEmail = searchParams.get('email')
    if (queryEmail) setForm((f) => ({ ...f, email: queryEmail }))
  }, [searchParams])

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push(redirect)
    }
  }, [user, router, redirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUnverifiedEmail(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        if (!form.email) {
          setError('Please enter your email')
          setLoading(false)
          return
        }
        if (!form.password) {
          setError('Please enter your password')
          setLoading(false)
          return
        }
        const res = await login(form.email, form.password)
        if (res?.requiresOtp) {
          setOtpEmail(res.email || form.email)
          setOtpStep(true)
          setCooldown(60)
          setLoading(false)
          toast.info('Verification code sent to your email address!')
          return
        }
        toast.success('Logged in!')
        router.push(redirect)
      } else {
        if (!form.firstName || !form.lastName || !form.email || !form.password) {
          setError('Please fill in all fields')
          setLoading(false)
          return
        }
        await register(form)
        toast.success('Account created! Verification code sent to your email.')
        setUnverifiedEmail(form.email)
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter a 6-digit verification code.')
      return
    }
    setOtpError('')
    setOtpLoading(true)
    try {
      await verifyLoginOtp(otpEmail, otpCode.trim())
      toast.success('Login successful!')
      router.push(redirect)
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed. Please check the code and try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyRegistrationCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unverifiedEmail || !regCode || regCode.trim().length !== 6) {
      setRegError('Please enter a 6-digit verification code.')
      return
    }
    setRegError('')
    setRegLoading(true)
    try {
      await verifyRegistrationCode(unverifiedEmail, regCode.trim())
      toast.success('Account verified! Welcome to Kebab Biteri.')
      router.push(redirect)
    } catch (err: any) {
      setRegError(err.message || 'Invalid verification code. Please check your email and try again.')
    } finally {
      setRegLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (cooldown > 0 || resendingOtp) return
    setResendingOtp(true)
    setOtpError('')
    try {
      const res = await resendLoginOtp(otpEmail)
      toast.success(res.message || 'Verification code sent to your email!')
      setCooldown(60)
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code')
    } finally {
      setResendingOtp(false)
    }
  }

  const handleResend = async () => {
    const targetEmail = unverifiedEmail || form.email
    if (!targetEmail) return
    setResending(true)
    try {
      const res = await api.post<{ message: string }>('/auth/resend-verification', { email: targetEmail }, { skipAuth: true })
      toast.success(res.message || 'Verification code sent to your email!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code')
    } finally {
      setResending(false)
    }
  }

  // Google Identity Services SDK Loader & OAuth Callback Handler
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check for Google OAuth hash response in URL (#id_token=... or #access_token=...)
    const hash = window.location.hash
    if (hash && (hash.includes('id_token=') || hash.includes('access_token='))) {
      const params = new URLSearchParams(hash.replace('#', '?'))
      const idToken = params.get('id_token')
      const accessToken = params.get('access_token')

      if (idToken || accessToken) {
        setGoogleLoading(true)
        window.history.replaceState(null, '', window.location.pathname)
        loginWithGoogle({ idToken: idToken || undefined, accessToken: accessToken || undefined })
          .then(() => {
            toast.success('Signed in with Google!')
            router.push(redirect)
          })
          .catch((err: any) => {
            toast.error(err.message || 'Google authentication failed.')
          })
          .finally(() => setGoogleLoading(false))
        return
      }
    }

    const scriptId = 'google-gsi-client-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        if ((window as any).google?.accounts?.id) {
          try {
            ;(window as any).google.accounts.id.initialize({
              client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '896856577539-mhe2et3ub580h7qsl1aek6h3q4e735a9.apps.googleusercontent.com',
              callback: async (response: any) => {
                if (response?.credential) {
                  setGoogleLoading(true)
                  try {
                    await loginWithGoogle({ credential: response.credential })
                    toast.success('Signed in with Google!')
                    router.push(redirect)
                  } catch (err: any) {
                    toast.error(err.message || 'Google authentication failed.')
                  } finally {
                    setGoogleLoading(false)
                  }
                }
              },
            })
          } catch {}
        }
      }
      document.head.appendChild(script)
    }
  }, [loginWithGoogle, router, redirect])

  const handleGoogleSignIn = () => {
    setGoogleLoading(true)
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '896856577539-mhe2et3ub580h7qsl1aek6h3q4e735a9.apps.googleusercontent.com'

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (response: any) => {
            if (response?.access_token) {
              try {
                await loginWithGoogle({ accessToken: response.access_token })
                toast.success('Signed in with Google!')
                router.push(redirect)
              } catch (err: any) {
                toast.error(err.message || 'Google login failed.')
              } finally {
                setGoogleLoading(false)
              }
            } else {
              setGoogleLoading(false)
            }
          },
          error_callback: () => {
            setGoogleLoading(false)
          },
        })
        client.requestAccessToken()
        return
      } catch (err: any) {
        console.error('Google OAuth Client error:', err)
      }
    }

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        ;(window as any).google.accounts.id.prompt()
        setGoogleLoading(false)
        return
      } catch {}
    }

    setGoogleLoading(false)
    toast.error('Google Sign-In is initializing. Please try again in a moment.')
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail) {
      toast.error('Please enter your email address')
      return
    }
    setForgotLoading(true)
    setForgotSuccess('')
    try {
      const res = await api.post<{ message: string }>('/auth/forgot-password', { email: forgotEmail }, { skipAuth: true })
      setForgotSuccess(res.message || 'Password reset link sent to your email.')
      toast.success('Password reset email sent!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-top sticky top-0 z-20 bg-surface/95 px-4 pb-3 pt-3 backdrop-blur-lg border-b border-amber-200">
        <div className="flex items-center gap-3">
          <Link href="/" className="touch-target -ml-2 flex items-center justify-center rounded-full">
            <ChevronLeft className="h-6 w-6 text-charcoal" />
          </Link>
          <h1 className="font-display text-xl font-extrabold text-charcoal">
            {otpStep ? 'Security Check' : unverifiedEmail ? 'Verify Account' : showForgot ? 'Forgot Password' : mode === 'login' ? 'Log in' : 'Sign up'}
          </h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-5 py-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size="lg" className="mb-2" />
          <h2 className="mt-2 font-display text-2xl font-extrabold text-charcoal">
            {otpStep ? 'Two-Step Verification' : unverifiedEmail ? 'Account Verification' : showForgot ? 'Reset your password' : mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-muted">Order authentic kebab online</p>
        </div>

        {otpStep ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
            <div className="rounded-2xl bg-amber-50 border border-amber-300 p-5 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4BE2C]/20 border border-[#F4BE2C]">
                <Mail className="h-6 w-6 text-[#D99F16]" />
              </div>
              <h3 className="font-sans text-base font-extrabold text-zinc-950">Enter Verification Code</h3>
              <p className="mt-1.5 text-xs text-zinc-600">
                We sent a 6-digit code to <strong className="text-zinc-950">{otpEmail}</strong>. Enter it below to complete login.
              </p>
            </div>

            {otpError && (
              <div className="flex items-center gap-2 rounded-xl bg-danger/10 p-3 text-xs text-danger font-bold border border-danger/20">
                <AlertCircle className="h-4 w-4 shrink-0" /> {otpError}
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-14 w-full rounded-2xl border-2 border-amber-300 bg-surface-alt text-center text-2xl font-black tracking-[0.4em] text-charcoal focus:border-[#F4BE2C] focus:outline-none placeholder:tracking-normal placeholder:text-subtle/40"
              />
            </div>

            <Button type="submit" size="xl" fullWidth loading={otpLoading} disabled={otpLoading || otpCode.length !== 6} className="font-black">
              {otpLoading ? 'Verifying...' : <>Verify & Login <ArrowRight className="h-5 w-5" /></>}
            </Button>

            <div className="flex flex-col items-center gap-2 pt-2 text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || resendingOtp}
                className="text-xs font-bold"
              >
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${resendingOtp ? 'animate-spin' : ''}`} />
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
              </Button>

              <button
                type="button"
                onClick={() => { setOtpStep(false); setOtpError(''); setOtpCode('') }}
                className="text-xs font-semibold text-zinc-500 hover:underline pt-1"
              >
                ← Back to login
              </button>
            </div>
          </form>
        ) : unverifiedEmail ? (
          <form onSubmit={handleVerifyRegistrationCode} className="space-y-4 animate-fade-in">
            <div className="rounded-2xl bg-amber-50 border border-amber-300 p-5 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4BE2C]/20 border border-[#F4BE2C]">
                <Mail className="h-6 w-6 text-[#D99F16]" />
              </div>
              <h3 className="font-sans text-base font-extrabold text-zinc-950">Verify Your Account</h3>
              <p className="mt-1.5 text-xs text-zinc-600">
                We sent a 6-digit verification code to <strong className="text-zinc-950">{unverifiedEmail}</strong>. Enter it below to activate your account.
              </p>
            </div>

            {regError && (
              <div className="flex items-center gap-2 rounded-xl bg-danger/10 p-3 text-xs text-danger font-bold border border-danger/20">
                <AlertCircle className="h-4 w-4 shrink-0" /> {regError}
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={regCode}
                onChange={(e) => setRegCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-14 w-full rounded-2xl border-2 border-amber-300 bg-surface-alt text-center text-2xl font-black tracking-[0.4em] text-charcoal focus:border-[#F4BE2C] focus:outline-none placeholder:tracking-normal placeholder:text-subtle/40"
              />
            </div>

            <Button type="submit" size="xl" fullWidth loading={regLoading} disabled={regLoading || regCode.length !== 6} className="font-black">
              {regLoading ? 'Verifying Account...' : <>Verify Email & Login <ArrowRight className="h-5 w-5" /></>}
            </Button>

            <div className="flex flex-col items-center gap-2 pt-2 text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResend}
                loading={resending}
                disabled={resending}
                className="text-xs font-bold"
              >
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                Resend Verification Code
              </Button>

              <button
                type="button"
                onClick={() => { setUnverifiedEmail(null); setRegError(''); setRegCode('') }}
                className="text-xs font-semibold text-zinc-500 hover:underline pt-1"
              >
                ← Back to login
              </button>
            </div>
          </form>
        ) : showForgot ? (
          <form onSubmit={handleForgotPassword} className="space-y-4 animate-fade-in">
            {forgotSuccess && (
              <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 font-medium">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>{forgotSuccess}</div>
              </div>
            )}
            <p className="text-xs text-zinc-600">
              Enter your account email address and we'll send you a link to reset your password.
            </p>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-subtle" />
              <input
                type="email"
                inputMode="email"
                placeholder="Enter your email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-surface-alt pl-11 pr-4 text-sm text-charcoal placeholder:text-subtle focus:border-primary focus:outline-none"
              />
            </div>
            <Button type="submit" size="xl" fullWidth loading={forgotLoading} disabled={forgotLoading} className="font-black">
              Send Password Reset Link <KeyRound className="ml-2 h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => { setShowForgot(false); setForgotSuccess('') }}
              className="w-full text-center text-xs font-semibold text-zinc-500 hover:underline pt-2"
            >
              ← Back to login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-danger/10 p-3 text-sm text-danger font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {/* Google / Gmail Sign In Button */}
            <Button
              type="button"
              variant="outline"
              size="xl"
              fullWidth
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="font-extrabold border-amber-300 bg-amber-50/50 text-charcoal hover:bg-amber-100/70 shadow-sm flex items-center justify-center gap-3 rounded-xl h-12"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google / Gmail</span>
            </Button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-amber-200" />
              </div>
              <span className="relative bg-surface px-3 text-xs font-semibold text-zinc-500">
                or continue with email
              </span>
            </div>

            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 h-5 w-5 text-subtle" />
                  <input type="text" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="h-12 w-full rounded-xl border border-border bg-surface-alt pl-11 pr-4 text-sm text-charcoal placeholder:text-subtle focus:border-primary focus:outline-none" />
                </div>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 h-5 w-5 text-subtle" />
                  <input type="text" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="h-12 w-full rounded-xl border border-border bg-surface-alt pl-11 pr-4 text-sm text-charcoal placeholder:text-subtle focus:border-primary focus:outline-none" />
                </div>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-subtle" />
              <input type="email" inputMode="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-12 w-full rounded-xl border border-border bg-surface-alt pl-11 pr-4 text-sm text-charcoal placeholder:text-subtle focus:border-primary focus:outline-none" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-subtle" />
              <input
                type={showLoginPassword ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="h-12 w-full rounded-xl border border-border bg-surface-alt pl-11 pr-11 text-sm text-charcoal placeholder:text-subtle focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-3.5 top-3.5 text-subtle hover:text-charcoal"
              >
                {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {mode === 'login' && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotEmail(form.email); setError('') }}
                  className="text-xs font-semibold text-[#D99F16] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <Button type="submit" size="xl" fullWidth loading={loading} disabled={loading} className="mt-4 font-black">
              {loading
                ? (mode === 'login' ? 'Logging in...' : 'Creating account...')
                : <>{mode === 'login' ? 'Log in' : 'Sign up'} <ArrowRight className="h-5 w-5" /></>
              }
            </Button>
          </form>
        )}

        {!showForgot && !unverifiedEmail && !otpStep && (
          <>
            <p className="mt-6 text-center text-sm text-muted">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} className="font-semibold text-primary">
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
            <p className="mt-4 text-center text-xs text-subtle">
              By continuing, you agree to our <Link href="/terms" className="text-primary">Terms</Link> and <Link href="/privacy" className="text-primary">Privacy Policy</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
