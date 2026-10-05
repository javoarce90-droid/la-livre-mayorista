import type { Metadata } from "next";
import { DashboardContainer } from "@/modules/account/ui/DashboardContainer";
import { requirePortalContext } from "@/portal-context";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  return <DashboardContainer context={await requirePortalContext()} />;
}
