import { Suspense, type ReactNode } from "react";
import { SidebarNav, SidebarNavLinks } from "@/components/layout/sidebar-nav";
import { UserCard, UserCardSkeleton } from "@/components/layout/user-card";

// Área logada. O menu é fixo; o que depende do usuário logado carrega
// dentro de <Suspense> (exigência do Cache Components do Next 16).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="flex w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 text-sidebar-foreground">
        <p className="px-2 font-heading text-base font-semibold">Central Comercial</p>
        <Suspense fallback={<SidebarNavLinks />}>
          <SidebarNav />
        </Suspense>
        <div className="mt-auto">
          <Suspense fallback={<UserCardSkeleton />}>
            <UserCard />
          </Suspense>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
