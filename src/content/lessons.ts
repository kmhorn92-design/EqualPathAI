export type Quiz = { q: string; options: string[]; answer: number; why: string };
export type Lesson = {
  id: string; title: string; track: string; minutes: number; summary: string;
  sections: { h: string; body: string[]; bullets?: string[] }[];
  quiz: Quiz[];
  sources: { label: string; url: string }[];
};

export const LESSONS: Lesson[] = [
  {
    id: "ai-literacy-101", title: "AI Literacy: What AI Can and Can't Do", track: "AI literacy", minutes: 8,
    summary: "A plain-language tour of how today's AI tools work, where they shine, and where they fail.",
    sections: [
      { h: "What a language model actually does", body: ["Tools like chat assistants are trained on large amounts of text. They predict likely next words, which lets them draft, summarize, and explain. They don't 'know' facts the way a database does."] },
      { h: "Where AI helps job seekers", body: ["AI is good at rephrasing, organizing information, brainstorming interview questions, and explaining unfamiliar terms."], bullets: ["Turning a rough bullet into a clear one", "Summarizing a long job posting", "Practicing interview answers"] },
      { h: "Where AI goes wrong", body: ["AI can state wrong information confidently (sometimes called 'hallucination'). It can reflect biases in its training data. Always check facts, dates, salaries, and legal claims against a trusted source."] },
      { h: "Your rule of thumb", body: ["Use AI as a drafting partner, not an authority. You are responsible for what goes on your resume, so keep it true."] },
    ],
    quiz: [
      { q: "An AI tool tells you the average salary for a role. What should you do?", options: ["Use it as-is", "Verify it with a source like BLS or O*NET", "Add 20% to be safe"], answer: 1, why: "AI can be out of date or wrong. Official sources like the BLS Occupational Outlook Handbook publish verifiable data." },
      { q: "Which task is AI generally good at?", options: ["Guaranteeing an interview", "Rephrasing a bullet more clearly", "Knowing your exact past job duties"], answer: 1, why: "AI is strong at language tasks like rephrasing. It can't know facts about your life you haven't told it." },
      { q: "'Hallucination' in AI means…", options: ["The AI is creative", "The AI states false information as if it were true", "The AI is slow"], answer: 1, why: "Models can generate fluent but false statements, so always check important facts." },
    ],
    sources: [
      { label: "NIST AI Risk Management Framework", url: "https://www.nist.gov/itl/ai-risk-management-framework" },
      { label: "White House OSTP — Blueprint for an AI Bill of Rights (archived)", url: "https://bidenwhitehouse.archives.gov/ostp/ai-bill-of-rights/" },
    ],
  },
  {
    id: "ats-myths-facts", title: "ATS Myths & Facts", track: "Hiring technology", minutes: 7,
    summary: "What applicant tracking systems really do, and the myths that cause unnecessary stress.",
    sections: [
      { h: "What an ATS is", body: ["An applicant tracking system (ATS) is software employers use to collect applications, organize candidates, and manage hiring steps. Popular systems include Workday, Greenhouse, iCIMS, and Lever, and each one is configured differently by each employer."] },
      { h: "Myth: '75% of resumes are rejected by robots'", body: ["You'll see this number a lot, but no reliable research supports it. Many systems don't auto-reject anyone. Recruiters search, filter, and read. Some employers do use knockout questions (e.g., 'Are you authorized to work in the US?') or filters, so answer those carefully."] },
      { h: "Fact: Clear formatting helps", body: ["Software extracts text in reading order. Complex tables, text boxes, columns, and images can scramble that order."], bullets: ["Use standard headings: Experience, Education, Skills", "Use a single column", "Save as DOCX or a text-based PDF unless the posting says otherwise"] },
      { h: "Fact: Relevant, truthful keywords help humans and software", body: ["When your resume uses the same words the posting uses for skills you really have, a recruiter searching for 'medical billing' can find you. Hiding white text or stuffing keywords is easy to detect and can disqualify you."] },
    ],
    quiz: [
      { q: "Do all ATS platforms work the same way?", options: ["Yes", "No, each employer configures them differently", "Only for large companies"], answer: 1, why: "Configuration, filters, and workflows vary by employer, so no tool can promise a universal 'pass'." },
      { q: "Which formatting choice is safest for parsing?", options: ["Two-column layout with icons", "Single column with standard headings", "Resume as an image"], answer: 1, why: "A single column with standard headings keeps the reading order predictable." },
      { q: "Is pasting hidden keywords in white text a good idea?", options: ["Yes, it beats the ATS", "No, it's deceptive and recruiters see it", "Only for tech jobs"], answer: 1, why: "Hidden text shows up in the parsed text recruiters see, and it damages trust." },
    ],
    sources: [
      { label: "Harvard Business School — Hidden Workers: Untapped Talent (2021)", url: "https://www.hbs.edu/managing-the-future-of-work/research/Pages/hidden-workers-untapped-talent.aspx" },
      { label: "CareerOneStop — Resume Guide", url: "https://www.careeronestop.org/JobSearch/Resumes/resumes-and-applications.aspx" },
    ],
  },
  {
    id: "algorithmic-bias", title: "Algorithmic Bias in Hiring", track: "Fairness", minutes: 9,
    summary: "How automated tools can reproduce discrimination, and what laws and regulators say.",
    sections: [
      { h: "How bias gets in", body: ["If a hiring model learns from past decisions, it can learn past patterns too, including unfair ones. A well-known example: reporters found in 2018 that an experimental resume-screening tool had learned to downrank resumes mentioning women's organizations, and the project was scrapped."] },
      { h: "Proxies", body: ["Even without asking about race or gender, a system can rely on stand-ins (proxies) like zip codes, names, school names, or employment gaps. Those stand-ins can link to protected characteristics."] },
      { h: "What the law says", body: ["Federal anti-discrimination laws such as Title VII, the ADA, and the ADEA apply no matter whether a decision is made by a person or software. The ADA also gives you the right to ask for reasonable accommodations on assessments.", "The EEOC used to publish technical-assistance documents explaining how these laws apply to AI, but it removed them from its website in January 2025. That guidance never created the obligations; the laws themselves still apply. Some states and cities have their own AI-specific rules. For example, New York City's Local Law 144 requires bias audits for certain automated employment decision tools."] },
      { h: "What you can do", body: ["You can ask an employer whether AI is used in its process and how to request an accommodation. Keep records of your applications. If you believe you were treated unfairly, the Fair Hiring Center lists official channels."] },
    ],
    quiz: [
      { q: "Can a hiring algorithm discriminate without ever seeing race?", options: ["No", "Yes, through proxies like zip code", "Only if programmed to"], answer: 1, why: "Correlated variables can recreate patterns tied to protected characteristics." },
      { q: "Do anti-discrimination laws apply to AI hiring tools?", options: ["No, only to humans", "Yes, employers are still responsible", "Only in New York"], answer: 1, why: "Employers remain responsible under federal law regardless of the tools they use." },
      { q: "If an online assessment isn't accessible to you, you can…", options: ["Do nothing", "Request a reasonable accommodation", "Have someone else take it"], answer: 1, why: "The ADA lets you request reasonable accommodations. Having someone else take it would be cheating." },
    ],
    sources: [
      { label: "EEOC — Disability Discrimination and Reasonable Accommodation", url: "https://www.eeoc.gov/disability-discrimination" },
      { label: "PEAT (DOL-funded) — AI & Inclusive Hiring Framework", url: "https://www.peatworks.org/ai-inclusive-hiring-framework/" },
      { label: "NYC DCWP — Automated Employment Decision Tools", url: "https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page" },
      { label: "NIST SP 1270 — Towards a Standard for Identifying and Managing Bias in AI", url: "https://www.nist.gov/publications/towards-standard-identifying-and-managing-bias-artificial-intelligence" },
    ],
  },
  {
    id: "job-search-safety", title: "Job Search Safety: Spotting Scams", track: "Safety", minutes: 6,
    summary: "Recognize fake job offers and protect your identity and money.",
    sections: [
      { h: "Common red flags", body: ["Scammers target job seekers with offers that seem too easy."], bullets: ["You're 'hired' without an interview", "You're asked to pay for training, equipment, or a background check", "You're sent a check and told to buy gift cards or wire money back", "Communication only by text or chat app, from a personal email domain", "Requests for your SSN or bank info before a real offer"] },
      { h: "Verify before you share", body: ["Find the job on the company's own careers site. Look up the recruiter on the company website. Never pay to get a job."] },
      { h: "If you've been targeted", body: ["Report it to the FTC at ReportFraud.ftc.gov. If you shared your identity, visit IdentityTheft.gov for a recovery plan."] },
    ],
    quiz: [
      { q: "A 'recruiter' sends a check and asks you to buy equipment with gift cards. This is…", options: ["Normal onboarding", "A common scam", "A signing bonus"], answer: 1, why: "Fake-check and gift-card requests are classic scams flagged by the FTC." },
      { q: "Best way to verify a job is real?", options: ["Trust the text message", "Find it on the employer's official careers site", "Ask the recruiter if it's real"], answer: 1, why: "Independent verification through official sites is the most reliable check." },
      { q: "Where do you report job scams in the US?", options: ["ReportFraud.ftc.gov", "Social media", "Nowhere"], answer: 0, why: "The FTC collects fraud reports and uses them to pursue scammers." },
    ],
    sources: [
      { label: "FTC — Job Scams", url: "https://consumer.ftc.gov/articles/job-scams" },
      { label: "IdentityTheft.gov", url: "https://www.identitytheft.gov/" },
    ],
  },
  {
    id: "digital-inclusion", title: "Digital Inclusion & Free Resources", track: "Access", minutes: 6,
    summary: "Where to get free internet, devices, and digital-skills help.",
    sections: [
      { h: "Free and low-cost access", body: ["Public libraries offer free computers, Wi-Fi, printing, and often one-on-one help. American Job Centers (find one through CareerOneStop) offer free job-search support, workshops, and sometimes training funds."] },
      { h: "Building digital skills", body: ["Free courses on email, documents, video interviews, and online safety are available through libraries and nonprofit programs like DigitalLearn.org."] },
      { h: "Mobile-first job search", body: ["You can do a lot from a phone, but keep a version of your resume as a DOCX or PDF in cloud storage so you can attach it from any device. EqualPath AI works on mobile, too."] },
    ],
    quiz: [
      { q: "Where can you find free job-search help and workshops?", options: ["American Job Centers", "Only paid coaches", "Nowhere"], answer: 0, why: "American Job Centers are publicly funded and free to use." },
      { q: "A good habit for mobile job seekers?", options: ["Only keep your resume in a photo", "Keep a DOCX/PDF in cloud storage", "Retype it every time"], answer: 1, why: "A stored file can be attached from any device quickly." },
      { q: "Public libraries commonly provide…", options: ["Free computers & Wi-Fi", "Guaranteed jobs", "Paid internet only"], answer: 0, why: "Libraries are a key digital-inclusion resource." },
    ],
    sources: [
      { label: "CareerOneStop — Find an American Job Center", url: "https://www.careeronestop.org/LocalHelp/AmericanJobCenters/find-american-job-centers.aspx" },
      { label: "DigitalLearn.org (Public Library Association)", url: "https://www.digitallearn.org/" },
    ],
  },
  {
    id: "workforce-readiness", title: "Workforce Readiness: Transferable Skills", track: "Career growth", minutes: 7,
    summary: "Recognize the valuable skills you already have from jobs, school, caregiving and volunteering.",
    sections: [
      { h: "What transfers", body: ["Many skills show up across industries: communication, scheduling, handling money, de-escalating conflict, training others, and learning new software."] },
      { h: "Translate, don't inflate", body: ["Restaurant server → 'Served 40+ guests per shift, handled payments, and resolved complaints.' Describe what you actually did. Use real numbers only if you know them."] },
      { h: "Use O*NET to find matches", body: ["O*NET OnLine lists the tasks and skills for hundreds of occupations. Comparing your current role to a target role shows where skills overlap and where you might need training."] },
    ],
    quiz: [
      { q: "Caregiving experience can demonstrate…", options: ["Nothing professional", "Scheduling, coordination, and patience", "Only medical licensure"], answer: 1, why: "Caregiving involves real, transferable skills. Describe them accurately." },
      { q: "When adding numbers to a bullet, you should…", options: ["Estimate high", "Use only figures you know are accurate", "Copy numbers from the job post"], answer: 1, why: "Inaccurate figures can be checked and can cost you an offer." },
      { q: "O*NET is useful for…", options: ["Comparing skills across occupations", "Applying to jobs", "Credit scores"], answer: 0, why: "O*NET describes the tasks, skills, and outlook for occupations." },
    ],
    sources: [
      { label: "O*NET OnLine", url: "https://www.onetonline.org/" },
      { label: "My Next Move (O*NET career exploration)", url: "https://www.mynextmove.org/" },
    ],
  },
  {
    id: "ai-productivity", title: "AI Productivity at Work", track: "AI literacy", minutes: 7,
    summary: "Use AI tools responsibly to work faster, and know your employer's rules.",
    sections: [
      { h: "Good uses", body: ["Drafting emails, summarizing notes, brainstorming, outlining documents, and explaining spreadsheet formulas."] },
      { h: "Protect sensitive info", body: ["Don't paste confidential customer, patient, or company data into public AI tools unless your employer allows it. Healthcare workers should remember HIPAA."] },
      { h: "Prompting basics", body: ["Be specific: say who the audience is, what format you want, and include examples. Then review the output critically before you use it."] },
    ],
    quiz: [
      { q: "Pasting patient records into a public chatbot is…", options: ["Fine if quick", "Likely a privacy violation", "Required by HIPAA"], answer: 1, why: "Protected health information must stay in approved systems." },
      { q: "A better prompt includes…", options: ["Audience, format, and examples", "As few words as possible", "Only the word 'help'"], answer: 0, why: "Context leads to more useful output." },
      { q: "After AI drafts something you should…", options: ["Send it immediately", "Review and edit it", "Delete it"], answer: 1, why: "You remain responsible for accuracy and tone." },
    ],
    sources: [
      { label: "HHS — HIPAA for Professionals", url: "https://www.hhs.gov/hipaa/for-professionals/index.html" },
      { label: "NIST AI Risk Management Framework", url: "https://www.nist.gov/itl/ai-risk-management-framework" },
    ],
  },
];

export const getLesson = (id: string) => LESSONS.find((l) => l.id === id);
