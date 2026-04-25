import { describe, it, expect } from 'vitest'
import { getCurrentWait, getBestTimeToVisit, getHeatmapMatrix } from './predictions'
import type { QueuePattern } from '@/types'

const depId = 'dept-1'

const patterns: QueuePattern[] = [
  { id: '1', department_id: depId, day_of_week: 1, hour: 9,  avg_wait_minutes: 90 },  // Mon 9am
  { id: '2', department_id: depId, day_of_week: 1, hour: 14, avg_wait_minutes: 25 },  // Mon 2pm — best
  { id: '3', department_id: depId, day_of_week: 2, hour: 9,  avg_wait_minutes: 80 },  // Tue 9am
  { id: '4', department_id: depId, day_of_week: 2, hour: 10, avg_wait_minutes: 120 }, // Tue 10am — highest
]

describe('getCurrentWait', () => {
  it('returns avg_wait_minutes for exact day+hour match', () => {
    const monday9am = new Date('2025-01-06T09:00:00') // Monday
    expect(getCurrentWait(patterns, depId, monday9am)).toBe(90)
  })

  it('returns null when no pattern exists for the slot', () => {
    const monday8am = new Date('2025-01-06T08:00:00')
    expect(getCurrentWait(patterns, depId, monday8am)).toBeNull()
  })

  it('returns null for unknown department', () => {
    const monday9am = new Date('2025-01-06T09:00:00')
    expect(getCurrentWait(patterns, 'unknown-dept', monday9am)).toBeNull()
  })
})

describe('getBestTimeToVisit', () => {
  it('returns the slot with lowest avg_wait_minutes after current time', () => {
    const monday10am = new Date('2025-01-06T10:00:00') // Mon 10am — Mon 2pm (25min) is best future slot
    const best = getBestTimeToVisit(patterns, depId, monday10am)
    expect(best).not.toBeNull()
    expect(best!.waitMinutes).toBe(25)
  })

  it('returns null if no patterns exist for department', () => {
    const monday9am = new Date('2025-01-06T09:00:00')
    expect(getBestTimeToVisit(patterns, 'unknown-dept', monday9am)).toBeNull()
  })

  it('skips past slots on same day', () => {
    const monday15pm = new Date('2025-01-06T15:00:00') // Mon 3pm — 2pm already passed
    const best = getBestTimeToVisit(patterns, depId, monday15pm)
    // Mon 2pm is past, so best is Tue 9am (80min) since 25min slot is gone
    expect(best).not.toBeNull()
    expect(best!.waitMinutes).toBe(80)
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
    // Tue 10am (day_of_week=2, hour=10) has 120min — max, so should be 5
    // HEATMAP_DAYS = [1,2,3,4,5,6,0] → Tue is index 1, hour 10 is index 2
    expect(matrix[1][2]).toBe(5)
  })

  it('cells with no pattern data return 0', () => {
    const matrix = getHeatmapMatrix(patterns, depId)
    // Sun (index 6 in DAYS array) has no patterns → all zeros
    expect(matrix[6].every((v) => v === 0)).toBe(true)
  })
})
