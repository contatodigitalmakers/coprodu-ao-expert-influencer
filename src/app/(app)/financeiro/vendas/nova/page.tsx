import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { currentMonth, parseMonth } from "@/lib/finance/calc";
import { getAppOptions } from "@/lib/finance/queries";
import { createSaleAction } from "../../actions";
import { EmptyState, isAdmin, Restricted } from "../../_components/finance-ui";
import { SaleForm } from "../../_components/sale-form";

export const metadata: Metadata = {
  title: "Lançar vendas",
};

export default function NewSalePage({ searchParams }: PageProps<"/financeiro/vendas/nova">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Lançar vendas do mês" description="Copie os números do relatório da plataforma de vendas." />
      <Suspense fallback={<Skeleton className="h-96 max-w-3xl" />}>
        <NewSale searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewSale({ searchParams }: Pick<PageProps<"/financeiro/vendas/nova">, "searchParams">) {
  if (!(await isAdmin())) return <Restricted />;
  const { app: appParam, mes } = await searchParams;
  const apps = await getAppOptions();
  if (!apps.length) {
    return (
      <EmptyState>
        Cadastre um app antes de lançar as vendas:{" "}
        <Link href="/financeiro/apps/novo" className="text-foreground underline underline-offset-4">
          Novo app
        </Link>
        .
      </EmptyState>
    );
  }
  const app = apps.find((item) => item.id === appParam);
  const returnTo = app ? `/financeiro/apps/${app.id}` : "";
  const cancelHref = app ? `/financeiro/apps/${app.id}` : "/financeiro/vendas";
  return (
    <SaleForm
      apps={apps}
      initial={{
        appId: app?.id ?? "",
        month: (parseMonth(mes) ?? currentMonth()).slice(0, 7),
        newSales: "",
        activeSubscribers: "",
        cancellations: "",
        grossRevenue: "",
        platformFees: "",
        refunds: "",
        companyShare: app ? String(app.companyShare) : "",
        notes: "",
      }}
      action={createSaleAction.bind(null, returnTo)}
      submitLabel="Salvar lançamento"
      cancelHref={cancelHref}
    />
  );
}
