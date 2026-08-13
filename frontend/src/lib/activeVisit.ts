/**
 * Pointer to the visit currently in progress.
 *
 * This lived in sessionStorage, which meant a refresh in a new tab — or any
 * session-storage loss — orphaned the visit: ActiveVisit fell back to
 * `new Date()` and the "waited so far" counter silently reset to zero.
 * localStorage survives that, and ActiveVisit additionally recovers the visit
 * from the database via useOwnActiveCheckin, so this is only a fast path.
 */
const CHECKIN_KEY = 'active_checkin_id'
const DEPT_KEY = 'active_dept_id'
const WAITED_KEY = 'active_waited_minutes'

export function rememberActiveCheckin(checkinId: string, departmentId: string): void {
  localStorage.setItem(CHECKIN_KEY, checkinId)
  localStorage.setItem(DEPT_KEY, departmentId)
}

/**
 * Records how long the visit actually took, so the feedback form can open on the
 * measured value instead of an arbitrary default. Feedback now feeds the
 * prediction model, so a default nobody chose would be fabricated training data.
 */
export function rememberWaitedMinutes(minutes: number): void {
  localStorage.setItem(WAITED_KEY, String(minutes))
}

export function readActiveCheckin(): {
  checkinId: string | null
  departmentId: string | null
  waitedMinutes: number | null
} {
  const waited = localStorage.getItem(WAITED_KEY)
  const parsed = waited === null ? NaN : Number(waited)
  return {
    checkinId: localStorage.getItem(CHECKIN_KEY),
    departmentId: localStorage.getItem(DEPT_KEY),
    waitedMinutes: Number.isFinite(parsed) ? parsed : null,
  }
}

export function clearActiveCheckin(): void {
  localStorage.removeItem(CHECKIN_KEY)
  localStorage.removeItem(DEPT_KEY)
  localStorage.removeItem(WAITED_KEY)
  // Clean up the old session-scoped keys from before this moved to localStorage.
  sessionStorage.removeItem(CHECKIN_KEY)
  sessionStorage.removeItem(DEPT_KEY)
}
