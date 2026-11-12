import { z } from "zod";

export const partnerInput = z.object({
  name: z.string().trim().min(2).max(120),
  industry: z.string().trim().min(2).max(60),
  description: z.string().trim().min(20).max(1500),
  website: z.string().url().max(300).refine((u) => u.startsWith("https://"), "Must be https").optional().or(z.literal("")),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#8B5CF6"),
  hiringFor: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  locations: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  workModes: z.array(z.enum(["REMOTE", "HYBRID", "ONSITE"])).max(3).default([]),
  jobCompanyNames: z.array(z.string().trim().min(1).max(120)).max(6).default([]),
  partnerSince: z.string().trim().max(20).optional(),
  /** Admin attests a signed partnership agreement is on file. Required to publish. */
  agreementConfirmed: z.boolean().default(false),
});

export const recruiterInput = z.object({
  name: z.string().trim().min(2).max(100),
  title: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(40).regex(/^[+()\d\s.-]*$/, "Phone can contain digits, spaces, +, (, ), . and -").optional().or(z.literal("")),
  specialties: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  workModes: z.array(z.enum(["REMOTE", "HYBRID", "ONSITE"])).max(3).default([]),
  linkedinUrl: z.string().url().max(300).refine((u) => u.startsWith("https://"), "Must be https").optional().or(z.literal("")),
  /** Admin attests the recruiter consented in writing to publishing their name, email and phone. */
  consentConfirmed: z.literal(true, { message: "Recruiter contact details can only be published with their written consent." }),
});

