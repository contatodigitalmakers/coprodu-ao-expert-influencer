import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { moneyInput } from "@/lib/finance/format";
import { getApp, getAppLeadOptions } from "@/lib/finance/queries";
import { updateAppAction } from "../../../actions";
import { AppForm } from "../../../_components/app-form";
import { isAdmin, Restricted } from "../../../_components/finance-ui";

export const metadata: Metadata = {
  title: "Editar app",
};

export default function EditAppPage({ params }: PageProps<"/financeiro/apps/[id]/editar">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Editar app" description="Mudar o % vale para os próximos lançamentos; os antigos não mudam." />
      <Suspense fallback={<Skeleton className="h-96 max-w-3xl" />}>
        <EditApp params={params} />
      </Suspense>
    </div>
  );
}

async function EditApp({ params }: Pick<PageProps<"/financeiro/apps/[id]/editar">, "params">) {
  if (!(await isAdmin())) return <Restricted />;
  const { id } = await params;
  const app = await getApp(id);
  if (!app) notFound();
  const leads = await getAppLeadOptions(app.expertId);
  return (
    <AppForm
      leads={leads}
      initial={{
        name: app.name,
        expertId: app.expertId ?? "",
        partnerName: app.partnerName,
        partnerHandle: app.partnerHandle ?? "",
        niche: app.niche ?? "",
        salesPlatform: app.salesPlatform ?? "",
        monthlyPrice: moneyInput(app.monthlyPrice),
        companyShare: String(app.companyShare),
        status: app.status,
        contractDate: app.contractDate ?? "",
        launchDate: app.launchDate ?? "",
        notes: app.notes ?? "",
      }}
      action={updateAppAction.bind(null, app.id)}
      submitLabel="Salvar alterações"
      cancelHref={`/financeiro/apps/${app.id}`}
    />
  );
}
