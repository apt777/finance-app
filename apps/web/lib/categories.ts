import prisma from '@lib/prisma'
import { DEFAULT_TRANSACTION_CATEGORIES } from './defaultCategories'

function mapDefaultCategories() {
  return DEFAULT_TRANSACTION_CATEGORIES.map((category, index) => ({
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

function normalizeLegacyCategories(
  categories: Array<{ id: string; name: string; key: string; icon: string | null; createdAt: Date }>
) {
  return categories.map((category) => {
    const defaultCategory = DEFAULT_TRANSACTION_CATEGORIES.find((item) => item.key === category.key)
    return {
      ...category,
      userId: null,
      color: defaultCategory?.color ?? '#64748b',
      type: defaultCategory?.type ?? 'expense',
      isDefault: Boolean(defaultCategory),
    }
  })
}

export async function ensureDefaultCategories(userId: string) {
  try {
    const existing = await prisma.transactionCategory.findMany({
      where: {
        OR: [{ userId }, { isDefault: true, userId: null }],
      },
      select: { key: true, userId: true },
    })

    const existingKeys = new Set(existing.map((category) => `${category.userId ?? 'default'}:${category.key}`))

    const missingDefaults = DEFAULT_TRANSACTION_CATEGORIES.filter(
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

    return await prisma.transactionCategory.findMany({
      where: {
        OR: [{ userId }, { isDefault: true, userId: null }],
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
  } catch {
    // Fallback for databases that haven't applied the new category migration yet.
    const legacyCategories = await prisma.transactionCategory.findMany({
      orderBy: { name: 'asc' },
    })

    if (legacyCategories.length === 0) {
      return mapDefaultCategories()
    }

    const merged = new Map<string, ReturnType<typeof normalizeLegacyCategories>[number]>()

    for (const category of normalizeLegacyCategories(legacyCategories)) {
      merged.set(category.key, category)
    }

    for (const category of mapDefaultCategories()) {
      if (!merged.has(category.key)) {
        merged.set(category.key, category)
      }
    }

    return Array.from(merged.values())
  }
}
