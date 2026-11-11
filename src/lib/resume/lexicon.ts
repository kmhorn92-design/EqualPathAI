/**
 * Cross-industry skill/keyword lexicon used for transparent, explainable keyword matching.
 * Matching is literal & case-insensitive with aliases — no hidden weights, no "ATS score".
 */
export const LEXICON: Record<string, string[]> = {
  // technology
  "JavaScript": ["javascript", "js"], "TypeScript": ["typescript"], "Python": ["python"], "Java": ["java"], "C#": ["c#", "csharp"], "C++": ["c++"],
  "Go": ["golang"], "SQL": ["sql"], "PostgreSQL": ["postgresql", "postgres"], "MySQL": ["mysql"], "NoSQL": ["nosql", "mongodb"],
  "React": ["react", "react.js", "reactjs"], "Next.js": ["next.js", "nextjs"], "Node.js": ["node.js", "nodejs", "node"], "HTML": ["html", "html5"], "CSS": ["css", "css3", "tailwind"],
  "REST APIs": ["rest api", "rest apis", "restful"], "GraphQL": ["graphql"], "AWS": ["aws", "amazon web services"], "Azure": ["azure"], "GCP": ["gcp", "google cloud"],
  "Docker": ["docker"], "Kubernetes": ["kubernetes", "k8s"], "CI/CD": ["ci/cd", "continuous integration"], "Git": ["git", "github", "gitlab"], "Linux": ["linux"],
  "Machine Learning": ["machine learning", "ml"], "Data Analysis": ["data analysis", "data analytics", "analyze data"], "Excel": ["excel", "spreadsheets"],
  "Tableau": ["tableau"], "Power BI": ["power bi"], "Agile": ["agile", "scrum", "kanban"], "Jira": ["jira"], "Cybersecurity": ["cybersecurity", "information security", "infosec"],
  "Technical Support": ["technical support", "help desk", "helpdesk", "it support"], "Networking": ["networking", "tcp/ip", "lan"], "Testing": ["testing", "qa", "quality assurance", "unit tests"],
  "Figma": ["figma"], "Adobe Creative Suite": ["adobe creative suite", "photoshop", "illustrator", "indesign"], "UX Design": ["ux", "user experience", "ux design"], "UI Design": ["ui design", "user interface"],
  // healthcare
  "Patient Care": ["patient care"], "EHR/EMR": ["ehr", "emr", "electronic health records", "epic", "cerner"], "HIPAA": ["hipaa"], "Medical Terminology": ["medical terminology"],
  "CPR": ["cpr", "bls", "basic life support"], "Phlebotomy": ["phlebotomy"], "Vital Signs": ["vital signs", "vitals"], "Medical Billing": ["medical billing", "medical coding", "icd-10", "cpt"],
  "Scheduling": ["scheduling", "appointment setting", "calendar management"], "Infection Control": ["infection control"],
  // customer service / admin
  "Customer Service": ["customer service", "customer support", "client service"], "Conflict Resolution": ["conflict resolution", "de-escalation", "de-escalate"],
  "CRM": ["crm", "salesforce", "hubspot", "zendesk"], "Call Center": ["call center", "contact center"], "Data Entry": ["data entry"], "Microsoft Office": ["microsoft office", "ms office", "word", "outlook", "powerpoint"],
  "Google Workspace": ["google workspace", "g suite", "google docs", "google sheets"], "Bilingual": ["bilingual", "spanish", "multilingual"], "Record Keeping": ["record keeping", "recordkeeping", "filing"],
  "Office Administration": ["office administration", "administrative support", "office management"], "Typing": ["typing", "wpm"],
  // finance
  "Accounting": ["accounting", "bookkeeping"], "Accounts Payable": ["accounts payable", "a/p"], "Accounts Receivable": ["accounts receivable", "a/r"], "QuickBooks": ["quickbooks"],
  "Financial Analysis": ["financial analysis", "financial modeling", "forecasting"], "Budgeting": ["budgeting", "budget management", "budgets"], "Reconciliation": ["reconciliation", "reconcile"],
  "Auditing": ["auditing", "audit"], "Compliance": ["compliance", "regulatory"], "Cash Handling": ["cash handling", "cash register", "pos"],
  // education
  "Lesson Planning": ["lesson planning", "lesson plans", "curriculum"], "Classroom Management": ["classroom management"], "Tutoring": ["tutoring", "tutor"], "Instructional Design": ["instructional design"],
  "Special Education": ["special education", "iep"], "Assessment": ["student assessment", "grading"],
  // logistics
  "Inventory Management": ["inventory management", "inventory control", "inventory"], "Supply Chain": ["supply chain"], "Forklift": ["forklift"], "Shipping & Receiving": ["shipping", "receiving"],
  "Warehouse Operations": ["warehouse", "fulfillment"], "Logistics": ["logistics"], "CDL": ["cdl", "commercial driver"], "OSHA": ["osha", "workplace safety", "safety protocols"],
  // hospitality
  "Food Safety": ["food safety", "servsafe", "food handler"], "Guest Relations": ["guest relations", "guest services", "hospitality"], "Reservations": ["reservations", "booking"], "Event Planning": ["event planning", "events"],
  // government / general
  "Public Administration": ["public administration", "public sector"], "Grant Writing": ["grant writing", "grants"], "Policy Analysis": ["policy analysis"], "Security Clearance": ["security clearance", "clearance"],
  "Project Management": ["project management", "pmp", "project manager"], "Communication": ["communication skills", "written communication", "verbal communication", "communication"],
  "Leadership": ["leadership", "team lead", "supervised", "supervisor"], "Training": ["training", "onboarding", "mentoring"], "Problem Solving": ["problem solving", "problem-solving", "troubleshooting"],
  "Time Management": ["time management", "prioritization", "multitasking"], "Teamwork": ["teamwork", "collaboration", "cross-functional"], "Sales": ["sales", "upselling", "quota"],
  "Marketing": ["marketing", "social media", "seo", "content marketing"], "Writing": ["writing", "copywriting", "editing", "content creation"], "Research": ["research"],
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rx = new Map<string, RegExp>();
function aliasRegex(alias: string) {
  let r = rx.get(alias);
  if (!r) { r = new RegExp(`(^|[^a-z0-9+#])${esc(alias.toLowerCase())}($|[^a-z0-9+#])`, "i"); rx.set(alias, r); }
  return r;
}

/** Returns canonical keywords literally present in text. */
export function findKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  for (const [canon, aliases] of Object.entries(LEXICON)) {
    if ([canon.toLowerCase(), ...aliases].some((a) => aliasRegex(a).test(lower))) out.push(canon);
  }
  return out;
}

export function hasKeyword(text: string, canon: string) {
  const aliases = LEXICON[canon] ?? [];
  return [canon.toLowerCase(), ...aliases].some((a) => aliasRegex(a).test(text.toLowerCase()));
}
