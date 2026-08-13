import { describe, it, expect } from 'vitest'
import {
  getCurrentWait,
  getBestTimeToday,
  getBestTimeThisWeek,
  getHeatmapMatrix,
  getNextOpenInfo,
  isWithinWorkingHours,
  blendWithLiveCheckins,
  OPD_OPEN_HOUR,
  OPD_CLOSE_HOUR,
} from './predictions'
import type { Checkin, QueuePattern } from '@/types'

const depId = 'dept-1'

const pattern = (
  id: string,
  day_of_week: number,
  hour: number,
  avg_wait_minutes: number,
  department_id = depId
): QueuePattern => ({
  id,
  department_id,
  day_of_week,
  hour,
  avg_wait_minutes,
  seed_wait_minutes: avg_wait_minutes,
  sample_count: 0,
  updated_at: '2025-01-01T00:00:00Z',
})

const patterns: QueuePattern[] = [
  pattern('1', 1, 9, 90),   // Mon 9am
  pattern('2', 1, 14, 25),  // Mon 2pm — best
  pattern('3', 2, 9, 80),   // Tue 9am
  pattern('4', 2, 10, 120), // Tue 10am — highest
]

describe('getCurrentWait', () => {
  it('returns avg_wait_minutes for exact day+hour match', () => {
    const monday9am = new Date('2025-01-06T09:00:00+05:30')
    expect(getCurrentWait(patterns, depId, monday9am)).toBe(90)
  })

  it('returns null when no pattern exists for the slot', () => {
    const monday8am = new Date('2025-01-06T08:00:00+05:30')
    expect(getCurrentWait(patterns, depId, monday8am)).toBeNull()
  })

  it('returns null for unknown department', () => {
    const monday9am = new Date('2025-01-06T09:00:00+05:30')
    expect(getCurrentWait(patterns, 'unknown-dept', monday9am)).toBeNull()
  })
})

describe('getBestTimeToday', () => {
  it('returns a slot that is actually today, not next week', () => {
    // Mon 10am — Mon 2pm (25min) is later today and should be returned as TODAY.
    const monday10am = new Date('2025-01-06T10:00:00+05:30')
    const best = getBestTimeToday(patterns, depId, monday10am)

    expect(best).not.toBeNull()
    expect(best!.waitMinutes).toBe(25)
    // The regression that hid the `|| 7` bug: assert the DATE, not just the wait.
    expect(best!.date.getDate()).toBe(monday10am.getDate())
    expect(best!.date.getHours()).toBe(14)
  })

  it('returns null once no slots remain today', () => {
    // Mon 3pm — Mon 2pm has passed and there are no later Monday slots.
    const monday3pm = new Date('2025-01-06T15:00:00+05:30')
    expect(getBestTimeToday(patterns, depId, monday3pm)).toBeNull()
  })

  it('never returns a slot earlier than now', () => {
    const monday10am = new Date('2025-01-06T10:00:00+05:30')
    const best = getBestTimeToday(patterns, depId, monday10am)
    expect(best!.date.getTime()).toBeGreaterThan(monday10am.getTime())
  })

  it('returns null for unknown department', () => {
    const monday9am = new Date('2025-01-06T09:00:00+05:30')
    expect(getBestTimeToday(patterns, 'unknown-dept', monday9am)).toBeNull()
  })
})

describe('getBestTimeThisWeek', () => {
  it('prefers a later-today slot and dates it today', () => {
    const monday10am = new Date('2025-01-06T10:00:00+05:30')
    const best = getBestTimeThisWeek(patterns, depId, monday10am)
    expect(best!.waitMinutes).toBe(25)
    expect(best!.date.getDate()).toBe(6)
  })

  it('rolls a passed slot forward to its next occurrence rather than dating it today', () => {
    // Mon 3pm — Mon 2pm (25min) is still the quietest slot in the coming week,
    // so it wins, but it must be dated NEXT Monday, not today.
    const monday3pm = new Date('2025-01-06T15:00:00+05:30')
    const best = getBestTimeThisWeek(patterns, depId, monday3pm)
    expect(best!.waitMinutes).toBe(25)
    expect(best!.date.getDate()).toBe(13)
    expect(best!.date.getDay()).toBe(1)
    expect(best!.date.getTime()).toBeGreaterThan(monday3pm.getTime())
  })

  it('breaks ties on proximity so the sooner of two equal slots wins', () => {
    const tied: QueuePattern[] = [
      pattern('a', 2, 9, 30), // Tue
      pattern('b', 5, 9, 30), // Fri
    ]
    const monday = new Date('2025-01-06T10:00:00+05:30')
    const best = getBestTimeThisWeek(tied, depId, monday)
    expect(best!.date.getDay()).toBe(2) // Tuesday, not Friday
  })

  it('wraps to next week for a slot whose weekday already passed', () => {
    // Sat — the only slots are Mon/Tue, so the best must land on the coming Monday.
    const saturday = new Date('2025-01-11T12:00:00+05:30')
    const best = getBestTimeThisWeek(patterns, depId, saturday)
    expect(best!.waitMinutes).toBe(25)
    expect(best!.date.getDay()).toBe(1)
    expect(best!.date.getTime()).toBeGreaterThan(saturday.getTime())
  })

  it('returns null when the department has no patterns', () => {
    const monday9am = new Date('2025-01-06T09:00:00+05:30')
    expect(getBestTimeThisWeek(patterns, 'unknown-dept', monday9am)).toBeNull()
  })
})

describe('isWithinWorkingHours', () => {
  it('is open during the day', () => {
    expect(isWithinWorkingHours(new Date('2025-01-06T09:00:00+05:30'))).toBe(true)
  })

  it('is closed before opening', () => {
    expect(isWithinWorkingHours(new Date('2025-01-06T07:59:00+05:30'))).toBe(false)
  })

  it('is closed at the close hour itself', () => {
    // OPD closes at 7pm — 19:00 onward must read as closed, matching getNextOpenInfo.
    expect(isWithinWorkingHours(new Date('2025-01-06T19:00:00+05:30'))).toBe(false)
    expect(isWithinWorkingHours(new Date('2025-01-06T19:45:00+05:30'))).toBe(false)
  })

  it('is open in the final working hour', () => {
    expect(isWithinWorkingHours(new Date('2025-01-06T18:59:00+05:30'))).toBe(true)
  })
})

describe('getNextOpenInfo', () => {
  it('reports opening later today when called before open', () => {
    const monday6am = new Date('2025-01-06T06:00:00+05:30')
    const info = getNextOpenInfo(patterns, depId, monday6am)
    expect(info.label).toContain('today')
  })

  it('skips days that have no pattern data', () => {
    // From Mon evening the next day WITH data is Tue; Wed–Sun have none.
    const mondayNight = new Date('2025-01-06T21:00:00+05:30')
    const info = getNextOpenInfo(patterns, depId, mondayNight)
    expect(info.label).toContain('tomorrow')
    expect(info.waitMinutes).toBe(80) // Tue 9am is the earliest Tue slot
  })

  it('falls back cleanly when the department has no data at all', () => {
    const mondayNight = new Date('2025-01-06T21:00:00+05:30')
    const info = getNextOpenInfo(patterns, 'unknown-dept', mondayNight)
    expect(info.waitMinutes).toBeNull()
    expect(info.label).toBeTruthy()
  })

  it('agrees with isWithinWorkingHours at the boundary', () => {
    const at1930 = new Date('2025-01-06T19:30:00+05:30')
    expect(isWithinWorkingHours(at1930)).toBe(false)
    // Closed means it must tell us about a FUTURE opening, not today's.
    expect(getNextOpenInfo(patterns, depId, at1930).label).not.toContain('today')
  })
})

describe('getHeatmapMatrix', () => {
  it('returns 7×12 matrix', () => {
    const matrix = getHeatmapMatrix(patterns, depId)
    expect(matrix).toHaveLength(7)
    matrix.forEach((row) => expect(row).toHaveLength(12))
  })

  it('maps intensity 0-5 relative to max wait', () => {
    const matrix = getHeatmapMatrix(patterns, depId)
    // Tue 10am (day 2, hour 10) is 120min — the max — so intensity 5.
    // HEATMAP_DAYS = [1,2,3,4,5,6,0] → Tue is index 1; hour 10 is index 2.
    expect(matrix[1][2]).toBe(5)
  })

  it('distinguishes "no data" from "quiet" using null', () => {
    const matrix = getHeatmapMatrix(patterns, depId)
    // Sunday has no patterns at all — every cell must be null, not 0.
    expect(matrix[6].every((v) => v === null)).toBe(true)
    // And a real low-wait slot must still be a number.
    expect(typeof matrix[0][6]).toBe('number') // Mon 2pm
  })

  it('handles an empty pattern list without producing NaN', () => {
    const matrix = getHeatmapMatrix([], depId)
    expect(matrix).toHaveLength(7)
    expect(matrix.flat().every((v) => v === null)).toBe(true)
  })
})

describe('blendWithLiveCheckins', () => {
  const now = new Date('2025-01-06T10:00:00+05:30')
  const mk = (condition: Checkin['queue_condition'], minutesAgo: number): Checkin => ({
    id: `c-${condition}-${minutesAgo}`,
    department_id: depId,
    doctor_id: null,
    queue_condition: condition,
    ended_at: null,
    created_at: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
  })

  it('returns the historical value when there are no live reports', () => {
    expect(blendWithLiveCheckins(90, [], now)).toBe(90)
  })

  it('pulls the estimate up when live reports say the queue is long', () => {
    const blended = blendWithLiveCheckins(30, [mk('long', 5), mk('long', 10)], now)
    expect(blended).toBeGreaterThan(30)
  })

  it('pulls the estimate down when live reports say the queue is short', () => {
    const blended = blendWithLiveCheckins(120, [mk('short', 5), mk('short', 10)], now)
    expect(blended).toBeLessThan(120)
  })

  it('weights recent reports more heavily than stale ones', () => {
    const fresh = blendWithLiveCheckins(30, [mk('long', 2)], now)
    const stale = blendWithLiveCheckins(30, [mk('long', 200)], now)
    expect(fresh).toBeGreaterThan(stale)
  })

  it('falls back to live reports alone when there is no historical value', () => {
    expect(blendWithLiveCheckins(null, [mk('short', 5)], now)).toBeGreaterThan(0)
  })

  it('returns null when there is neither history nor live data', () => {
    expect(blendWithLiveCheckins(null, [], now)).toBeNull()
  })

  it('never returns a negative wait', () => {
    expect(blendWithLiveCheckins(5, [mk('short', 1)], now)!).toBeGreaterThanOrEqual(0)
  })
})

describe('OPD hour constants', () => {
  it('exposes a single source of truth for open/close', () => {
    expect(OPD_OPEN_HOUR).toBe(8)
    expect(OPD_CLOSE_HOUR).toBe(19)
  })
})
