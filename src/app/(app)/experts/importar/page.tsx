import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { getFormOptions } from "@/lib/experts/queries";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = {
  title: "Importar experts",
};

export default function ImportExpertsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Importar experts"
        description="Cadastre vários experts de uma vez a partir de uma planilha CSV."
      />
      <Suspense fallback={<Skeleton className="h-64 max-w-2xl" />}>
        <Wizard />
      </Suspense>
    </div>
  );
}

async function Wizard() {
  const [options, user] = await Promise.all([getFormOptions(), getCurrentUser()]);
  return <ImportWizard users={options.users} currentUserId={user.id} />;
}
