import { emptyResume, type ResumeData } from "./types";
import { findKeywords } from "./lexicon";

const SECTION_PATTERNS: [keyof typeof SECTIONS, RegExp][] = [
  ["summary", /^(professional\s+)?(summary|profile|objective|about( me)?)$/i],
  ["experience", /^(professional\s+|work\s+|relevant\s+)?(experience|employment( history)?|work history|career history)$/i],
  ["education", /^(education|academic background|education & training|education and training)$/i],
  ["skills", /^(technical\s+|core\s+|key\s+)?(skills|competencies|core competencies|skills & abilities|qualifications)$/i],
  ["certifications", /^(certifications?|licenses?( (&|and) certifications)?|credentials)$/i],
  ["projects", /^(projects|selected projects|volunteer( experience)?)$/i],
];
const SECTIONS = { header: 0, summary: 0, experience: 0, education: 0, skills: 0, certifications: 0, projects: 0 };

const DATE = /((jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(19|20)\d{2}|present|current/i;
const RANGE = new RegExp(`(${DATE.source})\\s*(-|–|—|to)\\s*(${DATE.source})`, "i");
const BULLET = /^\s*([•●▪◦*\-–]|\d+[.)])\s+/;

let n = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}${(n++).toString(36)}`;

/**
 * Heuristic, deterministic parser. Only text that exists in the source document is placed
 * into fields — nothing is generated. Users review & edit every field afterwards.
 */
export function structureText(raw: string): ResumeData {
  const r = emptyResume();
  const lines = raw.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const buckets: Record<keyof typeof SECTIONS, string[]> = { header: [], summary: [], experience: [], education: [], skills: [], certifications: [], projects: [] };
  let cur: keyof typeof SECTIONS = "header";
  for (const line of lines) {
    const clean = line.replace(/[:|]+$/, "").trim();
    const hit = clean.length < 40 ? SECTION_PATTERNS.find(([, p]) => p.test(clean)) : undefined;
    if (hit) { cur = hit[0]; continue; }
    buckets[cur].push(line);
  }

  // contact
  const all = lines.join("\n");
  r.contact.email = all.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? "";
  r.contact.phone = all.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0] ?? "";
  r.contact.links = Array.from(new Set(all.match(/(https?:\/\/[^\s|,]+|linkedin\.com\/[^\s|,]+|github\.com\/[^\s|,]+)/gi) ?? [])).slice(0, 4);
  const nameLine = buckets.header.find((l) => !/@|\d{3}|http|linkedin/i.test(l) && l.split(" ").length <= 5);
  r.contact.name = nameLine ?? "";
  const locLine = buckets.header.map((l) => l.split(/[|•·]/)).flat().map((s) => s.trim())
    .find((s) => /^[A-Za-z .'-]+,\s*[A-Z]{2}(\s+\d{5})?$/.test(s));
  r.contact.location = locLine ?? "";
  if (!buckets.summary.length) {
    const extra = buckets.header.filter((l) => l !== nameLine && l.length > 80);
    r.summary = extra.join(" ");
  } else r.summary = buckets.summary.join(" ");

  // experience: a line containing a date range starts/annotates a role
  let job: ResumeData["experience"][number] | null = null;
  let pendingHeader: string[] = [];
  for (const line of buckets.experience) {
    const range = line.match(RANGE);
    if (range) {
      const [start, end] = range[0].split(/\s*(?:-|–|—|\bto\b)\s*/i).map((x) => x.trim());
      job = { id: uid("exp"), title: "", company: "", location: "", start: start ?? "", end: end ?? "", bullets: [] };
      const rest = line.replace(range[0], "").replace(/[|,–—-]\s*$/, "").trim();
      const head = [...pendingHeader, rest].filter(Boolean);
      const parts = head.join(" | ").split(/\s+[|@•·]\s+|\s+at\s+|,\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
      job.title = parts[0] ?? "";
      job.company = parts[1] ?? "";
      job.location = parts.slice(2).join(", ");
      r.experience.push(job);
      pendingHeader = [];
    } else if (BULLET.test(line) && job) {
      job.bullets.push(line.replace(BULLET, "").trim());
    } else if (job && job.bullets.length && /^[a-z]/.test(line)) {
      job.bullets[job.bullets.length - 1] += " " + line; // wrapped bullet
    } else if (job && !job.bullets.length && !job.company && !BULLET.test(line) && line.length < 90 && (/\s[|·•–—-]\s/.test(line) || !/^[A-Za-z .'-]+,\s*[A-Z]{2}$/.test(line))) {
      // "Title    dates" followed by "Company · City, ST" (the layout our own exports use)
      const parts = line.split(/\s+[|·•–—-]\s+/).map((x) => x.trim()).filter(Boolean);
      job.company = parts[0] ?? "";
      if (!job.location) job.location = parts.slice(1).join(", ");
    } else if (job && !job.bullets.length && !job.location && /^[A-Za-z .'-]+,\s*[A-Z]{2}$/.test(line)) {
      job.location = line;
    } else if (job && line.length > 45 && !/[|@]/.test(line)) {
      job.bullets.push(line); // sentence-like line without a bullet glyph
    } else {
      pendingHeader.push(line);
      if (pendingHeader.length > 2) {
        if (job) job.bullets.push(pendingHeader.shift()!);
        else pendingHeader.shift();
      }
    }
  }
  if (job && pendingHeader.length) job.bullets.push(...pendingHeader);

  // education
  let ed: ResumeData["education"][number] | null = null;
  const SCHOOL = /(university|college|institute|school|academy)/i;
  const DEGREE = /(bachelor|master|associate|b\.?s\.?\b|b\.?a\.?\b|m\.?s\.?\b|ph\.?d|diploma|certificate|ged)/i;
  for (const line of buckets.education) {
    const year = line.match(/(19|20)\d{2}/)?.[0] ?? "";
    const text = line.replace(BULLET, "").replace(/(19|20)\d{2}.*$/, "").replace(/[|,–-]\s*$/, "").trim();
    if (SCHOOL.test(line) && ed && !ed.school) { ed.school = text; if (!ed.end) ed.end = year; }
    else if (SCHOOL.test(line) || (!ed && !DEGREE.test(line))) { ed = { id: uid("edu"), school: text, degree: "", field: "", end: year, details: "" }; r.education.push(ed); }
    else if (DEGREE.test(line) && (!ed || ed.degree)) { ed = { id: uid("edu"), school: "", degree: text, field: "", end: year, details: "" }; r.education.push(ed); }
    else if (DEGREE.test(line) && ed && !ed.degree) { ed.degree = text; if (!ed.end) ed.end = year; }
    else if (ed) ed.details = [ed.details, line.replace(BULLET, "")].filter(Boolean).join("; ");
  }

  r.skills = Array.from(new Set(buckets.skills.join(", ").replace(BULLET, "").split(/[,;•|·]|\s{2,}/).map((s) => s.replace(BULLET, "").replace(/^[A-Za-z ]+:\s*/, "").trim()).filter((s) => s && s.length <= 60)));
  r.certifications = buckets.certifications.map((l) => l.replace(BULLET, "").trim());
  r.projects = groupProjects(buckets.projects);
  return r;
}

function groupProjects(lines: string[]) {
  const out: ResumeData["projects"] = [];
  for (const l of lines) {
    if (!BULLET.test(l) || !out.length) out.push({ id: uid("prj"), name: l.replace(BULLET, ""), description: "" });
    else out[out.length - 1].description = [out[out.length - 1].description, l.replace(BULLET, "")].filter(Boolean).join(" ");
  }
  return out;
}

/** Flattened text of a resume — used for keyword evidence & anti-fabrication checks. */
export function resumeCorpus(r: ResumeData): string {
  return [
    r.summary, ...r.skills, ...r.certifications,
    ...r.experience.flatMap((e) => [e.title, e.company, ...e.bullets]),
    ...r.education.flatMap((e) => [e.school, e.degree, e.field, e.details]),
    ...r.projects.flatMap((p) => [p.name, p.description]),
  ].join("\n");
}

export const detectedSkills = (r: ResumeData) => findKeywords(resumeCorpus(r));
