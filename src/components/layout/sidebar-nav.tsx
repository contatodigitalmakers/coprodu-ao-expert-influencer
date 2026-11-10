"use client";

import { CalendarIcon, ChartColumnIcon, FileTextIcon, ListChecksIcon, ListOrderedIcon, MessageSquareTextIcon, SettingsIcon, SquareKanbanIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";

// Itens do menu lateral. "segment" é a primeira parte da URL (null = Fila do dia).
// Novos módulos entram aqui conforme forem construídos.
const NAV_ITEMS = [
  { href: "/", segment: null, label: "Fila do dia", icon: ListChecksIcon },
  { href: "/experts", segment: "experts", label: "Experts", icon: UsersIcon },
  { href: "/pipeline", segment: "pipeline", label: "Pipeline", icon: SquareKanbanIcon },
  { href: "/agenda", segment: "agenda", label: "Agenda", icon: CalendarIcon },
  { href: "/propostas", segment: "propostas", label: "Propostas", icon: FileTextIcon },
  { href: "/cadencias", segment: "cadencias", label: "Cadências", icon: ListOrderedIcon },
  { href: "/templates", segment: "templates", label: "Templates", icon: MessageSquareTextIcon },
  { href: "/dashboard", segment: "dashboard", label: "Dashboard", icon: ChartColumnIcon },
  { href: "/configuracoes", segment: "configuracoes", label: "Configurações", icon: SettingsIcon },
];

// Menu com o item da página atual destacado. Lê a URL, então precisa ficar
// dentro de <Suspense> (o fallback é SidebarNavLinks sem destaque).
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const activeSegment = useSelectedLayoutSegment();
  return <SidebarNavLinks activeSegment={activeSegment} onNavigate={onNavigate} />;
}

export function SidebarNavLinks({ activeSegment, onNavigate }: { activeSegment?: string | null; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, segment, label, icon: Icon }) => {
        const isActive = activeSegment !== undefined && activeSegment === segment;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={label}
            aria-label={label}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors md:py-1.5",
              "md:group-data-[collapsed=true]/sidebar:justify-center",
              isActive
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="md:group-data-[collapsed=true]/sidebar:hidden">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
