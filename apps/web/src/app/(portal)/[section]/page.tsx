import { notFound } from "next/navigation";
import { findComingSoonSection } from "@/modules/account/domain/portal-sections";
import { ComingSoon } from "@/modules/account/ui/ComingSoon";
import { requirePortalContext } from "@/portal-context";

export default async function ComingSoonPage({ params }: PageProps<"/[section]">) {
  const { section: slug } = await params;
  const { account } = await requirePortalContext();
  const section = findComingSoonSection(slug, account.flags);
  if (!section) notFound();
  return <ComingSoon title={section.label} />;
}
