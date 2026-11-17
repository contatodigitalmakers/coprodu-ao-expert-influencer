import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { monthLongLabel } from "@/lib/finance/calc";
import { moneyInput } from "@/lib/finance/format";
import { getAppOptions, getSale } from "@/lib/finance/queries";
import { deleteSaleAction, updateSaleAction } from "../../../actions";
import { isAdmin, Restricted } from "../../../_components/finance-ui";
import { SaleForm } from "../../../_components/sale-form";

export const metadata: Metadata = {
  title: "Editar vendas",
};

export default function EditSalePage({ params }: PageProps<"/financeiro/vendas/[id]/editar">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-3xl" />}>
      <EditSale params={params} />
    </Suspense>
  );
}

async function EditSale({ params }: Pick<PageProps<"/financeiro/vendas/[id]/editar">, "params">) {
  if (!(await isAdmin())) return <Restricted />;
  const { id } = await params;
  const [sale, apps] = await Promise.all([getSale(id), getAppOptions()]);
  if (!sale) notFound();
  const appName = apps.find((app) => app.id === sale.appId)?.name ?? "app";
  const text = (value: number) => String(value);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Editar vendas"
        description={`${appName} · ${monthLongLabel(sale.month)}`}
        actions={
          <ConfirmDeleteButton
            title="Excluir este lançamento?"
            description="As vendas deste mês saem dos resumos. Dá para lançar de novo depois."
            action={deleteSaleAction.bind(null, sale.id)}
          />
        }
      />
      <SaleForm
        apps={apps}
        initial={{
          appId: sale.appId,
          month: sale.month.slice(0, 7),
          newSales: text(sale.newSales),
          activeSubscribers: text(sale.activeSubscribers),
          cancellations: text(sale.cancellations),
          grossRevenue: moneyInput(sale.grossRevenue),
          platformFees: moneyInput(sale.platformFees),
          refunds: moneyInput(sale.refunds),
          companyShare: text(sale.companyShare),
          notes: sale.notes ?? "",
        }}
        action={updateSaleAction.bind(null, sale.id, "")}
        submitLabel="Salvar alterações"
        cancelHref={`/financeiro/vendas?mes=${sale.month.slice(0, 7)}`}
      />
    </div>
  );
}
