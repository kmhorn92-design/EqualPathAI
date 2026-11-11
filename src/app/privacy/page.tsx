import Link from "next/link";
import { Logo } from "@/components/Logo";
export const metadata = { title: "Privacy" };
export default function Privacy() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-12">
      <Logo />
      <h1 className="mt-10 text-4xl font-semibold">Privacy & AI transparency</h1>
      <p className="mt-2 text-sm text-amber-200">Template policy for development. Have counsel review before launch.</p>
      <div className="prose-ep mt-8">
        <h3>What we collect</h3><ul><li>Account info: name, email, hashed password.</li><li>Career profile: target roles, industries, location, work preference, experience, education, skills, accessibility preferences.</li><li>Content you provide: resumes, job descriptions, coaching conversations, application notes.</li></ul>
        <h3>What we never collect</h3><p>We don&apos;t request, infer, or store race, ethnicity, gender, age, religion, disability status, national origin or other protected characteristics. We never use your name to guess anything about you.</p>
        <h3>Security</h3><p>Data is encrypted in transit (TLS). Resumes, resume versions, job descriptions, coaching messages and application notes are encrypted at rest with AES-256-GCM before they reach the database or file storage.</p>
        <h3>AI processing</h3><p>When AI features are on, the relevant text goes to our server-side AI provider only to generate your result. We don&apos;t use your resumes to train models unless you explicitly opt in under Settings. That setting is off by default. Every AI suggestion explains its reasoning and needs your approval. EqualPath AI makes no hiring decisions.</p>
        <h3>Your controls</h3><ul><li>Export all your data as JSON.</li><li>Delete your account and all data permanently.</li><li>Choose how long resumes are kept (retention).</li><li>Turn AI processing off.</li></ul>
        <p><Link href="/settings">Manage your privacy settings →</Link></p>
      </div>
    </main>
  );
}
