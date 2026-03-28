import { NextResponse } from 'next/server'
import { ensureDefaultCategories } from '@/lib/categories'
import { requireRouteSession } from '@/lib/server-auth'
import prisma from '@lib/prisma'

type ParsedType = 'income' | 'expense' | 'transfer'

interface ParseRequestBody {
  input?: string
  defaultAccountId?: string
  defaultDate?: string
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
  cafe: ['스타벅스', '투썸', '메가커피', '이디야', '커피', '카페', 'coffee', 'cafe'],
  food: ['점심', '저녁', '아침', '식비', '배달', '쿠팡이츠', '배민', '맥도날드', '버거', 'food', 'meal', 'restaurant'],
  transport: ['지하철', '버스', '택시', '전철', '교통', '주유', '주차', 'transport', 'uber', 'train', 'subway'],
  shopping: ['쿠팡', '쇼핑', '네이버', '무신사', '올리브영', '다이소', 'shopping', 'mart'],
  entertainment: ['영화', '넷플릭스', '게임', '콘서트', '유튜브', 'entertainment'],
  housing: ['월세', '관리비', '전기', '가스', '수도', 'house', 'rent'],
  healthcare: ['병원', '약국', '의원', 'health', 'medical'],
  education: ['학원', '책', '강의', '수업', 'education'],
  salary: ['월급', '급여', 'salary', 'payroll'],
  bonus: ['보너스', '상여', 'bonus'],
  allowance: ['용돈', 'allowance'],
  freelance: ['프리랜서', '외주', 'freelance'],
  investment: ['투자', '주식', '매수', '적금', '펀드', 'investment', 'etf'],
}

const CATEGORY_GROUP_ALIASES: Record<string, string[]> = {
  cafe: ['카페', '커피', 'cafe', 'coffee'],
  food: ['식비', 'food', 'meal', 'dining'],
  transport: ['교통', 'transport', 'transit', 'train', 'subway', 'bus'],
  shopping: ['쇼핑', 'shopping', '구매'],
  entertainment: ['문화', 'entertainment', '여가'],
  housing: ['주거', 'housing', 'rent', '월세'],
  healthcare: ['의료', 'health', 'medical'],
  education: ['교육', 'education'],
  salary: ['급여', 'salary'],
  bonus: ['보너스', 'bonus'],
  allowance: ['용돈', 'allowance'],
  freelance: ['프리랜서', 'freelance'],
  investment: ['투자', 'investment'],
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
    const { input, defaultAccountId, defaultDate }: ParseRequestBody = await request.json()

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

    const rows = lines
      .map((line, index) => parseLine(line, categories, accounts, index, defaultAccountId, defaultDate))
      .filter(Boolean)

    return NextResponse.json({
      rows,
      total: rows.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to parse transactions' }, { status: 500 })
  }
}
