'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useOverviewData } from '../hooks/useOverviewData'
import { useExchangeRates, ExchangeRate } from '../hooks/useExchangeRates'
import { Home, Wallet, TrendingUp, Target, Settings, LogOut, User, LogIn, DollarSign, Receipt } from 'lucide-react'
import { useAuth } from '../context/AuthProviderClient'

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
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, signOut } = useAuth()

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

  const creditLiabilities = new Map<string, number>();
  if (!isLoading && !isError) {
    accounts.forEach((account) => {
      if (account.type === 'credit_card' && account.balance > 0) {
        const currentLiability = creditLiabilities.get(account.currency) || 0;
        creditLiabilities.set(account.currency, currentLiability + account.balance);
      }
    });
  }

  const navLinks: NavLink[] = [
    { name: '대시보드', href: '/', icon: Home },
    { name: '계좌', href: '/accounts', icon: Wallet },
    { name: '투자', href: '/holdings', icon: TrendingUp },
    { name: '목표', href: '/goals', icon: Target },
    { name: '거래내역', href: '/transactions', icon: Receipt },
    { name: '환율 관리', href: '/settings/exchange-rates', icon: DollarSign },
    { name: '설정', href: '/setup', icon: Settings },
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
          <p className="text-lg text-gray-700">인증 정보 로딩 중...</p>
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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      {user && (
        <aside className="w-72 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col shadow-2xl">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Finance Boss
                </h1>
                <p className="text-xs text-slate-400">자산 관리 시스템</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-grow p-4 space-y-1">
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
                  <p className="text-xs text-slate-400">활성 사용자</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">로그아웃</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col">
        {/* Top Bar */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-10">
          <div className="px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {pathname === '/' ? '대시보드' : pathname?.substring(1).split('/')[0]}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {pathname === '/' ? '전체 자산 현황을 확인하세요' : ''}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  {(isLoading || ratesLoading) && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>데이터 로딩 중...</span>
                    </div>
                  )}
                  {(isError || ratesError) && (
                    <span className="text-sm text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">
                      데이터 로딩 오류
                    </span>
                  )}
                  {(!isLoading && !isError && !ratesLoading && !ratesError) && (
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-xl border border-blue-200">
                        <div className="flex items-center space-x-6">
                          <div>
                            <p className="text-xs text-slate-600 mb-0.5">계좌 수</p>
                            <p className="text-lg font-bold text-slate-800">{accounts.length}</p>
                          </div>
                          <div className="w-px h-8 bg-slate-300"></div>
                          <div>
                            <p className="text-xs text-slate-600 mb-0.5">총자산</p>
                            <p className="text-lg font-bold text-blue-600">
                              {Math.round(netWorth).toLocaleString()} {BASE_CURRENCY}
                            </p>
                          </div>
                          {Array.from(creditLiabilities.entries()).map(([currency, amount]) => (
                            <div key={currency}>
                              <p className="text-xs text-slate-600 mb-0.5">부채 ({currency})</p>
                              <p className="text-lg font-bold text-red-500">
                                -{Math.round(amount).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link 
                  href="/login" 
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <LogIn className="w-5 h-5" />
                  <span className="font-medium">로그인</span>
                </Link>
              )}
            </div>
          </div>
        </header>
        
        <main className="flex-grow p-8">
          {user && !isLoading && accounts.length === 0 && pathname !== '/setup' ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Wallet className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-3">
                  Finance Boss에 오신 것을 환영합니다!
                </h2>
                <p className="text-slate-600 mb-8">
                  아직 등록된 계좌가 없습니다. 초기 설정을 시작해서 자산 관리를 시작하세요.
                </p>
                <Link
                  href="/setup"
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <Settings className="w-5 h-5" />
                  <span>초기 설정 시작하기</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="fade-in">
              {children}
            </div>
          )}
        </main>
        
        <footer className="bg-white/50 backdrop-blur-sm border-t border-slate-200 text-center py-4">
          <p className="text-sm text-slate-600">
            &copy; 2024 Finance Boss. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  )
}

export default Layout
