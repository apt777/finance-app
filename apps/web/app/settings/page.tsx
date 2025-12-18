'use client'

import React, { useState } from 'react'
import { Settings, Globe, Lock, Bell } from 'lucide-react'
import ExchangeRateManager from '../components/ExchangeRateManager'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('exchange-rates')

  const tabs = [
    {
      id: 'exchange-rates',
      label: '환율 관리',
      icon: Globe,
    },
    {
      id: 'security',
      label: '보안',
      icon: Lock,
    },
    {
      id: 'notifications',
      label: '알림',
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
          <h1 className="text-3xl font-bold text-slate-800">설정</h1>
          <p className="text-slate-600 text-sm mt-1">애플리케이션 설정을 관리하세요</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
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
          {activeTab === 'exchange-rates' && (
            <ExchangeRateManager />
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">비밀번호 변경</h3>
                <form className="space-y-4">
                  <div>
                    <label htmlFor="current-password" className="block text-sm font-medium text-slate-700 mb-2">
                      현재 비밀번호
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="현재 비밀번호 입력"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-2">
                      새 비밀번호
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="새 비밀번호 입력"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-2">
                      비밀번호 확인
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="비밀번호 다시 입력"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    비밀번호 변경
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">알림 설정</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">이메일 알림</p>
                      <p className="text-sm text-slate-600">중요한 거래에 대한 이메일 알림</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">목표 달성 알림</p>
                      <p className="text-sm text-slate-600">목표 달성 시 알림</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">주간 리포트</p>
                      <p className="text-sm text-slate-600">매주 자산 요약 리포트</p>
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
