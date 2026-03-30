"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Trophy,
  Clock,
  ChevronDown,
  Building2,
  Network,
  Users,
  UserCheck,
  BarChart3,
  Megaphone,
  ShoppingCart,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Configuracao",
    icon: Settings,
    items: [
      { label: "Unidades", href: "/config/units", icon: Building2 },
      { label: "Setores", href: "/config/sectors", icon: Network },
      { label: "Equipes", href: "/config/teams", icon: Users },
      { label: "Vendedores", href: "/config/sellers", icon: UserCheck },
      { label: "KPIs", href: "/config/kpis", icon: BarChart3 },
    ],
  },
  {
    label: "Endomarketing",
    icon: Trophy,
    items: [
      { label: "Campanhas", href: "/campaigns", icon: Megaphone },
    ],
  },
  {
    label: "Historico",
    icon: Clock,
    items: [
      { label: "Vendas", href: "/history/sales", icon: ShoppingCart },
      { label: "Lancamentos", href: "/history/entries", icon: FileText },
    ],
  },
];

function CollapsibleSection({
  section,
  pathname,
}: {
  section: NavSection;
  pathname: string;
}) {
  const isActive = section.items.some((item) => pathname.startsWith(item.href));
  const [open, setOpen] = useState(isActive);

  const SectionIcon = section.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "text-sidebar-foreground"
        )}
        aria-expanded={open}
      >
        <SectionIcon className="size-4 shrink-0" />
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
          {section.items.map((item) => {
            const ItemIcon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <ItemIcon className="size-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isDashboardActive = pathname === "/";

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-sidebar-primary">
          <span className="text-xs font-bold text-sidebar-primary-foreground">
            V
          </span>
        </div>
        <span className="text-lg font-bold tracking-tight">Visus</span>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
        aria-label="Menu principal"
      >
        {/* Dashboard link */}
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isDashboardActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
          aria-current={isDashboardActive ? "page" : undefined}
        >
          <LayoutDashboard className="size-4 shrink-0" />
          <span>Dashboard</span>
        </Link>

        <div className="mt-2 flex flex-col gap-1">
          {NAV_SECTIONS.map((section) => (
            <CollapsibleSection
              key={section.label}
              section={section}
              pathname={pathname}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <Separator className="bg-sidebar-border" />
      <div className="px-5 py-3">
        <p className="text-xs text-sidebar-foreground/40">
          Visus Dashboard v1.0
        </p>
      </div>
    </aside>
  );
}
