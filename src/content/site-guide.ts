/**
 * EqualPath help guide — the single source of truth for the site assistant.
 * The LLM is instructed to answer ONLY from these entries; without an LLM, answers are retrieved directly.
 */
export type GuideEntry = { id: string; q: string; a: string; keywords: string[]; link?: { href: string; label: string } };

export const SITE_GUIDE: GuideEntry[] = [
  { id: "what", q: "What is EqualPath AI?", keywords: ["what", "about", "equalpath", "platform", "do", "mission", "who"],
    a: "EqualPath AI is a free career platform that helps job seekers, especially those overlooked by automated hiring, write truthful ATS-readable resumes, find verified jobs, practice assessments, learn about AI in hiring, and meet career coaches and partner recruiters.", link: { href: "/", label: "Home" } },
  { id: "start", q: "How do I get started?", keywords: ["start", "begin", "first", "new", "sign", "signup", "account", "register", "join"],
    a: "Create a free account, answer three quick optional onboarding steps (goals, background, accessibility), then upload your resume in Resume Studio. You'll never be asked for demographic information.", link: { href: "/signup", label: "Create an account" } },
  { id: "upload", q: "How do I upload my resume?", keywords: ["upload", "resume", "file", "pdf", "docx", "txt", "import", "paste", "cv"],
    a: "Open Resume Studio and drag in a PDF, DOCX or TXT file (up to 5 MB), or paste the text. EqualPath extracts your contact info, experience, education and skills into fields you can review and edit.", link: { href: "/resume", label: "Resume Studio" } },
  { id: "tailor", q: "How do I tailor my resume to a job?", keywords: ["tailor", "job", "description", "compare", "keywords", "match", "customize", "posting"],
    a: "In Resume Studio, open the \"Tailor to a job\" tab and paste the job description. You'll see which keywords already appear in your resume (green), which don't (amber), a requirements check, and suggested rewrites you can accept, edit or reject one by one. Save the result as a new version.", link: { href: "/resume", label: "Resume Studio" } },
  { id: "ats", q: "Will my resume pass the ATS? Do you give an ATS score?", keywords: ["ats", "score", "pass", "applicant", "tracking", "robot", "guarantee", "beat"],
    a: "No tool can honestly guarantee that. Every employer configures its applicant tracking system differently, and people make the final decisions. EqualPath shows a literal keyword count (not a score) and helps you write a clear, single-column resume that software can read.", link: { href: "/learn/ats-myths-facts", label: "Lesson: ATS Myths & Facts" } },
  { id: "fabricate", q: "Will the AI make up experience for me?", keywords: ["fake", "fabricate", "lie", "exaggerate", "invent", "honest", "truthful", "numbers", "metrics"],
    a: "Never. A fabrication guard blocks any suggestion that adds numbers, skills or achievements that aren't already in your resume, and nothing changes until you approve it. If you have real results, add them yourself.", link: { href: "/resume", label: "Resume Studio" } },
  { id: "export", q: "How do I download my resume?", keywords: ["download", "export", "word", "docx", "pdf", "save", "print"],
    a: "In Resume Studio go to \"Preview & export\", pick one of 12 ATS-friendly templates, and download DOCX or PDF. You can also compare any version side by side with your original.", link: { href: "/templates", label: "ATS Templates" } },
  { id: "templates", q: "Which resume template should I use?", keywords: ["template", "format", "design", "layout", "style", "healthcare", "tech", "entry"],
    a: "All 12 templates are single-column with standard headings, so software can read them. Pick the one for your field (healthcare, technology, customer service, administration, finance, education, logistics, creative, hospitality, government or entry-level). Each includes content tips.", link: { href: "/templates", label: "ATS Templates" } },
  { id: "jobs", q: "Where do the jobs come from? Are they real?", keywords: ["jobs", "job", "board", "listings", "real", "source", "where", "verified", "indeed", "linkedin"],
    a: "Listings come only from authorized sources: employer career sites (Greenhouse, Lever), USAJOBS, licensed aggregators, and approved employer or staffing-agency feeds. Each shows its source, when it was last verified, and a direct employer application link. The board shows the real count and never fills gaps with fake jobs. Indeed and LinkedIn appear only through approved partner programs; until then you get plain search links.", link: { href: "/jobs", label: "Job Board" } },
  { id: "remote", q: "How do I find remote, hybrid or on-site jobs?", keywords: ["remote", "hybrid", "onsite", "on-site", "home", "office", "telework", "wfh", "arrangement", "location"],
    a: "On the Job Board, choose All jobs, Remote, Hybrid or On-site at the top. Then add filters for location, industry, experience, disclosed salary, company, job type and posting date. Career coaches can also help with each kind of search.", link: { href: "/jobs", label: "Job Board" } },
  { id: "match", q: "What does \"Why this matches\" mean?", keywords: ["why", "matches", "match", "fit", "chance", "probability", "likely"],
    a: "It compares the skills in a posting with your profile and resume, and tells you what overlaps and what's missing. It's not a prediction of whether you'll be hired; EqualPath never shows hiring probabilities.", link: { href: "/jobs", label: "Job Board" } },
  { id: "tracker", q: "How do I track my applications?", keywords: ["track", "tracker", "applications", "applied", "status", "kanban", "reminder", "follow"],
    a: "Use the Applications page. Add jobs manually or press \"Track\" on any listing, then drag cards between stages (Saved → Applied → Interviewing → Offer), keep private notes, link the resume version you used, and set reminders. Follow-up tips and email drafts appear for each stage.", link: { href: "/tracker", label: "Applications" } },
  { id: "coach-ai", q: "What can the AI Career Coach help with?", keywords: ["ai", "coach", "career", "roadmap", "cover", "letter", "salary", "networking", "advice"],
    a: "The AI Career Coach helps with career roadmaps, finding transferable skills, salary research (with official sources like BLS and O*NET), interview prep, STAR answer practice, cover letters and networking. It won't invent facts about you, and your chat history is encrypted.", link: { href: "/coach", label: "AI Career Coach" } },
  { id: "coaches", q: "How do I book a human career coach?", keywords: ["book", "human", "coach", "coaches", "session", "appointment", "meet", "schedule", "mentor"],
    a: "Go to Career Coaches, pick Remote, Hybrid or On-site to see coaches who focus on that kind of search, and press \"Book a session\". Choose a session type (intro calls are free), format and time (shown in your time zone), and share your goals. Track requests and meeting links in My Sessions.", link: { href: "/coaches", label: "Career Coaches" } },
  { id: "sessions", q: "Where are my coaching sessions?", keywords: ["my", "sessions", "confirmed", "meeting", "link", "join", "cancel", "calendar"],
    a: "My Sessions lists your requests and confirmed sessions with meeting links, coach notes, an \"Add to calendar\" file, and a Cancel button. You can cancel up to 2 hours before a confirmed session.", link: { href: "/sessions", label: "My Sessions" } },
  { id: "become-coach", q: "How do I become a coach on EqualPath?", keywords: ["become", "apply", "listing", "coach", "portal", "availability", "offer"],
    a: "Sign in, go to Career Coaches, and submit a listing. An admin reviews it and verifies credentials with the issuer. Meanwhile you can set your availability and focus areas in the Coach Portal.", link: { href: "/coaches", label: "Career Coaches" } },
  { id: "partners", q: "Who are your hiring partners? Can I talk to a recruiter?", keywords: ["partner", "partners", "company", "companies", "employer", "recruiter", "recruiters", "contact", "talk", "email", "phone", "collaboration"],
    a: "The Hiring Partners page lists companies working with EqualPath and their recruiters' names, emails and phone numbers. Recruiters have agreed to share these. Sign in to see contact details, use the message template to reach out, and see each partner's open jobs.", link: { href: "/partners", label: "Hiring Partners" } },
  { id: "assess", q: "How do I practice for job assessments?", keywords: ["practice", "assessment", "test", "numerical", "verbal", "situational", "typing", "technical", "quiz", "interview", "mock", "star"],
    a: "The Assessment Academy has original practice tests for numerical, verbal and situational judgment, customer service, technical screening, typing speed, and STAR mock interviews. Every answer comes with an explanation. Please don't use it during a live employer assessment.", link: { href: "/assessments", label: "Assessment Academy" } },
  { id: "learn", q: "What can I learn in the Learning Hub?", keywords: ["learn", "lesson", "lessons", "course", "ai", "literacy", "bias", "scam", "safety", "hub"],
    a: "Short interactive lessons with quizzes on AI literacy, ATS myths and facts, algorithmic bias in hiring, spotting job scams, digital inclusion and free resources, transferable skills, and using AI productively at work. Each links to its sources.", link: { href: "/learn", label: "Learning Hub" } },
  { id: "discrimination", q: "What if I think I was discriminated against?", keywords: ["discrimination", "discriminated", "rights", "eeoc", "unfair", "report", "legal", "lawyer", "bias"],
    a: "The Fair Hiring Center explains your rights and links to official channels like the EEOC and Department of Labor. Deadlines apply (often 180 or 300 days). EqualPath can't make legal determinations, so for advice on your situation contact those agencies or a lawyer.", link: { href: "/fair-hiring", label: "Fair Hiring Center" } },
  { id: "accommodation", q: "Can I get accessibility accommodations?", keywords: ["accessibility", "accommodation", "disability", "screen", "reader", "contrast", "motion", "text", "ada"],
    a: "Yes. In Settings you can turn on reduced motion, high contrast, larger text and extra screen-reader descriptions. For employer assessments you have the right to request a reasonable accommodation; the Fair Hiring Center explains how.", link: { href: "/settings", label: "Settings" } },
  { id: "privacy", q: "Is my data private? Do you train AI on my resume?", keywords: ["privacy", "private", "data", "secure", "security", "encrypt", "train", "training", "sell", "share"],
    a: "Resumes, versions, coaching chats, notes and session details are encrypted. Your resume is never used for AI training unless you opt in (off by default), and EqualPath doesn't sell your data. You control retention and can export or permanently delete everything in Settings.", link: { href: "/privacy", label: "Privacy" } },
  { id: "delete", q: "How do I delete my account or export my data?", keywords: ["delete", "remove", "account", "export", "download", "data", "close"],
    a: "Go to Settings. \"Export my data\" downloads everything as JSON; \"Delete everything\" permanently removes your account, resumes, files, sessions and history after you confirm your password.", link: { href: "/settings", label: "Settings" } },
  { id: "demographics", q: "Do you ask about race, gender or age?", keywords: ["race", "gender", "age", "demographic", "ethnicity", "religion", "name"],
    a: "No. EqualPath never asks for, infers, or stores protected characteristics, and it never uses your name to guess anything about you.", link: { href: "/privacy", label: "Privacy" } },
  { id: "cost", q: "How much does it cost?", keywords: ["cost", "price", "free", "pay", "pricing", "money", "subscription"],
    a: "Core tools are free: Resume Studio, the Job Board, the Learning Hub, the Fair Hiring Center and practice assessments. Coach intro calls are free; other coaching sessions may cost money and are arranged directly with the coach. EqualPath doesn't process payments.", link: { href: "/#pricing", label: "Pricing" } },
  { id: "scam", q: "How do I avoid job scams?", keywords: ["scam", "fraud", "fake", "check", "gift", "card", "money", "suspicious"],
    a: "Never pay to get a job, and be wary of offers without an interview, requests for gift cards or bank details, or messages only by text. Verify jobs on the employer's own site and report scams at ReportFraud.ftc.gov. The Learning Hub has a full lesson.", link: { href: "/learn/job-search-safety", label: "Lesson: Spotting Scams" } },
];

const STOP = new Set("a an the and or of to in on for with is are do does i my me you your how what where can it be will at this that from as by about if".split(" "));
const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((t) => t && !STOP.has(t));

/** Lightweight keyword retrieval used as the no-LLM fallback and to ground the LLM. */
export function searchGuide(query: string, k = 3): (GuideEntry & { score: number })[] {
  const qt = tokens(query);
  if (!qt.length) return [];
  return SITE_GUIDE.map((e) => {
    const kw = new Set(e.keywords), qset = new Set(tokens(e.q));
    let score = 0;
    for (const t of qt) { if (kw.has(t)) score += 3; else if (qset.has(t)) score += 2; else if ([...kw].some((x) => x.startsWith(t) || t.startsWith(x))) score += 1; }
    return { ...e, score };
  }).filter((e) => e.score >= 3).sort((a, b) => b.score - a.score).slice(0, k);
}

export const SUGGESTED_QUESTIONS = ["How do I upload my resume?", "How do I find remote jobs?", "Can I talk to a recruiter?", "Will my resume pass the ATS?", "How do I book a career coach?", "Is my data private?"];
