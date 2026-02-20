'use client'

import React, { useEffect, useState } from 'react'
import { Link } from '@/navigation'
import { usePathname, useRouter } from '@/navigation'
import { useOverviewData } from '@/hooks/useOverviewData'
import { useExchangeRates, ExchangeRate } from '@/hooks/useExchangeRates'
import { Home, Wallet, TrendingUp, Target, Settings, LogOut, User, LogIn, DollarSign, Receipt, Menu, X } from 'lucide-react'
import { useAuth } from '@/context/AuthProviderClient'
import { useTranslations } from 'next-intl'

// Define interfaces for data structures
interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface Holding {
  id: string;
  accountId: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currency: string;
}

interface NavLink {
  name: string;
  href: string;
  icon: React.ElementType;
}

const Layout = ({ children }: { children: React.ReactNode }) => {
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const { data, isLoading, isError } = useOverviewData()
  const { data: exchangeRates, isLoading: ratesLoading, isError: ratesError } = useExchangeRates()

  // Type assertions for data from hooks
  const accounts: Account[] = (data?.accounts as Account[]) || []
  const holdings: Holding[] = (data?.holdings as Holding[]) || []
  const rates: ExchangeRate[] = exchangeRates || []

  const BASE_CURRENCY = 'JPY'

  const convertToBaseCurrency = (amount: number, currency: string): number => {
    if (currency === BASE_CURRENCY) return amount
    const rate = rates.find((r) => r.fromCurrency === currency && r.toCurrency === BASE_CURRENCY)?.rate
    return rate ? amount * rate : amount
  }

  let netWorth = 0
  if (!isLoading && !isError && !ratesLoading && !ratesError) {
    accounts.forEach((account) => {
      const convertedBalance = convertToBaseCurrency(account.balance, account.currency)
      if (account.type === 'credit_card') {
        netWorth -= convertedBalance
      } else {
        netWorth += convertedBalance
      }
    })
    holdings.forEach((holding) => {
      netWorth += convertToBaseCurrency(holding.shares * holding.costBasis, holding.currency)
    })
  }

  const getPageTitle = (path: string) => {
    if (path === '/') return tDashboard('title');
    if (path.startsWith('/accounts')) return tAccounts('title');
    if (path.startsWith('/holdings') || path.startsWith('/investments')) return tHoldings('title');
    if (path.startsWith('/goals')) return tGoals('title');
    if (path.startsWith('/transactions')) return tTransactions('title');
    if (path === '/settings/exchange-rates') return tSettings('exchangeRates');
    if (path.startsWith('/settings')) return tSettings('title');
    if (path.startsWith('/setup')) return tCommon('add'); // Fallback or Setup title
    return path.substring(1).split('/')[0];
  }

  const navLinks: NavLink[] = [
    { name: tDashboard('title'), href: '/', icon: Home },
    { name: tAccounts('title'), href: '/accounts', icon: Wallet },
    { name: tHoldings('title'), href: '/holdings', icon: TrendingUp },
    { name: tGoals('title'), href: '/goals', icon: Target },
    { name: tTransactions('title'), href: '/transactions', icon: Receipt },
    { name: tSettings('exchangeRates'), href: '/settings/exchange-rates', icon: DollarSign },
    { name: tSettings('title'), href: '/setup', icon: Settings }, // Setup maps to Settings icon
  ]

  // Bottom Tab Bar links (Mobile only)
  const bottomNavLinks = [
    { name: tDashboard('overview'), href: '/', icon: Home },
    { name: tAccounts('title'), href: '/accounts', icon: Wallet },
    { name: tHoldings('title'), href: '/holdings', icon: TrendingUp },
    { name: tTransactions('title'), href: '/transactions', icon: Receipt },
    { name: 'Menu', href: '#', icon: Menu, onClick: () => setIsSidebarOpen(true) }, // Menu kept hardcoded or tCommon('menu') if exists?
  ]

  useEffect(() => {
    if (
      !loading &&
      !user &&
      pathname !== '/login' &&
      pathname !== '/register' &&
      pathname !== '/forgot-password' &&
      pathname !== '/reset-password'
    ) {
      router.push('/login')
    }
  }, [user, loading, pathname, router])

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      alert(error.message)
    } else {
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg text-gray-700">{tCommon('loading')}</p>
        </div>
      </div>
    )
  }

  if (
    !user &&
    pathname !== '/login' &&
    pathname !== '/register' &&
    pathname !== '/forgot-password' &&
    pathname !== '/reset-password'
  ) {
    return null
  }

  if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password') {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-20 md:pb-0">
      {/* Sidebar (Desktop) / Drawer (Mobile) */}
      {user && (
        <>
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          
          <aside className={`
            fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    {tCommon('appName')}
                  </h1>
                  <p className="text-xs text-slate-400">{tCommon('appDescription')}</p>
                </div>
              </div>
              <button className="md:hidden p-2 text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
              {navLinks.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/50 scale-105' 
                        : 'hover:bg-slate-700/50 hover:translate-x-1'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className={`font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>
                      {link.name}
                    </span>
                  </Link>
                )
              })}
            </nav>
            
            <div className="p-4 border-t border-slate-700">
              <div className="bg-slate-700/50 rounded-xl p-4 mb-3">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    <p className="text-xs text-slate-400">Active User</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">{tCommon('logout')}</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col w-full max-w-full overflow-x-hidden">
        {/* Top Bar */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-10">
          <div className="px-4 md:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button 
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-slate-800 truncate max-w-[150px] md:max-w-none">
                  {getPageTitle(pathname || '')}
                </h1>
                <p className="hidden md:block text-sm text-slate-500 mt-0.5">
                  {pathname === '/' ? tDashboard('subtitle') : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              {user ? (
                <>
                  {(isLoading || ratesLoading) && (
                    <div className="flex items-center space-x-2 text-xs md:text-sm text-slate-600">
                      <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="hidden sm:inline">{tCommon('loading')}</span>
                    </div>
                  )}
                  {(!isLoading && !isError && !ratesLoading && !ratesError) && (
                    <div className="flex items-center">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-blue-200">
                        <div className="flex items-center space-x-3 md:space-x-6">
                          <div className="hidden sm:block">
                            <p className="text-[10px] text-slate-600 mb-0.5">{tAccounts('totalAccounts')}</p>
                            <p className="text-sm md:text-lg font-bold text-slate-800">{accounts.length}</p>
                          </div>
                          <div className="hidden sm:block w-px h-6 md:h-8 bg-slate-300"></div>
                          <div>
                            <p className="text-[10px] text-slate-600 mb-0.5">{tDashboard('totalAssets')}</p>
                            <p className="text-sm md:text-lg font-bold text-blue-600">
                              {Math.round(netWorth).toLocaleString()} <span className="text-[10px] md:text-xs">{BASE_CURRENCY}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link 
                  href="/login" 
                  className="flex items-center space-x-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <LogIn className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-sm md:font-medium">{tAuth('login')}</span>
                </Link>
              )}
            </div>
          </div>
        </header>
        
        <main className="flex-grow p-4 md:p-8">
          {user && !isLoading && accounts.length === 0 && pathname !== '/setup' ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md px-4">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Wallet className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
                  Welcome to {tCommon('appName')}!
                </h2>
                <p className="text-sm md:text-base text-slate-600 mb-8">
                  {tAccounts('noAccounts') || 'Please set up your accounts.'}
                </p>
                <Link
                  href="/setup"
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 md:px-8 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <Settings className="w-5 h-5" />
                  <span>{tCommon('add')}</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="fade-in max-w-full">
              {children}
            </div>
          )}
        </main>
        
        <footer className="hidden md:block bg-white/50 backdrop-blur-sm border-t border-slate-200 text-center py-4">
          <p className="text-sm text-slate-600">
            &copy; 2026 {tCommon('appName')}. All rights reserved.
          </p>
        </footer>

        {/* Bottom Navigation Bar (Mobile Only) */}
        {user && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-2 py-2 flex justify-around items-center z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            {bottomNavLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={link.onClick}
                  className={`flex flex-col items-center justify-center space-y-1 px-3 py-1 rounded-lg transition-all duration-200 ${
                    isActive ? 'text-blue-600' : 'text-slate-500'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''}`} />
                  <span className="text-[10px] font-medium">{link.name}</span>
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}

export default Layout
