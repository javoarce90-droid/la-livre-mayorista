"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  Library,
  LayoutDashboard,
  Mail,
  Menu,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  ShoppingCart,
  Sparkles,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/shared/ui/brand/Logo";
import { cx } from "@/shared/ui/cx";
import { IconButton } from "@/shared/ui/IconButton";
import type { PortalSection, PortalSectionKey } from "../domain/portal-sections";
import { AccountMenu } from "./AccountMenu";

const ICONS: Record<PortalSectionKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  libros: BookOpen,
  pedido: ShoppingCart,
  "ingresos-recientes": PackagePlus,
  novedades: Star,
  promociones: Percent,
  catalogos: Library,
  estadisticas: BarChart3,
  recomendador: Sparkles,
  mensajeria: Mail,
};

export interface PortalShellProps {
  sections: PortalSection[];
  user: { name: string; email: string };
  bookstore: { name: string; branch: string };
  unreadNotifications: number;
  children: ReactNode;
}

function SidebarContent({
  sections,
  bookstore,
  collapsed,
  onNavigate,
}: Pick<PortalShellProps, "sections" | "bookstore"> & { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <div className={cx("flex h-16 items-center border-b border-white/10", collapsed ? "justify-center px-2" : "px-5")}>
        <Link href="/dashboard" onClick={onNavigate} aria-label="Ir al Dashboard">
          <Logo inverse compact={collapsed} />
        </Link>
      </div>
      <div className={cx("border-b border-white/10 py-4", collapsed ? "px-2 text-center" : "px-5")}>
        {collapsed ? (
          <span title={`${bookstore.name} — ${bookstore.branch}`} className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {bookstore.name.slice(0, 1)}
          </span>
        ) : (
          <>
            <p className="truncate text-sm font-medium text-white">{bookstore.name}</p>
            <p className="truncate text-xs text-white/60">{bookstore.branch}</p>
          </>
        )}
      </div>
      <nav aria-label="Secciones del portal" className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {sections.map((section) => {
            const Icon = ICONS[section.key];
            const active = pathname === section.href || pathname.startsWith(`${section.href}/`);
            return (
              <li key={section.key}>
                <Link
                  href={section.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? section.label : undefined}
                  className={cx(
                    "flex items-center gap-3 rounded-lg py-2 text-sm transition-colors",
                    collapsed ? "justify-center px-2" : "px-3",
                    active ? "bg-brand-600 font-medium text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon aria-hidden className="size-[18px] shrink-0" />
                  {collapsed ? (
                    <span className="sr-only">{section.label}</span>
                  ) : (
                    <span className="flex-1 truncate">{section.label}</span>
                  )}
                  {section.badge && !collapsed ? (
                    <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                      {section.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/** Client shell: collapsible sidebar (desktop), drawer (mobile), top bar. */
export function PortalShell({ sections, user, bookstore, unreadNotifications, children }: PortalShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <aside
        className={cx(
          "sticky top-0 hidden h-dvh shrink-0 flex-col bg-brand-900 transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <SidebarContent sections={sections} bookstore={bookstore} collapsed={collapsed} />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setDrawerOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-brand-900 shadow-xl">
            <IconButton
              label="Cerrar menú"
              tone="inverse"
              icon={<X className="size-5" />}
              onClick={() => setDrawerOpen(false)}
              className="absolute top-3.5 right-3"
            />
            <SidebarContent sections={sections} bookstore={bookstore} collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-5">
          <IconButton label="Abrir menú" icon={<Menu className="size-5" />} onClick={() => setDrawerOpen(true)} className="lg:hidden" />
          <IconButton
            label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
            icon={collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
            onClick={() => setCollapsed((value) => !value)}
            className="hidden lg:inline-flex"
          />
          <div className="flex-1" />
          <IconButton
            label={unreadNotifications > 0 ? `Notificaciones: ${unreadNotifications} sin leer` : "Notificaciones"}
            icon={
              <>
                <Bell className="size-5" />
                {unreadNotifications > 0 ? (
                  <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] leading-4 font-semibold text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                ) : null}
              </>
            }
          />
          <AccountMenu name={user.name} email={user.email} />
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
