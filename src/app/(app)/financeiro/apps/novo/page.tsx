import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_COMPANY_SHARE } from "@/lib/finance/labels";
import { getAppLeadOptions } from "@/lib/finance/queries";
import type { AppInput } from "@/lib/finance/validation";
import { createAppAction } from "../../actions";
import { AppForm } from "../../_components/app-form";
import { isAdmin, Restricted } from "../../_components/finance-ui";

export const metadata: Metadata = {
  title: "Novo app",
};

export default function NewAppPage({ searchParams }: PageProps<"/financeiro/apps/novo">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novo app" description="Cadastre o app em coprodução para lançar as vendas e os custos dele." />
      <Suspense fallback={<Skeleton className="h-96 max-w-3xl" />}>
        <NewApp searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewApp({ searchParams }: Pick<PageProps<"/financeiro/apps/novo">, "searchParams">) {
  if (!(await isAdmin())) return <Restricted />;
  const { lead } = await searchParams;
  const leads = await getAppLeadOptions(null);
  const chosen = leads.find((item) => item.id === lead);
  const initial: AppInput = {
    name: "",
    expertId: chosen?.id ?? "",
    partnerName: chosen && !chosen.name.startsWith("@") ? chosen.name : "",
    partnerHandle: chosen?.handle ?? "",
    niche: chosen?.niche ?? "",
    salesPlatform: "",
    monthlyPrice: "",
    companyShare: String(chosen?.ourShare ?? DEFAULT_COMPANY_SHARE),
    status: "in_development",
    contractDate: chosen?.contractDate ?? "",
    launchDate: "",
    notes: "",
  };
  return <AppForm leads={leads} initial={initial} action={createAppAction} submitLabel="Cadastrar app" cancelHref="/financeiro/apps" />;
}
