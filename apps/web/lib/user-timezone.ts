import prisma from '@lib/prisma'
import { DEFAULT_TIMEZONE, TIMEZONE_SETTING_KEY, normalizeTimeZone } from '@/lib/timezone'

export async function getUserTimeZone(userId: string, fallback = DEFAULT_TIMEZONE) {
  const setting = await prisma.userSetting.findUnique({
    where: {
      userId_key: {
        userId,
        key: TIMEZONE_SETTING_KEY,
      },
    },
    select: {
      value: true,
    },
  }).catch(() => null)

  return normalizeTimeZone(setting?.value, fallback)
}
