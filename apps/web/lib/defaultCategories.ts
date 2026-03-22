export interface DefaultCategory {
  key: string
  name: string
  icon: string
  color: string
  type: 'income' | 'expense' | 'transfer'
}

type SupportedLocale = 'ko' | 'en' | 'ja' | 'zh'

const DEFAULT_CATEGORY_DEFINITIONS = [
  { key: 'food', names: { ko: '식비', en: 'Food', ja: '食費', zh: '餐饮' }, icon: 'Utensils', color: '#f97316', type: 'expense' },
  { key: 'transport', names: { ko: '교통', en: 'Transport', ja: '交通', zh: '交通' }, icon: 'Train', color: '#3b82f6', type: 'expense' },
  { key: 'shopping', names: { ko: '쇼핑', en: 'Shopping', ja: '買い物', zh: '购物' }, icon: 'ShoppingBag', color: '#8b5cf6', type: 'expense' },
  { key: 'housing', names: { ko: '주거', en: 'Housing', ja: '住居', zh: '住房' }, icon: 'House', color: '#14b8a6', type: 'expense' },
  { key: 'medical', names: { ko: '의료', en: 'Medical', ja: '医療', zh: '医疗' }, icon: 'HeartPulse', color: '#ef4444', type: 'expense' },
  { key: 'education', names: { ko: '교육', en: 'Education', ja: '教育', zh: '教育' }, icon: 'BookOpen', color: '#0ea5e9', type: 'expense' },
  { key: 'leisure', names: { ko: '여가', en: 'Leisure', ja: '娯楽', zh: '娱乐' }, icon: 'PartyPopper', color: '#ec4899', type: 'expense' },
  { key: 'subscription', names: { ko: '구독', en: 'Subscription', ja: 'サブスク', zh: '订阅' }, icon: 'MonitorPlay', color: '#6366f1', type: 'expense' },
  { key: 'salary', names: { ko: '급여', en: 'Salary', ja: '給与', zh: '工资' }, icon: 'BadgeDollarSign', color: '#16a34a', type: 'income' },
  { key: 'bonus', names: { ko: '보너스', en: 'Bonus', ja: 'ボーナス', zh: '奖金' }, icon: 'Sparkles', color: '#22c55e', type: 'income' },
  { key: 'investment_income', names: { ko: '투자수익', en: 'Investment Income', ja: '投資収益', zh: '投资收益' }, icon: 'TrendingUp', color: '#059669', type: 'income' },
  { key: 'other_income', names: { ko: '기타수입', en: 'Other Income', ja: 'その他収入', zh: '其他收入' }, icon: 'CircleDollarSign', color: '#84cc16', type: 'income' },
  { key: 'transfer', names: { ko: '계좌이체', en: 'Transfer', ja: '振替', zh: '转账' }, icon: 'ArrowRightLeft', color: '#64748b', type: 'transfer' },
] as const

export function normalizeAppLocale(locale?: string | null): SupportedLocale {
  if (locale?.startsWith('en')) return 'en'
  if (locale?.startsWith('ja')) return 'ja'
  if (locale?.startsWith('zh')) return 'zh'
  return 'ko'
}

export function getDefaultTransactionCategories(locale: string = 'ko'): DefaultCategory[] {
  const normalizedLocale = normalizeAppLocale(locale)
  return DEFAULT_CATEGORY_DEFINITIONS.map((category) => ({
    key: category.key,
    name: category.names[normalizedLocale],
    icon: category.icon,
    color: category.color,
    type: category.type,
  }))
}

export const DEFAULT_TRANSACTION_CATEGORIES: DefaultCategory[] = getDefaultTransactionCategories('ko')
