# QueueWise — Complete Interview Preparation Guide
### Infosys HackWithInfy / L2 Technical Interview

> **Read this front-to-back at least twice before the interview.**
> Every answer here is grounded in your actual codebase — not generic theory.

---

## SECTION 1 — PROJECT UNDERSTANDING

### Q1.1 — Explain your project in 30 seconds.

**Answer:**
"QueueWise is a real-time OPD queue management app for Kerala government hospitals. Patients can check predicted wait times before they leave home, check in anonymously when they arrive, and see a live feed from other patients already at the hospital. The prediction engine uses historical crowd-sourced data — average wait per department, per day of week, per hour — to generate heatmaps and 'best time to visit' recommendations."

---

### Q1.2 — Explain in 2 minutes.

**Answer:**
"The core problem is that government hospital OPDs in Kerala can have 2–4 hour waits with zero visibility. Patients take an auto, wait four hours, only to find out the doctor is on leave. QueueWise solves this in three layers.

Layer one is prediction: we store historical average wait times per department, broken down by day-of-week and hour. When you open the app, we match the current timestamp to the nearest pattern slot and show you the predicted wait and the lowest-wait slot remaining today.

Layer two is crowdsourcing: when a patient actually arrives, they check in and tag the queue as short, medium, or long. Those reports aggregate into a live feed visible to everyone else. This grounds the historical prediction in present-moment reality.

Layer three is doctor availability: doctors have a status — on duty, on leave, or unknown — which patients can report. So before you travel, you can check if your doctor is actually there.

The tech stack is React with Vite and TypeScript on the frontend, Supabase for the database, auth, and realtime subscriptions. Auth uses email magic links — zero friction, no password required. The prediction engine is a pure TypeScript module, fully unit-tested. Supabase Realtime pushes new check-ins to all active users via WebSocket, so the live feed updates without polling."

---

### Q1.3 — What specific problem does this solve?

**Answer:**
"Three problems: wasted travel time when waits are too long, wasted trips when the doctor is absent, and no historical data to plan future visits. Existing hospital apps, if they exist at all, show appointment slots for private hospitals — not walk-in OPD queues at government facilities. QueueWise is specifically built for the walk-in, crowdsourced, zero-cost government hospital context."

---

### Q1.4 — Why Kerala government hospitals specifically?

**Answer:**
"Kerala has one of the best government healthcare networks in India — high utilisation, educated patient base, strong smartphone penetration. That means the crowdsourcing layer actually works: you need enough daily visitors to generate meaningful reports. Private hospital apps exist but cost money to build and integrate with proprietary HMS. Government hospitals have no such vendor, so a patient-first open layer like this fills a real gap. The initial seed data covers five major hospitals in Thiruvananthapuram, Kottayam, Kozhikode, Ernakulam, and Thrissur."

---

### Q1.5 — What makes this different from existing systems like Practo or hospital portals?

**Answer:**
"Three things: walk-in OPD focus instead of appointment booking, crowdsourced real-time reports instead of admin-entered data, and a prediction engine that uses your historical patterns to recommend the best time slot — not just the current status. Practo assumes private hospitals with booking systems. Government OPDs are walk-in. No one has built this crowdsourced layer for the government hospital context at scale."

---

### Q1.6 — What is the user journey end-to-end?

**Answer:**
"A new user lands on the homepage, types a hospital name, and sees a blurred preview with a 'sign up to unlock' paywall equivalent — it creates urgency. They sign up via email magic link — one click, no password. They pick their primary hospital and department during onboarding. The dashboard then shows current predicted wait, the best time to visit today, a 7×12 heatmap of the full week, and a live feed of other patients' reports. When they arrive at the hospital, they check in, optionally tag the doctor, and report the queue condition. The active-visit screen tracks their elapsed time and shows live updates from others. After leaving, they submit actual wait time and experience rating, which feeds back into the prediction model over time."

---

## SECTION 2 — SYSTEM DESIGN

### Q2.1 — Draw the high-level architecture.

**Answer:**
```
Browser (React/Vite SPA)
        │
        │  HTTPS REST + WebSocket
        ▼
  Supabase Edge (PostgREST + Realtime)
        │
        │  SQL
        ▼
  PostgreSQL (Supabase managed)
  ┌──────────────────────────────────┐
  │  hospitals, departments,         │
  │  queue_patterns, doctors,        │
  │  user_preferences, checkins,     │
  │  visit_feedback                  │
  └──────────────────────────────────┘
        │
        │  Auth module (GoTrue)
        ▼
  Supabase Auth (email OTP / OAuth)
```

The SPA calls Supabase's auto-generated REST API (PostgREST) directly from the browser using the publishable/anon key. Auth tokens are JWTs that PostgREST passes to PostgreSQL as the `authenticated` role, which then applies Row Level Security policies to enforce data access rules. There is no separate Node/Express server — Supabase replaces it.

---

### Q2.2 — Walk me through a complete request flow when a user opens the dashboard.

**Answer:**
"1. React mounts the Dashboard component.
2. `useAuth()` reads the Supabase session from localStorage — the JWT is already present from the previous login.
3. `useUserPrefs(user.id)` fires a React Query query → `GET /rest/v1/user_preferences?user_id=eq.{id}` with the JWT in the Authorization header.
4. PostgREST receives the request, verifies the JWT, sets the PostgreSQL role to `authenticated`, and the RLS policy `auth.uid() = user_id` filters the row.
5. The returned prefs contain `primary_hospital_id` and `primary_department_id`.
6. Three parallel queries fire: `useHospital(hospitalId)`, `useDepartment(deptId)`, and `useQueuePatterns(deptId)`.
7. `queue_patterns` returns all (day_of_week, hour, avg_wait_minutes) rows for that department — no RLS, public SELECT.
8. The pure prediction engine (`getCurrentWait`, `getBestTimeToVisit`, `getHeatmapMatrix`) runs synchronously on the client with the returned patterns and the current timestamp.
9. A Supabase Realtime channel subscribes to `postgres_changes` on the `checkins` table filtered by `department_id=eq.{id}`, establishing a WebSocket. Any new check-in invalidates the React Query `checkins` cache and triggers a re-render of the live feed."

---

### Q2.3 — How does the frontend communicate with the backend?

**Answer:**
"Exclusively through Supabase's PostgREST REST API and the Realtime WebSocket. There is no custom API server. The Supabase JS client (`@supabase/supabase-js`) wraps both. REST calls use the anon/publishable key for unauthenticated requests and the user's JWT for authenticated ones. Mutations (INSERT, UPDATE) go through the same REST API using HTTP POST/PATCH. All queries are wrapped in TanStack React Query hooks for caching, background refetch, and loading/error state management."

---

### Q2.4 — How do you handle concurrent check-ins? What if 50 users check in simultaneously?

**Answer:**
"Each check-in is an independent INSERT into the `checkins` table. There is no shared counter to increment, so there's no race condition at the INSERT level — PostgreSQL handles concurrent inserts safely with MVCC. The unique constraint on `queue_patterns` uses a natural composite key `(department_id, day_of_week, hour)`, so seed data is idempotent with `ON CONFLICT DO NOTHING`. The prediction engine reads patterns, not live counts, so it's purely a read — no write contention. The live feed uses Realtime subscriptions, so all 50 users' UIs update independently when each INSERT is broadcast."

---

### Q2.5 — What happens if Supabase goes down?

**Answer:**
"Currently the app becomes non-functional — it's entirely dependent on Supabase. The React Query error boundaries would show error states. For production resilience I'd add: (1) a service worker to cache the last-seen patterns and show stale data with a 'last updated' warning, (2) retry logic in React Query — it already retries failed queries up to 3 times by default, (3) a health-check endpoint and a maintenance page. The architecture could also be moved to a self-hosted Supabase instance or migrated to a Node backend with Redis cache as a more resilient layer."

---

### Q2.6 — How do you manage state in the frontend?

**Answer:**
"Three layers: server state via TanStack React Query (all data fetched from Supabase — hospitals, patterns, checkins, prefs — lives here with automatic caching, background sync, and cache invalidation), global auth state via React Context (`AuthContext` wraps the whole app, provides `user`, `loading`, `phone`), and local UI state via `useState` within individual components — form inputs, selected items, loading flags. There is intentionally no global client-side state manager like Redux. The app is simple enough that React Query + Context handles everything without the overhead."

---

### Q2.7 — Where are caching opportunities?

**Answer:**
"Queue patterns are the best caching candidate — they change weekly at most. React Query already caches them for the session. For production: (1) set a long `staleTime` (e.g., 1 hour) on `useQueuePatterns` since patterns don't change intraday. (2) Use a CDN-level cache for the patterns endpoint — it's a public, unauthenticated read. (3) Hospitals and departments are nearly static — cache them at the edge (Cloudflare/Supabase Edge Functions) with a long TTL. (4) The live feed (`checkins`) intentionally does NOT cache aggressively — it polls every 30 seconds as a Realtime fallback and is invalidated on every INSERT event."

---

### Q2.8 — What is the load balancing strategy?

**Answer:**
"Currently none is needed — Supabase is a managed platform that handles load balancing internally. For a self-hosted or scaled version: the read-heavy pattern queries would be distributed across read replicas in PostgreSQL. The Realtime WebSocket connections are stateful — sticky sessions at the load balancer level (IP hash or cookie-based) would be required. The REST API is stateless (JWT-authenticated), so any round-robin balancer works there. For the SPA itself, it's static files behind a CDN — no load balancing needed, just edge distribution."

---

## SECTION 3 — DATABASE + BACKEND

### Q3.1 — Explain your database schema.

**Answer:**
"Seven tables. `hospitals` and `departments` are reference data — hospitals are the root entity, departments belong to hospitals. `queue_patterns` is the prediction engine's data source: one row per `(department_id, day_of_week, hour)` with the historical average wait in minutes. `doctors` belong to both a department and a hospital for easy cross-filtering. `user_preferences` has exactly one row per authenticated user (UNIQUE on user_id) and stores their primary hospital/department, saved departments, and notification flags. `checkins` is the crowdsource layer — each check-in is timestamped and tagged with a queue condition. `visit_feedback` links back to a checkin and stores the actual wait, doctor availability, and experience rating — this is the training data for improving predictions over time."

---

### Q3.2 — Is your schema in 3NF (Third Normal Form)?

**Answer:**
"Yes, with deliberate denormalization in `doctors`. Strictly speaking, a doctor belongs to a department which belongs to a hospital — so `hospital_id` on `doctors` is derivable through `department_id → departments.hospital_id`. I kept it denormalized because the most common query is 'all doctors at hospital X regardless of department' — this avoids a JOIN and is a standard performance-first denormalization for a read-heavy query pattern. Everything else is normalized: no repeating groups, no partial key dependencies, no transitive dependencies."

---

### Q3.3 — What indexes do you have? What indexes should you add for production?

**Answer:**
"Currently: only the implicit indexes from PRIMARY KEY constraints (b-tree on each UUID) and the UNIQUE constraints. For production I'd add:
- `CREATE INDEX idx_checkins_dept_created ON checkins(department_id, created_at DESC)` — the live feed query filters by department and orders by created_at descending.
- `CREATE INDEX idx_checkins_ended_at ON checkins(ended_at) WHERE ended_at IS NULL` — a partial index for active (non-ended) check-ins.
- `CREATE INDEX idx_queue_patterns_dept_day_hour ON queue_patterns(department_id, day_of_week, hour)` — the prediction engine's lookup.
- `CREATE INDEX idx_doctors_hospital ON doctors(hospital_id)` — the `useDoctorsByHospital` query.
Without these, table scans on large checkins tables would be expensive."

---

### Q3.4 — Explain Row Level Security in your project.

**Answer:**
"RLS is PostgreSQL's mechanism to enforce data access at the row level within the database itself — not just at the application layer. I enabled it on three tables. `user_preferences`: the policy is `USING (auth.uid() = user_id)` — a user can only see and modify their own preferences. `checkins`: two-tier — SELECT is open (`USING (TRUE)` — anyone authenticated or anonymous can read, for the live feed), but INSERT requires `auth.uid() = user_id` and UPDATE requires the same. `visit_feedback`: INSERT only, user must own the row. The reference tables (hospitals, departments, queue_patterns, doctors) have RLS enabled with a public read policy `USING (true)` — they're reference data, no write access via the client. This means even if someone bypasses the frontend and hits the API directly, they can only access what their JWT authorizes."

---

### Q3.5 — How does authentication work technically?

**Answer:**
"Supabase Auth uses GoTrue, an open-source auth server. For email magic link: the client calls `supabase.auth.signInWithOtp({ email })`, GoTrue generates a one-time token, emails it as a link with the token embedded. When the user clicks the link, GoTrue validates the token and issues a JWT (access token, 1-hour expiry) and a refresh token (stored in localStorage). The JWT contains the user's UUID, email, role (`authenticated`), and metadata. Every subsequent API call sends this JWT in the Authorization header. PostgREST verifies the JWT signature using Supabase's project secret, extracts the role, and executes queries as the `authenticated` PostgreSQL role — which activates RLS policies. The `auth.uid()` function in RLS policies extracts the UUID from the current JWT."

---

### Q3.6 — Could there be a race condition in check-in and feedback?

**Answer:**
"The main risk is: user checks in, closes the app, reopens — `sessionStorage` is cleared — feedback fails because `active_checkin_id` is gone. I handle this by: (1) the feedback flow gracefully navigates to dashboard if no checkin ID is found. For production, the robust fix is to query `checkins` for the user's most recent unclosed check-in on load instead of relying on sessionStorage. Another subtle race: if the user double-taps 'Confirm check-in', two INSERT requests fire. The fix is to disable the button immediately on first tap and re-enable only on error — which I do with the `submitting` state flag."

---

### Q3.7 — How does the prediction engine work?

**Answer:**
"It's a pure function module — no server needed. `getCurrentWait(patterns, departmentId, at)` finds the pattern row where `department_id`, `day_of_week` (from `at.getDay()`), and `hour` (from `at.getHours()`) match. Returns the `avg_wait_minutes` or null if no data. `getBestTimeToVisit(patterns, departmentId, from)` filters patterns to only future slots (same day with later hour, or any future day), sorts by `avg_wait_minutes` ascending, takes the minimum, then calculates the actual date by finding how many days until that day-of-week. `getHeatmapMatrix(patterns, departmentId)` builds a 7×12 matrix (Monday-first ordering, hours 8–19) where each cell is the wait scaled 0–5 relative to the department's maximum wait. All three are deterministic and unit-tested with 9 tests."

---

### Q3.8 — How would you add a feedback loop to improve predictions?

**Answer:**
"The `visit_feedback` table already captures `actual_wait_minutes`. A nightly job (Supabase cron or pg_cron) would: SELECT department_id, EXTRACT(DOW FROM c.created_at) as dow, EXTRACT(HOUR FROM c.created_at) as hour, AVG(vf.actual_wait_minutes) as actual_avg FROM visit_feedback vf JOIN checkins c ON c.id = vf.checkin_id WHERE vf.created_at > NOW() - INTERVAL '90 days' GROUP BY 1, 2, 3. Then UPDATE queue_patterns with a weighted average: `new_avg = 0.7 * existing_avg + 0.3 * actual_avg`. The 0.7/0.3 weight decays old data slowly and incorporates new signals gradually — a simple exponential moving average."

---

### Q3.9 — Why UUIDs instead of auto-increment integers as primary keys?

**Answer:**
"Two reasons. First, the seed data needs deterministic IDs — I seed hospitals with fixed UUIDs like `a1000000-0000-0000-0000-000000000001` so departments and doctors can reference them by known ID without needing a lookup after insert. Auto-increment IDs are assigned by the DB, making cross-table seeding a dependency chain. Second, UUIDs prevent enumeration attacks — an attacker can't guess `hospital/2` after seeing `hospital/1`. The cost is slightly larger index size and slightly slower comparison vs integers, but at our scale that's immaterial."

---

### Q3.10 — How do you validate data before it hits the database?

**Answer:**
"Multiple layers. Client-side: form validation before submission (phone format check, email format check, required fields). The TypeScript type system prevents passing wrong field types at compile time. Database-level: CHECK constraints on `queue_condition IN ('short','medium','long')`, `status IN ('on_duty','on_leave','unknown')`, `experience_rating IN ('poor','neutral','good')`, `day_of_week BETWEEN 0 AND 6`, `hour BETWEEN 8 AND 19`. FOREIGN KEY constraints prevent orphaned records. UNIQUE constraints prevent duplicate patterns. RLS policies prevent unauthorized inserts. PostgREST validates that request payloads match the table's column types. The weakest link is no server-side rate limiting on check-in inserts — that would be a production priority."

---

## SECTION 4 — FRONTEND

### Q4.1 — Why React with Vite instead of Next.js?

**Answer:**
"Two reasons. First, this is a client-rendered SPA — there's no SEO requirement (it's a logged-in dashboard tool), so server-side rendering adds complexity with no benefit. Second, Vite's dev server starts in under 300ms vs Next.js's several-second cold start. The hot module replacement is faster. Vite's build output is plain static files — deployable to any CDN or static host (Netlify, Cloudflare Pages, GitHub Pages) without a Node runtime. Next.js would require a serverless runtime for SSR/API routes which we don't need. Vite is the right tool for a pure client SPA."

---

### Q4.2 — Why TanStack React Query instead of useEffect + fetch?

**Answer:**
"React Query solves five problems that `useEffect + fetch` doesn't: automatic caching (the same query won't refetch if already in cache within staleTime), background refetching when the user returns to the tab, request deduplication (if two components request the same query key simultaneously, only one network request fires), loading/error state management without manual `useState`, and cache invalidation on mutation success (`queryClient.invalidateQueries`). Without React Query, managing all of this manually leads to race conditions, stale data, and waterfall loading. React Query makes the data layer declarative."

---

### Q4.3 — Explain how Supabase Realtime works in your frontend.

**Answer:**
"Supabase Realtime uses a WebSocket connection (via Phoenix Channels protocol) to deliver database change events. In the Dashboard and ActiveVisit components I subscribe to `postgres_changes` on the `checkins` table with a filter `department_id=eq.{id}`. When any row is INSERTed, UPDATEd, or DELETEd matching that filter, Supabase broadcasts the change event over the WebSocket. My handler calls `queryClient.invalidateQueries({ queryKey: ['checkins', dept.id] })` — this tells React Query to refetch the checkins query, which triggers a re-render of the live feed. The channel is created in a `useEffect` and cleaned up in the return function to prevent memory leaks: `return () => { supabase.removeChannel(channel); }`."

---

### Q4.4 — How do you handle loading states?

**Answer:**
"Three patterns. For the Dashboard initial load, if `user` is present but `prefs` hasn't loaded yet, I render skeleton cards — `div` elements with `animate-pulse` Tailwind classes that match the layout of the real content, preventing layout shift. For individual data loads (hospitals list during search), I check `isLoading` from React Query and render placeholder shimmer items. For mutations (check-in submission, feedback), I track `submitting` state locally and disable the submit button — it shows 'Checking in…' text. I do NOT show a full-page spinner for most things — skeleton loading is better UX because the user sees the layout immediately."

---

### Q4.5 — How does your heatmap component work?

**Answer:**
"The Heatmap accepts an optional `data` prop — a 7×12 number matrix where values are 0–5 intensity. It renders a CSS grid with `gridTemplateColumns: auto repeat(12, minmax(28px, 1fr))` — the first column is day labels, the remaining 12 are hour cells. Each cell gets a CSS class from `intensityClass(n)` which maps 0–5 to Tailwind classes `bg-heat-0` through `bg-heat-5` — these are custom colors defined in the Tailwind config. When no `data` prop is passed (Landing page demo), it falls back to the static mock data from `mockData.ts`. The `blurred` prop applies `filter blur-[3px]` for the guest preview paywall effect."

---

### Q4.6 — How do you prevent unnecessary re-renders?

**Answer:**
"React Query memoizes query results — a component only re-renders when the data for its specific query key changes. For computed values like `currentWait`, `bestTime`, and `heatmapData`, I compute them directly in the component body from the query data — they recompute only when `patterns` or `dept` changes, which is infrequent. The Heatmap component is stateless and pure — same `data` prop = same output, React can bail out with a simple reference equality check. I don't use `useMemo` everywhere by default — premature memoization adds code without benefit at our data size. The main optimization is query-level: `staleTime` on patterns means they don't refetch on every component mount."

---

### Q4.7 — How do you handle form validation?

**Answer:**
"Client-side, inline, without a form library. For the login: email format check with `emailInput.includes('@')` before submitting, phone format with a regex `/^[0-9]{10}$/`. Validation runs in the submit handler — if invalid, `toast.error()` shows a message and the function returns early without calling Supabase. I chose not to use Zod or React Hook Form because the forms are simple enough (1–2 fields each) that the overhead of a schema library isn't justified. For production with complex multi-step forms, I'd add Zod for schema validation and React Hook Form for field-level error management."

---

### Q4.8 — How is the app responsive?

**Answer:**
"Tailwind CSS utility-first responsive design. The Dashboard uses `grid lg:grid-cols-3` — on mobile it's a single column, on large screens a 3-column layout. The heatmap uses `overflow-x-auto` with `inline-block min-w-full` so it scrolls horizontally on small screens instead of overflowing. Navigation is hidden on mobile with `hidden md:flex` on the nav element — a mobile bottom tab bar would be added in production. The check-in page and feedback pages are `max-w-xl` centered — they're designed mobile-first. Font sizes use `text-3xl md:text-4xl` to scale typography."

---

## SECTION 5 — SECURITY

### Q5.1 — How is your app secured against unauthorized data access?

**Answer:**
"Defense in depth across three layers. Layer 1 — transport: all communication is HTTPS. Layer 2 — authentication: every API call requires a valid Supabase JWT in the Authorization header. Unauthenticated users can only read public reference data (hospitals, departments, patterns, doctors). Layer 3 — authorization: Row Level Security in PostgreSQL ensures that even with a valid JWT, users can only access their own `user_preferences` and can only INSERT their own `checkins` and `visit_feedback`. A user cannot read or modify another user's data even by directly calling the API."

---

### Q5.2 — Is your app vulnerable to SQL injection?

**Answer:**
"No. I don't write any raw SQL in the frontend. All database interaction goes through Supabase's PostgREST, which uses parameterized queries internally. The Supabase JS client builds type-safe query builders: `.eq('id', id!)`, `.ilike('name', \`%${search}%\`)`. The `ilike` call is parameterized — the search string is passed as a bind variable, not concatenated into the query string. PostgREST never interpolates user input directly into SQL."

---

### Q5.3 — How do you prevent XSS?

**Answer:**
"React escapes all rendered values by default — JSX expressions like `{hospital.name}` are HTML-escaped before rendering to the DOM. I never use `dangerouslySetInnerHTML`. User-provided strings (doctor name input, search query) are either displayed as text content (escaped by React) or passed to Supabase as parameterized values (not rendered as HTML). The Content-Security-Policy header would be configured at the CDN/hosting layer in production to restrict script sources."

---

### Q5.4 — What about CSRF?

**Answer:**
"CSRF is not a concern for this architecture. The app is a JavaScript SPA that communicates via AJAX/fetch, not form-based browser navigation. The JWT in the Authorization header is the CSRF mitigation — browsers do not automatically include custom headers in cross-site requests. Cookie-based sessions are vulnerable to CSRF; token-based auth in request headers is not. Supabase also validates the `Origin` header on its API to prevent cross-origin requests from unauthorized domains."

---

### Q5.5 — Is the anon/publishable key safe to expose in the frontend?

**Answer:**
"Yes, by design. Supabase's publishable key identifies the project but grants only the permissions of the `anon` PostgreSQL role. Without a valid JWT, the anon role can only read tables that have a public SELECT policy (our reference tables). RLS ensures that even with the publishable key, no private user data is accessible. The key is called 'publishable' specifically because it's meant to be in client-side code. The secret key (service role key) has admin access and must never be in the frontend — I only use the publishable key."

---

### Q5.6 — What about rate limiting?

**Answer:**
"Currently: none at the application level. Supabase's free tier has implicit rate limits on Auth operations (60 OTP emails per hour). For production: (1) Supabase Edge Functions or a reverse proxy (Nginx, Cloudflare) would rate-limit check-in INSERTs per user — e.g., max 3 check-ins per hour per user_id. (2) The prediction engine reads are cacheable at the CDN level so each user doesn't need to hit the database for static pattern data. (3) Supabase Pro has built-in API rate limiting configuration."

---

### Q5.7 — How are environment variables handled?

**Answer:**
"Vite reads `.env` files and exposes variables prefixed with `VITE_` to the browser bundle. The two variables are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The `.env` file is in `.gitignore` — it is never committed to version control. In production deployment (Netlify/Vercel/Cloudflare Pages), these are set as environment variables in the hosting platform's dashboard, not in the code. Note: `VITE_` prefixed variables ARE included in the client bundle — anyone can read them from the compiled JavaScript. This is acceptable for the publishable key (designed to be public) but the service role key must never have a `VITE_` prefix."

---

## SECTION 6 — DEPLOYMENT + DEVOPS

### Q6.1 — How would you deploy this to production?

**Answer:**
"Frontend: run `npm run build` to produce the `dist/` directory (static files). Deploy to Cloudflare Pages or Netlify — both auto-detect Vite projects, run the build command, and serve from their edge CDN. Set the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the hosting platform dashboard. Update Supabase Auth redirect URLs to include the production domain. Backend: Supabase is already cloud-hosted — nothing to deploy. Apply any new migrations through the Supabase Dashboard SQL Editor or via the Supabase CLI (`supabase db push`)."

---

### Q6.2 — How would you set up CI/CD?

**Answer:**
"GitHub Actions workflow triggered on push to `main`: (1) Install dependencies with `npm ci`. (2) Run TypeScript type check: `npm run build --noEmit`. (3) Run tests: `npm test -- --run`. (4) If all pass, Netlify/Cloudflare Pages auto-deploys from the GitHub repo via their Git integration — no manual deploy step needed. For database migrations, I'd add a step using the Supabase CLI: `supabase db push --linked` with the Supabase access token stored as a GitHub secret. PR previews would give each PR its own deployment URL for review."

---

### Q6.3 — How do you handle database migrations in production?

**Answer:**
"Migration files live in `supabase/migrations/` with sequential naming (`001_schema.sql`, `002_add_index.sql`). The Supabase CLI tracks which migrations have been applied via a `supabase_migrations` table. Running `supabase db push` applies any unapplied migrations in order. This is idempotent — run it twice, only new migrations execute. For the current project, migrations were applied manually via the SQL editor during development. In production CI/CD, `supabase db push` would be a step in the deploy pipeline, running before the frontend deploy."

---

### Q6.4 — How would you monitor the production app?

**Answer:**
"Three layers: (1) Supabase Dashboard — provides query performance stats, storage usage, auth event logs, and API request volume out of the box. (2) Client-side error tracking — I'd add Sentry with `@sentry/react` to capture unhandled errors, React Query errors, and performance traces. (3) Uptime monitoring — a simple service like Better Uptime or Checkly pings the app URL every minute and alerts on downtime. For business metrics, I'd use Supabase's built-in analytics to track daily active users, check-in counts, and feedback submission rates."

---

### Q6.5 — What is your rollback strategy?

**Answer:**
"Frontend: Netlify and Cloudflare Pages keep deployment history — a one-click rollback to any previous build in their dashboard. Database: this is harder. For schema changes, I'd write reverse migration files. For data corruption, Supabase Pro has point-in-time recovery (PITR). For the current free tier, I'd export critical tables as CSV before any risky migration: `COPY hospitals TO STDOUT WITH CSV HEADER` via the SQL editor. The seed data is in version control, so reference tables can always be recreated."

---

### Q6.6 — How would you containerize this with Docker?

**Answer:**
"The frontend is a static SPA — it doesn't need Docker in the traditional sense. But for local development consistency, a `Dockerfile` would be:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```
A `docker-compose.yml` could spin up a local Supabase instance (Supabase has official Docker compose files at github.com/supabase/supabase/docker) alongside the frontend, enabling fully offline local development."

---

## SECTION 7 — ADVANCED INTERVIEWER TRAPS

### Q7.1 — What did YOU specifically build in this project?

**Answer (honest, confident):**
"I designed the product end-to-end — the problem statement, the user journey, the data model, the feature set. I wrote all the frontend component logic, state management, and routing. I designed the prediction engine algorithm and wrote the unit tests first (TDD). I made all architecture decisions: Supabase over Firebase, React Query over Redux, email OTP over SMS-first. I debugged every issue — the Vite environment variable prefix mismatch, the RLS policies blocking public reads, the hardcoded mock hospital ID in the nav shell, the missing queue patterns for unseeded departments. I understand every line of code in this codebase and can modify, extend, or debug any part of it."

---

### Q7.2 — Where did AI help you?

**Answer (confident, not defensive):**
"AI was a productivity tool, not the decision-maker. I used it like an expert pair programmer: I described the architecture I wanted, it generated boilerplate (the React Query hooks follow a consistent pattern — AI generated the pattern once, I adapted it across seven files). It helped me write the SQL seed data faster (84 rows of queue patterns are tedious to hand-write). But the architectural decisions were mine: which tables to create, what the RLS policies should be, why to use `ON CONFLICT DO NOTHING` in seed SQL, why to keep `hospital_id` denormalized on `doctors`, why the heatmap needs a fallback to mock data. AI doesn't make product decisions — I do."

---

### Q7.3 — If AI wrote code, how do you prove you understand it?

**Answer:**
"Ask me to modify anything in the codebase. Want me to add a 'shortest wait department' feature? I'd add a `useDepartments(hospitalId)` call, run `getCurrentWait` across all departments, sort ascending, and surface the top result. Want me to add pagination to the live feed? I'd change the checkins query to use `.range(0, 9)` and add a 'load more' button that advances the range. Want me to add an RLS policy that prevents users from checking in to a department they've already checked into in the last 2 hours? I'd write the SQL policy. Understanding is demonstrated by the ability to extend, not just describe."

---

### Q7.4 — What would you rewrite today?

**Answer:**
"Three things. First, `sessionStorage` for passing the checkin ID between screens — fragile. I'd store the active checkin ID in a React Context (or derive it from a `useQuery` that fetches the user's most recent unclosed checkin on mount). Second, the prediction engine currently only uses historical patterns — it doesn't incorporate live check-in density (if 20 people just checked in, the prediction should increase). I'd blend the historical pattern with a live modifier: `adjustedWait = patternWait * (1 + activeChekins / baseline)`. Third, the heatmap currently shows intensity 0–5 across all departments relative to each department's own max — a very busy department and a quiet one look the same at peak. For comparison across departments, intensity should be absolute (normalize across all departments, not per-department)."

---

### Q7.5 — What are this project's biggest weaknesses?

**Answer:**
"Cold start problem: the prediction engine requires historical data, which requires users, which requires predictions to attract users. A new hospital with zero check-in history shows an empty heatmap. I partially solve this with seeded historical data, but that data is synthetic — not real. Second weakness: trust. Patients need to trust the predictions are accurate. If predictions are off (because seed data is approximate), early users churn. Third: the doctor status system relies entirely on patient reporting — there's no authoritative data source. A doctor marked 'on leave' by one impatient user could be false. Production would need a threshold (e.g., 3+ reports in 30 minutes to change status) and a time-decay mechanism to reset status to 'unknown' every 6 hours."

---

### Q7.6 — What if the internet fails inside the hospital (poor connectivity)?

**Answer:**
"Currently the app breaks — it's entirely online. For production: service worker with a cache-first strategy for the static assets and last-fetched patterns. The user could still see the cached heatmap and prediction even offline. Check-ins could be stored in IndexedDB with `background sync` API — the browser retries the POST when connectivity returns. The active-visit timer is purely local (JavaScript `setInterval`) — it keeps running offline. The Realtime feed would show 'no connection' state but cached checkins would still display. This is a PWA capability addition — significant work but not architecturally complex."

---

### Q7.7 — How would you support 10,000 concurrent users?

**Answer:**
"Let's break it down by component. The SPA static files: already CDN-distributed, handles millions of concurrent connections — not a bottleneck. Supabase REST API: Supabase Pro scales to ~500 concurrent database connections via PgBouncer connection pooling. For 10,000 users not all hitting the DB simultaneously — but if they do, I'd: (1) move queue_patterns reads to a CDN-cached Edge Function so they never hit the database per user, (2) use read replicas for all SELECT queries, (3) queue check-in writes through a Supabase Edge Function with rate limiting. Realtime WebSockets: Supabase Pro allows thousands of concurrent connections. At 10,000 simultaneous WebSocket connections, I'd need Supabase Enterprise or a self-hosted Phoenix Channels server. The bottleneck in this specific app would be Realtime connections — 10,000 users with live subscriptions is the hardest scaling challenge."

---

### Q7.8 — How would you redesign this for production scale with a large team?

**Answer:**
"I'd decompose into clear services: (1) a read API (Node/Hono or Supabase Edge Functions) serving patterns and hospital data — cached at CDN, no auth required, (2) a write API for check-ins and feedback — authenticated, rate-limited, (3) a prediction microservice that runs nightly to update `avg_wait_minutes` from feedback data, (4) a notification service (FCM/APNs) for 'queue is short now' push notifications. The frontend stays as a React SPA but adds a PWA manifest and service worker. Monitoring adds Sentry, Datadog, and alerting on p99 API latency. The team would split into frontend, backend/API, data/ML (prediction model), and DevOps tracks."

---

## SECTION 8 — MODEL ANSWERS (Complete)

### "How does React Query caching work in your project?"

"React Query maintains an in-memory cache keyed by `queryKey` arrays. When `useQueuePatterns('dept-id-123')` is called, React Query checks if `['patterns', 'dept-id-123']` exists in the cache and whether it's stale. The default `staleTime` is 0 — data is immediately considered stale and will be refetched in the background on next mount. I set `staleTime: 5 * 60 * 1000` on patterns (5 minutes) since they don't change intraday. `gcTime` (garbage collection time) defaults to 5 minutes — unused cache entries are cleared after 5 minutes. When `useCreateCheckin` succeeds, I call `qc.invalidateQueries({ queryKey: ['checkins', departmentId] })` — this marks that cache entry as stale and triggers an immediate refetch on any component that's currently subscribed to it."

---

### "Why did you choose Supabase over Firebase?"

"Supabase uses PostgreSQL — a relational database with JOINs, foreign keys, CHECK constraints, and transactions. My data model has clear relational structure: departments belong to hospitals, patterns belong to departments, checkins belong to departments and users. Modelling this in Firestore (Firebase's NoSQL) would require either denormalization with duplication or client-side JOINs. I also needed complex queries: 'all patterns for department X filtered by day_of_week and hour' — straightforward SQL, painful in Firestore. Supabase's Row Level Security is PostgreSQL-native — more powerful and auditable than Firebase's Firestore security rules. And Supabase's Realtime uses the same PostgreSQL change feed (logical replication), so I get real-time updates without a separate pub/sub system."

---

### "What was the hardest bug you fixed?"

"The hospitals query was returning no data despite the tables existing and the user being authenticated. The network log showed a valid authenticated request reaching Supabase. The issue was that creating tables via raw SQL in the Supabase SQL editor doesn't automatically grant SELECT to the `anon` and `authenticated` PostgreSQL roles — unlike tables created through the Supabase Dashboard UI which run grant statements automatically. The fix was enabling RLS on each reference table and adding a `USING (true)` SELECT policy. This took a while to diagnose because the error wasn't visible — Supabase returned an empty array rather than an error when RLS blocked reads with no policy, making it look like a data problem rather than a permissions problem."

---

### "How do you test your code?"

"The prediction engine is unit-tested with Vitest: 9 tests covering `getCurrentWait` (exact match, no match, wrong department), `getBestTimeToVisit` (finds minimum future slot, handles empty), and `getHeatmapMatrix` (correct dimensions, correct intensity mapping). I wrote the tests first — red, then implemented, then green. The test setup uses a controlled mock dataset with known values so assertions are deterministic. For the UI, I manually tested the golden path end-to-end — login, onboarding, dashboard data load, check-in flow, feedback — and edge cases like checking in without a selected department (button stays disabled), accessing the feedback page without a stored checkin ID (graceful redirect). In production I'd add Playwright e2e tests for the critical user flows."

---

## SECTION 9 — WHAT TO LEARN BEFORE THE INTERVIEW

### Priority A — Must Know (high probability of being asked)

| Topic | What to Know |
|-------|-------------|
| **React hooks** | `useState`, `useEffect`, `useContext`, `useCallback`, `useMemo` — when each applies, the rules of hooks, the dependency array |
| **React Query fundamentals** | `useQuery`, `useMutation`, `queryKey`, `staleTime`, `invalidateQueries`, loading/error states |
| **JWT authentication** | How JWTs are structured (header.payload.signature), what claims they contain, how they expire, refresh token flow |
| **PostgreSQL basics** | SELECT, JOIN, WHERE, GROUP BY, indexes, EXPLAIN ANALYZE, what a b-tree index does |
| **Row Level Security** | What it is, how `USING` vs `WITH CHECK` differ, why it matters for multi-tenant apps |
| **REST API fundamentals** | HTTP verbs, status codes, headers, what PostgREST does |
| **TypeScript** | Interfaces, generics, type narrowing, `as const`, `keyof`, `Partial<T>` |
| **WebSockets** | How they differ from HTTP, when to use them vs polling, connection lifecycle |

---

### Priority B — Strong Advantage

| Topic | What to Know |
|-------|-------------|
| **Database normalization** | 1NF, 2NF, 3NF — be able to identify violations and explain tradeoffs |
| **React performance** | How React reconciliation works, why keys matter in lists, when `React.memo` helps |
| **CSS Grid and Flexbox** | Be able to explain the heatmap layout without looking at code |
| **Service Workers / PWA** | Cache strategies (cache-first, network-first), background sync |
| **PostgreSQL indexes** | B-tree vs. hash, partial indexes, composite indexes, covering indexes |
| **Rate limiting patterns** | Token bucket, sliding window — conceptual understanding |
| **CORS** | What it is, what the browser enforces, what the server must respond with |
| **Vite build output** | What code-splitting is, what the chunk size warning means, `manualChunks` |

---

### Priority C — Nice to Know

| Topic | What to Know |
|-------|-------------|
| **Docker multi-stage builds** | Understand the Dockerfile structure I wrote in Section 6 |
| **CI/CD with GitHub Actions** | YAML structure, workflow triggers, secrets management |
| **Exponential backoff** | How React Query retries, what backoff means |
| **pg_cron** | PostgreSQL extension for scheduled jobs — relevant to the feedback loop question |
| **Cloudflare Pages / Netlify** | Deployment process, build configuration, preview deployments |
| **Content Security Policy** | What it is, why it prevents XSS at the browser level |
| **IndexedDB** | What it is, why it's relevant for offline support |

---

### Flashcard Must-Memorize Facts

- **Tables in this schema**: hospitals, departments, queue_patterns, doctors, user_preferences, checkins, visit_feedback
- **Tables with RLS**: user_preferences, checkins, visit_feedback, hospitals, departments, queue_patterns, doctors (all 7)
- **Prediction engine functions**: `getCurrentWait`, `getBestTimeToVisit`, `getHeatmapMatrix`, `formatWaitTime`
- **Heatmap matrix size**: 7 rows (Mon–Sun) × 12 columns (8am–7pm) = 84 cells
- **Test count**: 10 total (9 prediction engine + 1 example)
- **Auth method working**: Email magic link (OTP). Google OAuth and Phone OTP require external provider config.
- **sessionStorage keys**: `active_checkin_id`, `active_dept_id`
- **React Query cache invalidation trigger**: `qc.invalidateQueries({ queryKey: ['checkins', dept.id] })`
- **Realtime event**: `postgres_changes` on `checkins` table, filter `department_id=eq.{id}`

---

## SECTION 10 — MOCK INTERVIEW ROUND

*The following simulates a tough L2 interview. Answer mentally before reading the model response.*

---

**Interviewer:** "Tell me about your project."

**You:** *(use the 2-minute answer from Q1.2)*

---

**Interviewer:** "Okay, you said 'historical average wait times.' How exactly does that prediction work? Walk me through the code."

**You:** "The `getCurrentWait` function takes the full array of queue patterns for a department, the department ID, and a Date object. It calls `date.getDay()` to get 0–6 and `date.getHours()` to get the hour. It finds the pattern row where all three match — department ID, day of week, and hour — and returns `avg_wait_minutes`. If no pattern exists for that slot, it returns null and the UI shows 'No data.' It's a simple array find — O(n) where n is 84 rows per department. Trivially fast."

---

**Interviewer:** "What if it's 7:30pm? Hour 19 is the last slot. `getHours()` returns 19. Is that in your patterns?"

**You:** "Yes — the schema constraint is `hour BETWEEN 8 AND 19` and the seed data includes hour 19. `getHours()` at 7:45pm returns 19. If it's 8:15pm, `getHours()` returns 20, which has no pattern — `getCurrentWait` returns null and the UI shows 'No data.' That's correct behavior — OPDs close by 8pm. I could add a friendly message 'OPD hours: 8am–8pm' instead of 'No data' — that's a UX improvement I'd make."

---

**Interviewer:** "Smart catch. Now — what's a race condition and do you have any in this code?"

**You:** "A race condition is when two concurrent operations produce a different result depending on execution order. In my code: the double-submit risk on the check-in form — if a user taps 'Confirm check-in' twice quickly, two HTTP requests fire before the `submitting` state update disables the button. React's state updates are batched but not synchronous. The fix: track the in-flight request with a ref (`const submitting = useRef(false)`) that updates synchronously before re-render, not after. Another subtle one: if the user edits their preferred department while the heatmap is loading patterns for the old department, the returned data could briefly show wrong patterns. React Query handles this — queries for the old department ID are cancelled when the component re-renders with a new `dept.id` because the queryKey changes."

---

**Interviewer:** "You use UUIDs as primary keys. What's the performance cost and how would you mitigate it?"

**You:** "UUID v4 is random — inserts go to random positions in the b-tree index, causing page splits and cache misses. For a write-heavy table like `checkins`, this can cause index bloat. Mitigation: use UUID v7 (time-ordered UUID) — the first bits are a timestamp, so inserts are mostly sequential, like an auto-increment. PostgreSQL 17 has `gen_random_uuid_v7()`. Alternatively, use `BIGSERIAL` for the `checkins` table specifically and keep UUID only for tables that need external ID safety (hospitals, users). For our current scale — thousands of check-ins, not billions — this optimization isn't needed. I'd revisit at 1M+ rows."

---

**Interviewer:** "Your live feed polls every 30 seconds as a fallback. Why is polling a fallback and not the primary mechanism?"

**You:** "WebSocket (Realtime) is the primary because it's event-driven — updates arrive within milliseconds of the INSERT. Polling introduces up to 30 seconds of latency — a patient checks in, and other users might not see it for 30 seconds. Polling also has unnecessary load: 100 users × 1 request/30s = 200 extra database reads per minute, whether or not anything changed. The Realtime subscription delivers one broadcast per event to all subscribers, regardless of how many are connected. Polling is the fallback because WebSocket connections can drop (mobile network switches, browser backgrounding) and React Query's `refetchInterval` ensures eventual consistency even if the WebSocket is disconnected."

---

**Interviewer:** "You mentioned RLS. Write me the SQL for a policy that allows users to only read their own preferences but allows admins to read everyone's."

**You:**
```sql
-- User can read their own row
CREATE POLICY "users read own prefs"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Admin role (custom claim in JWT) can read all
CREATE POLICY "admins read all prefs"
  ON user_preferences FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
```
"In Supabase, you'd set the custom `role` claim in the JWT using a database function hook on user login, or via the Supabase admin API when granting admin status. The `auth.jwt()` function returns the full JWT payload as JSONB — you can extract any claim with the `->>` operator."

---

**Interviewer:** "What if I told you your prediction engine has a bug — at midnight on Sunday, `getBestTimeToVisit` might return a slot that's already past?"

**You:** "That's a valid edge case. Let me trace the logic. `getBestTimeToVisit` filters patterns where `day_of_week !== day || hour > hour`. At midnight Sunday (day=0, hour=0), it looks for patterns where day is not 0, OR where day is 0 and hour > 0. Sunday has slots from hour 8 onward — all qualify since 8 > 0. So Sunday 8am would be returned as 'best time today,' which is correct. The day calculation uses `(best.day_of_week - day + 7) % 7 || 7`. If best.day_of_week equals day (Sunday=0), `(0 - 0 + 7) % 7 = 0`, and `0 || 7 = 7` — it returns 7 days from now, not today. That IS a bug. At Sunday midnight, if the best slot is later on Sunday, it would return next Sunday instead of today. The fix: the condition should be `(0 - 0 + 7) % 7 === 0 ? 0 : (best.day_of_week - day + 7) % 7` — check if same day and return 0 days offset."

---

**Interviewer:** "Good catch. Last question — why should I hire you given that an AI could just build this for anyone?"

**You:** "Because this project demonstrates judgment, not just output. Anyone can prompt an AI to generate React hooks. What's hard is: knowing which database to choose and why (Supabase over Firebase, relational over NoSQL), designing a schema that's normalized but pragmatically denormalized where reads demand it, debugging a permissions issue that presents as an empty array (not an error) — that took understanding of PostgreSQL's role system. The AI wrote patterns; I made decisions. In a production team, decisions are what matter — what to build, how to architect it, what to prioritize, what to cut. This project shows I can make those decisions, own them, and defend them technically."

---

*End of mock interview.*

---

## QUICK REFERENCE — NUMBERS TO KNOW

| Metric | Value |
|--------|-------|
| Tables | 7 |
| Kerala hospitals seeded | 5 |
| Departments (Thiruvananthapuram) | 7 |
| Doctors seeded | 5 |
| Queue pattern slots per department | 84 (7 days × 12 hours) |
| Heatmap matrix dimensions | 7 × 12 |
| Unit tests | 10 (9 prediction + 1 example) |
| Auth method | Email magic link (OTP) |
| Active checkin poll interval | 30 seconds |
| Realtime transport | WebSocket (Phoenix Channels) |
| Frontend build time | ~3.7 seconds |
| Bundle size | ~644KB JS (187KB gzipped) |
| Pattern staleTime | 5 minutes |
| JWT expiry | 1 hour (Supabase default) |

---

*Last updated: 2026-04-24*
