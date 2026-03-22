import { NextResponse } from 'next/server'
import { ensureDefaultCategories } from '@/lib/categories'
import { requireRouteSession } from '@/lib/server-auth'

type ParsedType = 'income' | 'expense' | 'transfer'

interface ParseRequestBody {
  input?: string
}

interface CategoryShape {
  key: string
  name: string
  type?: string | null
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

const CATEGORY_KEYWORD_MAP: Record<string, string[]> = {
  food: ['스타벅스', '커피', '카페', '점심', '저녁', '식비', '배달', '쿠팡이츠', '배민', '맥도날드', '버거', 'food', 'meal'],
  transportation: ['지하철', '버스', '택시', '전철', '교통', '주유', '주차', 'transport', 'uber'],
  shopping: ['쿠팡', '쇼핑', '네이버', '무신사', '올리브영', '다이소', 'shopping'],
  entertainment: ['영화', '넷플릭스', '게임', '콘서트', '유튜브', 'entertainment'],
  housing: ['월세', '관리비', '전기', '가스', '수도', 'house', 'rent'],
  healthcare: ['병원', '약국', '의원', 'health', 'medical'],
  education: ['학원', '책', '강의', '수업', 'education'],
  salary: ['월급', '급여', 'salary', 'payroll'],
  bonus: ['보너스', '상여', 'bonus'],
  freelance: ['프리랜서', '외주', 'freelance'],
  investment: ['투자', '주식', '매수', '적금', '펀드', 'investment'],
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
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

function tokenizeCategoryValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !['카테고리', 'category', 'income', 'expense'].includes(token))
}

function scoreCategory(description: string, category: CategoryShape) {
  const lower = description.toLowerCase()
  const nameLower = category.name.toLowerCase()
  const keyLower = category.key.toLowerCase()

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

  const mappedKeywords = CATEGORY_KEYWORD_MAP[category.key] || []
  if (mappedKeywords.some((keyword) => lower.includes(keyword.toLowerCase()))) {
    return 0.9
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

function parseLine(line: string, categories: CategoryShape[], index: number) {
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

  const description = normalizeWhitespace(working.slice(0, working.length - amountMatch[0].length))
  if (!description) {
    return {
      id: `parsed-${index}`,
      source: trimmed,
      error: '내용을 찾지 못했습니다.',
    }
  }

  const type = inferType(numericAmount, description)
  const category = recommendCategory(description, type, categories)
  const today = new Date().toISOString().split('T')[0] || ''

  return {
    id: `parsed-${index}`,
    source: trimmed,
    date: parsedDate || today,
    description,
    amount: Math.abs(numericAmount),
    type,
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
    const { input }: ParseRequestBody = await request.json()

    if (!input?.trim()) {
      return NextResponse.json({ error: '입력 내용이 비어 있습니다.' }, { status: 400 })
    }

    const categories = await ensureDefaultCategories(userId)
    const lines = input
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const rows = lines
      .map((line, index) => parseLine(line, categories, index))
      .filter(Boolean)

    return NextResponse.json({
      rows,
      total: rows.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to parse transactions' }, { status: 500 })
  }
}
