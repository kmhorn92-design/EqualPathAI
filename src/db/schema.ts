/**
 * EqualPath AI — PostgreSQL schema (Drizzle ORM, Supabase-compatible).
 * Columns ending in `Enc` hold AES-256-GCM ciphertext (see src/lib/crypto.ts).
 * By design there are NO demographic / protected-characteristic columns.
 */
import { sql } from "drizzle-orm";
import {
  pgTable, pgEnum, text, timestamp, boolean, integer, jsonb, primaryKey, index, uniqueIndex, date, customType,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());
const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

export const roleEnum = pgEnum("role", ["USER", "ADMIN"]);
export const workModeEnum = pgEnum("work_mode", ["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"]);
export const jobStatusEnum = pgEnum("job_status", ["ACTIVE", "STALE", "UNAVAILABLE", "EXPIRED"]);
export const appStatusEnum = pgEnum("application_status", [
  "SAVED", "PREPARING", "APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "REJECTED", "WITHDRAWN",
]);
export const runStatusEnum = pgEnum("run_status", ["RUNNING", "SUCCESS", "PARTIAL", "FAILED", "SKIPPED"]);
export const moderationEnum = pgEnum("moderation_status", ["PENDING", "APPROVED", "REJECTED"]);

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: roleEnum("role").notNull().default("USER"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).defaultNow(),
  createdAt: created(),
  updatedAt: updated(),
});

export const sessions = pgTable("sessions", {
  id: id(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  userAgent: text("user_agent"),
  createdAt: created(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export type Accessibility = { reducedMotion?: boolean; highContrast?: boolean; largeText?: boolean; screenReaderHints?: boolean };

export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  targetRoles: text("target_roles").array().notNull().default(sql`'{}'`),
  industries: text("industries").array().notNull().default(sql`'{}'`),
  location: text("location"),
  workPreference: workModeEnum("work_preference").notNull().default("UNKNOWN"),
  experienceLevel: text("experience_level"),
  education: text("education"),
  skills: text("skills").array().notNull().default(sql`'{}'`),
  accessibility: jsonb("accessibility").$type<Accessibility>().notNull().default({}),
  updatedAt: updated(),
});

export const consents = pgTable("consents", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
  aiProcessing: boolean("ai_processing").notNull().default(true),
  trainingUse: boolean("training_use").notNull().default(false), // never defaulted on
  retentionDays: integer("retention_days").notNull().default(365),
  updatedAt: updated(),
});

export const resumes = pgTable("resumes", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  originalName: text("original_name"),
  mimeType: text("mime_type"),
  storageKey: text("storage_key"),
  parsedEnc: text("parsed_enc").notNull(),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("resumes_user_idx").on(t.userId)]);

export const resumeVersions = pgTable("resume_versions", {
  id: id(),
  resumeId: text("resume_id").notNull().references(() => resumes.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  templateId: text("template_id").notNull().default("classic"),
  contentEnc: text("content_enc").notNull(),
  jobTitle: text("job_title"),
  jobDescEnc: text("job_desc_enc"),
  analysisEnc: text("analysis_enc"),
  createdAt: created(),
}, (t) => [index("resume_versions_resume_idx").on(t.resumeId)]);

export const jobSources = pgTable("job_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  authMethod: text("auth_method").notNull(),
  cadence: text("cadence").notNull(),
  attribution: text("attribution").notNull(),
  permittedFields: text("permitted_fields").array().notNull().default(sql`'{}'`),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  configJson: jsonb("config_json").$type<Record<string, unknown>>().notNull().default({}),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  createdAt: created(),
  updatedAt: updated(),
});

export const jobs = pgTable("jobs", {
  id: id(),
  sourceId: text("source_id").notNull().references(() => jobSources.id),
  sourceJobId: text("source_job_id").notNull(),
  canonicalKey: text("canonical_key").notNull(),
  company: text("company").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  workMode: workModeEnum("work_mode").notNull().default("UNKNOWN"),
  employmentType: text("employment_type"),
  industry: text("industry"),
  experienceLevel: text("experience_level"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency"),
  salaryPeriod: text("salary_period"),
  description: text("description").notNull(),
  applyUrl: text("apply_url").notNull(),
  attribution: text("attribution"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  status: jobStatusEnum("status").notNull().default("ACTIVE"),
  isDemo: boolean("is_demo").notNull().default(false),
  searchVector: tsvector("search_vector").generatedAlwaysAs(
    sql`setweight(to_tsvector('english', coalesce(title,'')), 'A') || setweight(to_tsvector('english', coalesce(company,'')), 'B') || setweight(to_tsvector('english', coalesce(location,'') || ' ' || coalesce(industry,'')), 'C') || setweight(to_tsvector('english', coalesce(description,'')), 'D')`,
  ),
}, (t) => [
  uniqueIndex("jobs_canonical_key_uq").on(t.canonicalKey),
  uniqueIndex("jobs_source_job_uq").on(t.sourceId, t.sourceJobId),
  index("jobs_status_idx").on(t.status, t.isDemo, t.postedAt),
  index("jobs_search_idx").using("gin", t.searchVector),
]);

export const ingestionRuns = pgTable("ingestion_runs", {
  id: id(),
  sourceId: text("source_id").notNull().references(() => jobSources.id),
  status: runStatusEnum("status").notNull().default("RUNNING"),
  attempts: integer("attempts").notNull().default(1),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  fetched: integer("fetched").notNull().default(0),
  inserted: integer("inserted").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  duplicates: integer("duplicates").notNull().default(0),
  rejected: integer("rejected").notNull().default(0),
  markedStale: integer("marked_stale").notNull().default(0),
  error: text("error"),
}, (t) => [index("runs_source_idx").on(t.sourceId, t.startedAt)]);

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  target: text("target"),
  detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: created(),
}, (t) => [index("audit_created_idx").on(t.createdAt)]);

export const alerts = pgTable("alerts", {
  id: id(),
  level: text("level").notNull(),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: created(),
});

export const savedJobs = pgTable("saved_jobs", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.userId, t.jobId] })]);

export const applications = pgTable("applications", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
  company: text("company").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  status: appStatusEnum("status").notNull().default("SAVED"),
  notesEnc: text("notes_enc"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  reminderAt: timestamp("reminder_at", { withTimezone: true }),
  resumeVersionId: text("resume_version_id").references(() => resumeVersions.id, { onDelete: "set null" }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("applications_user_idx").on(t.userId, t.status)]);

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  module: text("module").notNull(),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  durationSec: integer("duration_sec").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: created(),
}, (t) => [index("attempts_user_idx").on(t.userId, t.module)]);

export const lessonProgress = pgTable("lesson_progress", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull(),
  completed: boolean("completed").notNull().default(false),
  quizScore: integer("quiz_score"),
  updatedAt: updated(),
}, (t) => [primaryKey({ columns: [t.userId, t.lessonId] })]);

export const chatThreads = pgTable("chat_threads", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("threads_user_idx").on(t.userId)]);

export const chatMessages = pgTable("chat_messages", {
  id: id(),
  threadId: text("thread_id").notNull().references(() => chatThreads.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  contentEnc: text("content_enc").notNull(),
  createdAt: created(),
}, (t) => [index("messages_thread_idx").on(t.threadId, t.createdAt)]);

export type Credential = { name: string; issuer: string; verified: boolean; verifiedAt?: string; verifyUrl?: string };

export const coaches = pgTable("coaches", {
  id: id(),
  name: text("name").notNull(),
  headline: text("headline").notNull(),
  bio: text("bio").notNull(),
  specialties: text("specialties").array().notNull().default(sql`'{}'`),
  credentials: jsonb("credentials").$type<Credential[]>().notNull().default([]),
  priceFrom: integer("price_from"),
  priceNote: text("price_note"),
  bookingUrl: text("booking_url").notNull(),
  remote: boolean("remote").notNull().default(true),
  location: text("location"),
  languages: text("languages").array().notNull().default(sql`'{}'`),
  status: moderationEnum("status").notNull().default("PENDING"),
  isDemo: boolean("is_demo").notNull().default(false),
  /** The coach's own EqualPath account. Set when a signed-in user submits a listing; enables in-app booking. */
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  /** Work arrangements the coach specializes in helping with. */
  focus: workModeEnum("focus").array().notNull().default(sql`'{}'`),
  formats: text("formats").array().notNull().default(sql`'{video}'`), // video | phone | in-person
  timezone: text("timezone").notNull().default("America/New_York"),
  bookingEnabled: boolean("booking_enabled").notNull().default(false),
  createdAt: created(),
}, (t) => [uniqueIndex("coaches_user_uq").on(t.userId)]);

/** Weekly recurring availability, in the coach's own time zone. */
export const coachAvailability = pgTable("coach_availability", {
  id: id(),
  coachId: text("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(), // 0 = Sunday
  startMinute: integer("start_minute").notNull(), // minutes after midnight
  endMinute: integer("end_minute").notNull(),
}, (t) => [index("availability_coach_idx").on(t.coachId)]);

export const bookingStatusEnum = pgEnum("booking_status", ["REQUESTED", "CONFIRMED", "DECLINED", "CANCELLED", "COMPLETED"]);

export const bookings = pgTable("bookings", {
  id: id(),
  coachId: text("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionType: text("session_type").notNull(),
  format: text("format").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  arrangement: workModeEnum("arrangement"),
  goalEnc: text("goal_enc"),
  accessibilityEnc: text("accessibility_enc"),
  /** Only set if the client explicitly chose to share a resume version with this coach. */
  sharedResumeVersionId: text("shared_resume_version_id").references(() => resumeVersions.id, { onDelete: "set null" }),
  status: bookingStatusEnum("status").notNull().default("REQUESTED"),
  meetingUrl: text("meeting_url"),
  coachNoteEnc: text("coach_note_enc"),
  clientTimezone: text("client_timezone"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [
  index("bookings_coach_idx").on(t.coachId, t.startsAt),
  index("bookings_user_idx").on(t.userId, t.startsAt),
  // Defense in depth against double-booking the same start time (overlaps are also checked in a locked transaction).
  uniqueIndex("bookings_active_slot_uq").on(t.coachId, t.startsAt).where(sql`status in ('REQUESTED','CONFIRMED')`),
]);

export const articles = pgTable("articles", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(),
  sourceUrl: text("source_url"),
  status: moderationEnum("status").notNull().default("PENDING"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
});

export const notifications = pgTable("notifications", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: created(),
}, (t) => [index("notifications_user_idx").on(t.userId, t.readAt)]);

/** Aggregated, non-identifying product usage counters (no user id stored). */
export const usageDaily = pgTable("usage_daily", {
  day: date("day").notNull(),
  event: text("event").notNull(),
  count: integer("count").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.day, t.event] })]);

/**
 * Hiring partners. A partner is shown publicly only when APPROVED *and* an admin has confirmed
 * a partnership agreement is on file — so we never imply a collaboration that doesn't exist.
 */
export const partners = pgTable("partners", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  description: text("description").notNull(),
  website: text("website"),
  brandColor: text("brand_color").notNull().default("#8B5CF6"),
  hiringFor: text("hiring_for").array().notNull().default(sql`'{}'`),
  locations: text("locations").array().notNull().default(sql`'{}'`),
  workModes: workModeEnum("work_modes").array().notNull().default(sql`'{}'`),
  /** Exact company name(s) as they appear on job listings, used to show this partner's open jobs. */
  jobCompanyNames: text("job_company_names").array().notNull().default(sql`'{}'`),
  partnerSince: text("partner_since"),
  agreementConfirmedAt: timestamp("agreement_confirmed_at", { withTimezone: true }),
  agreementConfirmedBy: text("agreement_confirmed_by"),
  status: moderationEnum("status").notNull().default("PENDING"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
});

/**
 * Partner recruiters. Contact details are published only with the recruiter's documented consent
 * (consent_confirmed_at is required), and can be hidden or removed at any time.
 */
export const recruiters = pgTable("recruiters", {
  id: id(),
  partnerId: text("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  specialties: text("specialties").array().notNull().default(sql`'{}'`),
  workModes: workModeEnum("work_modes").array().notNull().default(sql`'{}'`),
  linkedinUrl: text("linkedin_url"),
  consentConfirmedAt: timestamp("consent_confirmed_at", { withTimezone: true }).notNull(),
  consentConfirmedBy: text("consent_confirmed_by").notNull(),
  active: boolean("active").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: created(),
}, (t) => [index("recruiters_partner_idx").on(t.partnerId)]);
