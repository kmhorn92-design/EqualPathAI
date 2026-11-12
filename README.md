# EqualPath AI

**Your Skills. Your Potential. Your Opportunity.**

A full-stack AI workforce-development platform: truthful ATS-readable resumes, AI career coaching, practice assessments, AI-literacy lessons, fair-hiring resources, and a daily board of verified, currently open jobs from authorized sources.

> Built on Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · PostgreSQL (Supabase-compatible) · Drizzle ORM · server-side LLM (Anthropic or OpenAI-compatible).

---

## Quick start (local)

```bash
# 1. Install
npm install

# 2. Postgres (or use an existing/Supabase database)
docker compose up -d

# 3. Configure
cp .env.example .env
npm run keygen            # paste output into ENCRYPTION_KEY
# set CRON_SECRET to a long random string; optionally ANTHROPIC_API_KEY

# 4. Database
npm run db:migrate
SEED_ADMIN_PASSWORD="choose-a-strong-one" ENABLE_DEMO_JOBS=true npm run db:seed

# 5. Run
ENABLE_DEMO_JOBS=true npm run dev     # http://localhost:3000
```

Sign in as the seeded admin (`admin@equalpath.local`) to see `/admin`, or create a regular account via **Get started**. The seed also creates a DEMO coach account (`coach@equalpath.local`; set `SEED_COACH_PASSWORD`) linked to "[DEMO] Jordan Ellis", so you can test booking from both sides.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev, production build, production server |
| `npm test` | Unit tests (Vitest): crypto, parsing, analysis, anti-fabrication guard, exports, adapters, dedup, retry, grading |
| `npx tsx scripts/e2e.mts` | End-to-end API walkthrough against a running dev server (`BASE=http://localhost:3000`, start it with `ENABLE_DEMO_JOBS=true`) |
| `npx tsx scripts/e2e-booking.mts` | End-to-end coach booking test (client + coach + security checks), after `npm run db:seed` |
| `npx tsx scripts/e2e-partners.mts` | End-to-end: partner/recruiter publishing rules, contact visibility, site assistant |
| `npx tsx scripts/e2e-booking-race.mts` | Fires 8 simultaneous requests for one slot and checks that exactly one succeeds |
| `npm run typecheck` | TypeScript |
| `npm run db:generate` | Generate a new SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations in `drizzle/` |
| `npm run db:seed` | Admin account + clearly labeled DEMO coaches/articles (+ DEMO jobs if `ENABLE_DEMO_JOBS=true`) |
| `npm run ingest` | Run all job-source adapters once (CLI) |
| `npm run retention` | Enforce per-user resume retention & purge expired sessions |
| `npm run keygen` | Generate a 32-byte encryption key |

---

## What is fully functional vs. what needs credentials

| Feature | Status |
|---|---|
| Landing page, auth (email/password, sessions), onboarding, dashboard | ✅ Fully functional |
| Resume Studio: PDF/DOCX/TXT upload, encrypted storage, structured parsing, editable fields, job-description comparison, keyword highlighting, requirements check, approve/reject suggestions, versions, before/after compare, DOCX/PDF export | ✅ Fully functional with **rule-based** suggestions. **AI** suggestions and AI-assisted parsing need `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` |
| ATS template library (12 templates, all single-column) | ✅ Fully functional |
| AI Career Coach (7 modes, encrypted history) | ✅ Works with curated fallback guidance; full conversational AI needs an LLM key |
| Assessment Academy (numerical, verbal, situational, customer service, technical, typing, STAR mock interview) | ✅ Fully functional; AI interview feedback needs an LLM key (rule-based STAR check always on) |
| Learning Hub (7 lessons + quizzes + sources, admin-managed articles) | ✅ Fully functional |
| Fair Hiring Resource Center | ✅ Fully functional (educational content + official links) |
| Career Coaches: directory with Remote / Hybrid / On-site focus filter, submissions, moderation, credential verification | ✅ Functional. Only DEMO coaches are seeded; real coaches must apply and be verified |
| **In-app coach booking**: weekly availability, time-zone-aware slots, requests, confirm/decline/cancel/complete, meeting links, calendar (.ics) files, opt-in resume sharing, notifications, Coach Portal, My Sessions | ✅ Fully functional. Payments are arranged directly with coaches (no payment processing). Email/SMS reminders would need an email provider |
| **Site assistant** (chat bubble on every page): answers "how do I…?" questions about EqualPath and links to the right page | ✅ Works without a key (answers straight from the help guide in `src/content/site-guide.ts`). With an Anthropic/Gemini/OpenAI key it answers conversationally, grounded in the same guide |
| **Hiring Partners**: partner company pages, recruiter cards (name, title, email, phone), message template, partner's open jobs, admin management | ✅ Fully functional. Ships with fictional DEMO partners only; add real partners in /admin once agreements and recruiter consent are in place |
| Application Tracker (kanban/list, drag-drop, notes, reminders → notifications, follow-up drafts) | ✅ Fully functional |
| Privacy: consent, retention, export, deletion | ✅ Fully functional |
| Admin dashboard (feed freshness, permissions, runs, alerts, dedup stats, moderation, aggregate usage) | ✅ Fully functional |
| Job ingestion framework, scheduler, retry, audit logs, stale/expired handling, low-count alerts | ✅ Fully functional |
| **Greenhouse** / **Lever** employer boards | 🔑 Works once you list employer board tokens in env (public APIs, no key) |
| **USAJOBS** | 🔑 Needs a free API key |
| **Adzuna** | 🔑 Needs app id/key (free tier available) |
| **Authorized employer / staffing-agency feeds** | 🔑 Needs a feed URL **and written authorization** from the partner |
| **Indeed**, **LinkedIn** | 🔒 Require **approved partner agreements**. Adapters are scaffolded and hard-disabled; until approved, the UI only shows plain outbound search links. **We never scrape.** |

### About the "50 jobs per day" target
The job board shows **the real count** of verified, currently open listings. If authorized sources supply fewer than `JOB_DAILY_TARGET` (default 50) new valid listings in 24 hours, the scheduler raises a `LOW_JOB_COUNT` alert (admin dashboard + optional webhook). **Demo jobs are never counted, never mixed into live results, and refused entirely when `NODE_ENV=production`.** To reach 50+/day reliably, enable USAJOBS + Adzuna and add 10–20 Greenhouse/Lever employer boards in your target regions.

---

## Architecture

```
src/
  app/                    Next.js routes (pages + /api route handlers)
    (app)/…               Authenticated app shell (dashboard, resume, jobs, tracker, coach, …)
    api/…                 JSON APIs (validated with zod, owned-resource checks, rate limits)
  db/schema.ts            Drizzle schema (source of truth) → drizzle/*.sql migrations
  lib/
    auth.ts               bcrypt (cost 12) + hashed, httpOnly, SameSite=Lax DB sessions
    api.ts                Handler wrapper: auth/role checks, origin (CSRF) check, rate limit, errors
    crypto.ts             AES-256-GCM field & blob encryption, key rotation support
    storage.ts            Encrypted object storage (local or Supabase Storage private bucket)
    llm.ts                Server-side LLM client + global safety system prompt
    resume/               parse (deterministic), extract (PDF/DOCX/TXT), analyze, ai (guarded), export, templates
    jobs/                 adapters/, registry, normalize (validate + dedupe), ingest (scheduler), search, match
  content/                Original lessons & practice questions
scripts/                  migrate, seed, ingest, retention, e2e
tests/                    Vitest unit tests
```

### Job ingestion
Each adapter (`src/lib/jobs/adapters/*`) implements `JobAdapter` and **declares** its source, authorization method + required env vars + terms URL, update cadence, attribution, and the **permitted fields** we may store. Fields not on that list are dropped before storage. To add a source, implement the interface and register it in `registry.ts`. The admin dashboard shows each declaration automatically.

Pipeline per run: fetch (timeout, up to 3 retries with exponential backoff; 4xx permission errors are not retried) → restrict to permitted fields → validate (https apply URL, not expired, has title/company) → in-batch dedupe → cross-source dedupe on `canonical_key` (normalized company|title|location) plus a `(source, source_job_id)` unique index → upsert → listings the source no longer returns become `UNAVAILABLE` → freshness sweep (`EXPIRED` past deadline, `STALE` when not re-verified within `JOB_STALE_AFTER_HOURS`) → audit log + alerts.

Search uses a weighted Postgres `tsvector` (GIN index) with `websearch_to_tsquery`, plus filters for industry, arrangement, location, experience, disclosed salary, company, job type, and recency.

### Coach booking
* **Who can coach:** any signed-in user can submit a listing; it's linked to their account and stays `PENDING` until an admin approves it. Coaches manage everything in **/coach-portal**: Remote/Hybrid/On-site focus, formats (video/phone/in-person), time zone, weekly availability, and booking on/off.
* **Slots** (`src/lib/booking.ts`, unit-tested): availability is stored in the coach's IANA time zone, turned into UTC slots on a 30-minute grid (DST-safe), shown in the client's time zone, with a 12-hour minimum lead time and a 21-day horizon. A slot is offered only if the whole session fits in a window and doesn't overlap an active booking.
* **No double-booking:** each request re-validates the slot inside a transaction holding a row lock on the coach (`SELECT … FOR UPDATE`). A partial unique index on `(coach_id, starts_at)` for active bookings adds a second guard.
* **Lifecycle:** `REQUESTED → CONFIRMED | DECLINED`, `CONFIRMED → CANCELLED | COMPLETED`. Video sessions need an https meeting link to confirm. Clients can cancel up to 2 hours before a confirmed session. Every change notifies the other party in the app and is written to the audit log.
* **Privacy:** goals, accessibility needs and coach notes are encrypted. Coaches see the client's name, never their email. A resume is visible only if the client chose a specific version for that session, and only while it's active. Sessions are included in data export and deleted with the account.

### Hiring partners & recruiter contacts
* **No implied partnerships.** A company appears publicly only when an admin marks it approved *and* confirms that a signed partnership agreement is on file. Without that it stays a draft (enforced by the API).
* **Consent for contact details.** A recruiter can only be added after the admin confirms the recruiter's written consent to publish their name, title, work email and phone. Phone is optional. Admins can hide a recruiter instantly or delete their details entirely on request.
* **Limited exposure.** Emails and phone numbers are shown only to signed-in users. Signed-out visitors see names and titles only, which reduces scraping. EqualPath never sends messages on a user's behalf; the message template opens the user's own email app.
* **Open jobs** come from the verified job board, matched on the company names configured for each partner.

### Site assistant
* Stateless: conversations aren't stored. Rate-limited to 40 questions per hour per IP, and available to signed-out visitors.
* The LLM is instructed to answer only from the help guide and to say when it doesn't know, so it won't invent features, prices, partners or people. Without a key, or if the provider fails, answers come directly from the guide.
* To teach it something new, add an entry to `src/content/site-guide.ts`. The same file powers the demo's assistant.

### AI safety guarantees (enforced in code)
* **No fabrication.** AI rewrites go through `guardSuggestion`, which rejects any suggestion that adds numbers/metrics or skill keywords not already in the resume, or that balloons the length. Blocked suggestions are counted and shown to the user. AI-assisted parsing keeps only text grounded in the uploaded document.
* **Human approval.** Nothing changes until the user accepts it. Pending suggestions are never applied. Every saved version stores the decision log.
* **No ATS score, no hiring probability.** The UI shows a literal keyword count with an explicit disclaimer; job matches are explained by skill overlap only.
* **No demographic profiling.** The schema has no protected-characteristic fields; validation strips unknown fields; the LLM system prompt forbids inference; coach context includes career data only.
* **No cheating.** Assessments are original practice content, answers are graded server-side, and pasting is disabled in typing tests.
* **No legal determinations.** The Fair Hiring Center is educational and links to official channels (EEOC, DOL, DOJ IER, JAN).

### Security & privacy
* TLS in transit (enforce HTTPS + HSTS header); `DB_SSL=true` or `sslmode=require` for managed Postgres.
* At rest: resumes, versions, job descriptions, analyses, coach messages and application notes are AES-256-GCM encrypted in the app before reaching Postgres; uploaded files are encrypted before reaching object storage.
* Upload hardening: 5 MB cap, magic-byte type sniffing (client MIME is not trusted), text-only extraction.
* Sessions: random 256-bit tokens, only SHA-256 hashes stored, 14-day expiry; middleware gate + server-side validation.
* Every resource query is scoped to the owner (IDOR-tested); admin APIs require the `ADMIN` role; cron endpoints use constant-time secret comparison.
* Same-origin check on mutating requests; rate limits on auth, analysis, coach, and interview endpoints (in-memory; use Redis/Upstash when running multiple instances).
* Users control AI processing consent, training consent (**off by default**), retention window, full JSON export, and permanent deletion (cascades to files).
* Analytics are aggregate daily counters with no user identifiers.

---

## Deployment

### Vercel + Supabase (recommended)
1. Create a Supabase project. Copy the **pooled** connection string (append `?sslmode=require`) to `DATABASE_URL` and the **direct** string to `DIRECT_URL`.
2. In Supabase Storage create a **private** bucket `resumes`; set `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only env var).
3. Generate secrets: `npm run keygen` → `ENCRYPTION_KEY`; random `CRON_SECRET`. Store your encryption key in a secrets manager as well; losing it makes encrypted data unrecoverable.
4. Run migrations from your machine or CI: `DATABASE_URL=… DIRECT_URL=… npm run db:migrate`, then seed only the admin: `SEED_ADMIN_EMAIL=you@org SEED_ADMIN_PASSWORD=… npm run db:seed`.
5. Import the repo into Vercel, add the env vars, and deploy. `vercel.json` schedules `/api/cron/ingest` (daily 10:00 UTC) and `/api/cron/retention`.
6. Configure job sources (see `.env.example`), then visit `/admin` → **Run all sources**.

### Any Node host / container
`npm ci && npm run build && npm run db:migrate && npm start` (Node 20+). Schedule daily:
`curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/ingest` (or use `.github/workflows/daily-ingest.yml`).

---

## Before launch: checklist
- [ ] Legal review of the privacy policy template (`/privacy`) and terms.
- [ ] Sign data agreements for each employer/staffing feed; obtain Indeed/LinkedIn partner approval before enabling those adapters.
- [ ] Replace example testimonials on the landing page with genuine, consented ones (currently labeled "Example").
- [ ] Verify real coaches' credentials with issuers before marking them verified.
- [ ] Before adding a real hiring partner, have a signed agreement that allows listing them, and written consent from each recruiter whose contact details you publish. Delete the DEMO partners in /admin.
- [ ] Recheck external resource links periodically (federal guidance pages change; e.g. the EEOC removed its AI technical-assistance documents in January 2025, and the lessons now reflect that).
- [ ] Accessibility audit with assistive-technology users (WCAG 2.2 AA target).
- [ ] Swap the in-memory rate limiter for a shared store if running more than one instance.
