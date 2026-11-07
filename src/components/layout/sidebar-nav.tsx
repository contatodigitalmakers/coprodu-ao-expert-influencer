"use client";

import { HouseIcon, SettingsIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";

// Itens do menu lateral. "segment" é a primeira parte da URL (null = Início).
// Novos módulos entram aqui conforme forem construídos.
const NAV_ITEMS = [
  { href: "/", segment: null, label: "Início", icon: HouseIcon },
  { href: "/experts", segment: "experts", label: "Experts", icon: UsersIcon },
  { href: "/configuracoes", segment: "configuracoes", label: "Configurações", icon: SettingsIcon },
];

// Menu com o item da página atual destacado. Lê a URL, então precisa ficar
// dentro de <Suspense> (o fallback é SidebarNavLinks sem destaque).
export function SidebarNav() {
  const activeSegment = useSelectedLayoutSegment();
  return <SidebarNavLinks activeSegment={activeSegment} />;
}

export function SidebarNavLinks({ activeSegment }: { activeSegment?: string | null }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, segment, label, icon: Icon }) => {
        const isActive = activeSegment !== undefined && activeSegment === segment;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              isActive
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
