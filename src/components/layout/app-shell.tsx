"use client";

import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, XIcon } from "lucide-react";
import { Suspense, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarNav, SidebarNavLinks } from "./sidebar-nav";

// Estrutura da área logada.
// - Computador (md ou mais): menu fixo na lateral, com botão para reduzir a só
//   ícones. A escolha fica guardada neste navegador.
// - Celular: barra no topo com o botão do menu, que abre como gaveta.
// O estado "reduzido" vai no atributo data-collapsed do menu; os textos somem por
// CSS (group-data), então o que vem do servidor (cartão do usuário) também reage.

const STORAGE_KEY = "central-comercial:menu-reduzido";
const CHANGE_EVENT = "menu-reduzido-change";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function useCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  function toggle() {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1");
    } catch {
      // sem armazenamento: vale só até recarregar
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return [collapsed, toggle] as const;
}

// Esconde o elemento quando o menu está reduzido (só no computador).
export const HIDE_WHEN_COLLAPSED = "md:group-data-[collapsed=true]/sidebar:hidden";

export function AppShell({ userCard, children }: { userCard: ReactNode; children: ReactNode }) {
  const [collapsed, toggleCollapsed] = useCollapsed();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open}>
          <MenuIcon />
        </Button>
        <p className="font-heading text-base font-semibold">Central Comercial</p>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={close} aria-hidden />}

      <aside
        data-collapsed={collapsed}
        className={cn(
          "group/sidebar flex flex-col gap-6 overflow-y-auto border-r bg-sidebar p-4 text-sidebar-foreground",
          // celular: gaveta por cima da página
          "fixed inset-y-0 left-0 z-50 w-64 transition-[transform,visibility] duration-200",
          // fechada, a gaveta também fica invisível (os links não entram no foco do teclado)
          open ? "translate-x-0" : "-translate-x-full max-md:invisible",
          // computador: coluna fixa à esquerda
          "md:sticky md:top-0 md:h-dvh md:shrink-0 md:translate-x-0 md:self-start md:transition-[width]",
          collapsed ? "md:w-16 md:p-2" : "md:w-60",
        )}
      >
        <div className={cn("flex items-center justify-between gap-2", collapsed && "md:justify-center")}>
          <p className={cn("px-2 font-heading text-base font-semibold", HIDE_WHEN_COLLAPSED)}>Central Comercial</p>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden md:inline-flex"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menu" : "Reduzir menu"}
            title={collapsed ? "Expandir menu" : "Reduzir menu"}
          >
            {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
          </Button>
          <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={close} aria-label="Fechar menu">
            <XIcon />
          </Button>
        </div>
        <Suspense fallback={<SidebarNavLinks onNavigate={close} />}>
          <SidebarNav onNavigate={close} />
        </Suspense>
        <div className="mt-auto">{userCard}</div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
