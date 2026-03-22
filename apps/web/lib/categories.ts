import prisma from '@lib/prisma'
import { DEFAULT_TRANSACTION_CATEGORIES, getDefaultTransactionCategories } from './defaultCategories'

function mapDefaultCategories(locale = 'ko') {
  return getDefaultTransactionCategories(locale).map((category, index) => ({
    id: `default-${index}`,
    userId: null,
    name: category.name,
    key: category.key,
    icon: category.icon,
    color: category.color,
    type: category.type,
    isDefault: true,
    createdAt: new Date(0),
  }))
}

function mergeCategoryVariants<
  T extends {
    key: string
    userId?: string | null
    isDefault?: boolean | null
    name: string
    type?: string | null
    color?: string | null
    icon?: string | null
  },
>(categories: T[]) {
  const merged = new Map<string, T>()

  for (const category of categories.filter((item) => item.isDefault || item.userId == null)) {
    merged.set(category.key, category)
  }

  for (const category of categories.filter((item) => item.userId != null)) {
    merged.set(category.key, category)
  }

  return Array.from(merged.values()).sort((a, b) => {
    const typeCompare = (a.type ?? '').localeCompare(b.type ?? '')
    if (typeCompare !== 0) return typeCompare
    return a.name.localeCompare(b.name)
  })
}

function normalizeLegacyCategories(
  categories: Array<{ id: string; name: string; key: string; icon: string | null; createdAt: Date }>
) {
  return categories.map((category) => {
    const defaultCategory = DEFAULT_TRANSACTION_CATEGORIES.find((item) => item.key === category.key)
    const inferredType = category.key.startsWith('income-')
      ? 'income'
      : category.key.startsWith('transfer')
        ? 'transfer'
        : 'expense'
    return {
      ...category,
      userId: null,
      color: defaultCategory?.color ?? '#64748b',
      type: defaultCategory?.type ?? inferredType,
      isDefault: Boolean(defaultCategory),
    }
  })
}

export async function ensureDefaultCategories(userId: string, locale = 'ko') {
  try {
    const existing = await prisma.transactionCategory.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
      select: { key: true, userId: true },
    })

    const existingKeys = new Set(existing.map((category) => `${category.userId ?? 'default'}:${category.key}`))

    const localizedDefaults = getDefaultTransactionCategories(locale)
    const missingDefaults = localizedDefaults.filter(
      (category) => !existingKeys.has(`default:${category.key}`)
    )

    if (missingDefaults.length > 0) {
      await prisma.transactionCategory.createMany({
        data: missingDefaults.map((category) => ({
          key: category.key,
          name: category.name,
          icon: category.icon,
          color: category.color,
          type: category.type,
          isDefault: true,
        })),
        skipDuplicates: true,
      })
    }

    const categories = await prisma.transactionCategory.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    return mergeCategoryVariants(categories)
  } catch {
    // Fallback for databases that haven't applied the new category migration yet.
    const legacyCategories = await prisma.$queryRawUnsafe<Array<{
      id: string
      name: string
      key: string
      icon: string | null
      createdAt: Date
    }>>('SELECT "id", "name", "key", "icon", "createdAt" FROM "TransactionCategory" ORDER BY "name" ASC')

    if (legacyCategories.length === 0) {
      return mapDefaultCategories(locale)
    }

    const merged = new Map<string, ReturnType<typeof normalizeLegacyCategories>[number]>()

    for (const category of normalizeLegacyCategories(legacyCategories)) {
      merged.set(category.key, category)
    }

    for (const category of mapDefaultCategories(locale)) {
      if (!merged.has(category.key)) {
        merged.set(category.key, category)
      }
    }

    return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name))
  }
}
