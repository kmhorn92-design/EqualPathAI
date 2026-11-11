/** Rule-based, transparent follow-up suggestions. The user decides whether to act. */
export function followUp(a: { status: string; appliedAt: string | Date | null; updatedAt: string | Date; company: string; title: string }): { tip: string; draft?: string } | null {
  const days = (d: string | Date | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 864e5) : 0);
  switch (a.status) {
    case "SAVED": return { tip: "Tailor a resume version for this posting before applying." };
    case "PREPARING": return { tip: "Double-check the posting is still open on the employer's site, then apply." };
    case "APPLIED": {
      const d = days(a.appliedAt);
      if (d >= 7) return { tip: `It's been ${d} days. A brief, polite follow-up is reasonable if you have a contact.`, draft: `Subject: Following up — ${a.title} application\n\nHello,\n\nI applied for the ${a.title} role at ${a.company} on ${new Date(a.appliedAt!).toLocaleDateString()} and wanted to reaffirm my interest. I'd welcome the chance to discuss how my experience could support your team.\n\nThank you for your time,\n[Your name]` };
      return { tip: `Applied ${d} day${d === 1 ? "" : "s"} ago. Many employers take 1–3 weeks to respond.` };
    }
    case "SCREENING": case "INTERVIEWING":
      return { tip: "Send a thank-you note within 24 hours of each interview. Practice STAR answers in the Assessment Academy.", draft: `Subject: Thank you — ${a.title} interview\n\nHi [Name],\n\nThank you for speaking with me about the ${a.title} position. I enjoyed learning about [something specific]. I'm excited about the opportunity to contribute [a relevant strength].\n\nBest regards,\n[Your name]` };
    case "OFFER": return { tip: "Review the offer carefully. Research pay with BLS/O*NET data, and it's okay to ask for time to decide." };
    case "REJECTED": return { tip: "It's okay to ask for feedback, and to keep the door open for future roles." };
    default: return null;
  }
}
