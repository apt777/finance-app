'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@/navigation'
import { Settings, Plus, Trash2, Wallet, Repeat, PiggyBank, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { DEFAULT_TRANSACTION_CATEGORIES } from '@/lib/defaultCategories'

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
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currencies, setCurrencies] = useState<Array<{ code: string }>>([])
  const [accountTypes, setAccountTypes] = useState<Array<{ key: string; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ key: string; name: string; type: string }>>([])

  const [accounts, setAccounts] = useState<AccountInput[]>([
    { name: '', type: 'checking', currency: 'JPY', balance: '' },
  ])
  const [budgets, setBudgets] = useState<BudgetInput[]>([
    {
      name: '식비 예산',
      categoryKey: 'food',
      amount: '',
      currency: 'JPY',
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
      currency: 'JPY',
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
        setCategories(DEFAULT_TRANSACTION_CATEGORIES)
      }
    }

    fetchData().catch(() => {
      setCategories(DEFAULT_TRANSACTION_CATEGORIES)
    })
  }, [])

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
        currency: account.currency || 'JPY',
        balance: Number(account.balance) || 0,
      }))

    try {
      const response = await fetch('/api/setup/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: normalizedAccounts,
          exchangeRates: [],
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
        throw new Error(result.error || '초기 설정에 실패했습니다.')
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['setup-status'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] }),
      ])

      router.push('/')
    } catch (submitError: any) {
      setError(submitError.message)
    } finally {
      setIsLoading(false)
    }
  }

  const addAccount = () => {
    setAccounts((current) => [...current, { name: '', type: 'checking', currency: 'JPY', balance: '' }])
  }

  const addBudget = () => {
    setBudgets((current) => [
      ...current,
      {
        name: '',
        categoryKey: expenseCategories[0]?.key ?? 'food',
        amount: '',
        currency: 'JPY',
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
          budgets: [],
          recurringTransactions: [],
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || '온보딩 건너뛰기에 실패했습니다.')
      }

      await queryClient.invalidateQueries({ queryKey: ['setup-status'] })
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
        currency: 'JPY',
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
    { id: 1, title: '계좌', icon: Wallet },
    { id: 2, title: '예산', icon: PiggyBank },
    { id: 3, title: '반복거래', icon: Repeat },
  ]
  const fieldClassName =
    'w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
  const selectClassName = `${fieldClassName} appearance-none`
  const deleteButtonClassName =
    'inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors'

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center mb-4">
              <Settings className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">온보딩 설정</h1>
            <p className="text-slate-600 mt-2">
              수동 입력 중심 가계부에 맞춰 계좌, 환율, 예산, 반복거래를 한 번에 준비합니다.
            </p>
            <p className="text-sm text-slate-500 mt-3">
              지금 다 입력하지 않아도 됩니다. 필요한 것만 적고 나머지는 나중에 추가해도 돼요.
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 max-w-sm">
            <div className="flex items-center gap-3 text-emerald-700 font-semibold">
              <ShieldCheck className="w-5 h-5" />
              보안 우선 설정
            </div>
            <p className="text-sm text-emerald-700/80 mt-2">
              모든 데이터는 로그인된 사용자 소유로만 저장되고, 온보딩 완료 전에는 메인 화면으로 진입하지 않도록 구성했습니다.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSkip}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            지금은 건너뛰기
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
              <p className="text-xs font-semibold uppercase tracking-wide">Step {id}</p>
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
              <h2 className="text-2xl font-bold text-slate-900">계좌 등록</h2>
              <p className="text-slate-600 mt-1">자주 사용하는 계좌와 초기 잔액을 먼저 세팅해 주세요.</p>
              <p className="text-sm text-slate-500 mt-2">예시: 생활비 통장, 비상금 통장, 카드 결제 계좌. 비워두면 저장하지 않고 넘어갑니다.</p>
            </div>
            <button onClick={addAccount} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white">
              <Plus className="w-4 h-4" />
              계좌 추가
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
                  placeholder="예: 메인 통장"
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
                      삭제
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
              <h2 className="text-2xl font-bold text-slate-900">월별 예산</h2>
              <p className="text-slate-600 mt-1">카테고리별 예산을 잡아두면 분석 탭에서 바로 초과 여부를 볼 수 있습니다.</p>
              <p className="text-sm text-slate-500 mt-2">예시: 식비 40,000엔, 교통비 12,000엔. 아직 계획이 없다면 비워둬도 됩니다.</p>
            </div>
            <button onClick={addBudget} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white">
              <Plus className="w-4 h-4" />
              예산 추가
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
                  placeholder="예: 식비 예산"
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
                  삭제
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
              <h2 className="text-2xl font-bold text-slate-900">반복거래</h2>
              <p className="text-slate-600 mt-1">월세, 급여, 구독료처럼 반복되는 거래를 미리 등록해 두세요.</p>
              <p className="text-sm text-slate-500 mt-2">예시: 매월 25일 월세, 매월 10일 구독료. 나중에 따로 추가해도 됩니다.</p>
            </div>
            <button onClick={addRecurring} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white">
              <Plus className="w-4 h-4" />
              반복거래 추가
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
                    placeholder="예: 월세"
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
                    <option value="expense">지출</option>
                    <option value="income">수입</option>
                    <option value="transfer">이체</option>
                  </select>
                  <input
                    value={item.description}
                    onChange={(event) => {
                      const next = [...recurringTransactions]
                      next[index] = { ...next[index], description: event.target.value }
                      setRecurringTransactions(next)
                    }}
                    placeholder="설명"
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
                      <option value="transfer">계좌이체</option>
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
                    삭제
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
                        <option value="">출금 계좌</option>
                        {accounts.map((account, accountIndex) => (
                          <option key={`from-${accountIndex}`} value={account.name}>
                            {account.name || '계좌 선택'}
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
                        <option value="">입금 계좌</option>
                        {accounts.map((account, accountIndex) => (
                          <option key={`to-${accountIndex}`} value={account.name}>
                            {account.name || '계좌 선택'}
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
                      <option value="">계좌 선택</option>
                      {accounts.map((account, accountIndex) => (
                        <option key={`account-${accountIndex}`} value={account.name}>
                          {account.name || '계좌 선택'}
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
                    <option value="monthly">매월</option>
                    <option value="weekly">매주</option>
                    <option value="yearly">매년</option>
                  </select>
                  <input
                    type="number"
                    value={item.dayOfMonth}
                    onChange={(event) => {
                      const next = [...recurringTransactions]
                      next[index] = { ...next[index], dayOfMonth: event.target.value }
                      setRecurringTransactions(next)
                    }}
                    placeholder="실행 일자"
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
          이전
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep((current) => Math.min(3, current + 1))}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white"
          >
            다음
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white disabled:opacity-60"
          >
            {isLoading ? '저장 중...' : '온보딩 완료'}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
