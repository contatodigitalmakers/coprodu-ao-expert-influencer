import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listCadences } from "@/lib/cadences/queries";

export const metadata: Metadata = {
  title: "Cadências",
};

export default function CadencesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cadências"
        description="Sequências de contato do SDR. Inscreva um lead pela ficha dele."
        actions={
          <Link href="/cadencias/nova" className={buttonVariants()}>
            Nova cadência
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <CadenceList />
      </Suspense>
    </div>
  );
}

async function CadenceList() {
  const rows = await listCadences();
  if (!rows.length) {
    return <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Nenhuma cadência ainda.</p>;
  }
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cadência</TableHead>
            <TableHead>Passos</TableHead>
            <TableHead>Leads em andamento</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cadence) => (
            <TableRow key={cadence.id}>
              <TableCell>
                <Link href={`/cadencias/${cadence.id}`} className="font-medium hover:underline">
                  {cadence.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{cadence.days.map((day) => `D${day}`).join(", ") || "—"}</TableCell>
              <TableCell>{cadence.activeEnrollments}</TableCell>
              <TableCell>
                <Badge variant={cadence.active ? "secondary" : "outline"}>{cadence.active ? "Ativa" : "Inativa"}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
