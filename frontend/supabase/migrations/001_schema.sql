-- Hospitals
CREATE TABLE hospitals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  city       TEXT NOT NULL,
  address    TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments (belong to a hospital)
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  UNIQUE(hospital_id, name)
);

-- Queue patterns — prediction engine's data source
-- day_of_week: 0=Sun 1=Mon … 6=Sat, hour: 8..19 (8am to 7pm)
CREATE TABLE queue_patterns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id    UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  day_of_week      SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  hour             SMALLINT NOT NULL CHECK (hour BETWEEN 8 AND 19),
  avg_wait_minutes SMALLINT NOT NULL,
  UNIQUE(department_id, day_of_week, hour)
);

-- Doctors
CREATE TABLE doctors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id     UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  hospital_id       UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'unknown'
                     CHECK (status IN ('on_duty', 'on_leave', 'unknown')),
  typical_days      SMALLINT[],  -- day-of-week indices
  status_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences (one row per authenticated user)
CREATE TABLE user_preferences (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  primary_hospital_id     UUID REFERENCES hospitals(id),
  primary_department_id   UUID REFERENCES departments(id),
  saved_department_ids    UUID[] DEFAULT '{}',
  notif_morning_digest    BOOLEAN DEFAULT TRUE,
  notif_best_time         BOOLEAN DEFAULT TRUE,
  notif_live_queue        BOOLEAN DEFAULT FALSE,
  notif_feedback_reminder BOOLEAN DEFAULT TRUE,
  onboarding_completed    BOOLEAN DEFAULT FALSE
);

-- Check-ins (crowdsource layer)
CREATE TABLE checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  doctor_id       UUID REFERENCES doctors(id) ON DELETE SET NULL,
  queue_condition TEXT NOT NULL CHECK (queue_condition IN ('short', 'medium', 'long')),
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Post-visit feedback
CREATE TABLE visit_feedback (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  checkin_id          UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  actual_wait_minutes SMALLINT,
  doctor_available    BOOLEAN,
  experience_rating   TEXT CHECK (experience_rating IN ('poor', 'neutral', 'good')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their prefs"
  ON user_preferences FOR ALL USING (auth.uid() = user_id);

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read all checkins" ON checkins FOR SELECT USING (TRUE);
CREATE POLICY "insert own checkin" ON checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own checkin" ON checkins FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE visit_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own feedback" ON visit_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Realtime for checkins
ALTER PUBLICATION supabase_realtime ADD TABLE checkins;
