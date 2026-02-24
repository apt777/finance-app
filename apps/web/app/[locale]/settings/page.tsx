'use client'

import React, { useState } from 'react'
import { Settings, Globe, Lock, Bell, Languages } from 'lucide-react'
import ExchangeRateManager from '@/components/ExchangeRateManager'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslations } from 'next-intl'

export default function SettingsPage() {
  const tSettings = useTranslations('settings')
  const [activeTab, setActiveTab] = useState('language')

  const tabs = [
    {
      id: 'language',
      label: tSettings('language'),
      icon: Languages,
    },
    {
      id: 'exchange-rates',
      label: tSettings('exchangeRates'),
      icon: Globe,
    },
    {
      id: 'security',
      label: tSettings('security'),
      icon: Lock,
    },
    {
      id: 'notifications',
      label: tSettings('notifications'),
      icon: Bell,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{tSettings('title')}</h1>
          <p className="text-slate-600 text-sm mt-1">Manage application settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'language' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Language Settings</h3>
                <p className="text-slate-600 text-sm mb-6">Select your preferred application language.</p>
                <div className="flex justify-start">
                  <LanguageSwitcher />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Supported Languages</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-slate-200">
                    <span className="text-3xl">🇰🇷</span>
                    <div>
                      <p className="font-semibold text-slate-800">한국어</p>
                      <p className="text-xs text-slate-500">Korean</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-slate-200">
                    <span className="text-3xl">🇯🇵</span>
                    <div>
                      <p className="font-semibold text-slate-800">日本語</p>
                      <p className="text-xs text-slate-500">Japanese</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-slate-200">
                    <span className="text-3xl">🇺🇸</span>
                    <div>
                      <p className="font-semibold text-slate-800">English</p>
                      <p className="text-xs text-slate-500">English</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-slate-200">
                    <span className="text-3xl">🇨🇳</span>
                    <div>
                      <p className="font-semibold text-slate-800">中文</p>
                      <p className="text-xs text-slate-500">Chinese</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'exchange-rates' && (
            <ExchangeRateManager />
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Change Password</h3>
                <form className="space-y-4">
                  <div>
                    <label htmlFor="current-password" className="block text-sm font-medium text-slate-700 mb-2">
                      Current Password
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white text-slate-900 placeholder-slate-400"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-2">
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white text-slate-900 placeholder-slate-400"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white text-slate-900 placeholder-slate-400"
                      placeholder="Re-enter password"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Change Password
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Notification Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">Email Notifications</p>
                      <p className="text-sm text-slate-600">Receive emails for important transactions</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">Goal Notifications</p>
                      <p className="text-sm text-slate-600">Alerts when goals are reached</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">Weekly Report</p>
                      <p className="text-sm text-slate-600">Weekly summary of your assets</p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded"
                    />
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
