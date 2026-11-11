import type { ResumeData } from "@/lib/resume/types";
/** DEMO sample data used only to preview templates. Fictional person. */
export const SAMPLE_RESUME: ResumeData = {
  contact: { name: "Alex Morgan (DEMO)", email: "alex.demo@example.com", phone: "(555) 010-0000", location: "Columbus, OH", links: ["linkedin.com/in/demo"] },
  summary: "DEMO — Replace with your own background, strengths, and the kind of role you're seeking.",
  experience: [
    { id: "d1", title: "Team Member", company: "Example Company", location: "Columbus, OH", start: "2022", end: "Present", bullets: ["Assisted customers with orders and questions in a fast-paced setting", "Trained 3 new team members on opening procedures", "Maintained accurate inventory counts using a handheld scanner"] },
    { id: "d2", title: "Volunteer Coordinator", company: "Community Food Pantry", location: "Columbus, OH", start: "2020", end: "2022", bullets: ["Scheduled weekly volunteer shifts using Google Sheets", "Communicated with donors by email and phone"] },
  ],
  education: [{ id: "e1", school: "Example Community College", degree: "Certificate", field: "Business Office Technology", end: "2023", details: "" }],
  skills: ["Customer Service", "Scheduling", "Google Workspace", "Microsoft Office", "Inventory"],
  certifications: ["ServSafe Food Handler (example)"],
  projects: [],
};
