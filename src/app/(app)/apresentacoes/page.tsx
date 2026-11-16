import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, plural } from "@/lib/format";
import { listPresentations } from "@/lib/presentations/queries";
import { CopyLinkButton } from "./_components/presentation-link";
import { SearchForm } from "./_components/search-form";

export const metadata: Metadata = {
  title: "Apresentações",
};

export default function PresentationsPage({ searchParams }: PageProps<"/apresentacoes">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Apresentações"
        description="Apresentações personalizadas para a call de diagnóstico, cada uma com o seu link curto."
        actions={
          <Link href="/apresentacoes/nova" className={buttonVariants()}>
            Nova apresentação
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <PresentationList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PresentationList({ searchParams }: Pick<PageProps<"/apresentacoes">, "searchParams">) {
  const { busca } = await searchParams;
  const search = typeof busca === "string" ? busca.slice(0, 100) : "";
  const rows = await listPresentations(search);

  return (
    <div className="flex flex-col gap-4">
      <SearchForm action="/apresentacoes" defaultValue={search} label="Buscar apresentação pelo lead" />
      {!rows.length ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {search ? "Nenhuma apresentação para essa busca." : "Nenhuma apresentação. Crie a primeira em “Nova apresentação” ou pela ficha do lead."}
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead className="max-md:hidden">Link</TableHead>
                <TableHead className="max-md:hidden">Aberturas</TableHead>
                <TableHead className="max-md:hidden">Criada</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/apresentacoes/${row.id}`} className="font-medium hover:underline">
                      {row.expertName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      @{row.expertHandle}
                      <span className="md:hidden"> · /a/{row.code} · {plural(row.views, "abertura", "aberturas")}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs max-md:hidden">/a/{row.code}</TableCell>
                  <TableCell className="text-muted-foreground max-md:hidden">
                    {row.views}
                    {row.lastViewedAt && <div className="text-xs">última {formatDateTime(row.lastViewedAt)}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-md:hidden">
                    {formatDateTime(row.createdAt)}
                    {row.createdByName && <div className="text-xs">por {row.createdByName}</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <CopyLinkButton code={row.code} size="sm" />
                      <Link href={`/apresentacoes/${row.id}/editar`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        Editar
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
