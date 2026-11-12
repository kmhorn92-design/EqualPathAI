/**
 * Visual resume styles. The industry template decides section order and tips; the style decides the look.
 * Every style stays ATS-readable: one column, real text (no images of text), standard section names,
 * and a reading order that matches the visual order.
 */
export type StyleId = "modern" | "executive" | "spotlight";
export type ResumeStyle = {
  id: StyleId; name: string; blurb: string; bestFor: string;
  family: "sans" | "serif"; ink: string; muted: string; accent: string; band?: string;
  header: "left" | "center" | "band"; heading: "rule" | "underline" | "bar";
};

export const RESUME_STYLES: ResumeStyle[] = [
  { id: "modern", name: "Modern", blurb: "Clean sans-serif, left-aligned name, indigo accents and hairline dividers.", bestFor: "Tech, business, healthcare, customer success",
    family: "sans", ink: "#0F172A", muted: "#475569", accent: "#4338CA", header: "left", heading: "rule" },
  { id: "executive", name: "Executive", blurb: "Refined serif type, centered header, and classic ruled sections.", bestFor: "Finance, government, education, leadership",
    family: "serif", ink: "#111827", muted: "#4B5563", accent: "#111827", header: "center", heading: "underline" },
  { id: "spotlight", name: "Spotlight", blurb: "Bold dark header band with teal section markers. Stands out, still ATS-safe.", bestFor: "Creative, sales, marketing, career changers",
    family: "sans", ink: "#0F172A", muted: "#475569", accent: "#0D9488", band: "#0F172A", header: "band", heading: "bar" },
];
export const DEFAULT_STYLE: StyleId = "modern";
export const getStyle = (id?: string | null) => RESUME_STYLES.find((s) => s.id === id) ?? RESUME_STYLES[0];
export const isStyleId = (v: unknown): v is StyleId => RESUME_STYLES.some((s) => s.id === v);
