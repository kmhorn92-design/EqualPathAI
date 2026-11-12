import "server-only";
import { promises as fs } from "fs";
import path from "path";

export type Mail = { to: string; subject: string; text: string; html: string };

const env = (n: string) => (process.env[n] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
export const mailConfigured = () => Boolean(env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASS"));

/**
 * Sends email over SMTP (works with Gmail app passwords, Resend, SendGrid, Mailgun…).
 * Without SMTP settings, development writes the message to ./.dev-mail/ instead so you can click the link.
 */
export async function sendMail(m: Mail): Promise<"sent" | "dev-outbox" | "not-configured"> {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") { console.warn("[mail] SMTP is not configured; email not sent"); return "not-configured"; }
    const dir = path.resolve(".dev-mail"); await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${m.to.replace(/[^a-z0-9@.]+/gi, "_")}.json`);
    await fs.writeFile(file, JSON.stringify(m, null, 2));
    console.log(`[mail] (dev) "${m.subject}" to ${m.to} saved to ${file}`);
    return "dev-outbox";
  }
  const nodemailer = await import("nodemailer");
  const port = Number(env("SMTP_PORT") || 465);
  const t = nodemailer.createTransport({ host: env("SMTP_HOST"), port, secure: port === 465, auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") } });
  await t.sendMail({ from: env("MAIL_FROM") || `EqualPath AI <${env("SMTP_USER")}>`, to: m.to, subject: m.subject, text: m.text, html: m.html });
  return "sent";
}

/** Public base URL for links in emails. Never derived from the request's Host header (prevents link poisoning). */
export function appUrl(): string {
  const set = env("APP_URL");
  if (set && !/localhost/.test(set) || (set && process.env.NODE_ENV !== "production")) return set.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return set ? set.replace(/\/$/, "") : "http://localhost:3000";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function resetEmail(name: string | null, link: string, minutes: number): Mail & { to: "" } {
  const hi = name ? `Hi ${name},` : "Hi,";
  return {
    to: "", subject: "Reset your EqualPath AI password",
    text: `${hi}\n\nSomeone (hopefully you) asked to reset your EqualPath AI password. Use this link within ${minutes} minutes:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email. Your password won't change.\n\n— EqualPath AI`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
  <p style="font-size:18px;font-weight:bold;margin:0 0 16px">EqualPath <span style="color:#7c3aed">AI</span></p>
  <p>${esc(hi)}</p>
  <p>Someone (hopefully you) asked to reset your EqualPath AI password. This link works for ${minutes} minutes and can be used once.</p>
  <p style="margin:28px 0"><a href="${esc(link)}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">Choose a new password</a></p>
  <p style="font-size:13px;color:#475569">Or paste this into your browser:<br><span style="word-break:break-all">${esc(link)}</span></p>
  <p style="font-size:13px;color:#475569">If you didn't ask for this, ignore this email. Your password won't change.</p>
</div>`,
  };
}
