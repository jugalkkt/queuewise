-- ============================================================================
-- 003 — Close the crowdsourcing loop
--
-- Until now `queue_patterns` was read-only: the entire codebase contained a
-- single reference to it, a SELECT. Check-ins and post-visit feedback were
-- written and never read back, so the predictions could not improve and the
-- "crowdsourced / gets smarter over time" claim was not implemented.
--
-- This migration feeds visit_feedback.actual_wait_minutes back into
-- queue_patterns using a weighted blend against the seeded baseline, so a
-- single outlier report cannot swing a bucket.
-- ============================================================================

-- Track how much evidence sits behind each bucket, so blending is principled
-- rather than last-write-wins, and so the UI can show confidence later.
-- IF NOT EXISTS makes this safe to re-run after a partial failure further down.
ALTER TABLE queue_patterns
  ADD COLUMN IF NOT EXISTS seed_wait_minutes SMALLINT,
  ADD COLUMN IF NOT EXISTS sample_count      INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Preserve the original seeded value as the prior. Scoped to rows that don't
-- have one yet — on a re-run after live blending has already moved
-- avg_wait_minutes, an unguarded UPDATE would clobber the real prior with an
-- already-blended value.
UPDATE queue_patterns SET seed_wait_minutes = avg_wait_minutes WHERE seed_wait_minutes IS NULL;

ALTER TABLE queue_patterns ALTER COLUMN seed_wait_minutes SET NOT NULL;

COMMENT ON COLUMN queue_patterns.seed_wait_minutes IS
  'Immutable baseline from seed data. Acts as the prior that observed waits are blended against.';
COMMENT ON COLUMN queue_patterns.sample_count IS
  'Number of real visit_feedback observations folded into avg_wait_minutes.';

-- How much the seeded baseline counts for, expressed in "equivalent reports".
-- At PRIOR_WEIGHT = 5, one real report moves a bucket by ~1/6th of the gap.
CREATE OR REPLACE FUNCTION pattern_prior_weight() RETURNS NUMERIC
  LANGUAGE SQL IMMUTABLE AS $$ SELECT 5::NUMERIC $$;

-- Observations older than this stop counting, so patterns track reality as a
-- department's throughput changes.
CREATE OR REPLACE FUNCTION pattern_observation_window() RETURNS INTERVAL
  LANGUAGE SQL IMMUTABLE AS $$ SELECT INTERVAL '60 days' $$;

/**
 * Recomputes one (department, day_of_week, hour) bucket from scratch.
 *
 * Buckets are keyed on the check-in's start time in Asia/Kolkata — the same
 * zone the client uses via istParts() — so a user in another timezone cannot
 * write their observation into the wrong slot.
 */
CREATE OR REPLACE FUNCTION recompute_pattern_bucket(
  target_department UUID,
  target_dow        SMALLINT,
  target_hour       SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  observed_sum   NUMERIC;
  observed_count INTEGER;
  prior          NUMERIC;
  prior_weight   NUMERIC := pattern_prior_weight();
BEGIN
  SELECT COALESCE(SUM(vf.actual_wait_minutes), 0), COUNT(*)
    INTO observed_sum, observed_count
  FROM visit_feedback vf
  JOIN checkins c ON c.id = vf.checkin_id
  WHERE c.department_id = target_department
    AND vf.actual_wait_minutes IS NOT NULL
    AND vf.created_at > NOW() - pattern_observation_window()
    AND EXTRACT(DOW  FROM c.created_at AT TIME ZONE 'Asia/Kolkata')::SMALLINT = target_dow
    AND EXTRACT(HOUR FROM c.created_at AT TIME ZONE 'Asia/Kolkata')::SMALLINT = target_hour;

  SELECT seed_wait_minutes INTO prior
  FROM queue_patterns
  WHERE department_id = target_department
    AND day_of_week = target_dow
    AND hour = target_hour;

  -- No seeded baseline for this slot: create one from observations alone, but
  -- only once there is any evidence at all.
  IF prior IS NULL THEN
    IF observed_count = 0 THEN RETURN; END IF;

    INSERT INTO queue_patterns (
      department_id, day_of_week, hour,
      avg_wait_minutes, seed_wait_minutes, sample_count, updated_at
    )
    VALUES (
      target_department, target_dow, target_hour,
      ROUND(observed_sum / observed_count), ROUND(observed_sum / observed_count),
      observed_count, NOW()
    )
    ON CONFLICT (department_id, day_of_week, hour) DO NOTHING;
    RETURN;
  END IF;

  UPDATE queue_patterns
  SET avg_wait_minutes =
        ROUND((prior * prior_weight + observed_sum) / (prior_weight + observed_count)),
      sample_count = observed_count,
      updated_at   = NOW()
  WHERE department_id = target_department
    AND day_of_week = target_dow
    AND hour = target_hour;
END;
$$;

/**
 * Full recompute across every bucket that has evidence. Safe to run repeatedly
 * (it always blends against the immutable seed). Schedule with pg_cron if
 * available:
 *   SELECT cron.schedule('refresh-patterns', '0 * * * *', 'SELECT refresh_queue_patterns()');
 */
CREATE OR REPLACE FUNCTION refresh_queue_patterns()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket        RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR bucket IN
    SELECT DISTINCT
      c.department_id,
      EXTRACT(DOW  FROM c.created_at AT TIME ZONE 'Asia/Kolkata')::SMALLINT AS dow,
      EXTRACT(HOUR FROM c.created_at AT TIME ZONE 'Asia/Kolkata')::SMALLINT AS hour
    FROM visit_feedback vf
    JOIN checkins c ON c.id = vf.checkin_id
    WHERE vf.actual_wait_minutes IS NOT NULL
      AND vf.created_at > NOW() - pattern_observation_window()
  LOOP
    -- Skip anything outside OPD hours; the table's CHECK would reject it anyway.
    CONTINUE WHEN bucket.hour < 8 OR bucket.hour > 19;
    PERFORM recompute_pattern_bucket(bucket.department_id, bucket.dow, bucket.hour);
    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$;

/**
 * Applies a single new piece of feedback immediately, so a prediction visibly
 * moves the moment a patient reports their real wait.
 */
CREATE OR REPLACE FUNCTION on_visit_feedback_recorded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket_dept UUID;
  bucket_dow  SMALLINT;
  bucket_hour SMALLINT;
BEGIN
  IF NEW.actual_wait_minutes IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.department_id,
         EXTRACT(DOW  FROM c.created_at AT TIME ZONE 'Asia/Kolkata')::SMALLINT,
         EXTRACT(HOUR FROM c.created_at AT TIME ZONE 'Asia/Kolkata')::SMALLINT
    INTO bucket_dept, bucket_dow, bucket_hour
  FROM checkins c
  WHERE c.id = NEW.checkin_id;

  IF bucket_dept IS NULL OR bucket_hour < 8 OR bucket_hour > 19 THEN
    RETURN NEW;
  END IF;

  PERFORM recompute_pattern_bucket(bucket_dept, bucket_dow, bucket_hour);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS visit_feedback_updates_patterns ON visit_feedback;

CREATE TRIGGER visit_feedback_updates_patterns
  AFTER INSERT ON visit_feedback
  FOR EACH ROW EXECUTE FUNCTION on_visit_feedback_recorded();
