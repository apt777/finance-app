import prisma from '@lib/prisma'

export type SubscriptionPlan = 'free' | 'plus'

export const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  free: ['manual_tracking', 'exchange_rates', 'basic_analysis'],
  plus: ['manual_tracking', 'exchange_rates', 'basic_analysis', 'ai_bulk_import', 'ai_advice', 'advanced_analysis'],
}

const PLAN_KEY = 'subscription_plan'

export function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  return value === 'free' || value === 'plus'
}

export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  const setting = await prisma.userSetting.findUnique({
    where: {
      userId_key: {
        userId,
        key: PLAN_KEY,
      },
    },
  })

  return setting?.value === 'plus' ? 'plus' : 'free'
}

export async function getUserEntitlements(userId: string) {
  const plan = await getUserPlan(userId)
  return {
    plan,
    features: PLAN_FEATURES[plan],
  }
}

export function hasFeature(features: string[], feature: string) {
  return features.includes(feature)
}
