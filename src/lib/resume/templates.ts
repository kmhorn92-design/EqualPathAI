/** ATS-friendly templates: single column, standard headings, no tables/columns/graphics in exports. */
export type Template = {
  id: string; name: string; industry: string; font: "Helvetica" | "Times" | "Calibri" | "Georgia";
  accent: string; headingCase: "upper" | "title"; sectionOrder: ("summary" | "experience" | "education" | "skills" | "certifications" | "projects")[];
  guidance: string[]; sampleSummary: string;
};

const base = ["summary", "experience", "skills", "education", "certifications", "projects"] as Template["sectionOrder"];
const edu1 = ["summary", "education", "skills", "projects", "experience", "certifications"] as Template["sectionOrder"];

export const TEMPLATES: Template[] = [
  { id: "classic", name: "Classic Professional", industry: "General", font: "Calibri", accent: "#1f2937", headingCase: "upper", sectionOrder: base,
    guidance: ["Lead each bullet with an action verb.", "Keep to 1 page for <10 years experience, 2 pages max otherwise.", "Use standard section headings so parsers can find them."],
    sampleSummary: "Reliable professional with experience in … (replace with your own background)." },
  { id: "healthcare", name: "Clinical Care", industry: "Healthcare", font: "Calibri", accent: "#0e7490", headingCase: "upper", sectionOrder: ["summary", "certifications", "experience", "skills", "education", "projects"],
    guidance: ["List active licenses and certifications (e.g. BLS) near the top with expiration dates.", "Name the EHR systems you have actually used.", "Mention patient volume or unit type only if accurate."],
    sampleSummary: "Patient-focused care professional … (your specialties, settings, and certifications)." },
  { id: "technology", name: "Tech Builder", industry: "Technology", font: "Helvetica", accent: "#6d28d9", headingCase: "upper", sectionOrder: ["summary", "skills", "experience", "projects", "education", "certifications"],
    guidance: ["Group skills by category (Languages, Frameworks, Tools) in plain text.", "Link to GitHub/portfolio in the header as plain URLs.", "Describe what you built, the tools used, and the result."],
    sampleSummary: "Developer experienced with … (your languages, frameworks, and what you've built)." },
  { id: "customer-service", name: "Service Star", industry: "Customer Service", font: "Calibri", accent: "#0369a1", headingCase: "title", sectionOrder: base,
    guidance: ["Highlight de-escalation, CRM tools, and languages spoken.", "Include customer satisfaction metrics only if you have them.", "Note shift flexibility in your summary if relevant."],
    sampleSummary: "Customer-first professional skilled in … (channels, tools, strengths)." },
  { id: "administration", name: "Office Pro", industry: "Administration", font: "Calibri", accent: "#334155", headingCase: "upper", sectionOrder: base,
    guidance: ["List software (Microsoft Office, Google Workspace, scheduling tools).", "Show organization: calendars managed, records maintained.", "Include typing speed only if recently tested."],
    sampleSummary: "Organized administrative professional … (systems, responsibilities)." },
  { id: "finance", name: "Ledger", industry: "Finance", font: "Times", accent: "#14532d", headingCase: "upper", sectionOrder: base,
    guidance: ["Name the accounting systems you use (QuickBooks, SAP, Excel).", "Quantify volume (e.g. invoices per month) only with real figures.", "Place licenses (CPA, Series 7) in Certifications."],
    sampleSummary: "Detail-oriented finance professional … (functions, systems)." },
  { id: "education", name: "Educator", industry: "Education", font: "Georgia", accent: "#9a3412", headingCase: "title", sectionOrder: ["summary", "certifications", "experience", "education", "skills", "projects"],
    guidance: ["Lead with teaching licenses/certifications.", "Mention grade levels and subjects.", "Describe instructional strategies you actually used."],
    sampleSummary: "Educator dedicated to … (grade levels, subjects, approaches)." },
  { id: "logistics", name: "Supply Line", industry: "Logistics", font: "Helvetica", accent: "#854d0e", headingCase: "upper", sectionOrder: ["summary", "certifications", "experience", "skills", "education", "projects"],
    guidance: ["List equipment certifications (forklift, CDL class).", "Mention safety record only if documented.", "Name the warehouse/inventory systems used."],
    sampleSummary: "Safety-minded logistics professional … (equipment, systems, environments)." },
  { id: "creative", name: "Clean Creative", industry: "Creative", font: "Helvetica", accent: "#be185d", headingCase: "title", sectionOrder: ["summary", "skills", "projects", "experience", "education", "certifications"],
    guidance: ["Keep the ATS version plain; put visual flair in your portfolio, not your resume.", "Link your portfolio as a plain URL.", "Name tools (Figma, Adobe) in Skills."],
    sampleSummary: "Designer and storyteller … (mediums, tools, portfolio link)." },
  { id: "hospitality", name: "Guest First", industry: "Hospitality", font: "Calibri", accent: "#b45309", headingCase: "title", sectionOrder: base,
    guidance: ["Include food safety certifications (e.g. ServSafe) if held.", "Mention POS and reservation systems used.", "Highlight teamwork in fast-paced settings with concrete examples."],
    sampleSummary: "Hospitality professional … (venues, roles, certifications)." },
  { id: "government", name: "Public Service", industry: "Government", font: "Times", accent: "#1e3a8a", headingCase: "upper", sectionOrder: base,
    guidance: ["Federal resumes (USAJOBS) are often longer and need hours/week, salary, and supervisor info for each role — check the posting.", "Mirror the announcement's specialized-experience language truthfully.", "List clearance level only if currently held."],
    sampleSummary: "Public-sector professional … (agencies, programs, clearance if held)." },
  { id: "entry-level", name: "First Step", industry: "Entry-Level", font: "Calibri", accent: "#7c3aed", headingCase: "upper", sectionOrder: edu1,
    guidance: ["Put Education and Projects first if work history is short.", "Volunteer work, class projects, and caregiving can show real skills.", "One page is plenty."],
    sampleSummary: "Motivated student/early-career candidate … (studies, projects, interests)." },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
