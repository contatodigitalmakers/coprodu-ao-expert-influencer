import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppOptions } from "@/lib/finance/queries";
import { todayInSaoPaulo } from "@/lib/format";
import { createCostAction } from "../../actions";
import { CostForm } from "../../_components/cost-form";
import { isAdmin, Restricted } from "../../_components/finance-ui";

export const metadata: Metadata = {
  title: "Lançar custo",
};

export default function NewCostPage({ searchParams }: PageProps<"/financeiro/custos/novo">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Lançar custo" description="Uma linha por despesa." />
      <Suspense fallback={<Skeleton className="h-96 max-w-3xl" />}>
        <NewCost searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewCost({ searchParams }: Pick<PageProps<"/financeiro/custos/novo">, "searchParams">) {
  if (!(await isAdmin())) return <Restricted />;
  const { app: appParam } = await searchParams;
  const apps = await getAppOptions();
  const app = apps.find((item) => item.id === appParam);
  const returnTo = app ? `/financeiro/apps/${app.id}` : "";
  return (
    <CostForm
      apps={apps}
      initial={{
        appId: app?.id ?? "",
        spentOn: todayInSaoPaulo(),
        category: "",
        supplier: "",
        description: "",
        amount: "",
        shared: false,
        partnerShare: app ? String(100 - app.companyShare) : "",
      }}
      action={createCostAction.bind(null, returnTo)}
      submitLabel="Salvar custo"
      cancelHref={app ? `/financeiro/apps/${app.id}` : "/financeiro/custos"}
    />
  );
}
