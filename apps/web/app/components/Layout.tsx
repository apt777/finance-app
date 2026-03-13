'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from '@/navigation'
import { usePathname, useRouter } from '@/navigation'
import { useOverviewData } from '@/hooks/useOverviewData'
import { useExchangeRates, ExchangeRate } from '@/hooks/useExchangeRates'
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus'
import { useAuth } from '@/context/AuthProviderClient'
import { useColorMode } from '@/context/ColorModeContext'
import { useUiTheme } from '@/context/UiThemeContext'
import {
  ChartColumnIncreasing,
  Home,
  LogIn,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Target,
  TrendingUp,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Account {
  id: string
  name: string
  type: string
  balance: number
  currency: string
}

interface Holding {
  id: string
  accountId: string
  symbol: string
  shares: number
  costBasis: number
  currency: string
}

interface NavLink {
  name: string
  href: string
  icon: React.ElementType
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const tCommon = useTranslations('common')
  const tAuth = useTranslations('auth')
  const tDashboard = useTranslations('dashboard')
  const tAccounts = useTranslations('accounts')
  const tGoals = useTranslations('goals')
  const tHoldings = useTranslations('holdings')
  const tTransactions = useTranslations('transactions')
  const tSettings = useTranslations('settings')

  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const { colorMode } = useColorMode()
  const { theme, mounted } = useUiTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { data: setupStatus, isLoading: setupLoading } = useOnboardingStatus()

  const { data, isLoading, isError } = useOverviewData()
  const { data: exchangeRates, isLoading: ratesLoading, isError: ratesError } = useExchangeRates()

  const accounts: Account[] = (data?.accounts as Account[]) || []
  const holdings: Holding[] = (data?.holdings as Holding[]) || []
  const rates: ExchangeRate[] = exchangeRates || []

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  const isSetupPage = pathname.startsWith('/setup')
  const isDashboardHome = pathname === '/'

  const navLinks: NavLink[] = useMemo(
    () => [
      { name: tDashboard('title'), href: '/', icon: Home },
      { name: tDashboard('analysisTitle'), href: '/analysis', icon: ChartColumnIncreasing },
      { name: tAccounts('title'), href: '/accounts', icon: Wallet },
      { name: tHoldings('title'), href: '/holdings', icon: TrendingUp },
      { name: tGoals('title'), href: '/goals', icon: Target },
      { name: tTransactions('title'), href: '/transactions', icon: Receipt },
      { name: tSettings('title'), href: '/settings', icon: Settings },
    ],
    [tAccounts, tDashboard, tGoals, tHoldings, tSettings, tTransactions]
  )

  const BASE_CURRENCY = 'JPY'

  const convertToBaseCurrency = (amount: number, currency: string): number => {
    if (currency === BASE_CURRENCY) return amount
    const rate = rates.find((item) => item.fromCurrency === currency && item.toCurrency === BASE_CURRENCY)?.rate
    return rate ? amount * rate : amount
  }

  let netWorth = 0
  if (!isLoading && !isError && !ratesLoading && !ratesError) {
    accounts.forEach((account) => {
      const convertedBalance = convertToBaseCurrency(account.balance, account.currency)
      netWorth += account.type === 'credit_card' ? -convertedBalance : convertedBalance
    })
    holdings.forEach((holding) => {
      netWorth += convertToBaseCurrency(holding.shares * holding.costBasis, holding.currency)
    })
  }

  const getPageTitle = (path: string) => {
    if (path === '/') return tDashboard('title')
    if (path.startsWith('/analysis')) return tDashboard('analysisTitle')
    if (path.startsWith('/accounts')) return tAccounts('title')
    if (path.startsWith('/holdings') || path.startsWith('/investments')) return tHoldings('title')
    if (path.startsWith('/goals')) return tGoals('title')
    if (path.startsWith('/transactions')) return tTransactions('title')
    if (path.startsWith('/settings')) return tSettings('title')
    if (path.startsWith('/setup')) return tDashboard('onboardingTitle')
    return path.substring(1).split('/')[0]
  }

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.push('/login')
    }
  }, [isAuthPage, loading, router, user])

  useEffect(() => {
    if (loading || setupLoading || !user) {
      return
    }

    if (!isAuthPage && !isSetupPage && setupStatus && !setupStatus.completed) {
      router.push('/setup')
    }

    if (isSetupPage && setupStatus?.completed) {
      router.push('/')
    }
  }, [isAuthPage, isSetupPage, loading, router, setupLoading, setupStatus, user])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      alert(error.message)
      return
    }

    router.push('/login')
  }

  if (loading || (user && setupLoading && !isSetupPage)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-lg text-gray-700">{tCommon('loading')}</p>
        </div>
      </div>
    )
  }

  if (!user && !isAuthPage) {
    return null
  }

  if (isAuthPage) {
    return <>{children}</>
  }

  if (!mounted) {
    return <div className="min-h-screen bg-background" />
  }

  const isDark = colorMode === 'dark'

  if (theme === 'old') {
    return (
      <div className={`flex min-h-screen pb-20 md:pb-0 ${isDark ? 'bg-[linear-gradient(180deg,#08111f_0%,#0d1a2d_42%,#07111f_100%)] text-slate-100' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
        {user && (
          <>
            {isSidebarOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            <aside
              className={`
                fixed inset-y-0 left-0 z-50 flex w-72 flex-col text-white shadow-2xl transition-transform duration-300 ease-in-out
                md:relative md:translate-x-0
                ${isDark ? 'bg-[#08111f] border-r border-white/10' : 'bg-gradient-to-b from-slate-800 to-slate-900'}
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              `}
            >
              <div className="flex items-center justify-between border-b border-slate-700 p-6">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-xl font-bold text-transparent">
                      {tCommon('appName')}
                    </h1>
                    <p className="text-xs text-slate-400">{tCommon('appDescription')}</p>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-white md:hidden" onClick={() => setIsSidebarOpen(false)}>
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="flex-grow space-y-1 overflow-y-auto p-4">
                {navLinks.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center space-x-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                        isActive
                          ? 'scale-105 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/50'
                          : 'hover:translate-x-1 hover:bg-slate-700/50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className={`font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>{link.name}</span>
                    </Link>
                  )
                })}
              </nav>

              <div className="border-t border-slate-700 p-4">
                <div className="mb-3 rounded-xl bg-slate-700/50 p-4">
                  <div className="mb-2 flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{user?.email}</p>
                      <p className="text-xs text-slate-400">{tCommon('activeUser')}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-red-500/10 px-4 py-3 text-red-400 transition-all duration-200 hover:bg-red-500/20 hover:text-red-300"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">{tCommon('logout')}</span>
                </button>
              </div>
            </aside>
          </>
        )}

        <div className="flex w-full max-w-full flex-grow flex-col overflow-x-hidden">
          <header className={`sticky top-0 z-10 shadow-sm backdrop-blur-md ${isDark ? 'border-b border-white/10 bg-slate-950/70' : 'border-b border-slate-200 bg-white/80'}`}>
            <div className="flex items-center justify-between px-4 py-4 md:px-8">
              <div className="flex items-center space-x-3">
                <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setIsSidebarOpen(true)}>
                  <Menu className="h-6 w-6" />
                </button>
                <div>
                  <h1 className={`max-w-[150px] truncate text-lg font-bold md:max-w-none md:text-2xl ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {getPageTitle(pathname || '')}
                  </h1>
                  <p className={`mt-0.5 hidden text-sm md:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {pathname === '/' ? tDashboard('subtitle') : ''}
                  </p>
                </div>
              </div>

              {user ? (
                <div className="flex items-center">
                  <div className={`rounded-xl px-3 py-2 md:px-4 ${isDark ? 'border border-white/10 bg-white/5' : 'border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50'}`}>
                    <div className="flex items-center space-x-3 md:space-x-6">
                      <div className="hidden sm:block">
                        <p className={`mb-0.5 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{tAccounts('totalAccounts')}</p>
                        <p className={`text-sm font-bold md:text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>{accounts.length}</p>
                      </div>
                      <div className={`hidden h-6 w-px md:h-8 sm:block ${isDark ? 'bg-white/10' : 'bg-slate-300'}`} />
                      <div>
                        <p className={`mb-0.5 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{tDashboard('totalAssets')}</p>
                        <p className={`text-sm font-bold md:text-lg ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                          {Math.round(netWorth).toLocaleString()} <span className="text-[10px] md:text-xs">{BASE_CURRENCY}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-white transition-all duration-200 hover:scale-105 hover:shadow-lg md:px-4 md:py-2"
                >
                  <LogIn className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-sm md:font-medium">{tAuth('login')}</span>
                </Link>
              )}
            </div>
          </header>

          <main className="flex-grow p-4 md:p-8">
            <div className="fade-in max-w-full">{children}</div>
          </main>

          <footer className={`hidden py-4 text-center backdrop-blur-sm md:block ${isDark ? 'border-t border-white/10 bg-slate-950/40' : 'border-t border-slate-200 bg-white/50'}`}>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>&copy; 2026 {tCommon('appName')}. All rights reserved.</p>
          </footer>
        </div>
      </div>
    )
  }

  const modernTopNav = (
    <div className={`fixed inset-x-0 top-0 z-30 border-b ${isDark ? 'border-white/10 bg-[#14171b]/96' : 'border-slate-200/80 bg-white/96'} backdrop-blur-xl`}>
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-4 py-4 md:px-8 md:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? isDark
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-slate-900 text-white shadow-md'
                      : isDark
                        ? 'border border-white/10 bg-white/5 text-slate-200 shadow-sm hover:border-white/20 hover:text-white'
                        : 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:text-slate-950'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`rounded-[20px] px-4 py-3 shadow-sm ${isDark ? 'border border-white/10 bg-white/5' : 'border border-slate-200 bg-white'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{tAccounts('totalAccounts')}</p>
              <p className={`mt-2 text-xl font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-950'}`}>{accounts.length}</p>
            </div>
            <div className={`rounded-[20px] px-4 py-3 shadow-sm ${isDark ? 'border border-white/10 bg-white/5 text-white' : 'border border-slate-200 bg-slate-50 text-slate-950'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tDashboard('totalAssets')}</p>
              <p className="mt-2 text-xl font-black tabular-nums">
                {Math.round(netWorth).toLocaleString()} <span className="text-xs text-slate-400">{BASE_CURRENCY}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition-all hover:border-red-300 hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              {tCommon('logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen pb-8 ${isDark ? 'text-slate-100' : ''}`}>
      {modernTopNav}
      <main className="px-4 pb-8 pt-[132px] md:px-8 md:pt-[148px]">
        <div className="mx-auto max-w-[1680px] fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
