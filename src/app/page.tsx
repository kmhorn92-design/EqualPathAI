import Link from "next/link";
import { ArrowRight, ShieldCheck, FileSearch, Compass, Briefcase, GraduationCap, Scale, Check, Lock, Eye, HeartHandshake, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LoadingScreen } from "@/components/landing/LoadingScreen";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { getUser } from "@/lib/auth";

const FEATURES = [
  { icon: FileSearch, title: "AI Resume Studio", body: "Upload your resume, compare it to a job post, and see which keywords already appear in your experience. You approve every suggested change." },
  { icon: Briefcase, title: "Verified Daily Job Board", body: "Listings come only from authorized sources and link directly to the employer. Each one shows when it was last checked, and the count shown is the real count." },
  { icon: Compass, title: "AI Career Coach", body: "Build a career roadmap, find skills that transfer from your past work, practice STAR interview answers, and draft cover letters." },
  { icon: GraduationCap, title: "Assessment Academy", body: "Original practice questions for numerical, verbal, situational and technical screens, with typing drills and mock interviews." },
  { icon: Sparkles, title: "AI Learning Hub", body: "Short lessons on AI literacy, ATS myths, algorithmic bias and job-search safety, each linked to its research source." },
  { icon: Scale, title: "Fair Hiring Center", body: "Plain-language EEOC and Department of Labor resources, plus links to official reporting channels." },
];

const STEPS = [
  ["Tell us your goals", "Target roles, industries, location and skills. We never ask for demographic information."],
  ["Bring your real experience", "Upload a PDF, DOCX or TXT resume. It is encrypted, and you can edit every field."],
  ["Tailor truthfully", "Paste a job description. We show matched and missing keywords, and you decide what changes."],
  ["Apply & track", "Export a clean, ATS-readable file, apply on the employer's site, and track follow-ups."],
];

const FAQ = [
  ["Do you guarantee my resume will pass an ATS?", "No. Every employer configures its applicant tracking system differently, and people make the final decisions. We help you write a clear, machine-readable resume that reflects your real experience. We don't show a made-up 'ATS score'."],
  ["Will the AI make up experience to help me get hired?", "Never. Suggestions only rephrase what you wrote. Our system blocks rewrites that add numbers, skills or achievements that aren't already in your resume, and you approve every change."],
  ["Is my resume used to train AI models?", "Not unless you opt in, and that setting is off by default. Resumes are encrypted in transit and at rest. You can export or permanently delete your data at any time."],
  ["Where do the jobs come from?", "Employer career sites, government APIs like USAJOBS, licensed aggregators, and authorized employer or staffing-agency feeds. We never scrape sites in violation of their terms. Indeed and LinkedIn listings appear only through approved partner programs. Until then, we give you a link to search those sites directly."],
  ["Do I have to share my race, gender or age?", "No. We don't ask for, infer or store protected characteristics, and nothing in EqualPath AI uses your name to guess anything about you."],
  ["Can EqualPath tell me if I was discriminated against?", "We can't make legal determinations. Our Fair Hiring Center explains your rights and links to the EEOC and Department of Labor so you can get official help."],
];

const EXAMPLE_TESTIMONIALS = [
  ["Career changer, retail → healthcare admin", "Seeing which of my retail skills already matched the job post gave me words for experience I didn't know counted."],
  ["Recent community-college graduate", "The practice tests explained why each answer was right. I walked into my screening calmer."],
  ["Returning to work after caregiving", "It never pushed me to exaggerate. It helped me describe what I'd actually done."],
];

export default async function Landing() {
  const user = await getUser().catch(() => null);
  return (
    <div className="relative overflow-hidden">
      <LoadingScreen />
      <div className="pointer-events-none absolute inset-0 grid-bg [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-56 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-[40%] h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />

      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Logo />
          <nav aria-label="Primary" className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
            <a href="#features" className="hover:text-white">Features</a><a href="#how" className="hover:text-white">How it works</a>
            <a href="#mission" className="hover:text-white">Mission</a><a href="#pricing" className="hover:text-white">Pricing</a><a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <div className="flex gap-2">
            {user ? <Link href="/dashboard" className="btn-primary">Open dashboard <ArrowRight size={16} /></Link> : <>
              <Link href="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
              <Link href="/signup" className="btn-primary">Get started</Link></>}
          </div>
        </div>
      </header>

      <main id="main" className="relative">
        {/* HERO */}
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-20 pt-16 md:pt-24 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-fadeup">
            <span className="chip-violet mb-6"><ShieldCheck size={13} />Truthful by design · No fabricated credentials</span>
            <h1 className="text-5xl font-semibold leading-[1.02] md:text-7xl">
              Your Skills.<br /><span className="gradient-text">Your Potential.</span><br />Your Opportunity.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-400">
              EqualPath AI helps you get through automated hiring with honest, ATS-readable resumes, AI coaching, practice assessments and verified job listings. It&apos;s built for every job seeker, especially those the system has overlooked.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={user ? "/resume" : "/signup"} className="btn-primary px-6 py-3 text-base">Build my resume <ArrowRight size={18} /></Link>
              <Link href="/jobs" className="btn-ghost px-6 py-3 text-base">Browse verified jobs</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              {["Free core tools", "No demographic data collected", "Delete your data anytime"].map((t) => <li key={t} className="flex items-center gap-1.5"><Check size={15} className="text-cyan-300" />{t}</li>)}
            </ul>
          </div>
          <HeroVisual />
        </section>

        {/* PRODUCT PREVIEW */}
        <section aria-labelledby="preview" className="mx-auto max-w-6xl px-5 pb-24">
          <h2 id="preview" className="sr-only">Product preview</h2>
          <div className="glass relative overflow-hidden p-1.5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent" />
            <div className="flex items-center gap-1.5 px-3 py-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" /><span className="ml-3 text-xs text-slate-500">Resume Studio · product preview with sample content</span></div>
            <div className="grid gap-1.5 md:grid-cols-2">
              <div className="rounded-xl bg-ink-900/80 p-5 text-sm leading-relaxed">
                <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Job description</p>
                <p className="text-slate-300">Seeking a <mark className="mark-hit">Customer Service</mark> representative with <mark className="mark-hit">CRM</mark> experience, strong <mark className="mark-hit">Conflict Resolution</mark> skills, and <mark className="mark-miss">Bilingual</mark> ability. <mark className="mark-hit">Scheduling</mark> and <mark className="mark-miss">Data Entry</mark> required.</p>
                <div className="mt-4 flex flex-wrap gap-1.5"><span className="chip-green">4 found in your resume</span><span className="chip-amber">2 not found — add only if true</span></div>
              </div>
              <div className="rounded-xl bg-ink-900/80 p-5 text-sm">
                <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Suggested edit · needs your approval</p>
                <p className="rounded-lg bg-rose-500/10 p-2 text-rose-200 line-through decoration-rose-300/50">Responsible for handling customer complaints in Zendesk</p>
                <p className="mt-2 rounded-lg bg-emerald-500/10 p-2 text-emerald-100">Handled customer complaints in Zendesk</p>
                <p className="mt-2 text-xs text-slate-500">Why: starts with an action verb. Meaning unchanged, and no new facts added.</p>
                <div className="mt-3 flex gap-2"><span className="btn-primary px-3 py-1.5 text-xs">Accept</span><span className="btn-ghost px-3 py-1.5 text-xs">Reject</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="mx-auto max-w-7xl px-5 pb-24">
          <div className="mb-10 max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">The platform</p><h2 className="mt-2 text-4xl font-semibold">Everything you need to get hired, in one place.</h2></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="glass glass-hover group p-6">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-500/10 text-cyan-200 ring-1 ring-white/10 transition group-hover:scale-110"><Icon size={20} /></div>
                <h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW */}
        <section id="how" className="mx-auto max-w-7xl px-5 pb-24">
          <h2 className="mb-10 text-4xl font-semibold">How it works</h2>
          <ol className="grid gap-4 md:grid-cols-4">
            {STEPS.map(([t, b], i) => (
              <li key={t} className="glass relative p-6">
                <span className="font-display text-5xl font-bold text-white/[0.06]">0{i + 1}</span>
                <h3 className="-mt-4 font-semibold">{t}</h3><p className="mt-2 text-sm text-slate-400">{b}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* MISSION */}
        <section id="mission" className="mx-auto max-w-7xl px-5 pb-24">
          <div className="glass relative overflow-hidden p-8 md:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl" />
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Our mission</p>
                <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Automated hiring shouldn&apos;t decide who gets a fair shot.</h2>
                <p className="mt-4 text-slate-400">Women, racial and ethnic minorities, people in underserved communities, students and career changers often face hiring systems they can&apos;t see into. EqualPath AI explains how those systems work and helps you present your real skills clearly. It never asks you to pretend to be someone else.</p>
              </div>
              <ul className="grid gap-3 self-center">
                {[[Eye, "Transparent AI", "Every suggestion explains why it was made. Nothing is a black box."], [Lock, "Private by default", "Encrypted resumes, no training on your data without opt-in, and one-click deletion."], [HeartHandshake, "Human in control", "You approve every change. We don't make automated hiring decisions."]].map(([I, t, b]) => {
                  const Icon = I as typeof Eye;
                  return <li key={t as string} className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><Icon size={20} className="mt-0.5 shrink-0 text-cyan-300" /><div><div className="font-semibold">{t as string}</div><div className="text-sm text-slate-400">{b as string}</div></div></li>;
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS (examples) */}
        <section aria-labelledby="stories" className="mx-auto max-w-7xl px-5 pb-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3"><h2 id="stories" className="text-4xl font-semibold">What we hope to hear</h2><span className="chip-amber">Example testimonials — illustrative, not from real users</span></div>
          <div className="grid gap-4 md:grid-cols-3">
            {EXAMPLE_TESTIMONIALS.map(([who, quote]) => (
              <figure key={who} className="glass p-6"><blockquote className="text-slate-200">&ldquo;{quote}&rdquo;</blockquote><figcaption className="mt-4 text-xs uppercase tracking-wider text-slate-500">Example · {who}</figcaption></figure>
            ))}
          </div>
        </section>

        {/* PRICING placeholder */}
        <section id="pricing" className="mx-auto max-w-7xl px-5 pb-24">
          <h2 className="mb-2 text-4xl font-semibold">Pricing</h2><p className="mb-8 text-slate-400">Pricing isn&apos;t final yet. Core career tools will always have a free tier.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {[["Community", "Free", ["Resume Studio", "Verified job board", "Learning Hub & Fair Hiring Center", "Practice assessments"]], ["Plus", "TBD", ["Unlimited AI coaching sessions", "Unlimited resume versions", "Mock interview feedback"]], ["Partners", "Contact", ["Workforce boards & nonprofits", "Cohort dashboards (aggregate only)", "Authorized job-feed integration"]]].map(([n, p, f], i) => (
              <div key={n as string} className={`glass p-6 ${i === 0 ? "ring-1 ring-violet-400/40" : ""}`}>
                <div className="text-sm text-slate-400">{n as string}</div><div className="mt-1 font-display text-3xl font-semibold">{p as string}</div>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">{(f as string[]).map((x) => <li key={x} className="flex gap-2"><Check size={16} className="text-cyan-300" />{x}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-4xl px-5 pb-24">
          <h2 className="mb-8 text-4xl font-semibold">Questions, answered honestly</h2>
          <div className="space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="glass group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{q}<span className="text-violet-300 transition group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-5 pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600/40 via-ink-700 to-cyan-600/30 p-10 text-center ring-1 ring-white/10 md:p-16">
            <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
            <h2 className="relative text-4xl font-semibold md:text-5xl">Your path starts with what you already know.</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-slate-300">Create a free account. Takes about two minutes, and no demographic questions.</p>
            <Link href={user ? "/dashboard" : "/signup"} className="btn-primary relative mt-8 px-8 py-3 text-base">Start free <ArrowRight size={18} /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 text-sm text-slate-500 md:flex-row md:items-center">
          <Logo />
          <p className="max-w-xl">EqualPath AI gives educational career guidance. It is not legal advice and does not guarantee hiring outcomes. For discrimination concerns, visit <a className="text-cyan-300 underline" href="https://www.eeoc.gov/how-file-charge-employment-discrimination" target="_blank" rel="noreferrer">eeoc.gov</a>.</p>
          <div className="flex gap-4"><Link href="/fair-hiring" className="hover:text-white">Fair Hiring</Link><Link href="/learn" className="hover:text-white">Learn</Link><Link href="/privacy" className="hover:text-white">Privacy</Link></div>
        </div>
      </footer>
    </div>
  );
}
