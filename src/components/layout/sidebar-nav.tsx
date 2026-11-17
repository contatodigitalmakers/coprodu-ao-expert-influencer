"use client";

import { BanknoteIcon, CalendarIcon, CalendarRangeIcon, ChartColumnIcon, FileTextIcon, ListChecksIcon, ListOrderedIcon, MessageSquareTextIcon, PresentationIcon, ReceiptIcon, SettingsIcon, SmartphoneIcon, SquareKanbanIcon, UsersIcon, WalletIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment, useSelectedLayoutSegments } from "next/navigation";
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

// Central Financeira, abaixo da Central Comercial. "sub" é a parte da URL
// depois de /financeiro (null = Resumo).
const FINANCE_ITEMS = [
  { href: "/financeiro", sub: null, label: "Resumo", icon: WalletIcon },
  { href: "/financeiro/mensal", sub: "mensal", label: "Mês a mês", icon: CalendarRangeIcon },
  { href: "/financeiro/apps", sub: "apps", label: "Apps", icon: SmartphoneIcon },
  { href: "/financeiro/vendas", sub: "vendas", label: "Vendas", icon: BanknoteIcon },
  { href: "/financeiro/custos", sub: "custos", label: "Custos", icon: ReceiptIcon },
];

// Menu com o item da página atual destacado. Lê a URL, então precisa ficar
// dentro de <Suspense> (o fallback é SidebarNavLinks sem destaque).
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const activeSegment = useSelectedLayoutSegment();
  const segments = useSelectedLayoutSegments().filter((segment) => !segment.startsWith("__") && !segment.startsWith("("));
  const financeSub = segments[0] === "financeiro" ? (segments[1] ?? null) : undefined;
  return <SidebarNavLinks activeSegment={activeSegment} financeSub={financeSub} onNavigate={onNavigate} />;
}

export function SidebarNavLinks({
  activeSegment,
  financeSub,
  onNavigate,
}: {
  activeSegment?: string | null;
  financeSub?: string | null;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, segment, label, icon }) => (
        <NavLink
          key={href}
          href={href}
          label={label}
          icon={icon}
          isActive={activeSegment !== undefined && activeSegment === segment}
          onNavigate={onNavigate}
        />
      ))}
      <div role="group" aria-labelledby="menu-central-financeira" className="mt-4 flex flex-col gap-1 border-t border-sidebar-border pt-4">
        <p
          id="menu-central-financeira"
          className="lap-rotulo px-3 pb-1 text-[11px] text-sidebar-foreground/50 md:group-data-[collapsed=true]/sidebar:sr-only"
        >
          Central Financeira
        </p>
        {FINANCE_ITEMS.map(({ href, sub, label, icon }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            icon={icon}
            isActive={financeSub !== undefined && financeSub === sub}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
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
}
