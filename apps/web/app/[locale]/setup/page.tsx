'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Settings, Plus, Trash2, Wallet, Repeat, PiggyBank, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { getDefaultTransactionCategories } from '@/lib/defaultCategories'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { getUiCopy } from '@/lib/uiCopy'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'
import { getLocaleBaseCurrency, getLocaleMirrorCurrency, getLocaleTrackedCurrencies } from '@/lib/currencyPreferences'
import type { SupportedCurrency } from '@/lib/currencyPreferences'

interface AccountInput {
  name?: string
  type?: string
  currency?: string
  balance?: number | string
}

interface ExchangeRateInput {
  fromCurrency?: string
  toCurrency?: string
  rate?: number | string
}

interface BudgetInput {
  name?: string
  categoryKey?: string
  amount?: number | string
  currency?: string
  period?: string
  year?: number
  month?: number
  alertThreshold?: number
}

interface RecurringInput {
  name?: string
  description?: string
  type?: 'income' | 'expense' | 'transfer'
  amount?: number | string
  currency?: string
  categoryKey?: string
  accountName?: string
  fromAccountName?: string
  toAccountName?: string
  interval?: string
  dayOfMonth?: number | string
  startDate?: string
}

const today = new Date()

export default function SetupPage() {
  const router = useRouter()
  const locale = useLocale()
  const ui = getUiCopy(locale)
  const tTransactions = useTranslations('transactions')
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currencies, setCurrencies] = useState<Array<{ code: string }>>([])
  const [accountTypes, setAccountTypes] = useState<Array<{ key: string; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ key: string; name: string; type: string }>>([])
  const [baseCurrency, setBaseCurrency] = useState(getLocaleBaseCurrency(locale))
  const [mirrorCurrency, setMirrorCurrency] = useState(getLocaleMirrorCurrency(locale))
  const [trackedCurrencies, setTrackedCurrencies] = useState<string[]>(getLocaleTrackedCurrencies(locale))

  const [accounts, setAccounts] = useState<AccountInput[]>([
    { name: '', type: 'checking', currency: getLocaleBaseCurrency(locale), balance: '' },
  ])
  const [budgets, setBudgets] = useState<BudgetInput[]>([
    {
      name: ui.setup.defaultBudgetName,
      categoryKey: 'food',
      amount: '',
      currency: getLocaleBaseCurrency(locale),
      period: 'monthly',
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      alertThreshold: 80,
    },
  ])
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringInput[]>([
    {
      name: '',
      description: '',
      type: 'expense',
      amount: '',
      currency: getLocaleBaseCurrency(locale),
      categoryKey: 'housing',
      accountName: '',
      fromAccountName: '',
      toAccountName: '',
      interval: 'monthly',
      dayOfMonth: today.getDate(),
      startDate: new Date().toISOString().split('T')[0] ?? '',
    },
  ])

  useEffect(() => {
    const fetchData = async () => {
      const [currencyResponse, typeResponse, categoryResponse] = await Promise.all([
        fetch('/api/currencies'),
        fetch('/api/account-types'),
        fetch('/api/categories'),
      ])

      if (currencyResponse.ok) {
        const currencyData = await currencyResponse.json()
        setCurrencies(currencyData)
      }

      if (typeResponse.ok) {
        const typeData = await typeResponse.json()
        setAccountTypes(typeData)
      }

      if (categoryResponse.ok) {
        const categoryData = await categoryResponse.json()
        setCategories(categoryData)
      } else {
        setCategories(getDefaultTransactionCategories(locale))
      }
    }

    fetchData().catch(() => {
      setCategories(getDefaultTransactionCategories(locale))
    })
  }, [locale])

  useEffect(() => {
    const requestedStep = Number(searchParams.get('step'))
    if ([1, 2, 3].includes(requestedStep)) {
      setStep(requestedStep)
    }
  }, [searchParams])

  useEffect(() => {
    setBaseCurrency((current) => current || getLocaleBaseCurrency(locale))
    setMirrorCurrency((current) => current || getLocaleMirrorCurrency(locale))
    setTrackedCurrencies((current) => (current.length >= 2 ? current : getLocaleTrackedCurrencies(locale)))
  }, [locale])

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories]
  )

  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === 'income'),
    [categories]
  )

  const handleSubmit = async () => {
    setError(null)

    setIsLoading(true)

    const normalizedAccounts = accounts
      .filter((account) => account.name?.trim())
      .map((account) => ({
        name: account.name?.trim(),
        type: account.type || 'checking',
        currency: account.currency || baseCurrency,
        balance: Number(account.balance) || 0,
      }))

    try {
      const response = await fetch('/api/setup/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: normalizedAccounts,
          exchangeRates: [],
          locale,
          trackedCurrencies,
          baseCurrency,
          mirrorCurrency,
          budgets: budgets.filter((budget) => Number(budget.amount) > 0),
          recurringTransactions: recurringTransactions
            .filter((item) => item.name && item.description && Number(item.amount) > 0)
            .map((item) => ({
              ...item,
              accountName: item.type === 'transfer' ? undefined : item.accountName || undefined,
              fromAccountName: item.type === 'transfer' ? item.fromAccountName || undefined : undefined,
              toAccountName: item.type === 'transfer' ? item.toAccountName || undefined : undefined,
              categoryKey: item.type === 'transfer' ? 'transfer' : item.categoryKey,
              dayOfMonth: Number(item.dayOfMonth) || undefined,
            })),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || ui.setup.onboardingFailed)
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['setup-status'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['trackedCurrencies'] }),
      ])

      window.localStorage.setItem('kablus-base-currency', baseCurrency)
      window.localStorage.setItem('kablus-mirror-currency', mirrorCurrency)

      router.push('/')
    } catch (submitError: any) {
      setError(submitError.message)
    } finally {
      setIsLoading(false)
    }
  }

  const addAccount = () => {
    setAccounts((current) => [...current, { name: '', type: 'checking', currency: baseCurrency, balance: '' }])
  }

  const addBudget = () => {
    setBudgets((current) => [
      ...current,
      {
        name: '',
        categoryKey: expenseCategories[0]?.key ?? 'food',
        amount: '',
        currency: baseCurrency,
        period: 'monthly',
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        alertThreshold: 80,
      },
    ])
  }

  const handleSkip = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/setup/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: [],
          exchangeRates: [],
          locale,
          trackedCurrencies,
          baseCurrency,
          mirrorCurrency,
          budgets: [],
          recurringTransactions: [],
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || ui.setup.skipFailed)
      }

      await queryClient.invalidateQueries({ queryKey: ['setup-status'] })
      await queryClient.invalidateQueries({ queryKey: ['trackedCurrencies'] })
      window.localStorage.setItem('kablus-base-currency', baseCurrency)
      window.localStorage.setItem('kablus-mirror-currency', mirrorCurrency)
      router.push('/')
    } catch (skipError: any) {
      setError(skipError.message)
    } finally {
      setIsLoading(false)
    }
  }

  const addRecurring = () => {
    setRecurringTransactions((current) => [
      ...current,
      {
        name: '',
        description: '',
        type: 'expense',
        amount: '',
        currency: baseCurrency,
        categoryKey: expenseCategories[0]?.key ?? 'food',
        accountName: '',
        fromAccountName: '',
        toAccountName: '',
        interval: 'monthly',
        dayOfMonth: today.getDate(),
        startDate: new Date().toISOString().split('T')[0] ?? '',
      },
    ])
  }

  const stepConfig = [
    { id: 1, title: ui.setup.step1, icon: Wallet },
    { id: 2, title: ui.setup.step2, icon: PiggyBank },
    { id: 3, title: ui.setup.step3, icon: Repeat },
  ]
  const fieldClassName =
    'w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
  const selectClassName = `${fieldClassName} appearance-none`
  const deleteButtonClassName =
    'inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors'

  const ensureTrackedCurrency = (currency: string) => {
    setTrackedCurrencies((current) => (current.includes(currency) ? current : [...current, currency]))
  }

  const handleBaseCurrencyChange = (currency: SupportedCurrency) => {
    setBaseCurrency((current) => {
      setAccounts((items) => items.map((item) => ({
        ...item,
        currency: item.currency === current ? currency : item.currency,
      })))
      setBudgets((items) => items.map((item) => ({
        ...item,
        currency: item.currency === current ? currency : item.currency,
      })))
      setRecurringTransactions((items) => items.map((item) => ({
        ...item,
        currency: item.currency === current ? currency : item.currency,
      })))
      return currency
    })

    ensureTrackedCurrency(currency)
  }

  const handleMirrorCurrencyChange = (currency: SupportedCurrency) => {
    setMirrorCurrency(currency)
    ensureTrackedCurrency(currency)
  }

  const toggleTrackedCurrency = (currency: string) => {
    setTrackedCurrencies((current) => {
      if (current.includes(currency)) {
        if (currency === baseCurrency || currency === mirrorCurrency) {
          return current
        }
        return current.length <= 2 ? current : current.filter((item) => item !== currency)
      }

      return [...current, currency]
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center mb-4">
              <Settings className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">{ui.setup.title}</h1>
            <p className="text-slate-600 mt-2">
              {ui.setup.desc}
            </p>
            <p className="text-sm text-slate-500 mt-3">
              {ui.setup.descSub}
            </p>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">{ui.setup.languageTitle}</p>
              <p className="mt-1 text-xs text-slate-500">{ui.setup.languageDesc}</p>
              <div className="mt-3">
                <LanguageSwitcher align="start" />
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">{ui.setup.currencyTitle}</p>
              <p className="mt-1 text-xs text-slate-500">{ui.setup.currencyDesc}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {ui.setup.baseCurrencyLabel}
                  </label>
                  <select
                    value={baseCurrency}
                    onChange={(event) => handleBaseCurrencyChange(event.target.value as SupportedCurrency)}
                    className={`${selectClassName} mt-2`}
                  >
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {ui.setup.mirrorCurrencyLabel}
                  </label>
                  <select
                    value={mirrorCurrency}
                    onChange={(event) => handleMirrorCurrencyChange(event.target.value as SupportedCurrency)}
                    className={`${selectClassName} mt-2`}
                  >
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {ui.setup.trackedCurrenciesLabel}
                </p>
                <p className="mt-1 text-xs text-slate-500">{ui.setup.trackedCurrenciesDesc}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUPPORTED_CURRENCIES.map((currency) => {
                    const active = trackedCurrencies.includes(currency)

                    return (
                      <button
                        key={currency}
                        type="button"
                        onClick={() => toggleTrackedCurrency(currency)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                          active
                            ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
                        }`}
                      >
                        {currency}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 max-w-sm">
            <div className="flex items-center gap-3 text-emerald-700 font-semibold">
              <ShieldCheck className="w-5 h-5" />
              {ui.setup.securityTitle}
            </div>
            <p className="text-sm text-emerald-700/80 mt-2">
              {ui.setup.securityDesc}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSkip}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {ui.setup.skip}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-8">
          {stepConfig.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setStep(id)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                step === id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              <Icon className="w-5 h-5 mb-3" />
              <p className="text-xs font-semibold uppercase tracking-wide">0{id}</p>
              <p className="text-lg font-bold">{title}</p>
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{ui.setup.accountTitle}</h2>
              <p className="text-slate-600 mt-1">{ui.setup.accountDesc}</p>
              <p className="text-sm text-slate-500 mt-2">{ui.setup.accountDescSub}</p>
            </div>
            <button onClick={addAccount} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white">
              <Plus className="w-4 h-4" />
              {ui.setup.addAccount}
            </button>
          </div>

          <div className="space-y-4">
            {accounts.map((account, index) => (
              <div key={`account-${index}`} className="grid grid-cols-1 md:grid-cols-4 gap-4 border border-slate-200 rounded-2xl p-5">
                <input
                  value={account.name}
                  onChange={(event) => {
                    const next = [...accounts]
                    next[index] = { ...next[index], name: event.target.value }
                    setAccounts(next)
                  }}
                  placeholder={ui.setup.accountPlaceholder}
                  className={fieldClassName}
                />
                <select
                  value={account.type}
                  onChange={(event) => {
                    const next = [...accounts]
                    next[index] = { ...next[index], type: event.target.value }
                    setAccounts(next)
                  }}
                  className={selectClassName}
                >
                  {accountTypes.map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <select
                  value={account.currency}
                  onChange={(event) => {
                    const next = [...accounts]
                    next[index] = { ...next[index], currency: event.target.value }
                    setAccounts(next)
                  }}
                  className={selectClassName}
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={account.balance}
                    onChange={(event) => {
                      const next = [...accounts]
                      next[index] = { ...next[index], balance: event.target.value }
                      setAccounts(next)
                    }}
                    placeholder="0"
                    className={`flex-1 ${fieldClassName}`}
                  />
                  {accounts.length > 1 && (
                    <button
                      onClick={() => setAccounts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className={deleteButtonClassName}
                    >
                      <Trash2 className="w-4 h-4" />
                      {ui.setup.delete}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{ui.setup.budgetTitle}</h2>
              <p className="text-slate-600 mt-1">{ui.setup.budgetDesc}</p>
              <p className="text-sm text-slate-500 mt-2">{ui.setup.budgetDescSub}</p>
            </div>
            <button onClick={addBudget} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white">
              <Plus className="w-4 h-4" />
              {ui.setup.addBudget}
            </button>
          </div>

          <div className="space-y-4">
            {budgets.map((budget, index) => (
              <div key={`budget-${index}`} className="grid grid-cols-1 md:grid-cols-6 gap-4 border border-slate-200 rounded-2xl p-5">
                <input
                  value={budget.name}
                  onChange={(event) => {
                    const next = [...budgets]
                    next[index] = { ...next[index], name: event.target.value }
                    setBudgets(next)
                  }}
                  placeholder={ui.setup.budgetPlaceholder}
                  className={fieldClassName}
                />
                <select
                  value={budget.categoryKey}
                  onChange={(event) => {
                    const next = [...budgets]
                    next[index] = { ...next[index], categoryKey: event.target.value }
                    setBudgets(next)
                  }}
                  className={selectClassName}
                >
                  {expenseCategories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={budget.amount}
                  onChange={(event) => {
                    const next = [...budgets]
                    next[index] = { ...next[index], amount: event.target.value }
                    setBudgets(next)
                  }}
                  placeholder="0"
                  className={fieldClassName}
                />
                <select
                  value={budget.currency}
                  onChange={(event) => {
                    const next = [...budgets]
                    next[index] = { ...next[index], currency: event.target.value }
                    setBudgets(next)
                  }}
                  className={selectClassName}
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={budget.alertThreshold}
                  onChange={(event) => {
                    const next = [...budgets]
                    next[index] = { ...next[index], alertThreshold: Number(event.target.value) }
                    setBudgets(next)
                  }}
                  placeholder="80"
                  className={fieldClassName}
                />
                <button
                  onClick={() => setBudgets((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  className={deleteButtonClassName}
                >
                  <Trash2 className="w-4 h-4" />
                  {ui.setup.delete}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{ui.setup.recurringTitle}</h2>
              <p className="text-slate-600 mt-1">{ui.setup.recurringDesc}</p>
              <p className="text-sm text-slate-500 mt-2">{ui.setup.recurringDescSub}</p>
            </div>
            <button onClick={addRecurring} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white">
              <Plus className="w-4 h-4" />
              {ui.setup.addRecurring}
            </button>
          </div>

          <div className="space-y-4">
            {recurringTransactions.map((item, index) => {
              const typeCategories = item.type === 'income' ? incomeCategories : expenseCategories

              return (
                <div key={`recurring-${index}`} className="grid grid-cols-1 md:grid-cols-6 gap-4 border border-slate-200 rounded-2xl p-5">
                  <input
                    value={item.name}
                    onChange={(event) => {
                      const next = [...recurringTransactions]
                      next[index] = { ...next[index], name: event.target.value }
                      setRecurringTransactions(next)
                    }}
                    placeholder={ui.setup.recurringNamePlaceholder}
                    className={fieldClassName}
                  />
                  <select
                    value={item.type}
                    onChange={(event) => {
                      const next = [...recurringTransactions]
                      next[index] = { ...next[index], type: event.target.value as RecurringInput['type'] }
                      setRecurringTransactions(next)
                    }}
                    className={selectClassName}
                  >
                    <option value="expense">{tTransactions('expense')}</option>
                    <option value="income">{tTransactions('income')}</option>
                    <option value="transfer">{tTransactions('transfer')}</option>
                  </select>
                  <input
                    value={item.description}
                    onChange={(event) => {
                      const next = [...recurringTransactions]
                      next[index] = { ...next[index], description: event.target.value }
                      setRecurringTransactions(next)
                    }}
                    placeholder={ui.setup.recurringDescriptionPlaceholder}
                    className={fieldClassName}
                  />
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(event) => {
                      const next = [...recurringTransactions]
                      next[index] = { ...next[index], amount: event.target.value }
                      setRecurringTransactions(next)
                    }}
                    placeholder="0"
                    className={fieldClassName}
                  />
                  <select
                    value={item.categoryKey}
                    onChange={(event) => {
                      const next = [...recurringTransactions]
                      next[index] = { ...next[index], categoryKey: event.target.value }
                      setRecurringTransactions(next)
                    }}
                    disabled={item.type === 'transfer'}
                    className={`${selectClassName} disabled:bg-slate-100`}
                  >
                    {item.type === 'transfer' ? (
                      <option value="transfer">{expenseCategories.find((category) => category.key === 'transfer')?.name || tTransactions('transfer')}</option>
                    ) : (
                      typeCategories.map((category) => (
                        <option key={`${item.type}-${category.key}`} value={category.key}>
                          {category.name}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    onClick={() => setRecurringTransactions((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className={deleteButtonClassName}
                  >
                    <Trash2 className="w-4 h-4" />
                    {ui.setup.delete}
                  </button>

                  {item.type === 'transfer' ? (
                    <>
                      <select
                        value={item.fromAccountName}
                        onChange={(event) => {
                          const next = [...recurringTransactions]
                          next[index] = { ...next[index], fromAccountName: event.target.value }
                          setRecurringTransactions(next)
                        }}
                        className={selectClassName}
                      >
                        <option value="">{ui.setup.withdrawalAccount}</option>
                        {accounts.map((account, accountIndex) => (
                          <option key={`from-${accountIndex}`} value={account.name}>
                            {account.name || ui.setup.accountSelect}
                          </option>
                        ))}
                      </select>
                      <select
                        value={item.toAccountName}
                        onChange={(event) => {
                          const next = [...recurringTransactions]
                          next[index] = { ...next[index], toAccountName: event.target.value }
                          setRecurringTransactions(next)
                        }}
                        className={selectClassName}
                      >
                        <option value="">{ui.setup.depositAccount}</option>
                        {accounts.map((account, accountIndex) => (
                          <option key={`to-${accountIndex}`} value={account.name}>
                            {account.name || ui.setup.accountSelect}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <select
                      value={item.accountName}
                      onChange={(event) => {
                        const next = [...recurringTransactions]
                        next[index] = { ...next[index], accountName: event.target.value }
                        setRecurringTransactions(next)
                      }}
                      className={selectClassName}
                    >
                      <option value="">{ui.setup.accountSelect}</option>
                      {accounts.map((account, accountIndex) => (
                        <option key={`account-${accountIndex}`} value={account.name}>
                          {account.name || ui.setup.accountSelect}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={item.currency}
                    onChange={(event) => {
                      const next = [...recurringTransactions]
                      next[index] = { ...next[index], currency: event.target.value }
                      setRecurringTransactions(next)
                    }}
                    className={selectClassName}
                  >
                    {currencies.map((currency) => (
                      <option key={`recurring-${currency.code}`} value={currency.code}>
                        {currency.code}
                      </option>
                    ))}
                  </select>
                  <select
                    value={item.interval}
                    onChange={(event) => {
                      const next = [...recurringTransactions]
                      next[index] = { ...next[index], interval: event.target.value }
                      setRecurringTransactions(next)
                    }}
                    className={selectClassName}
                  >
                    <option value="monthly">{ui.setup.monthly}</option>
                    <option value="weekly">{ui.setup.weekly}</option>
                    <option value="yearly">{ui.setup.yearly}</option>
                  </select>
                  <input
                    type="number"
                    value={item.dayOfMonth}
                    onChange={(event) => {
                      const next = [...recurringTransactions]
                      next[index] = { ...next[index], dayOfMonth: event.target.value }
                      setRecurringTransactions(next)
                    }}
                    placeholder={ui.setup.executionDay}
                    className={fieldClassName}
                  />
                  <input
                    type="date"
                    value={item.startDate}
                    onChange={(event) => {
                      const next = [...recurringTransactions]
                      next[index] = { ...next[index], startDate: event.target.value }
                      setRecurringTransactions(next)
                    }}
                    className={fieldClassName}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((current) => Math.max(1, current - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-300 text-slate-700 disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4" />
          {ui.setup.previous}
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep((current) => Math.min(3, current + 1))}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white"
          >
            {ui.setup.next}
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white disabled:opacity-60"
          >
            {isLoading ? ui.setup.saving : ui.setup.complete}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
