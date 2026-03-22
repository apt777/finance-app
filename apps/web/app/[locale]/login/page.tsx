'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from '@/navigation'
import { Link } from '@/navigation'
import { useAuth } from '@/context/AuthProviderClient'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslations } from 'next-intl'
import KablusMark from '@/components/KablusMark'

export default function Login() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user, signIn } = useAuth()

  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setIsLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setErrorMessage(error.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_45%,#f8fafc_100%)] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_28%)]" />
      <div className="absolute left-6 top-6 z-40 sm:left-auto sm:right-6">
        <LanguageSwitcher align="start" />
      </div>
      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[0.98fr_1.02fr] lg:items-stretch">
        <div className="hidden h-full rounded-[36px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(241,245,249,0.88)_38%,_rgba(226,232,240,0.78)_100%)] p-8 shadow-[0_28px_80px_rgba(148,163,184,0.18)] backdrop-blur-xl lg:block">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/75 px-4 py-2 shadow-sm">
                <KablusMark className="h-6 w-6" />
                <span className="text-sm font-semibold text-slate-700">Kablus</span>
              </div>
            </div>
            <div className="relative mt-6 flex-1 overflow-hidden rounded-[32px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.14)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Live workspace</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">오늘의 금융 화면</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-[28px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,243,255,0.92)_45%,_rgba(211,226,255,0.92)_100%)] p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">순자산</p>
                      <p className="mt-2 text-3xl font-bold tracking-[-0.03em] text-slate-950">3,820,400</p>
                      <p className="mt-1 text-xs text-emerald-600">이번 주 +2.4%</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="h-10 w-3 rounded-full bg-slate-900/10 animate-[pulse_1.8s_ease-in-out_infinite]" />
                      <span className="h-14 w-3 rounded-full bg-slate-900/20 animate-[pulse_1.8s_ease-in-out_infinite_0.2s]" />
                      <span className="h-8 w-3 rounded-full bg-slate-900/10 animate-[pulse_1.8s_ease-in-out_infinite_0.4s]" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">최근 지출</p>
                    <p className="mt-2 text-xl font-bold text-slate-950">124,000</p>
                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                      <div className="h-2 w-[62%] rounded-full bg-slate-900/70 animate-[pulse_2.4s_ease-in-out_infinite]" />
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">목표 진행</p>
                    <p className="mt-2 text-xl font-bold text-slate-950">68%</p>
                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                      <div className="h-2 w-[68%] rounded-full bg-emerald-500 animate-[pulse_2.6s_ease-in-out_infinite]" />
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">최근 거래</p>
                    <p className="text-xs text-slate-400">Today</p>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 animate-[fadeIn_0.9s_ease-in-out]">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Lunch</p>
                        <p className="text-xs text-slate-500">식비</p>
                      </div>
                      <p className="text-sm font-bold text-rose-600">-12,000</p>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 animate-[fadeIn_1.2s_ease-in-out]">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Salary</p>
                        <p className="text-xs text-slate-500">급여</p>
                      </div>
                      <p className="text-sm font-bold text-emerald-600">+320,000</p>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 animate-[fadeIn_1.5s_ease-in-out]">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">ETF Buy</p>
                        <p className="text-xs text-slate-500">투자</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">-80,000</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative h-full w-full">
          <div className="flex h-full flex-col rounded-[36px] border border-white/80 bg-white/72 p-8 shadow-[0_28px_80px_rgba(148,163,184,0.16)] backdrop-blur-xl">
            <div className="mb-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-white/80 bg-white/80 p-3 shadow-sm">
                  <KablusMark className="h-12 w-12" />
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-[-0.03em] text-slate-950">{tCommon('appName')}</h1>
              <p className="mt-2 text-sm text-slate-500">{tCommon('appDescription')}</p>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
            {/* Email Input */}
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-2">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                <p className="font-medium">{t('loginFailed')}</p>
                <p className="text-xs mt-1">{errorMessage}</p>
              </div>
            )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center space-x-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition-all duration-200 hover:bg-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{t('signingIn')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('login')}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white/80 text-slate-400">OR</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-center">
                <p className="text-slate-600 text-sm">
                  {t('dontHaveAccount')}{' '}
                  <Link 
                    href="/register" 
                    className="font-semibold text-slate-900 transition-colors hover:text-slate-700"
                  >
                    {t('register')}
                  </Link>
                </p>
              </div>
              <div className="text-center">
                <Link 
                  href="/forgot-password" 
                  className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-slate-400 text-xs">
            <p>{tCommon('appName')} © 2026 · {tCommon('appDescription')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
