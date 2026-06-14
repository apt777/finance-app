function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function calculateNextRunDate(baseDate: Date, interval: string, dayOfMonth?: number | null, dayOfWeek?: number | null) {
  const next = new Date(baseDate)

  if (interval === 'weekly') {
    const targetDay = typeof dayOfWeek === 'number' ? dayOfWeek : next.getDay()
    const diff = (targetDay - next.getDay() + 7) % 7 || 7
    next.setDate(next.getDate() + diff)
    return startOfDay(next)
  }

  if (interval === 'yearly') {
    next.setFullYear(next.getFullYear() + 1)
    return startOfDay(next)
  }

  next.setDate(1)
  next.setMonth(next.getMonth() + 1)
  const targetDay = Math.max(1, Math.min(dayOfMonth || baseDate.getDate(), daysInMonth(next.getFullYear(), next.getMonth())))
  next.setDate(targetDay)
  return startOfDay(next)
}

export function calculateInitialRunDate(startDate: Date, interval: string, dayOfMonth?: number | null, dayOfWeek?: number | null) {
  const base = startOfDay(startDate)

  if (interval === 'weekly') {
    const targetDay = typeof dayOfWeek === 'number' ? dayOfWeek : base.getDay()
    const diff = (targetDay - base.getDay() + 7) % 7
    base.setDate(base.getDate() + diff)
    return startOfDay(base)
  }

  if (interval === 'yearly') {
    return startOfDay(base)
  }

  const targetDay = Math.max(1, Math.min(dayOfMonth || base.getDate(), daysInMonth(base.getFullYear(), base.getMonth())))
  const sameMonthCandidate = new Date(base.getFullYear(), base.getMonth(), targetDay)
  if (sameMonthCandidate.getTime() >= base.getTime()) {
    return startOfDay(sameMonthCandidate)
  }

  return calculateNextRunDate(base, interval, dayOfMonth, dayOfWeek)
}
