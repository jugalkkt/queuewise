# QueueWise

A crowdsourced hospital queue management app for Kerala government hospitals. Patients can check real-time and predicted wait times, see doctor availability, and anonymously report queue conditions to help others plan their visits.

---

## Features

- **Wait time predictions** — heatmap of historical queue patterns by day and hour for each department
- **Live crowdsourcing** — patients check in anonymously to report current queue conditions, updating predictions in real time
- **Doctor availability** — see which doctors are on duty, on leave, or unconfirmed; a reported status is published only once two patients agree within six hours
- **Smart routing** — after login, new users go through onboarding; returning users land directly on their dashboard
- **Hospital & department selection** — covers 5 Kerala government hospitals across Thiruvananthapuram, Kottayam, Kozhikode, Ernakulam, and Thrissur
- **Best time to visit** — surfaces the lowest-wait slot coming up based on historical patterns
- **OPD closed state** — when outside working hours (8 AM–7 PM), shows when OPD next opens with expected wait at opening

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript (Vite) |
| Styling | Tailwind CSS + shadcn/ui |
| Routing | React Router v6 |
| Data fetching | TanStack Query (React Query) |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Google OAuth, Email magic link |
| Live updates | 30s polling on the anonymised check-in feed |
| Deployment | Vercel |

---

## Project Structure

```
frontend/
├── src/
│   ├── api/              # React Query hooks (hospitals, departments, doctors, patterns, checkins)
│   ├── components/       # Shared UI (AppShell, Heatmap, ProtectedRoute, shadcn/ui)
│   ├── lib/              # Supabase client, auth context, prediction engine
│   ├── pages/            # Route-level components
│   └── types/            # TypeScript interfaces
├── supabase/
│   ├── migrations/       # Schema SQL
│   └── seed*.sql         # Seed data for hospitals, departments, doctors, queue patterns
└── vercel.json           # SPA rewrite rule
```

---

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A [Supabase](https://supabase.com) project
- A [Vercel](https://vercel.com) account (for deployment)

### Local Setup

```bash
# Clone the repo
git clone <repo-url>
cd q-mgmt/frontend

# Install dependencies
npm install

# Set environment variables — create a .env file with:
# VITE_SUPABASE_URL=your_supabase_project_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Run the dev server
npm run dev
```

### Database Setup

Run the migrations in order in your Supabase SQL Editor (or `supabase db push`):

1. `supabase/migrations/001_schema.sql` — tables
2. `supabase/migrations/002_rls_and_constraints.sql` — row level security, integrity constraints, indexes
3. `supabase/migrations/003_pattern_learning.sql` — the prediction feedback loop

Then seed:

4. `supabase/seed.sql` to populate hospitals, departments, doctors, and initial queue patterns
5. `supabase/seed_patterns_all.sql` and `supabase/seed_patterns_missing.sql` for full pattern coverage
6. `supabase/seed_doctors_all.sql` to populate doctors across all departments

> Seed **before** 003 or re-run `UPDATE queue_patterns SET seed_wait_minutes = avg_wait_minutes`
> afterwards — 003 snapshots the seeded values as the prior that live observations blend against.

Finally, deploy the account-deletion function (it needs the service-role key, which never reaches
the browser):

```bash
supabase functions deploy delete-account
```

---

## Authentication

Supports two sign-in methods:

- **Google OAuth** — one-click sign-in via Google account
- **Email magic link** — passwordless, link sent to inbox

After sign-in, `/auth/callback` checks if the user has completed onboarding and redirects to `/onboarding/hospital` for new users or `/dashboard` for returning users.

### Supabase Auth Setup

1. Enable **Google** provider in Supabase → Authentication → Providers
2. Add your Google OAuth Client ID and Secret (from Google Cloud Console)
3. Add `https://your-project.supabase.co/auth/v1/callback` as an authorized redirect URI in Google Cloud
4. Add your Vercel domain to the Supabase redirect URL allowlist

---

## Prediction Engine

Queue wait times are predicted from a `queue_patterns` table with columns:

- `department_id`
- `day_of_week` (0 = Sunday … 6 = Saturday)
- `hour` (8–19, i.e. 8 AM–7 PM)
- `avg_wait_minutes`

Buckets are keyed in **Asia/Kolkata** on both the client (`istParts`) and the server, so a user in
another timezone cannot read — or write — the wrong slot.

The engine (`src/lib/predictions.ts`) provides:

- `getCurrentWait` — looks up the pattern for the current day and hour
- `getBestTimeToday` — the quietest slot still remaining today (returns `null` once the day is done)
- `getBestTimeThisWeek` — the quietest slot in the next 7 days, tie-broken toward the sooner one
- `getHeatmapMatrix` — 7×12 intensity matrix; `null` marks slots with no data, which the UI renders
  distinctly from a genuinely quiet hour
- `getNextOpenInfo` — the next OPD opening that actually has data
- `blendWithLiveCheckins` — merges the historical figure with active on-site reports

### How predictions actually improve

The loop is closed in three steps:

1. **Live blend (read time).** `blendWithLiveCheckins` weights each active check-in by recency
   (45-minute half-life) against the historical pattern, so the number on screen responds to what
   patients are reporting right now.
2. **Ground truth (write time).** On post-visit feedback, an `AFTER INSERT` trigger calls
   `recompute_pattern_bucket()` for the `(department, day, hour)` bucket the visit started in.
3. **Weighted blend.** Observations are folded against the immutable `seed_wait_minutes` prior:

   ```
   avg_wait_minutes = (seed × 5 + Σ observed) / (5 + n)
   ```

   The prior weight of 5 means one report moves a bucket by about a sixth of the gap, so a single
   outlier cannot swing it. `sample_count` records how much real evidence backs each bucket, and
   observations older than 60 days age out.

`refresh_queue_patterns()` recomputes everything from scratch and is safe to re-run (it always
blends against the seed, never against an already-blended value). Schedule it with pg_cron:

```sql
SELECT cron.schedule('refresh-patterns', '0 * * * *', 'SELECT refresh_queue_patterns()');
```

---

## Deployment

The app is deployed on Vercel. `vercel.json` rewrites all routes to `index.html` for client-side routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Every push to `main` triggers an automatic redeploy.

---

## Hospitals Covered

| Hospital | City | Departments |
|---|---|---|
| Govt. General Hospital | Thiruvananthapuram | General OPD, Cardiology, Orthopaedics, Paediatrics, Gynaecology, ENT, Dermatology |
| Govt. Medical College | Kottayam | General OPD, Cardiology, Orthopaedics, Neurology, Paediatrics, ENT |
| Govt. Medical College | Kozhikode | General OPD, Cardiology, Orthopaedics, Paediatrics, Gynaecology, Dermatology |
| Govt. General Hospital | Ernakulam | General OPD, Cardiology, Orthopaedics, Paediatrics, ENT |
| Govt. Medical College | Thrissur | General OPD, Cardiology, Orthopaedics, Paediatrics, Gynaecology |
