'use client'

import React, { useEffect, useState } from 'react'
import { Bell, Globe, Languages, Lock, PiggyBank, Repeat, Settings, Sparkles, Tags, Zap } from 'lucide-react'
import CategoryManager from '@/components/CategoryManager'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import AIBulkImportBeta from '@/components/AIBulkImportBeta'
import BudgetManager from '@/components/BudgetManager'
import RecurringManager from '@/components/RecurringManager'
import QuickActionManager from '@/components/QuickActionManager'
import { useColorMode } from '@/context/ColorModeContext'
import { useCurrencyPreferences } from '@/context/CurrencyPreferenceContext'
import { useUiTheme } from '@/context/UiThemeContext'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'
import { useTrackedCurrencies } from '@/hooks/useTrackedCurrencies'

export default function SettingsPage() {
  const tSettings = useTranslations('settings')
  const locale = useLocale()
  const { theme, setTheme } = useUiTheme()
  const { colorMode, setColorMode } = useColorMode()
  const { baseCurrency, mirrorCurrency, setBaseCurrency, setMirrorCurrency } = useCurrencyPreferences()
  const { trackedCurrencies, updateTrackedCurrencies, isSaving: isSavingTrackedCurrencies } = useTrackedCurrencies()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('general')
  const languageNames =
    locale === 'en'
      ? { ko: 'Korean', ja: 'Japanese', en: 'English', zh: 'Chinese' }
      : locale === 'ja'
        ? { ko: '韓国語', ja: '日本語', en: '英語', zh: '中国語' }
        : locale === 'zh'
          ? { ko: '韩语', ja: '日语', en: '英语', zh: '中文' }
          : { ko: '한국어', ja: '일본어', en: '영어', zh: '중국어' }

  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    if (!requestedTab) return

    const allowedTabs = new Set(['general', 'quickActions', 'theme', 'language', 'categories', 'budgets', 'recurring', 'beta', 'security', 'notifications'])
    if (allowedTabs.has(requestedTab)) {
      setActiveTab(requestedTab === 'theme' ? 'general' : requestedTab)
    }
  }, [searchParams])

  const tabs = [
    { id: 'general', label: tSettings('general'), icon: Settings },
    { id: 'quickActions', label: tSettings('quickActions'), icon: Zap },
    { id: 'language', label: tSettings('language'), icon: Languages },
    { id: 'categories', label: tSettings('categories'), icon: Tags },
    { id: 'budgets', label: tSettings('budgetSettings'), icon: PiggyBank },
    { id: 'recurring', label: tSettings('recurringSettings'), icon: Repeat },
    { id: 'beta', label: tSettings('beta'), icon: Sparkles },
    { id: 'security', label: tSettings('security'), icon: Lock },
    { id: 'notifications', label: tSettings('notifications'), icon: Bell },
  ]

  const toggleTrackedCurrency = async (currency: string) => {
    const next = trackedCurrencies.includes(currency)
      ? trackedCurrencies.filter((item) => item !== currency)
      : [...trackedCurrencies, currency]

    if (next.length < 2) {
      return
    }

    await updateTrackedCurrencies(next)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/80 bg-white/70 p-6 shadow-[0_18px_60px_rgba(148,163,184,0.14)] backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{tSettings('general')}</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{tSettings('title')}</h1>
            <p className="mt-2 text-sm text-slate-500">{tSettings('manageSettings')}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/80 bg-white/70 shadow-[0_18px_60px_rgba(148,163,184,0.12)] backdrop-blur-xl">
        <div className="flex overflow-x-auto border-b border-slate-200/80">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 whitespace-nowrap px-5 py-4 font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'text-slate-950'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span className={`flex items-center gap-2 rounded-full px-3 py-2 ${activeTab === tab.id ? 'bg-slate-100 shadow-sm' : ''}`}>
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">{tSettings('themeSettings')}</h3>
                <p className="mt-2 text-sm text-slate-500">{tSettings('themeDesc')}</p>
                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTheme('old')}
                    className={`rounded-[28px] border p-5 text-left transition-all ${
                      theme === 'old'
                        ? 'border-blue-300 bg-blue-50 text-slate-950 shadow-md ring-1 ring-blue-200'
                        : 'border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold uppercase tracking-[0.2em]">{tSettings('oldTheme')}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${theme === 'old' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {theme === 'old' ? 'Active' : 'Classic'}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-500">
                      {tSettings('oldThemeDesc')}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('modern')}
                    className={`rounded-[28px] border p-5 text-left transition-all ${
                      theme === 'modern'
                        ? 'border-blue-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,243,255,0.92)_45%,_rgba(211,226,255,0.92)_100%)] text-slate-950 shadow-lg'
                        : 'border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold uppercase tracking-[0.2em]">{tSettings('modernTheme')}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${theme === 'modern' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {theme === 'modern' ? 'Active' : 'New'}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-500">{tSettings('modernThemeDesc')}</p>
                  </button>
                </div>

                <div className="mt-8 border-t border-slate-200 pt-6">
                  <h4 className="text-base font-black tracking-[-0.02em] text-slate-950">{tSettings('colorModeSettings')}</h4>
                  <p className="mt-2 text-sm text-slate-500">{tSettings('colorModeDesc')}</p>
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setColorMode('light')}
                      className={`rounded-[24px] border p-5 text-left transition-all ${colorMode === 'light' ? 'border-blue-300 bg-blue-50 shadow-md ring-1 ring-blue-200' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold uppercase tracking-[0.2em]">{tSettings('lightMode')}</span>
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${colorMode === 'light' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Light</span>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-500">{tSettings('lightModeDesc')}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorMode('dark')}
                      className={`rounded-[24px] border p-5 text-left transition-all ${colorMode === 'dark' ? 'border-slate-700 bg-slate-950 text-white shadow-md ring-1 ring-slate-700' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold uppercase tracking-[0.2em]">{tSettings('darkMode')}</span>
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${colorMode === 'dark' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}>Dark</span>
                      </div>
                      <p className={`mt-4 text-sm leading-7 ${colorMode === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>{tSettings('darkModeDesc')}</p>
                    </button>
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-200 pt-6">
                  <h4 className="text-base font-black tracking-[-0.02em] text-slate-950">{tSettings('currencyDisplaySettings')}</h4>
                  <p className="mt-2 text-sm text-slate-500">{tSettings('currencyDisplayDesc')}</p>
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <label className="block text-sm font-bold uppercase tracking-[0.2em] text-slate-700">{tSettings('mainCurrency')}</label>
                      <p className="mt-3 text-sm leading-6 text-slate-500">{tSettings('mainCurrencyDesc')}</p>
                      <select
                        value={baseCurrency}
                        onChange={(event) => setBaseCurrency(event.target.value as typeof baseCurrency)}
                        className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                      >
                        {SUPPORTED_CURRENCIES.map((currency) => (
                          <option key={currency} value={currency}>{currency}</option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <label className="block text-sm font-bold uppercase tracking-[0.2em] text-slate-700">{tSettings('mirrorCurrency')}</label>
                      <p className="mt-3 text-sm leading-6 text-slate-500">{tSettings('mirrorCurrencyDesc')}</p>
                      <select
                        value={mirrorCurrency}
                        onChange={(event) => setMirrorCurrency(event.target.value as typeof mirrorCurrency)}
                        className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                      >
                        {SUPPORTED_CURRENCIES.map((currency) => (
                          <option key={currency} value={currency}>{currency}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-200 pt-6">
                  <h4 className="text-base font-black tracking-[-0.02em] text-slate-950">{tSettings('currencies')}</h4>
                  <p className="mt-2 text-sm text-slate-500">{tSettings('trackedCurrenciesDesc')}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {SUPPORTED_CURRENCIES.map((currency) => {
                      const active = trackedCurrencies.includes(currency)

                      return (
                        <button
                          key={currency}
                          type="button"
                          onClick={() => toggleTrackedCurrency(currency)}
                          disabled={isSavingTrackedCurrencies}
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
          )}

          {activeTab === 'language' && (
            <div className="space-y-6">
              <div className="rounded-[28px] border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">{tSettings('languageSettings')}</h3>
                <p className="mb-6 mt-2 text-sm text-slate-500">{tSettings('languageDesc')}</p>
                <div className="flex justify-start">
                  <LanguageSwitcher align="start" />
                </div>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-black tracking-[-0.03em] text-slate-950">{tSettings('supportedLanguages')}</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-3xl">🇰🇷</span>
                    <div>
                      <p className="font-semibold text-slate-800">{languageNames.ko}</p>
                      <p className="text-xs text-slate-500">Korean</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-3xl">🇯🇵</span>
                    <div>
                      <p className="font-semibold text-slate-800">{languageNames.ja}</p>
                      <p className="text-xs text-slate-500">Japanese</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                      <Globe className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{languageNames.en}</p>
                      <p className="text-xs text-slate-500">English</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-3xl">🇨🇳</span>
                    <div>
                      <p className="font-semibold text-slate-800">{languageNames.zh}</p>
                      <p className="text-xs text-slate-500">Chinese</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quickActions' && <QuickActionManager />}

          {activeTab === 'categories' && <CategoryManager />}

          {activeTab === 'budgets' && <BudgetManager />}

          {activeTab === 'recurring' && <RecurringManager />}

          {activeTab === 'beta' && <AIBulkImportBeta />}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-black tracking-[-0.03em] text-slate-950">{tSettings('changePassword')}</h3>
                <form className="space-y-4">
                  <div>
                    <label htmlFor="current-password" className="mb-2 block text-sm font-medium text-slate-700">
                      {tSettings('currentPassword')}
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={tSettings('currentPasswordPlaceholder')}
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-slate-700">
                      {tSettings('newPassword')}
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={tSettings('newPasswordPlaceholder')}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-slate-700">
                      {tSettings('confirmPassword')}
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={tSettings('confirmPasswordPlaceholder')}
                    />
                  </div>
                  <button type="submit" className="rounded-2xl bg-slate-950 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-800">
                    {tSettings('changePassword')}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-black tracking-[-0.03em] text-slate-950">{tSettings('notificationSettings')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div>
                      <p className="font-medium text-slate-800">{tSettings('emailNotifications')}</p>
                      <p className="text-sm text-slate-600">{tSettings('emailDesc')}</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-5 w-5 rounded" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div>
                      <p className="font-medium text-slate-800">{tSettings('goalNotifications')}</p>
                      <p className="text-sm text-slate-600">{tSettings('goalDesc')}</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-5 w-5 rounded" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div>
                      <p className="font-medium text-slate-800">{tSettings('weeklyReport')}</p>
                      <p className="text-sm text-slate-600">{tSettings('weeklyDesc')}</p>
                    </div>
                    <input type="checkbox" className="h-5 w-5 rounded" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
