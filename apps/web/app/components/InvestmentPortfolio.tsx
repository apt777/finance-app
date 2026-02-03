'use client'

import React, { useMemo } from 'react'
import { useHoldings } from '@/hooks/useHoldings'
import { 
  calculatePortfolioSummary, 
  analyzePortfolioDiversification,
  getInvestmentTypeStats,
  getStockTypeStats,
  checkNISALimit 
} from '@/lib/investment'
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Wallet,
  Award,
  Globe,
  ChevronRight
} from 'lucide-react'

const InvestmentPortfolio = () => {
  const { data: holdings, isLoading, isError } = useHoldings()

  const analysis = useMemo(() => {
    if (!holdings || !Array.isArray(holdings)) {
      return null
    }

    const summary = calculatePortfolioSummary(holdings as any)
    const diversification = analyzePortfolioDiversification(holdings as any)
    const investmentTypeStats = getInvestmentTypeStats(holdings as any)
    const stockTypeStats = getStockTypeStats(holdings as any)
    const nisaHoldings = holdings.filter((h: any) => h.type === 'nisa')
    const nisaLimit = checkNISALimit(nisaHoldings as any)

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
      <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-slate-200" />
        </div>
        <p className="text-slate-500 font-medium">투자 내역이 없습니다.</p>
      </div>
    )
  }

  const { summary, diversification, investmentTypeStats, stockTypeStats, nisaLimit } = analysis

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center space-x-3 px-1">
        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">투자 포트폴리오</h2>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">총 {holdings.length}개의 투자 종목</p>
        </div>
      </div>

      {/* Portfolio Summary Cards - Horizontal scroll on mobile */}
      <div className="flex overflow-x-auto pb-2 gap-4 snap-x no-scrollbar -mx-1 px-1">
        {/* Total Value */}
        <div className="min-w-[240px] flex-1 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 shadow-lg text-white snap-start">
          <div className="flex items-center justify-between mb-3">
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider">포트폴리오 가치</p>
            <Wallet className="w-4 h-4 text-blue-200" />
          </div>
          <p className="text-2xl font-black">
            {Math.round(summary.totalValue).toLocaleString()}
          </p>
          <p className="text-blue-100 text-[10px] mt-2 font-medium">현재 평가 금액 (JPY)</p>
        </div>

        {/* Gain/Loss */}
        <div className={`min-w-[240px] flex-1 rounded-2xl p-5 shadow-md border snap-start ${
          summary.totalGainLoss >= 0
            ? 'bg-emerald-50 border-emerald-100'
            : 'bg-rose-50 border-rose-100'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-[10px] font-bold uppercase tracking-wider ${
              summary.totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              총 손익
            </p>
            {summary.totalGainLoss >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-black ${
              summary.totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {summary.totalGainLoss >= 0 ? '+' : ''}
              {Math.round(summary.totalGainLoss).toLocaleString()}
            </p>
            <p className={`text-xs font-bold ${
              summary.totalGainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              ({summary.gainLossPercentage >= 0 ? '+' : ''}{summary.gainLossPercentage.toFixed(2)}%)
            </p>
          </div>
          <p className="text-slate-400 text-[10px] mt-2 font-medium">누적 투자 수익</p>
        </div>
      </div>

      {/* NISA Limit */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">NISA 투자 한도 (성장투자전략)</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">연간 120만엔</span>
        </div>
        <div className="space-y-3">
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 ease-out"
              style={{
                width: `${Math.min((nisaLimit.totalCost / 1200000) * 100, 100)}%`,
              }}
            ></div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">사용 금액</p>
              <p className="text-sm font-black text-slate-800">{Math.round(nisaLimit.totalCost).toLocaleString()} JPY</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">잔여 한도</p>
              <p className="text-sm font-black text-amber-600">{Math.round(nisaLimit.remainingLimit).toLocaleString()} JPY</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* By Investment Type */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-500" />
            투자 유형별
          </h3>
          <div className="space-y-3">
            {Object.entries(investmentTypeStats).map(([type, stats]) => (
              <div key={type} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{type === 'nisa' ? 'NISA' : '일반'}</p>
                  <p className="text-sm font-bold text-slate-800">{Math.round(stats.totalValue).toLocaleString()} JPY</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${stats.gainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {stats.gainLoss >= 0 ? '+' : ''}{Math.round(stats.gainLoss).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">{stats.count}개 종목</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Stock Type */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            시장별 분포
          </h3>
          <div className="space-y-3">
            {Object.entries(stockTypeStats).map(([type, stats]) => (
              <div key={type} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{type === 'japanese' ? '일본 시장' : '미국 시장'}</p>
                  <p className="text-sm font-bold text-slate-800">{Math.round(stats.totalValue).toLocaleString()} JPY</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${stats.gainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {stats.gainLoss >= 0 ? '+' : ''}{Math.round(stats.gainLoss).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">{stats.count}개 종목</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio Diversification */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-600" />
            보유 종목 비중
          </h3>
        </div>

        <div className="space-y-5">
          {diversification.map((holding) => (
            <div key={holding.symbol} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {holding.symbol.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{holding.symbol}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{holding.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-800">
                    {Math.round(holding.value).toLocaleString()} JPY
                  </p>
                  <p className="text-[10px] font-bold text-blue-600">{holding.percentage.toFixed(1)}%</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-500 ease-out"
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
