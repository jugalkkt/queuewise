import type { Checkin, QueuePattern } from '@/types'

// Mon-first ordering for heatmap display (matches UI mockData DAYS order)
const HEATMAP_DAYS = [1, 2, 3, 4, 5, 6, 0] // Mon=1 … Sat=6, Sun=0
const HEATMAP_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// OPD is open [OPD_OPEN_HOUR, OPD_CLOSE_HOUR) — 8:00 up to but not including 19:00.
// Single source of truth so isWithinWorkingHours and getNextOpenInfo cannot disagree.
export const OPD_OPEN_HOUR = 8
export const OPD_CLOSE_HOUR = 19

const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Day-of-week and hour as they are in Kerala, regardless of where the viewer is.
 * Predictions are bucketed by IST on the server, so the client must agree.
 */
export function istParts(date: Date): { day: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date)

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
  const hourRaw = parts.find((p) => p.type === 'hour')?.value ?? '0'

  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday)
  // Intl can emit "24" for midnight under hour12:false; normalise it to 0.
  const hour = Number(hourRaw) % 24

  return { day: dayIndex === -1 ? date.getDay() : dayIndex, hour }
}

export function getCurrentWait(
  patterns: QueuePattern[],
  departmentId: string,
  at: Date
): number | null {
  const { day, hour } = istParts(at)
  const p = patterns.find(
    (p) => p.department_id === departmentId && p.day_of_week === day && p.hour === hour
  )
  return p?.avg_wait_minutes ?? null
}

/** Builds a Date `daysAhead` days from `from`, at `hour` o'clock local time. */
function dateAtSlot(from: Date, daysAhead: number, hour: number): Date {
  const date = new Date(from)
  date.setDate(date.getDate() + daysAhead)
  date.setHours(hour, 0, 0, 0)
  return date
}

/**
 * Lowest-wait slot still remaining TODAY. Returns null once the day is exhausted,
 * so a card labelled "best time today" can never advertise a slot on another day.
 */
export function getBestTimeToday(
  patterns: QueuePattern[],
  departmentId: string,
  from: Date
): { date: Date; waitMinutes: number } | null {
  const { day, hour } = istParts(from)

  const remaining = patterns
    .filter((p) => p.department_id === departmentId)
    .filter((p) => p.day_of_week === day && p.hour > hour)
    .sort((a, b) => a.avg_wait_minutes - b.avg_wait_minutes)

  if (!remaining.length) return null

  const best = remaining[0]
  return { date: dateAtSlot(from, 0, best.hour), waitMinutes: best.avg_wait_minutes }
}

/**
 * Lowest-wait slot in the next 7 days. A slot later today is dated today —
 * the previous implementation used `% 7 || 7`, which pushed same-day slots a
 * full week into the future because the modulo legitimately yields 0.
 */
export function getBestTimeThisWeek(
  patterns: QueuePattern[],
  departmentId: string,
  from: Date
): { date: Date; waitMinutes: number } | null {
  const { day, hour } = istParts(from)

  const upcoming = patterns
    .filter((p) => p.department_id === departmentId)
    .map((p) => {
      // How many days until this weekday next occurs, counting today as 0 only
      // when the hour has not already passed.
      let daysAhead = (p.day_of_week - day + 7) % 7
      if (daysAhead === 0 && p.hour <= hour) daysAhead = 7
      return { pattern: p, daysAhead }
    })
    .sort(
      (a, b) =>
        a.pattern.avg_wait_minutes - b.pattern.avg_wait_minutes ||
        // Tie-break on proximity so an equally-quiet slot today beats one next week.
        a.daysAhead - b.daysAhead
    )

  if (!upcoming.length) return null

  const { pattern, daysAhead } = upcoming[0]
  return {
    date: dateAtSlot(from, daysAhead, pattern.hour),
    waitMinutes: pattern.avg_wait_minutes,
  }
}

/**
 * 7×12 intensity matrix. Slots with no pattern data are `null` rather than 0 so
 * the UI can distinguish "nobody has reported this hour" from "this hour is quiet".
 */
export function getHeatmapMatrix(
  patterns: QueuePattern[],
  departmentId: string
): (number | null)[][] {
  const dept = patterns.filter((p) => p.department_id === departmentId)
  const maxWait = Math.max(...dept.map((p) => p.avg_wait_minutes), 1)

  return HEATMAP_DAYS.map((day) =>
    HEATMAP_HOURS.map((hour) => {
      const p = dept.find((p) => p.day_of_week === day && p.hour === hour)
      if (!p) return null
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
  const { hour } = istParts(date)
  return hour >= OPD_OPEN_HOUR && hour < OPD_CLOSE_HOUR
}

/** Earliest slot with data on a given weekday. */
function earliestSlotOnDay(
  patterns: QueuePattern[],
  departmentId: string,
  dayOfWeek: number
): QueuePattern | null {
  const slots = patterns
    .filter((p) => p.department_id === departmentId && p.day_of_week === dayOfWeek)
    .sort((a, b) => a.hour - b.hour)
  return slots[0] ?? null
}

/**
 * Human-readable label for when OPD next opens, plus the expected wait then.
 * Walks forward until it finds a day that actually has pattern data — the previous
 * version returned unconditionally on the first iteration, so the search never ran.
 */
export function getNextOpenInfo(
  patterns: QueuePattern[],
  departmentId: string,
  now: Date
): { label: string; sublabel: string; waitMinutes: number | null } {
  const { day, hour } = istParts(now)

  // Before opening: it opens later the same day.
  if (hour < OPD_OPEN_HOUR) {
    const slot = earliestSlotOnDay(patterns, departmentId, day)
    return {
      label: `Opens today at ${OPD_OPEN_HOUR}:00 AM`,
      sublabel: `OPD starts at ${OPD_OPEN_HOUR} AM`,
      waitMinutes: slot?.avg_wait_minutes ?? null,
    }
  }

  // After closing: find the next day that has data.
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (day + offset) % 7
    const slot = earliestSlotOnDay(patterns, departmentId, nextDay)
    if (!slot) continue

    const dayLabel = offset === 1 ? 'tomorrow' : DAY_NAMES[nextDay]
    return {
      label: `Opens ${dayLabel} at ${OPD_OPEN_HOUR}:00 AM`,
      sublabel: `Next OPD session · ${DAY_NAMES[nextDay]}`,
      waitMinutes: slot.avg_wait_minutes,
    }
  }

  return { label: 'OPD closed', sublabel: 'Check back during working hours', waitMinutes: null }
}

// Minute estimates behind each queue bucket, matching the descriptions users are
// shown when they report ("Under 30 min" / "30 min – 1.5 hr" / "Over 1.5 hr").
const CONDITION_MINUTES: Record<Checkin['queue_condition'], number> = {
  short: 20,
  medium: 60,
  long: 110,
}

// A report loses half its influence every 45 minutes.
const CHECKIN_HALF_LIFE_MINUTES = 45
// How much weight the historical pattern carries against live reports.
const HISTORICAL_WEIGHT = 2

/**
 * Blends the historical prediction with what people on-site are reporting right now,
 * weighting recent reports more heavily. This is what makes the "live" figure live —
 * previously active check-ins only changed a caption and never moved the number.
 */
export function blendWithLiveCheckins(
  historicalWait: number | null,
  checkins: Checkin[],
  now: Date
): number | null {
  let weightedSum = 0
  let totalWeight = 0

  for (const c of checkins) {
    const ageMinutes = (now.getTime() - new Date(c.created_at).getTime()) / 60_000
    if (ageMinutes < 0) continue
    const weight = Math.pow(0.5, ageMinutes / CHECKIN_HALF_LIFE_MINUTES)
    weightedSum += CONDITION_MINUTES[c.queue_condition] * weight
    totalWeight += weight
  }

  if (historicalWait !== null) {
    weightedSum += historicalWait * HISTORICAL_WEIGHT
    totalWeight += HISTORICAL_WEIGHT
  }

  if (totalWeight === 0) return null
  return Math.max(0, Math.round(weightedSum / totalWeight))
}
