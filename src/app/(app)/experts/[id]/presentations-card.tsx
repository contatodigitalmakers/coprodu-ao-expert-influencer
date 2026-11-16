import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, plural } from "@/lib/format";
import type { PresentationRow } from "@/lib/presentations/queries";
import { CopyLinkButton } from "../../apresentacoes/_components/presentation-link";

export function PresentationsCard({ expertId, presentations }: { expertId: string; presentations: PresentationRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Apresentações</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {presentations.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Apresentações do lead">
            {presentations.map((presentation) => (
              <li key={presentation.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/apresentacoes/${presentation.id}`} className="hover:underline">
                  {formatDateTime(presentation.createdAt)} · {plural(presentation.views, "abertura", "aberturas")}
                </Link>
                <CopyLinkButton code={presentation.code} size="sm" />
              </li>
            ))}
          </ul>
        )}
        <Link href={`/apresentacoes/nova?lead=${expertId}`} className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}>
          Nova apresentação
        </Link>
      </CardContent>
    </Card>
  );
}
