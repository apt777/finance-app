/**
 * 투자 관리 유틸리티
 * NISA, 일본 주식, 미국 주식 지원
 */

export type InvestmentType = 'nisa' | 'regular'
export type StockType = 'japanese' | 'us'

export interface Holding {
  id: string
  symbol: string
  name: string
  shares: number
  costBasis: number
  currentPrice: number
  currency: string
  type: InvestmentType
  stockType: StockType
  purchaseDate: Date
  lastUpdated: Date
  notes?: string
}

export interface InvestmentSummary {
  totalValue: number
  totalCost: number
  totalGainLoss: number
  gainLossPercentage: number
  byType: {
    [key in InvestmentType]: {
      value: number
      cost: number
      gainLoss: number
      percentage: number
    }
  }
  byStockType: {
    [key in StockType]: {
      value: number
      cost: number
      gainLoss: number
      percentage: number
    }
  }
}

/**
 * 현재 포지션 가치 계산
 * @param shares 주수
 * @param currentPrice 현재가
 * @returns 포지션 가치
 */
export function calculateCurrentValue(shares: number, currentPrice: number): number {
  return shares * currentPrice
}

/**
 * 매입 가격 계산
 * @param shares 주수
 * @param costBasis 매입가
 * @returns 매입 총액
 */
export function calculateCostBasis(shares: number, costBasis: number): number {
  return shares * costBasis
}

/**
 * 손익 계산
 * @param currentValue 현재 가치
 * @param costBasis 매입 총액
 * @returns 손익
 */
export function calculateGainLoss(currentValue: number, costBasis: number): number {
  return currentValue - costBasis
}

/**
 * 손익률 계산
 * @param gainLoss 손익
 * @param costBasis 매입 총액
 * @returns 손익률 (%)
 */
export function calculateGainLossPercentage(gainLoss: number, costBasis: number): number {
  if (costBasis === 0) return 0
  return (gainLoss / costBasis) * 100
}

/**
 * 포트폴리오 요약 계산
 * @param holdings 보유 주식 목록
 * @returns 포트폴리오 요약
 */
export function calculatePortfolioSummary(holdings: Holding[]): InvestmentSummary {
  let totalValue = 0
  let totalCost = 0

  const byType: InvestmentSummary['byType'] = {
    nisa: { value: 0, cost: 0, gainLoss: 0, percentage: 0 },
    regular: { value: 0, cost: 0, gainLoss: 0, percentage: 0 },
  }

  const byStockType: InvestmentSummary['byStockType'] = {
    japanese: { value: 0, cost: 0, gainLoss: 0, percentage: 0 },
    us: { value: 0, cost: 0, gainLoss: 0, percentage: 0 },
  }

  holdings.forEach((holding) => {
    const currentValue = calculateCurrentValue(holding.shares, holding.currentPrice)
    const cost = calculateCostBasis(holding.shares, holding.costBasis)
    const gainLoss = calculateGainLoss(currentValue, cost)

    totalValue += currentValue
    totalCost += cost

    // By investment type
    byType[holding.type].value += currentValue
    byType[holding.type].cost += cost
    byType[holding.type].gainLoss += gainLoss

    // By stock type
    byStockType[holding.stockType].value += currentValue
    byStockType[holding.stockType].cost += cost
    byStockType[holding.stockType].gainLoss += gainLoss
  })

  const totalGainLoss = calculateGainLoss(totalValue, totalCost)
  const gainLossPercentage = calculateGainLossPercentage(totalGainLoss, totalCost)

  // Calculate percentages
  Object.keys(byType).forEach((type) => {
    const item = byType[type as InvestmentType]
    item.percentage = calculateGainLossPercentage(item.gainLoss, item.cost)
  })

  Object.keys(byStockType).forEach((type) => {
    const item = byStockType[type as StockType]
    item.percentage = calculateGainLossPercentage(item.gainLoss, item.cost)
  })

  return {
    totalValue,
    totalCost,
    totalGainLoss,
    gainLossPercentage,
    byType,
    byStockType,
  }
}

/**
 * NISA 한도 확인
 * @param nisaHoldings NISA 보유 주식 목록
 * @returns { totalCost: 총 매입액, remainingLimit: 남은 한도 }
 */
export function checkNISALimit(nisaHoldings: Holding[]): {
  totalCost: number
  remainingLimit: number
} {
  const ANNUAL_LIMIT = 1200000 // 120만 엔 (2024년 기준)

  const totalCost = nisaHoldings.reduce((sum, holding) => {
    return sum + calculateCostBasis(holding.shares, holding.costBasis)
  }, 0)

  return {
    totalCost,
    remainingLimit: Math.max(0, ANNUAL_LIMIT - totalCost),
  }
}

/**
 * 포트폴리오 다각화 분석
 * @param holdings 보유 주식 목록
 * @returns 각 주식의 포트폴리오 비중
 */
export function analyzePortfolioDiversification(
  holdings: Holding[]
): Array<{
  symbol: string
  name: string
  value: number
  percentage: number
}> {
  const summary = calculatePortfolioSummary(holdings)

  return holdings.map((holding) => {
    const value = calculateCurrentValue(holding.shares, holding.currentPrice)
    const percentage = summary.totalValue > 0 ? (value / summary.totalValue) * 100 : 0

    return {
      symbol: holding.symbol,
      name: holding.name,
      value,
      percentage,
    }
  })
}

/**
 * 평균 매입가 계산
 * @param holdings 보유 주식 목록
 * @returns 평균 매입가
 */
export function calculateAverageCostBasis(holdings: Holding[]): number {
  if (holdings.length === 0) return 0

  const totalShares = holdings.reduce((sum, h) => sum + h.shares, 0)
  const totalCost = holdings.reduce((sum, h) => {
    return sum + calculateCostBasis(h.shares, h.costBasis)
  }, 0)

  return totalCost / totalShares
}

/**
 * 투자 유형별 통계
 * @param holdings 보유 주식 목록
 * @returns 투자 유형별 통계
 */
export function getInvestmentTypeStats(holdings: Holding[]): {
  [key in InvestmentType]: {
    count: number
    totalValue: number
    totalCost: number
    gainLoss: number
  }
} {
  const stats = {
    nisa: { count: 0, totalValue: 0, totalCost: 0, gainLoss: 0 },
    regular: { count: 0, totalValue: 0, totalCost: 0, gainLoss: 0 },
  }

  holdings.forEach((holding) => {
    const value = calculateCurrentValue(holding.shares, holding.currentPrice)
    const cost = calculateCostBasis(holding.shares, holding.costBasis)
    const gainLoss = calculateGainLoss(value, cost)

    stats[holding.type].count++
    stats[holding.type].totalValue += value
    stats[holding.type].totalCost += cost
    stats[holding.type].gainLoss += gainLoss
  })

  return stats
}

/**
 * 주식 유형별 통계
 * @param holdings 보유 주식 목록
 * @returns 주식 유형별 통계
 */
export function getStockTypeStats(holdings: Holding[]): {
  [key in StockType]: {
    count: number
    totalValue: number
    totalCost: number
    gainLoss: number
  }
} {
  const stats = {
    japanese: { count: 0, totalValue: 0, totalCost: 0, gainLoss: 0 },
    us: { count: 0, totalValue: 0, totalCost: 0, gainLoss: 0 },
  }

  holdings.forEach((holding) => {
    const value = calculateCurrentValue(holding.shares, holding.currentPrice)
    const cost = calculateCostBasis(holding.shares, holding.costBasis)
    const gainLoss = calculateGainLoss(value, cost)

    stats[holding.stockType].count++
    stats[holding.stockType].totalValue += value
    stats[holding.stockType].totalCost += cost
    stats[holding.stockType].gainLoss += gainLoss
  })

  return stats
}
