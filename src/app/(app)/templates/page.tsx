import { getUser } from "@/lib/auth";
import { TEMPLATES } from "@/lib/resume/templates";
import { SAMPLE_RESUME } from "@/content/sample-resume";
import { PageHeader } from "@/components/ui";
import { TemplateGallery } from "@/components/templates/TemplateGallery";

export const metadata = { title: "ATS Template Library" };
export default async function Templates() {
  const u = await getUser();
  return (
    <>
      <PageHeader kicker="ATS Template Library" title="Simple, polished, and machine-readable" subtitle="Twelve single-column templates with role-specific guidance for healthcare, technology, customer service, administration, finance, education, logistics, creative, hospitality, government, and entry-level roles." />
      <TemplateGallery templates={TEMPLATES} sample={SAMPLE_RESUME} signedIn={!!u} />
    </>
  );
}
