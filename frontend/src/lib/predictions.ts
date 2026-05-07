import type { QueuePattern } from '@/types'

// Mon-first ordering for heatmap display (matches UI mockData DAYS order)
const HEATMAP_DAYS = [1, 2, 3, 4, 5, 6, 0] // Mon=1 … Sat=6, Sun=0
const HEATMAP_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]

export function getCurrentWait(
  patterns: QueuePattern[],
  departmentId: string,
  at: Date
): number | null {
  const p = patterns.find(
    (p) =>
      p.department_id === departmentId &&
      p.day_of_week === at.getDay() &&
      p.hour === at.getHours()
  )
  return p?.avg_wait_minutes ?? null
}

export function getBestTimeToVisit(
  patterns: QueuePattern[],
  departmentId: string,
  from: Date
): { date: Date; waitMinutes: number } | null {
  const day = from.getDay()
  const hour = from.getHours()

  const future = patterns
    .filter((p) => p.department_id === departmentId)
    .filter((p) => p.day_of_week !== day || p.hour > hour)
    .sort((a, b) => a.avg_wait_minutes - b.avg_wait_minutes)

  if (!future.length) return null

  const best = future[0]
  const daysUntil = (best.day_of_week - day + 7) % 7 || 7
  const date = new Date(from)
  date.setDate(date.getDate() + daysUntil)
  date.setHours(best.hour, 0, 0, 0)

  return { date, waitMinutes: best.avg_wait_minutes }
}

export function getHeatmapMatrix(
  patterns: QueuePattern[],
  departmentId: string
): number[][] {
  const dept = patterns.filter((p) => p.department_id === departmentId)
  const maxWait = Math.max(...dept.map((p) => p.avg_wait_minutes), 1)

  return HEATMAP_DAYS.map((day) =>
    HEATMAP_HOURS.map((hour) => {
      const p = dept.find((p) => p.day_of_week === day && p.hour === hour)
      if (!p) return 0
      return Math.round((p.avg_wait_minutes / maxWait) * 5)
    })
  )
}

export function formatWaitTime(minutes: number | null): string {
  if (minutes === null) return 'No data'
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function isWithinWorkingHours(date: Date): boolean {
  const h = date.getHours()
  return h >= 8 && h <= 19
}

// Returns human-readable label for when OPD next opens, plus the expected wait at opening.
export function getNextOpenInfo(
  patterns: QueuePattern[],
  departmentId: string,
  now: Date
): { label: string; sublabel: string; waitMinutes: number | null } {
  const hour = now.getHours()
  const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Opens later today
  if (hour < 8) {
    const wait = patterns.find(
      (p) => p.department_id === departmentId && p.day_of_week === now.getDay() && p.hour === 8
    )?.avg_wait_minutes ?? null
    return { label: 'Opens today at 8:00 AM', sublabel: 'OPD starts at 8 AM', waitMinutes: wait }
  }

  // After closing — find next day with data
  const base = new Date(now)
  for (let offset = 1; offset <= 7; offset++) {
    base.setDate(now.getDate() + offset)
    const nextDay = base.getDay()
    const wait = patterns.find(
      (p) => p.department_id === departmentId && p.day_of_week === nextDay && p.hour === 8
    )?.avg_wait_minutes ?? null

    const isToday = offset === 0
    const isTomorrow = offset === 1
    const dayLabel = isToday ? 'today' : isTomorrow ? 'tomorrow' : DAY[nextDay]
    return {
      label: `Opens ${dayLabel} at 8:00 AM`,
      sublabel: `Next OPD session · ${DAY[nextDay]}`,
      waitMinutes: wait,
    }
  }

  return { label: 'OPD closed', sublabel: 'Check back during working hours', waitMinutes: null }
}
