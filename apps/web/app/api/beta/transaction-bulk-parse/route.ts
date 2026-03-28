import { NextResponse } from 'next/server'
import { ensureDefaultCategories } from '@/lib/categories'
import { requireRouteSession } from '@/lib/server-auth'
import prisma from '@lib/prisma'

type ParsedType = 'income' | 'expense' | 'transfer'

interface ParseRequestBody {
  input?: string
  defaultAccountId?: string
}

interface CategoryShape {
  key: string
  name: string
  type?: string | null
}

interface AccountShape {
  id: string
  name: string
  currency: string
}

const INCOME_HINTS = [
  '월급',
  '급여',
  'salary',
  'payroll',
  'income',
  '給料',
  '給与',
  '賞与',
  'ボーナス',
  '給付',
  '返金',
  '工资',
  '薪资',
  '奖金',
  '收入',
  '退款',
  '보너스',
  '상여',
  'bonus',
  '용돈',
  'allowance',
  '환급',
  'refund',
  '배당',
  'dividend',
  '이자',
  'interest',
]

const CATEGORY_GROUP_KEYWORDS: Record<string, string[]> = {
  cafe: ['스타벅스', '투썸', '메가커피', '이디야', '커피', '카페', 'coffee', 'cafe', 'starbucks', 'コーヒー', 'カフェ', 'スタバ', '咖啡', '星巴克'],
  food: ['점심', '저녁', '아침', '식비', '배달', '쿠팡이츠', '배민', '맥도날드', '버거', 'food', 'meal', 'restaurant', 'lunch', 'dinner', 'breakfast', '食事', '食費', 'ランチ', 'ディナー', '早餐', '午饭', '晚饭', '餐饮', '外卖'],
  transport: ['지하철', '버스', '택시', '전철', '교통', '주유', '주차', 'transport', 'uber', 'train', 'subway', 'metro', '交通', '電車', '地下鉄', 'バス', 'タクシー', '地铁', '公交', '出租车'],
  shopping: ['쿠팡', '쇼핑', '네이버', '무신사', '올리브영', '다이소', 'shopping', 'mart', 'amazon', 'rakuten', 'taobao', '買い物', '购物', '网购'],
  entertainment: ['영화', '넷플릭스', '게임', '콘서트', '유튜브', 'entertainment', 'movie', 'netflix', '映画', '娯楽', '游戏', '娱乐'],
  housing: ['월세', '관리비', '전기', '가스', '수도', 'house', 'rent', 'housing', '家賃', '住居', '電気', 'ガス', '水道', '房租', '住房', '电费', '燃气'],
  healthcare: ['병원', '약국', '의원', 'health', 'medical', 'hospital', 'clinic', '病院', '薬局', '医療', '医院', '药店', '医疗'],
  education: ['학원', '책', '강의', '수업', 'education', 'book', 'course', 'school', '教育', '授業', '講座', '书', '课程'],
  salary: ['월급', '급여', 'salary', 'payroll'],
  bonus: ['보너스', '상여', 'bonus'],
  allowance: ['용돈', 'allowance'],
  freelance: ['프리랜서', '외주', 'freelance'],
  investment: ['투자', '주식', '매수', '적금', '펀드', 'investment', 'etf'],
}

const CATEGORY_GROUP_ALIASES: Record<string, string[]> = {
  cafe: ['카페', '커피', 'cafe', 'coffee', 'カフェ', 'コーヒー', '咖啡'],
  food: ['식비', 'food', 'meal', 'dining', '食費', '餐饮'],
  transport: ['교통', 'transport', 'transit', 'train', 'subway', 'bus', '交通'],
  shopping: ['쇼핑', 'shopping', '구매', '買い物', '购物'],
  entertainment: ['문화', 'entertainment', '여가', '娯楽', '娱乐'],
  housing: ['주거', 'housing', 'rent', '월세', '住居', '住房'],
  healthcare: ['의료', 'health', 'medical', '医療', '医疗'],
  education: ['교육', 'education', '教育'],
  salary: ['급여', 'salary', '給与', '工资'],
  bonus: ['보너스', 'bonus', 'ボーナス', '奖金'],
  allowance: ['용돈', 'allowance', '零花钱'],
  freelance: ['프리랜서', 'freelance', '外注', '自由职业'],
  investment: ['투자', 'investment', '投資', '投资'],
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseDateToken(token: string) {
  const now = new Date()
  const normalized = token.replace(/[.]/g, '-').replace(/\//g, '-')
  const parts = normalized.split('-').map((part) => part.trim())

  if (parts.length === 3) {
    const [year, month, day] = parts
    if (!year || !month || !day) return null
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  if (parts.length === 2) {
    const [month, day] = parts
    if (!month || !day) return null
    return `${now.getFullYear()}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return null
}

function parseDateDirectiveToken(line: string) {
  const trimmed = normalizeWhitespace(line)
  const directDateMatch = trimmed.match(/^(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2})$/)
  if (directDateMatch?.[1]) {
    return parseDateToken(directDateMatch[1])
  }

  const directiveMatch = trimmed.match(/^(date|날짜|日付|日期)\s*[:：]?\s*(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2})$/i)
  if (directiveMatch?.[2]) {
    return parseDateToken(directiveMatch[2])
  }

  return null
}

function inferType(rawAmount: number, description: string): ParsedType {
  const lower = description.toLowerCase()

  if (INCOME_HINTS.some((keyword) => lower.includes(keyword))) {
    return 'income'
  }

  if (rawAmount < 0) {
    return 'expense'
  }

  return 'expense'
}

function detectCategoryGroups(description: string) {
  const lower = description.toLowerCase()

  return Object.entries(CATEGORY_GROUP_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => lower.includes(keyword.toLowerCase())))
    .map(([group]) => group)
}

function tokenizeCategoryValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !['카테고리', 'category', 'income', 'expense'].includes(token))
}

function inferCategoryGroups(category: CategoryShape) {
  const source = `${category.key} ${category.name}`.toLowerCase()
  return Object.entries(CATEGORY_GROUP_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => source.includes(alias.toLowerCase())))
    .map(([group]) => group)
}

function scoreCategory(description: string, category: CategoryShape) {
  const lower = description.toLowerCase()
  const nameLower = category.name.toLowerCase()
  const keyLower = category.key.toLowerCase()
  const detectedGroups = detectCategoryGroups(description)

  if (lower.includes(nameLower) || lower.includes(keyLower.replace(/_/g, ' '))) {
    return 0.98
  }

  const nameTokens = tokenizeCategoryValue(category.name)
  if (nameTokens.some((token) => token.length >= 2 && lower.includes(token))) {
    return 0.93
  }

  const keyTokens = tokenizeCategoryValue(category.key)
  if (keyTokens.some((token) => token.length >= 2 && lower.includes(token))) {
    return 0.9
  }

  for (const group of inferCategoryGroups(category)) {
    const keywords = CATEGORY_GROUP_KEYWORDS[group] || []
    if (keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) {
      return group === 'cafe' ? 0.97 : 0.92
    }
  }

  const categoryGroups = inferCategoryGroups(category)
  if (detectedGroups.some((group) => categoryGroups.includes(group))) {
    return detectedGroups.includes('cafe') ? 0.975 : 0.94
  }

  return 0
}

function recommendCategory(description: string, type: ParsedType, categories: CategoryShape[]) {
  const candidates = categories.filter((category) => (category.type || 'expense') === type)

  let best: CategoryShape | null = null
  let bestScore = 0

  for (const category of candidates) {
    const score = scoreCategory(description, category)
    if (score > bestScore) {
      best = category
      bestScore = score
    }
  }

  if (best) {
    return { categoryKey: best.key, categoryName: best.name, confidence: bestScore }
  }

  const preferredFallbackOrder =
    type === 'income'
      ? ['salary', 'bonus', 'allowance', 'other_income']
      : ['food', 'transportation', 'shopping', 'housing', 'entertainment', 'other_expense']

  const fallbackByKey = preferredFallbackOrder
    .map((key) => candidates.find((category) => category.key === key))
    .find(Boolean)

  const fallback = fallbackByKey || candidates[0] || null

  return {
    categoryKey: fallback?.key || null,
    categoryName: fallback?.name || null,
    confidence: fallback ? 0.72 : 0.35,
  }
}

function inferAccount(description: string, accounts: AccountShape[], defaultAccountId?: string) {
  const lower = description.toLowerCase()
  const defaultAccount = accounts.find((account) => account.id === defaultAccountId) || null

  const exactMatch = accounts.find((account) => lower.includes(account.name.toLowerCase()))
  if (exactMatch) return exactMatch

  if (/(엔|jpy|yen|¥)/i.test(description)) {
    return accounts.find((account) => account.currency === 'JPY') || defaultAccount
  }
  if (/(원|krw|₩)/i.test(description)) {
    return accounts.find((account) => account.currency === 'KRW') || defaultAccount
  }
  if (/(usd|\$|달러|dollar)/i.test(description)) {
    return accounts.find((account) => account.currency === 'USD') || defaultAccount
  }

  return defaultAccount
}

function stripAccountMentions(description: string, accounts: AccountShape[], selectedAccount?: AccountShape | null) {
  let cleaned = description

  const candidates = selectedAccount ? [selectedAccount] : accounts

  for (const account of candidates) {
    const name = normalizeWhitespace(account.name)
    if (!name) continue

    cleaned = cleaned.replace(new RegExp(escapeRegExp(name), 'ig'), ' ')

    const compactName = name.replace(/\s+/g, '')
    if (compactName && compactName !== name) {
      cleaned = cleaned.replace(new RegExp(escapeRegExp(compactName), 'ig'), ' ')
    }
  }

  cleaned = cleaned
    .replace(/\b(card|account|현금|cash)\b/gi, ' ')
    .replace(/카드결제|카드사용|통장|계좌/gi, ' ')

  return normalizeWhitespace(cleaned)
}

function isAmountToken(token: string) {
  return /^[+-]?\d[\d,]*(?:\.\d+)?$/.test(token)
}

function splitCompoundSegments(value: string) {
  const tokens = normalizeWhitespace(value).split(' ').filter(Boolean)
  const amountIndexes = tokens
    .map((token, index) => (isAmountToken(token) ? index : -1))
    .filter((index) => index >= 0)

  if (amountIndexes.length <= 1) {
    return [value]
  }

  const segments: string[] = []
  let segmentStart = 0

  for (const amountIndex of amountIndexes) {
    const segmentTokens = tokens.slice(segmentStart, amountIndex + 1)
    if (segmentTokens.length > 1) {
      segments.push(segmentTokens.join(' '))
    }
    segmentStart = amountIndex + 1
  }

  return segments.length > 0 ? segments : [value]
}

function parseLine(
  line: string,
  categories: CategoryShape[],
  accounts: AccountShape[],
  index: number,
  defaultAccountId?: string,
  defaultDate?: string
) {
  const trimmed = normalizeWhitespace(line)
  if (!trimmed) return null

  let working = trimmed
  let parsedDate: string | null = null

  const dateMatch = working.match(/^(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2})\s+/)
  if (dateMatch?.[1]) {
    parsedDate = parseDateToken(dateMatch[1])
    working = working.slice(dateMatch[0].length).trim()
  }

  const amountMatch = working.match(/([+-]?\d[\d,]*(?:\.\d+)?)\s*$/)
  if (!amountMatch?.[1]) {
    return {
      id: `parsed-${index}`,
      source: trimmed,
      error: '금액을 찾지 못했습니다.',
    }
  }

  const numericAmount = Number(amountMatch[1].replace(/,/g, ''))
  if (Number.isNaN(numericAmount) || numericAmount === 0) {
    return {
      id: `parsed-${index}`,
      source: trimmed,
      error: '유효한 금액을 찾지 못했습니다.',
    }
  }

  const rawDescription = normalizeWhitespace(working.slice(0, working.length - amountMatch[0].length))
  if (!rawDescription) {
    return {
      id: `parsed-${index}`,
      source: trimmed,
      error: '내용을 찾지 못했습니다.',
    }
  }

  const inferredAccount = inferAccount(rawDescription, accounts, defaultAccountId)
  const description = stripAccountMentions(rawDescription, accounts, inferredAccount)
  const finalDescription = description || rawDescription
  const type = inferType(numericAmount, finalDescription)
  const category = recommendCategory(finalDescription, type, categories)
  const today = new Date().toISOString().split('T')[0] || ''

  return {
    id: `parsed-${index}`,
    source: trimmed,
    date: parsedDate || defaultDate || today,
    description: finalDescription,
    amount: Math.abs(numericAmount),
    type,
    accountId: inferredAccount?.id || null,
    accountName: inferredAccount?.name || null,
    categoryKey: category.categoryKey,
    categoryName: category.categoryName,
    confidence: category.confidence,
  }
}

export async function POST(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { input, defaultAccountId }: ParseRequestBody = await request.json()

    if (!input?.trim()) {
      return NextResponse.json({ error: '입력 내용이 비어 있습니다.' }, { status: 400 })
    }

    const categories = await ensureDefaultCategories(userId)
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { id: true, name: true, currency: true },
      orderBy: { name: 'asc' },
    })
    const lines = input
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    let currentDate: string | undefined
    const rows = lines.reduce<Array<ReturnType<typeof parseLine>>>((list, line, index) => {
      const dateDirective = parseDateDirectiveToken(line)
      if (dateDirective) {
        currentDate = dateDirective
        return list
      }

      const segments = splitCompoundSegments(line)

      for (const [segmentOffset, segment] of segments.entries()) {
        const parsed = parseLine(
          segment,
          categories,
          accounts,
          index * 100 + segmentOffset,
          defaultAccountId,
          currentDate
        )

        if (parsed) {
          list.push(parsed)
        }
      }
      return list
    }, []).filter(Boolean)

    return NextResponse.json({
      rows,
      total: rows.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to parse transactions' }, { status: 500 })
  }
}
