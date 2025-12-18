'use client'

import React, { useMemo } from 'react'
import { useHoldings } from '../hooks/useHoldings'
import { 
  calculatePortfolioSummary, 
  analyzePortfolioDiversification,
  getInvestmentTypeStats,
  getStockTypeStats,
  checkNISALimit 
} from '../lib/investment'
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Wallet,
  Award,
  Globe 
} from 'lucide-react'

const InvestmentPortfolio = () => {
  const { data: holdings, isLoading, isError } = useHoldings()

  const analysis = useMemo(() => {
    if (!holdings || !Array.isArray(holdings)) {
      return null
    }

    const summary = calculatePortfolioSummary(holdings)
    const diversification = analyzePortfolioDiversification(holdings)
    const investmentTypeStats = getInvestmentTypeStats(holdings)
    const stockTypeStats = getStockTypeStats(holdings)
    const nisaHoldings = holdings.filter((h: any) => h.type === 'nisa')
    const nisaLimit = checkNISALimit(nisaHoldings)

    return {
      summary,
      diversification,
      investmentTypeStats,
      stockTypeStats,
      nisaLimit,
    }
  }, [holdings])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">투자 정보 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">투자 정보를 불러오는 중 오류 발생</p>
      </div>
    )
  }

  if (!analysis || !Array.isArray(holdings) || holdings.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 shadow-lg border border-slate-200 text-center">
        <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">투자 내역이 없습니다.</p>
      </div>
    )
  }

  const { summary, diversification, investmentTypeStats, stockTypeStats, nisaLimit } = analysis

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">투자 포트폴리오</h2>
          <p className="text-slate-600 text-sm mt-1">총 {holdings.length}개의 투자</p>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Value */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-sm">포트폴리오 가치</p>
            <Wallet className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold">
            {Math.round(summary.totalValue).toLocaleString()}
          </p>
          <p className="text-blue-100 text-xs mt-2">현재 가치</p>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-600 text-sm">총 매입액</p>
            <Award className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {Math.round(summary.totalCost).toLocaleString()}
          </p>
          <p className="text-slate-500 text-xs mt-2">매입 총액</p>
        </div>

        {/* Gain/Loss */}
        <div className={`rounded-2xl p-6 shadow-lg border ${
          summary.totalGainLoss >= 0
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm ${
              summary.totalGainLoss >= 0
                ? 'text-green-700'
                : 'text-red-700'
            }`}>
              손익
            </p>
            {summary.totalGainLoss >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          <p className={`text-3xl font-bold ${
            summary.totalGainLoss >= 0
              ? 'text-green-600'
              : 'text-red-600'
          }`}>
            {summary.totalGainLoss >= 0 ? '+' : '-'}
            {Math.abs(Math.round(summary.totalGainLoss)).toLocaleString()}
          </p>
          <p className={`text-xs mt-2 ${
            summary.totalGainLoss >= 0
              ? 'text-green-700'
              : 'text-red-700'
          }`}>
            {summary.gainLossPercentage >= 0 ? '+' : ''}
            {summary.gainLossPercentage.toFixed(2)}%
          </p>
        </div>

        {/* Holdings Count */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-600 text-sm">보유 종목</p>
            <Globe className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {holdings.length}
          </p>
          <p className="text-slate-500 text-xs mt-2">개의 종목</p>
        </div>
      </div>

      {/* NISA Limit */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 shadow-lg border border-amber-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">NISA 한도</h3>
          <Award className="w-6 h-6 text-amber-600" />
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-700">사용 한도</span>
              <span className="font-semibold text-slate-800">
                {Math.round(nisaLimit.totalCost).toLocaleString()} / 1,200,000 엔
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                style={{
                  width: `${Math.min((nisaLimit.totalCost / 1200000) * 100, 100)}%`,
                }}
              ></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700">남은 한도</span>
            <span className="font-semibold text-amber-600">
              {Math.round(nisaLimit.remainingLimit).toLocaleString()} 엔
            </span>
          </div>
        </div>
      </div>

      {/* Investment Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Investment Type */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">투자 유형별</h3>
          <div className="space-y-4">
            {Object.entries(investmentTypeStats).map(([type, stats]) => (
              <div key={type} className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-800 capitalize">
                    {type === 'nisa' ? 'NISA' : '일반'}
                  </span>
                  <span className="text-sm text-slate-600">{stats.count}개</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-600">가치</p>
                    <p className="font-semibold text-slate-800">
                      {Math.round(stats.totalValue).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">손익</p>
                    <p className={`font-semibold ${
                      stats.gainLoss >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {stats.gainLoss >= 0 ? '+' : '-'}
                      {Math.abs(Math.round(stats.gainLoss)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Stock Type */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">주식 유형별</h3>
          <div className="space-y-4">
            {Object.entries(stockTypeStats).map(([type, stats]) => (
              <div key={type} className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-800 capitalize">
                    {type === 'japanese' ? '일본 주식' : '미국 주식'}
                  </span>
                  <span className="text-sm text-slate-600">{stats.count}개</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-600">가치</p>
                    <p className="font-semibold text-slate-800">
                      {Math.round(stats.totalValue).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">손익</p>
                    <p className={`font-semibold ${
                      stats.gainLoss >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {stats.gainLoss >= 0 ? '+' : '-'}
                      {Math.abs(Math.round(stats.gainLoss)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio Diversification */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center space-x-3 mb-6">
          <PieChart className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">포트폴리오 구성</h3>
        </div>

        <div className="space-y-4">
          {diversification.map((holding) => (
            <div key={holding.symbol} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{holding.symbol}</p>
                  <p className="text-xs text-slate-600">{holding.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">
                    {Math.round(holding.value).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-600">{holding.percentage.toFixed(1)}%</p>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                  style={{ width: `${holding.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default InvestmentPortfolio
