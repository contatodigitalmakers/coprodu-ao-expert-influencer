import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { UserCard, UserCardSkeleton } from "@/components/layout/user-card";

// Área logada. O menu e a barra do celular ficam no AppShell; o que depende do
// usuário logado carrega dentro de <Suspense> (exigência do Cache Components).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      userCard={
        <Suspense fallback={<UserCardSkeleton />}>
          <UserCard />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
