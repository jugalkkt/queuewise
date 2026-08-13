export interface Hospital {
  id: string
  name: string
  city: string
  address: string | null
  phone: string | null
  created_at: string
}

export interface Department {
  id: string
  hospital_id: string
  name: string
}

export interface QueuePattern {
  id: string
  department_id: string
  day_of_week: number  // 0=Sun .. 6=Sat (Asia/Kolkata)
  hour: number         // 8..19
  avg_wait_minutes: number
  /** Immutable seeded baseline that observed waits are blended against. */
  seed_wait_minutes: number
  /** How many real visit_feedback observations back this bucket. */
  sample_count: number
  updated_at: string
}

export interface Doctor {
  id: string
  department_id: string
  hospital_id: string
  name: string
  status: 'on_duty' | 'on_leave' | 'unknown'
  typical_days: number[] | null
  status_updated_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  primary_hospital_id: string | null
  primary_department_id: string | null
  saved_department_ids: string[]
  notif_morning_digest: boolean
  notif_best_time: boolean
  notif_live_queue: boolean
  notif_feedback_reminder: boolean
  onboarding_completed: boolean
}

/**
 * A check-in as exposed by the `public_checkins` view — deliberately without
 * user_id, so the anonymous feed cannot leak who reported what.
 */
export interface Checkin {
  id: string
  department_id: string
  doctor_id: string | null
  queue_condition: 'short' | 'medium' | 'long'
  ended_at: string | null
  created_at: string
}

/** The caller's own check-in, read from the base table under RLS. */
export interface OwnCheckin extends Checkin {
  user_id: string
}

export interface DoctorStatusReport {
  id: string
  doctor_id: string
  user_id: string
  reported_status: 'on_duty' | 'on_leave'
  created_at: string
}

export interface VisitFeedback {
  id: string
  user_id: string | null
  checkin_id: string
  actual_wait_minutes: number | null
  doctor_available: boolean | null
  experience_rating: 'poor' | 'neutral' | 'good' | null
  created_at: string
}
