# QueueWise

A crowdsourced hospital queue management app for Kerala government hospitals. Patients can check real-time and predicted wait times, see doctor availability, and anonymously report queue conditions to help others plan their visits.

---

## Features

- **Wait time predictions** — heatmap of historical queue patterns by day and hour for each department
- **Live crowdsourcing** — patients check in anonymously to report current queue conditions, updating predictions in real time
- **Doctor availability** — see which doctors are on duty, on leave, or unconfirmed; report incorrect statuses
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
| Realtime | Supabase Realtime (live check-in feed) |
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

1. Run `supabase/migrations/001_schema.sql` in your Supabase SQL Editor
2. Run `supabase/seed.sql` to populate hospitals, departments, doctors, and initial queue patterns
3. Run `supabase/seed_patterns_all.sql` and `supabase/seed_patterns_missing.sql` for full pattern coverage
4. Run `supabase/seed_doctors_all.sql` to populate doctors across all departments

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

The engine (`src/lib/predictions.ts`) provides:

- `getCurrentWait` — looks up the pattern for the current day and hour
- `getBestTimeToVisit` — finds the lowest-wait future slot
- `getHeatmapMatrix` — builds a 7×12 intensity matrix for the heatmap UI
- `getNextOpenInfo` — returns the next OPD opening time when outside working hours

Predictions improve over time as users submit check-ins, which can be aggregated back into patterns.

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
