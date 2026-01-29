'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Plus, Trash2, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react'

interface Account {
  name: string
  type: string
  currency: string
  balance: number
}

interface ExchangeRate {
  fromCurrency: string
  toCurrency: string
  rate: number
}

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Step 1: Accounts
  const [accounts, setAccounts] = useState<Account[]>([
    { name: '', type: 'checking', currency: 'JPY', balance: 0 },
  ])

  // Step 2: Exchange Rates
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([
    { fromCurrency: 'KRW', toCurrency: 'JPY', rate: 0 },
    { fromCurrency: 'USD', toCurrency: 'JPY', rate: 0 },
  ])

  const [currencies, setCurrencies] = useState<any[]>([])
  const [accountTypes, setAccountTypes] = useState<any[]>([])

  // Fetch available currencies and account types
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [currRes, typeRes] = await Promise.all([
          fetch('/api/currencies'),
          fetch('/api/account-types'),
        ])

        if (currRes.ok) setCurrencies(await currRes.json())
        if (typeRes.ok) setAccountTypes(await typeRes.json())
      } catch (err) {
        console.error('Failed to fetch data:', err)
      }
    }

    fetchData()
  }, [])

  // ============================================================================
  // Step 1: Account Management
  // ============================================================================

  const handleAddAccount = () => {
    setAccounts([...accounts, { name: '', type: 'checking', currency: 'JPY', balance: 0 }])
  }

  const handleRemoveAccount = (index: number) => {
    setAccounts(accounts.filter((_, i) => i !== index))
  }

  const handleAccountChange = (index: number, field: keyof Account, value: any) => {
    const newAccounts = [...accounts]
    if (newAccounts[index]) {
      newAccounts[index][field] = value
      setAccounts(newAccounts)
    }
  }

  // ============================================================================
  // Step 2: Exchange Rate Management
  // ============================================================================

  const handleAddExchangeRate = () => {
    setExchangeRates([...exchangeRates, { fromCurrency: 'KRW', toCurrency: 'JPY', rate: 0 }])
  }

  const handleRemoveExchangeRate = (index: number) => {
    setExchangeRates(exchangeRates.filter((_, i) => i !== index))
  }

  const handleExchangeRateChange = (index: number, field: keyof ExchangeRate, value: any) => {
    const newRates = [...exchangeRates]
    if (newRates[index]) {
      newRates[index][field] = value
      setExchangeRates(newRates)
    }
  }

  // ============================================================================
  // Submit
  // ============================================================================

  const handleSubmit = async () => {
    setError(null)
    setSuccessMessage(null)

    // Validation
    if (accounts.some(acc => !acc.name)) {
      setError('모든 계좌의 이름을 입력해 주세요.')
      return
    }

    if (exchangeRates.some(rate => !rate.rate || rate.rate <= 0)) {
      setError('모든 환율을 올바르게 입력해 주세요.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/setup/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts, exchangeRates }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '초기화 실패')
      }

      setSuccessMessage('초기 설정이 완료되었습니다!')
      setTimeout(() => router.push('/'), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white">
              <Settings className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2">초기 설정</h1>
          <p className="text-slate-600">Finance Boss를 시작하기 위해 기본 정보를 입력해 주세요</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12 gap-4">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <button
                onClick={() => setStep(s)}
                className={`w-12 h-12 rounded-full font-bold transition-all ${
                  step === s
                    ? 'bg-blue-600 text-white shadow-lg'
                    : step > s
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {step > s ? '✓' : s}
              </button>
              {s < 3 && <div className={`w-12 h-1 ${step > s ? 'bg-green-500' : 'bg-slate-200'}`}></div>}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Accounts */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">계좌 설정</h2>
              <p className="text-slate-600">보유하고 있는 계좌를 추가해 주세요</p>
            </div>

            <div className="space-y-4">
              {accounts.map((account, index) => (
                <div key={index} className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Account Name */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">계좌명</label>
                      <input
                        type="text"
                        value={account.name}
                        onChange={(e) => handleAccountChange(index, 'name', e.target.value)}
                        placeholder="예: 메인 계좌"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder-slate-400"
                      />
                    </div>

                    {/* Account Type */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">유형</label>
                      <select
                        value={account.type}
                        onChange={(e) => handleAccountChange(index, 'type', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 appearance-none pr-8"
                      >
                        {accountTypes.map((type) => (
                          <option key={type.key} value={type.key}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">통화</label>
                      <select
                        value={account.currency}
                        onChange={(e) => handleAccountChange(index, 'currency', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 appearance-none pr-8"
                      >
                        {currencies.map((curr) => (
                          <option key={curr.code} value={curr.code}>
                            {curr.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Balance */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">잔액</label>
                      <input
                        type="number"
                        value={account.balance}
                        onChange={(e) => handleAccountChange(index, 'balance', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  {accounts.length > 1 && (
                    <button
                      onClick={() => handleRemoveAccount(index)}
                      className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>계좌 삭제</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Account Button */}
            <button
              onClick={handleAddAccount}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 font-semibold transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>계좌 추가</span>
            </button>

            {/* Navigation */}
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                다음
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Exchange Rates */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">환율 설정</h2>
              <p className="text-slate-600">복수 통화 간의 환율을 설정해 주세요</p>
            </div>

            <div className="space-y-4">
              {exchangeRates.map((rate, index) => (
                <div key={index} className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {/* From Currency */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">출발 통화</label>
                      <select
                        value={rate.fromCurrency}
                        onChange={(e) => handleExchangeRateChange(index, 'fromCurrency', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 appearance-none pr-8"
                      >
                        {currencies.map((curr) => (
                          <option key={curr.code} value={curr.code}>
                            {curr.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ChevronDown className="w-5 h-5 text-slate-400 rotate-90" />
                    </div>

                    {/* To Currency */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">도착 통화</label>
                      <select
                        value={rate.toCurrency}
                        onChange={(e) => handleExchangeRateChange(index, 'toCurrency', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 appearance-none pr-8"
                      >
                        {currencies.map((curr) => (
                          <option key={curr.code} value={curr.code}>
                            {curr.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Rate */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">
                        환율 (1 {rate.fromCurrency} = ? {rate.toCurrency})
                      </label>
                      <input
                        type="number"
                        value={rate.rate}
                        onChange={(e) => handleExchangeRateChange(index, 'rate', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder-slate-400"
                      />
                    </div>

                    {/* Remove Button */}
                    {exchangeRates.length > 1 && (
                      <div className="flex items-end">
                        <button
                          onClick={() => handleRemoveExchangeRate(index)}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>삭제</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Exchange Rate Button */}
            <button
              onClick={handleAddExchangeRate}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 font-semibold transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>환율 추가</span>
            </button>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border-2 border-slate-300 text-slate-800 font-semibold rounded-lg hover:bg-slate-50 transition-all"
              >
                이전
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                다음
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">설정 확인</h2>
              <p className="text-slate-600">입력한 정보를 확인하고 완료해 주세요</p>
            </div>

            {/* Accounts Summary */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">계좌 정보</h3>
              <div className="space-y-3">
                {accounts.map((account, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                    <div>
                      <p className="font-semibold text-slate-800">{account.name}</p>
                      <p className="text-sm text-slate-600">{account.type} • {account.currency}</p>
                    </div>
                    <p className="text-lg font-bold text-blue-600">{account.balance.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Exchange Rates Summary */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">환율 정보</h3>
              <div className="space-y-3">
                {exchangeRates.map((rate, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                    <p className="font-semibold text-slate-800">
                      1 {rate.fromCurrency} = {rate.rate} {rate.toCurrency}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Error & Success Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-green-700 text-sm">{successMessage}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border-2 border-slate-300 text-slate-800 font-semibold rounded-lg hover:bg-slate-50 transition-all"
              >
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>처리 중...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>완료</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
