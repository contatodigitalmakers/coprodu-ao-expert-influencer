import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { moneyInput } from "@/lib/finance/format";
import { COST_CATEGORIES } from "@/lib/finance/labels";
import { getAppOptions, getCost } from "@/lib/finance/queries";
import { formatDate } from "@/lib/format";
import { deleteCostAction, updateCostAction } from "../../../actions";
import { CostForm } from "../../../_components/cost-form";
import { isAdmin, Restricted } from "../../../_components/finance-ui";

export const metadata: Metadata = {
  title: "Editar custo",
};

export default function EditCostPage({ params }: PageProps<"/financeiro/custos/[id]/editar">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-3xl" />}>
      <EditCost params={params} />
    </Suspense>
  );
}

async function EditCost({ params }: Pick<PageProps<"/financeiro/custos/[id]/editar">, "params">) {
  if (!(await isAdmin())) return <Restricted />;
  const { id } = await params;
  const [cost, apps] = await Promise.all([getCost(id), getAppOptions()]);
  if (!cost) notFound();
  const app = apps.find((item) => item.id === cost.appId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Editar custo"
        description={`${COST_CATEGORIES[cost.category].label} · ${app?.name ?? "Geral (empresa)"} · ${formatDate(cost.spentOn)}`}
        actions={
          <ConfirmDeleteButton
            title="Excluir este custo?"
            description="O custo sai dos resumos."
            action={deleteCostAction.bind(null, cost.id)}
          />
        }
      />
      <CostForm
        apps={apps}
        initial={{
          appId: cost.appId ?? "",
          spentOn: cost.spentOn,
          category: cost.category,
          supplier: cost.supplier ?? "",
          description: cost.description ?? "",
          amount: moneyInput(cost.amount),
          shared: cost.shared,
          partnerShare: cost.partnerShare === null ? (app ? String(100 - app.companyShare) : "") : String(cost.partnerShare),
        }}
        action={updateCostAction.bind(null, cost.id, "")}
        submitLabel="Salvar alterações"
        cancelHref={`/financeiro/custos?mes=${cost.spentOn.slice(0, 7)}`}
      />
    </div>
  );
}
