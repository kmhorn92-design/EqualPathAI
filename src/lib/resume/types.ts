import { z } from "zod";

export const experienceSchema = z.object({
  id: z.string(),
  title: z.string().max(200).default(""),
  company: z.string().max(200).default(""),
  location: z.string().max(200).default(""),
  start: z.string().max(40).default(""),
  end: z.string().max(40).default(""),
  bullets: z.array(z.string().max(600)).max(30).default([]),
});
export const educationSchema = z.object({
  id: z.string(),
  school: z.string().max(200).default(""),
  degree: z.string().max(200).default(""),
  field: z.string().max(200).default(""),
  end: z.string().max(40).default(""),
  details: z.string().max(600).default(""),
});
export const projectSchema = z.object({ id: z.string(), name: z.string().max(200).default(""), description: z.string().max(800).default("") });

export const resumeDataSchema = z.object({
  contact: z.object({
    name: z.string().max(120).default(""),
    email: z.string().max(200).default(""),
    phone: z.string().max(60).default(""),
    location: z.string().max(160).default(""),
    links: z.array(z.string().max(300)).max(6).default([]),
  }),
  summary: z.string().max(2000).default(""),
  experience: z.array(experienceSchema).max(30).default([]),
  education: z.array(educationSchema).max(15).default([]),
  skills: z.array(z.string().max(80)).max(100).default([]),
  certifications: z.array(z.string().max(200)).max(30).default([]),
  projects: z.array(projectSchema).max(20).default([]),
});
export type ResumeData = z.infer<typeof resumeDataSchema>;
export type Experience = z.infer<typeof experienceSchema>;

export type SuggestionKind = "summary" | "bullet" | "skill";
export type Suggestion = {
  id: string;
  kind: SuggestionKind;
  /** for bullets: `${expId}:${bulletIndex}`; summary: "summary"; skill: "skills" */
  target: string;
  before: string;
  after: string;
  rationale: string;
  source: "ai" | "rules";
  status: "pending" | "accepted" | "rejected";
};

export type KeywordAnalysis = {
  jobKeywords: string[];
  matched: string[];
  missing: string[];
  requirements: { text: string; status: "evidenced" | "not-found"; evidence?: string }[];
  coverage: { matched: number; total: number };
  notes: string[];
};

export const emptyResume = (): ResumeData => resumeDataSchema.parse({ contact: {} });
