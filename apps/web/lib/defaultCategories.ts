export interface DefaultCategory {
  key: string
  name: string
  icon: string
  color: string
  type: 'income' | 'expense' | 'transfer'
}

export const DEFAULT_TRANSACTION_CATEGORIES: DefaultCategory[] = [
  { key: 'food', name: '식비', icon: 'Utensils', color: '#f97316', type: 'expense' },
  { key: 'transport', name: '교통', icon: 'Train', color: '#3b82f6', type: 'expense' },
  { key: 'shopping', name: '쇼핑', icon: 'ShoppingBag', color: '#8b5cf6', type: 'expense' },
  { key: 'housing', name: '주거', icon: 'House', color: '#14b8a6', type: 'expense' },
  { key: 'medical', name: '의료', icon: 'HeartPulse', color: '#ef4444', type: 'expense' },
  { key: 'education', name: '교육', icon: 'BookOpen', color: '#0ea5e9', type: 'expense' },
  { key: 'leisure', name: '여가', icon: 'PartyPopper', color: '#ec4899', type: 'expense' },
  { key: 'subscription', name: '구독', icon: 'MonitorPlay', color: '#6366f1', type: 'expense' },
  { key: 'salary', name: '급여', icon: 'BadgeDollarSign', color: '#16a34a', type: 'income' },
  { key: 'bonus', name: '보너스', icon: 'Sparkles', color: '#22c55e', type: 'income' },
  { key: 'investment_income', name: '투자수익', icon: 'TrendingUp', color: '#059669', type: 'income' },
  { key: 'other_income', name: '기타수입', icon: 'CircleDollarSign', color: '#84cc16', type: 'income' },
  { key: 'transfer', name: '계좌이체', icon: 'ArrowRightLeft', color: '#64748b', type: 'transfer' },
]
