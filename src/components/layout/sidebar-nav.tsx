"use client";

import { CalendarIcon, ChartColumnIcon, FileTextIcon, ListChecksIcon, ListOrderedIcon, MessageSquareTextIcon, PresentationIcon, SettingsIcon, SquareKanbanIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";

// Itens do menu lateral. "segment" é a primeira parte da URL (null = Fila do dia).
// Novos módulos entram aqui conforme forem construídos.
const NAV_ITEMS = [
  { href: "/dashboard", segment: "dashboard", label: "Dashboard", icon: ChartColumnIcon },
  { href: "/", segment: null, label: "Fila do dia", icon: ListChecksIcon },
  { href: "/experts", segment: "experts", label: "Experts", icon: UsersIcon },
  { href: "/pipeline", segment: "pipeline", label: "Pipeline", icon: SquareKanbanIcon },
  { href: "/agenda", segment: "agenda", label: "Agenda", icon: CalendarIcon },
  { href: "/propostas", segment: "propostas", label: "Propostas", icon: FileTextIcon },
  { href: "/apresentacoes", segment: "apresentacoes", label: "Apresentações", icon: PresentationIcon },
  { href: "/cadencias", segment: "cadencias", label: "Cadências", icon: ListOrderedIcon },
  { href: "/templates", segment: "templates", label: "Templates", icon: MessageSquareTextIcon },
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
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors md:h-9 md:py-0",
              "md:group-data-[collapsed=true]/sidebar:justify-center md:group-data-[collapsed=true]/sidebar:px-0",
              isActive
                ? "lap-elevado font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-white/[0.05] hover:text-sidebar-foreground",
            )}
          >
            <Icon className={cn("size-4 shrink-0", isActive && "text-primary")} />
            <span className="md:group-data-[collapsed=true]/sidebar:hidden">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
