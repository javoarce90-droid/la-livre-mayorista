import { container } from "@/composition";
import { visiblePortalSections } from "@/modules/account/domain/portal-sections";
import { PortalShell } from "@/modules/account/ui/PortalShell";
import { requirePortalContext } from "@/portal-context";
import { ToastProvider } from "@/shared/ui/Toast";

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const { user, account } = await requirePortalContext();
  const unread = await container().accounts.getUnreadNotifications(account.id);
  return (
    <ToastProvider>
      <PortalShell
        sections={visiblePortalSections(account.flags)}
        user={{ name: user.name, email: user.email }}
        bookstore={{ name: account.bookstoreName, branch: account.branch }}
        unreadNotifications={unread}
      >
        {children}
      </PortalShell>
    </ToastProvider>
  );
}
