'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useOverviewData } from '../hooks/useOverviewData'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { Home, Wallet, TrendingUp, Target, LogOut, User, LogIn } from 'lucide-react'
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

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
}

interface NavLink {
  name: string;
  href: string;
  icon: React.ElementType; // Type for Lucide icon components
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
  const rates: ExchangeRate[] = (exchangeRates as ExchangeRate[]) || []

  const BASE_CURRENCY = 'JPY'

  const convertToBaseCurrency = (amount: number, currency: string): number => {
    if (currency === BASE_CURRENCY) return amount
    const rate = rates.find((r) => r.from === currency && r.to === BASE_CURRENCY)?.rate
    return rate ? amount * rate : amount
  }

  let netWorth = 0
  if (!isLoading && !isError && !ratesLoading && !ratesError) {
    accounts.forEach((account) => {
      netWorth += convertToBaseCurrency(account.balance, account.currency)
    })
    holdings.forEach((holding) => {
      netWorth += convertToBaseCurrency(holding.shares * holding.costBasis, holding.currency)
    })
  }

  const navLinks: NavLink[] = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Accounts', href: '/accounts', icon: Wallet },
    { name: 'Holdings', href: '/holdings', icon: TrendingUp },
    { name: 'Goals', href: '/goals', icon: Target },
    { name: 'Transactions', href: '/transactions', icon: Wallet }, // Added Transactions link
  ]

  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/register') {
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading authentication...</p>
      </div>
    )
  }

  if (!user && pathname !== '/login' && pathname !== '/register') {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      {user && (
        <aside className="w-64 bg-gray-800 text-white flex flex-col p-4">
          <div className="text-2xl font-bold mb-8">Finance Boss</div>
          <nav className="flex-grow">
            <ul>
              {navLinks.map((link) => {
                const Icon = link.icon
                return (
                  <li key={link.name} className="mb-2">
                    <Link
                      href={link.href}
                      className={`flex items-center p-2 rounded-md ${
                        pathname === link.href ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="mr-3" size={20} />
                      {link.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="mt-auto border-t border-gray-700 pt-4">
            <div className="flex items-center mb-2">
              <User className="mr-3" size={20} />
              <span>{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center p-2 rounded-md hover:bg-gray-700 w-full text-left"
            >
              <LogOut className="mr-3" size={20} />
              Logout
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col">
        {/* Top Bar */}
        <header className="bg-white shadow p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold capitalize">
            {pathname === '/' ? 'Dashboard' : pathname?.substring(1).split('/')[0]} {/* Added null check for pathname */}
          </h1>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {(isLoading || ratesLoading) && <span className="text-sm">Loading data...</span>}
                {(isError || ratesError) && <span className="text-sm text-red-500">Error loading data</span>}
                {(!isLoading && !isError && !ratesLoading && !ratesError) && (
                  <div className="text-sm">
                    Accounts: {accounts.length} | Net Worth: {netWorth.toFixed(2)} {BASE_CURRENCY}
                  </div>
                )}
              </>
            ) : (
              <Link href="/login" className="flex items-center p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600">
                <LogIn className="mr-2" size={20} />
                Login
              </Link>
            )}
          </div>
        </header>
        <main className="flex-grow p-4">{children}</main>
        <footer className="bg-gray-200 text-center p-4 mt-auto">
          <p>&copy; 2024 Finance Boss</p>
        </footer>
      </div>
    </div>
  )
}

export default Layout
