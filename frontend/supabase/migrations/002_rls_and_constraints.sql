-- ============================================================================
-- 002 — Row Level Security, integrity constraints, and indexes
--
-- 001_schema.sql enabled RLS only on user_preferences, checkins and
-- visit_feedback. Reference tables were left unprotected in the repo while
-- production had RLS switched on with no policies at all, which silently denied
-- every read. This migration makes the repo reproduce production from scratch
-- and closes the gaps that let the client write data it shouldn't.
--
-- Every statement below is written to be safe to re-run: Supabase's SQL Editor
-- commits each statement as it executes rather than wrapping the whole paste in
-- one transaction, so a failure partway through a run still leaves everything
-- before it applied. Idempotent statements mean re-running after fixing a later
-- error can't fail on an earlier one that already succeeded.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Reference data: readable by everyone (guests included), writable by no one.
-- GuestResult and onboarding both read these before the user has an account.
-- ---------------------------------------------------------------------------
ALTER TABLE hospitals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read hospitals"      ON hospitals;
DROP POLICY IF EXISTS "public read departments"    ON departments;
DROP POLICY IF EXISTS "public read doctors"        ON doctors;
DROP POLICY IF EXISTS "public read queue_patterns" ON queue_patterns;

CREATE POLICY "public read hospitals"      ON hospitals      FOR SELECT USING (TRUE);
CREATE POLICY "public read departments"    ON departments    FOR SELECT USING (TRUE);
CREATE POLICY "public read doctors"        ON doctors        FOR SELECT USING (TRUE);
CREATE POLICY "public read queue_patterns" ON queue_patterns FOR SELECT USING (TRUE);

-- ---------------------------------------------------------------------------
-- Check-in privacy.
--
-- The old policy was `FOR SELECT USING (TRUE)` on the base table, which handed
-- every client the user_id behind every check-in while the UI labelled the feed
-- "Anonymous". Reads now go through a view that simply does not carry user_id.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "read all checkins" ON checkins;
DROP POLICY IF EXISTS "read own checkins" ON checkins;

-- Users may still read their OWN rows (ActiveVisit needs to recover an open visit).
CREATE POLICY "read own checkins"
  ON checkins FOR SELECT USING (auth.uid() = user_id);

-- security_invoker = FALSE is deliberate: the view runs as its owner so it can
-- read every department's rows, while structurally being unable to leak user_id
-- because the column is not in its definition. Supabase's advisor flags
-- security-definer views by default; this one is the intended use of the pattern.
--
-- Trade-off to be aware of: because the base table no longer grants blanket
-- SELECT, Realtime's postgres_changes can only deliver a user their own rows.
-- The live feed therefore refreshes on the existing 30s poll rather than a
-- socket push. Restoring socket-speed updates without reopening the leak would
-- mean broadcasting sanitised payloads from a trigger.
CREATE OR REPLACE VIEW public_checkins
WITH (security_invoker = FALSE) AS
  SELECT id, department_id, doctor_id, queue_condition, ended_at, created_at
  FROM checkins;

GRANT SELECT ON public_checkins TO anon, authenticated;

COMMENT ON VIEW public_checkins IS
  'Anonymised check-in feed. Deliberately omits user_id so the "Anonymous" label in the UI is accurate.';

-- One open visit per user at a time. Prevents a user inflating the live feed by
-- checking in repeatedly without ending the previous visit.
--
-- If this fails with a uniqueness violation, some user already has more than one
-- open check-in (leftover test data from before this constraint existed). Run:
--   WITH ranked AS (
--     SELECT id, user_id,
--            ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
--     FROM checkins WHERE ended_at IS NULL AND user_id IS NOT NULL
--   )
--   UPDATE checkins SET ended_at = now() WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
-- then re-run this file.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_checkin_per_user
  ON checkins (user_id)
  WHERE ended_at IS NULL AND user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Feedback integrity.
--
-- 001 allowed any authenticated user to insert feedback against ANY check-in,
-- as many times as they liked, and gave nobody permission to read it back.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visit_feedback_one_per_checkin'
  ) THEN
    ALTER TABLE visit_feedback
      ADD CONSTRAINT visit_feedback_one_per_checkin UNIQUE (checkin_id);
  END IF;
END $$;

DROP POLICY IF EXISTS "insert own feedback" ON visit_feedback;
DROP POLICY IF EXISTS "read own feedback"   ON visit_feedback;

CREATE POLICY "insert own feedback"
  ON visit_feedback FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM checkins c
      WHERE c.id = checkin_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "read own feedback"
  ON visit_feedback FOR SELECT USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Doctor status: crowdsourced with consensus instead of a raw client UPDATE.
--
-- Before this, the client called UPDATE on doctors directly. With RLS enabled
-- and no UPDATE policy that matched zero rows and returned no error, so the app
-- cheerfully toasted "Status updated. Thank you for reporting!" while nothing
-- changed. Reports now go into their own table and only move the published
-- status once two distinct users agree within the freshness window — which is
-- what the "How we know" copy on the doctor page already claims happens.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctor_status_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_status TEXT NOT NULL CHECK (reported_status IN ('on_duty', 'on_leave')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE doctor_status_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert own status report" ON doctor_status_reports;
DROP POLICY IF EXISTS "read status reports"       ON doctor_status_reports;

CREATE POLICY "insert own status report"
  ON doctor_status_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "read status reports"
  ON doctor_status_reports FOR SELECT USING (TRUE);

-- date_trunc(text, timestamptz) is STABLE, not IMMUTABLE — it depends on the
-- session's TimeZone setting — so Postgres won't allow it directly in an index
-- expression. Pinning the zone to a literal 'UTC' makes the result genuinely a
-- pure function of the input, so declaring this IMMUTABLE is accurate, not a lie.
CREATE OR REPLACE FUNCTION hour_bucket_utc(ts TIMESTAMPTZ)
RETURNS TIMESTAMP
LANGUAGE SQL IMMUTABLE PARALLEL SAFE
AS $$ SELECT date_trunc('hour', ts AT TIME ZONE 'UTC') $$;

-- Rate limit: one report per user per doctor per hour.
CREATE UNIQUE INDEX IF NOT EXISTS one_status_report_per_user_hour
  ON doctor_status_reports (doctor_id, user_id, hour_bucket_utc(created_at));

CREATE INDEX IF NOT EXISTS doctor_status_reports_recent
  ON doctor_status_reports (doctor_id, created_at DESC);

-- Freshness window for both consensus and the "not updated recently" state.
CREATE OR REPLACE FUNCTION doctor_status_window() RETURNS INTERVAL
  LANGUAGE SQL IMMUTABLE AS $$ SELECT INTERVAL '6 hours' $$;

/**
 * Recomputes a doctor's published status from recent reports.
 * Requires >= 2 distinct users reporting the same status inside the window;
 * otherwise the doctor falls back to 'unknown' rather than trusting one voice.
 */
CREATE OR REPLACE FUNCTION recompute_doctor_status(target_doctor UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  winning_status TEXT;
BEGIN
  SELECT reported_status INTO winning_status
  FROM doctor_status_reports
  WHERE doctor_id = target_doctor
    AND created_at > NOW() - doctor_status_window()
  GROUP BY reported_status
  HAVING COUNT(DISTINCT user_id) >= 2
  ORDER BY COUNT(DISTINCT user_id) DESC, MAX(created_at) DESC
  LIMIT 1;

  UPDATE doctors
  SET status = COALESCE(winning_status, 'unknown'),
      status_updated_at = NOW()
  WHERE id = target_doctor;
END;
$$;

CREATE OR REPLACE FUNCTION on_doctor_status_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM recompute_doctor_status(NEW.doctor_id);
  RETURN NEW;
END;
$$;

-- DROP + CREATE rather than CREATE OR REPLACE TRIGGER for compatibility with
-- Postgres versions before 14, which don't support replacing triggers in place.
DROP TRIGGER IF EXISTS doctor_status_report_applied ON doctor_status_reports;

CREATE TRIGGER doctor_status_report_applied
  AFTER INSERT ON doctor_status_reports
  FOR EACH ROW EXECUTE FUNCTION on_doctor_status_report();

-- ---------------------------------------------------------------------------
-- Indexes for the hot read paths.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS checkins_department_created
  ON checkins (department_id, created_at DESC);

CREATE INDEX IF NOT EXISTS checkins_department_active
  ON checkins (department_id) WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS queue_patterns_department
  ON queue_patterns (department_id);

CREATE INDEX IF NOT EXISTS doctors_department     ON doctors (department_id);
CREATE INDEX IF NOT EXISTS doctors_hospital        ON doctors (hospital_id);
CREATE INDEX IF NOT EXISTS departments_hospital    ON departments (hospital_id);
