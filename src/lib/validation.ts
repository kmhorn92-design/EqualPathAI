import { z } from "zod";

const tag = z.string().trim().min(1).max(80);
export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  password: z.string().min(10, "Use at least 10 characters").max(200).refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Include a letter and a number"),
  acceptTerms: z.literal(true, { message: "Please accept the terms to continue" }),
});
export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export const profileSchema = z.object({
  targetRoles: z.array(tag).max(10).default([]),
  industries: z.array(tag).max(10).default([]),
  location: z.string().trim().max(120).optional().default(""),
  workPreference: z.enum(["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"]).default("UNKNOWN"),
  experienceLevel: z.string().trim().max(60).optional().default(""),
  education: z.string().trim().max(160).optional().default(""),
  skills: z.array(tag).max(60).default([]),
  accessibility: z.object({ reducedMotion: z.boolean().optional(), highContrast: z.boolean().optional(), largeText: z.boolean().optional(), screenReaderHints: z.boolean().optional() }).default({}),
});

export const consentSchema = z.object({ aiProcessing: z.boolean(), trainingUse: z.boolean(), retentionDays: z.number().int().min(7).max(1095) });

export const applicationSchema = z.object({
  jobId: z.string().max(64).optional().nullable(),
  company: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  url: z.string().url().max(1000).optional().nullable().or(z.literal("")),
  status: z.enum(["SAVED", "PREPARING", "APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "REJECTED", "WITHDRAWN"]).default("SAVED"),
  notes: z.string().max(5000).optional().nullable(),
  appliedAt: z.string().datetime().optional().nullable().or(z.literal("")),
  reminderAt: z.string().datetime().optional().nullable().or(z.literal("")),
  resumeVersionId: z.string().max(64).optional().nullable().or(z.literal("")),
});

export const jobQuerySchema = z.object({
  q: z.string().max(200).optional(),
  industry: z.string().max(60).optional(),
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional(),
  location: z.string().max(120).optional(),
  experience: z.string().max(60).optional(),
  salaryMin: z.coerce.number().int().min(0).max(1_000_000).optional(),
  company: z.string().max(200).optional(),
  type: z.string().max(60).optional(),
  days: z.coerce.number().int().min(1).max(60).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  demo: z.enum(["1", "0"]).optional(),
  saved: z.enum(["1"]).optional(),
});
